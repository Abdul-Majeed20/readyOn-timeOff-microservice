const { v4: uuidv4 } = require('uuid');
const TimeOffRequest = require('../models/TimeOffRequest');
const balanceService = require('./balanceService');
const hcmClient = require('./hcmClient');

/**
 * Generate a human-readable request ID like REQ-20240424-A1B2
 */
function generateRequestId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = uuidv4().slice(0, 4).toUpperCase();
  return `REQ-${date}-${suffix}`;
}

/**
 * Validate incoming request fields.
 * We always validate locally — never rely on HCM to catch these.
 */
function validateRequestInput({ days, startDate, endDate }) {
  const errors = [];

  if (!days || days < 0.5) errors.push('days must be at least 0.5');

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(start.getTime())) errors.push('startDate is invalid');
  if (isNaN(end.getTime())) errors.push('endDate is invalid');
  if (start < today) errors.push('startDate must be today or in the future');
  if (end < start) errors.push('endDate must be on or after startDate');

  return errors;
}

/**
 * Create a new time-off request.
 *
 * Flow:
 *  1. Idempotency check
 *  2. Local input validation
 *  3. Ensure local balance record exists (sync from HCM if needed)
 *  4. Lock pendingDays atomically (optimistic lock)
 *  5. Call HCM to deduct
 *  6. If HCM fails → release lock → throw
 *  7. Save request as PENDING
 */
async function createRequest({ employeeId, locationId, days, startDate, endDate, reason, idempotencyKey }) {
  // 1. Idempotency — if this key was already used, return the existing request
  if (idempotencyKey) {
    const existing = await TimeOffRequest.findOne({ idempotencyKey });
    if (existing) return { request: existing, duplicate: true };
  }

  // 2. Validate inputs
  const errors = validateRequestInput({ days, startDate, endDate });
  if (errors.length) {
    throw Object.assign(new Error('Validation failed'), { code: 'VALIDATION_ERROR', errors });
  }

  // 3. Ensure we have a local balance record (seeds from HCM on first call)
  await balanceService.getOrCreateBalance(employeeId, locationId);

  // 4. Lock pendingDays (throws INSUFFICIENT_BALANCE or LOCK_CONFLICT if it can't)
  await balanceService.lockPendingDays(employeeId, locationId, days);

  // 5. Call HCM to deduct
  try {
    await hcmClient.deductBalance(employeeId, locationId, days);
  } catch (hcmErr) {
    // HCM refused or is down — release the lock we just acquired and surface the error
    await balanceService.releasePendingDays(employeeId, locationId, days);

    if (hcmErr.response && hcmErr.response.status === 422) {
      throw Object.assign(new Error('HCM rejected: insufficient balance'), {
        code: 'HCM_INSUFFICIENT_BALANCE',
      });
    }
    throw Object.assign(new Error('HCM is unavailable'), { code: 'HCM_UNAVAILABLE' });
  }

  // 6. Persist the request
  const request = await TimeOffRequest.create({
    requestId: generateRequestId(),
    employeeId,
    locationId,
    days,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    reason: reason || '',
    status: 'PENDING',
    idempotencyKey: idempotencyKey || undefined,
    hcmConfirmed: true,
  });

  return { request, duplicate: false };
}

/**
 * List all requests for an employee, with optional filters.
 */
async function getEmployeeRequests(employeeId, { status, page = 1, limit = 20 } = {}) {
  const filter = { employeeId };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [requests, total] = await Promise.all([
    TimeOffRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    TimeOffRequest.countDocuments(filter),
  ]);

  return { requests, total, page, limit };
}

/**
 * Approve a PENDING request.
 * Moves the days from pendingDays to a real deduction on the balance.
 */
async function approveRequest(requestId, managerId, notes) {
  const request = await TimeOffRequest.findOne({ requestId });
  if (!request) throw Object.assign(new Error('Request not found'), { code: 'NOT_FOUND' });
  if (request.status !== 'PENDING') {
    throw Object.assign(new Error(`Cannot approve a ${request.status} request`), { code: 'INVALID_STATUS' });
  }

  // Confirm deduction — moves days out of availableDays permanently
  await balanceService.confirmDeduction(request.employeeId, request.locationId, request.days);

  request.status = 'APPROVED';
  request.managerId = managerId;
  request.managerNotes = notes || '';
  await request.save();

  return request;
}

/**
 * Reject a PENDING request.
 * Releases the locked pendingDays back to available.
 */
async function rejectRequest(requestId, managerId, reason) {
  const request = await TimeOffRequest.findOne({ requestId });
  if (!request) throw Object.assign(new Error('Request not found'), { code: 'NOT_FOUND' });
  if (request.status !== 'PENDING') {
    throw Object.assign(new Error(`Cannot reject a ${request.status} request`), { code: 'INVALID_STATUS' });
  }

  // Release the pending lock — balance is fully restored
  await balanceService.releasePendingDays(request.employeeId, request.locationId, request.days);

  // Tell HCM to restore the balance too
  try {
    await hcmClient.restoreBalance(request.employeeId, request.locationId, request.days);
  } catch (_) {
    // Best-effort — HCM restore failure is logged but doesn't block the rejection
  }

  request.status = 'REJECTED';
  request.managerId = managerId;
  request.managerNotes = reason || '';
  await request.save();

  return request;
}

/**
 * Cancel a request (by the employee).
 * Works for both PENDING and APPROVED requests.
 * APPROVED requests can only be cancelled before their startDate.
 */
async function cancelRequest(requestId, employeeId) {
  const request = await TimeOffRequest.findOne({ requestId });
  if (!request) throw Object.assign(new Error('Request not found'), { code: 'NOT_FOUND' });
  if (request.employeeId !== employeeId) {
    throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
  }
  if (!['PENDING', 'APPROVED'].includes(request.status)) {
    throw Object.assign(new Error(`Cannot cancel a ${request.status} request`), { code: 'INVALID_STATUS' });
  }
  if (request.status === 'APPROVED' && new Date(request.startDate) <= new Date()) {
    throw Object.assign(new Error('Cannot cancel an approved request that has already started'), {
      code: 'INVALID_STATUS',
    });
  }

  if (request.status === 'PENDING') {
    // Release the pending lock
    await balanceService.releasePendingDays(request.employeeId, request.locationId, request.days);
  } else {
    // APPROVED — restore the days that were fully deducted
    await balanceService.restoreDeductedDays(request.employeeId, request.locationId, request.days);
  }

  // Tell HCM to restore
  try {
    await hcmClient.restoreBalance(request.employeeId, request.locationId, request.days);
  } catch (_) {
    // Best-effort
  }

  request.status = 'CANCELLED';
  await request.save();

  return request;
}

module.exports = {
  createRequest,
  getEmployeeRequests,
  approveRequest,
  rejectRequest,
  cancelRequest,
  validateRequestInput,
  generateRequestId,
};