const Balance = require('../models/Balance');
const SyncLog = require('../models/SyncLog');
const hcmClient = require('./hcmClient');
const axios = require('axios');

const MAX_LOCK_RETRIES = 3;
const RETRY_DELAY_MS = 50;
const DEFAULT_BALANCE = 20; // days given to new employees

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch balance from HCM.
 * If HCM doesn't know this employee yet (404), auto-seed them with a default balance.
 * This bridges the gap between real registered users and the Mock HCM's hardcoded data.
 */
async function fetchOrSeedHcmBalance(employeeId, locationId) {
  try {
    const data = await hcmClient.getBalance(employeeId, locationId);
    return data.availableDays;
  } catch (err) {
    // HCM doesn't know this employee — seed them with a default balance
    if (err.response && err.response.status === 404) {
      console.log(`[BALANCE] Employee ${employeeId}@${locationId} not in HCM — seeding with ${DEFAULT_BALANCE} days`);
      const hcmUrl = process.env.HCM_BASE_URL || 'http://localhost:4000';
      await axios.post(`${hcmUrl}/hcm/admin/seed`, {
        balances: [{ employeeId, locationId, availableDays: DEFAULT_BALANCE }],
      });
      return DEFAULT_BALANCE;
    }
    throw err;
  }
}

/**
 * Get or create a local balance record.
 * Seeds HCM automatically if the employee is not found there.
 */
async function getOrCreateBalance(employeeId, locationId) {
  let balance = await Balance.findOne({ employeeId, locationId });
  if (!balance) {
    const availableDays = await fetchOrSeedHcmBalance(employeeId, locationId);
    balance = await Balance.create({
      employeeId,
      locationId,
      availableDays,
      lastSyncedAt: new Date(),
      lastHcmBalance: availableDays,
    });
  }
  return balance;
}

/**
 * Sync a single employee+location balance from HCM.
 */
async function syncBalanceFromHcm(employeeId, locationId, triggeredBy = 'manual') {
  const log = { syncType: 'REALTIME', employeeId, locationId, triggeredBy, success: false };

  try {
    const existing = await Balance.findOne({ employeeId, locationId });
    log.previousBalance = existing ? existing.availableDays : null;

    const availableDays = await fetchOrSeedHcmBalance(employeeId, locationId);

    const balance = await Balance.findOneAndUpdate(
      { employeeId, locationId },
      { $set: { availableDays, lastSyncedAt: new Date(), lastHcmBalance: availableDays }, $inc: { version: 1 } },
      { upsert: true, new: true }
    );

    log.newBalance = availableDays;
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
 */
async function applyBatchSync(balances, triggeredBy = 'batch') {
  const results = { updated: 0, failed: 0, errors: [] };

  for (const item of balances) {
    const { employeeId, locationId, availableDays } = item;
    const log = { syncType: 'BATCH', employeeId, locationId, triggeredBy, success: false };
    try {
      const existing = await Balance.findOne({ employeeId, locationId });
      log.previousBalance = existing ? existing.availableDays : null;

      await Balance.findOneAndUpdate(
        { employeeId, locationId },
        { $set: { availableDays, lastSyncedAt: new Date(), lastHcmBalance: availableDays }, $inc: { version: 1 } },
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
    if (attempt < MAX_LOCK_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
  }

  throw Object.assign(new Error('Could not acquire balance lock after retries'), { code: 'LOCK_CONFLICT' });
}

async function releasePendingDays(employeeId, locationId, days) {
  await Balance.findOneAndUpdate(
    { employeeId, locationId },
    { $inc: { pendingDays: -days, version: 1 } }
  );
}

async function confirmDeduction(employeeId, locationId, days) {
  await Balance.findOneAndUpdate(
    { employeeId, locationId },
    { $inc: { availableDays: -days, pendingDays: -days, version: 1 } }
  );
}

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