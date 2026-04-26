const balanceService = require('../services/balanceService');
const SyncLog = require('../models/SyncLog');

async function getBalance(req, res, next) {
  try {
    const { employeeId, locationId } = req.params;

    // Always sync from HCM before returning — user always sees fresh data
    const balance = await balanceService.syncBalanceFromHcm(
      employeeId,
      locationId,
      'on-read'
    );
    res.json({
      employeeId: balance.employeeId,
      locationId: balance.locationId,
      availableDays: balance.availableDays,
      pendingDays: balance.pendingDays,
      effectiveDays: balance.availableDays - balance.pendingDays,
      lastSyncedAt: balance.lastSyncedAt,
    });
  } catch (err) {
    next(err);
  }
}

async function syncBalance(req, res, next) {
  try {
    const { employeeId, locationId } = req.body;

    if (!employeeId || !locationId) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'employeeId and locationId are required',
      });
    }

    const previous = await require('../models/Balance').findOne({ employeeId, locationId });
    const previousBalance = previous ? previous.availableDays : null;

    const balance = await balanceService.syncBalanceFromHcm(employeeId, locationId, 'manual-sync');

    res.json({
      message: 'Balance synced from HCM',
      previousBalance,
      newBalance: balance.availableDays,
      syncedAt: balance.lastSyncedAt,
    });
  } catch (err) {
    next(err);
  }
}

async function batchSync(req, res, next) {
  try {
    const { balances } = req.body;

    if (!Array.isArray(balances) || balances.length === 0) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'balances array is required and must not be empty',
      });
    }

    const result = await balanceService.applyBatchSync(balances, 'hcm-webhook');
    res.json({ message: 'Batch sync complete', ...result });
  } catch (err) {
    next(err);
  }
}

async function getSyncLogs(req, res, next) {
  try {
    const { employeeId, locationId } = req.params;
    const logs = await SyncLog.find({ employeeId, locationId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBalance, syncBalance, batchSync, getSyncLogs };