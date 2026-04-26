const Balance = require('../models/Balance');
const SyncLog = require('../models/SyncLog');
const hcmClient = require('./hcmClient');

const MAX_LOCK_RETRIES = 3;
const RETRY_DELAY_MS = 50;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get or create a local balance record.
 * If it doesn't exist yet (first time we've seen this employee+location), we
 * fetch it from HCM and store it locally.
 */
async function getOrCreateBalance(employeeId, locationId) {
  let balance = await Balance.findOne({ employeeId, locationId });
  if (!balance) {
    // First time — fetch from HCM and seed locally
    const hcmData = await hcmClient.getBalance(employeeId, locationId);
    balance = await Balance.create({
      employeeId,
      locationId,
      availableDays: hcmData.availableDays,
      lastSyncedAt: new Date(),
      lastHcmBalance: hcmData.availableDays,
    });
  }
  return balance;
}

/**
 * Sync a single employee+location balance from HCM.
 * Updates the local record and writes a sync log entry.
 */
async function syncBalanceFromHcm(employeeId, locationId, triggeredBy = 'manual') {
  const log = { syncType: 'REALTIME', employeeId, locationId, triggeredBy, success: false };

  try {
    const existing = await Balance.findOne({ employeeId, locationId });
    console.log("Existing: ",existing)

    log.previousBalance = existing ? existing.availableDays : null;

    const hcmData = await hcmClient.getBalance(employeeId, locationId);
    
    console.log("HCM Data: ",hcmData)
    const newAvailable = hcmData.availableDays;

    const balance = await Balance.findOneAndUpdate(
      { employeeId, locationId },
      {
        $set: {
          availableDays: newAvailable,
          lastSyncedAt: new Date(),
          lastHcmBalance: newAvailable,
        },
        $inc: { version: 1 },
      },
      { upsert: true, new: true }
    );
    log.newBalance = newAvailable;
    log.success = true;
    await SyncLog.create(log);
    return balance;
  } catch (err) {
    log.error = err.message;
    await SyncLog.create(log);
    throw err;
  }
}

/**
 * Apply a batch of balance updates received from HCM.
 * Used by the /api/balances/batch endpoint and the scheduled sync job.
 */
async function applyBatchSync(balances, triggeredBy = 'batch') {
  const results = { updated: 0, failed: 0, errors: [] };

  for (const item of balances) {
    const { employeeId, locationId, availableDays } = item;
    const log = {
      syncType: 'BATCH',
      employeeId,
      locationId,
      triggeredBy,
      success: false,
    };
    try {
      const existing = await Balance.findOne({ employeeId, locationId });
      log.previousBalance = existing ? existing.availableDays : null;

      await Balance.findOneAndUpdate(
        { employeeId, locationId },
        {
          $set: {
            availableDays,
            lastSyncedAt: new Date(),
            lastHcmBalance: availableDays,
          },
          $inc: { version: 1 },
        },
        { upsert: true }
      );

      log.newBalance = availableDays;
      log.success = true;
      results.updated++;
    } catch (err) {
      log.error = err.message;
      results.failed++;
      results.errors.push({ employeeId, locationId, error: err.message });
    } finally {
      await SyncLog.create(log);
    }
  }

  return results;
}

/**
 * Atomically lock pendingDays using optimistic locking.
 *
 * The update only succeeds if:
 *   1. The version matches (no concurrent write has happened)
 *   2. availableDays - pendingDays >= days (enough balance)
 *
 * Retries up to MAX_LOCK_RETRIES times on version conflicts.
 * Returns the updated balance document, or throws on failure.
 */
async function lockPendingDays(employeeId, locationId, days) {
  for (let attempt = 1; attempt <= MAX_LOCK_RETRIES; attempt++) {
    const current = await Balance.findOne({ employeeId, locationId });

    if (!current) {
      throw Object.assign(new Error('Balance record not found'), { code: 'BALANCE_NOT_FOUND' });
    }

    const effective = current.availableDays - current.pendingDays;
    if (effective < days) {
      const err = new Error('Insufficient balance');
      err.code = 'INSUFFICIENT_BALANCE';
      err.available = effective;
      err.requested = days;
      throw err;
    }

    // Atomic: only applies if version still matches AND balance still sufficient
    const updated = await Balance.findOneAndUpdate(
      {
        employeeId,
        locationId,
        version: current.version,
        $expr: { $gte: [{ $subtract: ['$availableDays', '$pendingDays'] }, days] },
      },
      { $inc: { pendingDays: days, version: 1 } },
      { new: true }
    );

    if (updated) return updated;

    // Version conflict — another request beat us to it. Retry after a short delay.
    if (attempt < MAX_LOCK_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
  }

  throw Object.assign(new Error('Could not acquire balance lock after retries'), {
    code: 'LOCK_CONFLICT',
  });
}

/**
 * Release pendingDays (on rejection, cancellation, or HCM error).
 */
async function releasePendingDays(employeeId, locationId, days) {
  await Balance.findOneAndUpdate(
    { employeeId, locationId },
    { $inc: { pendingDays: -days, version: 1 } }
  );
}

/**
 * Confirm a deduction — move days from pendingDays to a real deduction
 * (i.e., reduce both availableDays and pendingDays).
 */
async function confirmDeduction(employeeId, locationId, days) {
  await Balance.findOneAndUpdate(
    { employeeId, locationId },
    { $inc: { availableDays: -days, pendingDays: -days, version: 1 } }
  );
}

/**
 * Restore previously deducted days to availableDays (on cancellation of APPROVED request).
 */
async function restoreDeductedDays(employeeId, locationId, days) {
  await Balance.findOneAndUpdate(
    { employeeId, locationId },
    { $inc: { availableDays: days, version: 1 } }
  );
}

module.exports = {
  getOrCreateBalance,
  syncBalanceFromHcm,
  applyBatchSync,
  lockPendingDays,
  releasePendingDays,
  confirmDeduction,
  restoreDeductedDays,
};