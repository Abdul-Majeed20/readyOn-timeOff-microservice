const { v4: uuidv4 } = require('uuid');
const TimeOffRequest = require('../models/TimeOffRequest');
const balanceService = require('./balanceService');
const hcmClient = require('./hcmClient');

function generateRequestId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = uuidv4().slice(0, 4).toUpperCase();
  return `REQ-${date}-${suffix}`;
}

function validateRequestInput({ days, startDate, endDate }) {
  const errors = [];

  if (!days || days < 0.5) errors.push('days must be at least 0.5');

  const start = new Date(startDate);
  const end   = new Date(endDate);

  if (isNaN(start.getTime())) { errors.push('startDate is invalid'); return errors; }
  if (isNaN(end.getTime()))   { errors.push('endDate is invalid');   return errors; }

  // Compare date strings directly (YYYY-MM-DD) so timezone never matters
  const todayStr = new Date().toISOString().slice(0, 10);
  const startStr = typeof startDate === 'string' ? startDate.slice(0, 10)
    : start.toISOString().slice(0, 10);
  const endStr   = typeof endDate === 'string'   ? endDate.slice(0, 10)
    : end.toISOString().slice(0, 10);

  if (startStr < todayStr) errors.push('startDate must be today or in the future');
  if (endStr   < startStr) errors.push('endDate must be on or after startDate');

  return errors;
}

async function createRequest({ employeeId, locationId, days, startDate, endDate, reason, idempotencyKey }) {
  // 1. Idempotency check
  if (idempotencyKey) {
    const existing = await TimeOffRequest.findOne({ idempotencyKey });
    if (existing) return { request: existing, duplicate: true };
  }

  // 2. Validate inputs
  const errors = validateRequestInput({ days, startDate, endDate });
  if (errors.length) {
    throw Object.assign(new Error('Validation failed'), { code: 'VALIDATION_ERROR', errors });
  }

  // 3. Ensure local balance record exists
  await balanceService.getOrCreateBalance(employeeId, locationId);

  // 4. Lock pending days (optimistic lock)
  await balanceService.lockPendingDays(employeeId, locationId, days);

  // 5. Call HCM to deduct
  try {
    await hcmClient.deductBalance(employeeId, locationId, days);
  } catch (hcmErr) {
    await balanceService.releasePendingDays(employeeId, locationId, days);
    if (hcmErr.response && hcmErr.response.status === 422) {
      throw Object.assign(new Error('HCM rejected: insufficient balance'), { code: 'HCM_INSUFFICIENT_BALANCE' });
    }
    throw Object.assign(new Error('HCM is unavailable'), { code: 'HCM_UNAVAILABLE' });
  }

  // 6. Save request
  const request = await TimeOffRequest.create({
    requestId: generateRequestId(),
    employeeId,
    locationId,
    days,
    startDate: new Date(startDate),
    endDate:   new Date(endDate),
    reason:    reason || '',
    status:    'PENDING',
    idempotencyKey: idempotencyKey || undefined,
    hcmConfirmed: true,
  });

  return { request, duplicate: false };
}

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

async function approveRequest(requestId, managerId, notes) {
  const request = await TimeOffRequest.findOne({ requestId });
  if (!request) throw Object.assign(new Error('Request not found'), { code: 'NOT_FOUND' });
  if (request.status !== 'PENDING') throw Object.assign(new Error(`Cannot approve a ${request.status} request`), { code: 'INVALID_STATUS' });
  await balanceService.confirmDeduction(request.employeeId, request.locationId, request.days);
  request.status = 'APPROVED';
  request.managerId = managerId;
  request.managerNotes = notes || '';
  await request.save();
  return request;
}

async function rejectRequest(requestId, managerId, reason) {
  const request = await TimeOffRequest.findOne({ requestId });
  if (!request) throw Object.assign(new Error('Request not found'), { code: 'NOT_FOUND' });
  if (request.status !== 'PENDING') throw Object.assign(new Error(`Cannot reject a ${request.status} request`), { code: 'INVALID_STATUS' });
  await balanceService.releasePendingDays(request.employeeId, request.locationId, request.days);
  try { await hcmClient.restoreBalance(request.employeeId, request.locationId, request.days); } catch (_) {}
  request.status = 'REJECTED';
  request.managerId = managerId;
  request.managerNotes = reason || '';
  await request.save();
  return request;
}

async function cancelRequest(requestId, employeeId) {
  const request = await TimeOffRequest.findOne({ requestId });
  if (!request) throw Object.assign(new Error('Request not found'), { code: 'NOT_FOUND' });
  if (request.employeeId !== employeeId) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
  if (!['PENDING', 'APPROVED'].includes(request.status)) throw Object.assign(new Error(`Cannot cancel a ${request.status} request`), { code: 'INVALID_STATUS' });
  if (request.status === 'APPROVED' && new Date(request.startDate) <= new Date()) throw Object.assign(new Error('Cannot cancel an approved request that has already started'), { code: 'INVALID_STATUS' });

  if (request.status === 'PENDING') {
    await balanceService.releasePendingDays(request.employeeId, request.locationId, request.days);
  } else {
    await balanceService.restoreDeductedDays(request.employeeId, request.locationId, request.days);
  }
  try { await hcmClient.restoreBalance(request.employeeId, request.locationId, request.days); } catch (_) {}
  request.status = 'CANCELLED';
  await request.save();
  return request;
}

module.exports = { createRequest, getEmployeeRequests, approveRequest, rejectRequest, cancelRequest, validateRequestInput, generateRequestId };