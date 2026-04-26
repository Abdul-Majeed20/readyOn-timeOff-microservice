const cron = require('node-cron');
const hcmClient = require('../services/hcmClient');
const balanceService = require('../services/balanceService');

let scheduledTask = null;

/**
 * Fetches all balances from HCM and reconciles them with local records.
 * This catches any anniversary bonuses, year-end resets, or admin changes
 * that happened without ReadyOn being notified.
 */
async function runScheduledSync() {
  console.log('[SYNC JOB] Starting scheduled balance reconciliation...');
  try {
    const { balances } = await hcmClient.getAllBalances();
    const result = await balanceService.applyBatchSync(balances, 'scheduled-job');
    console.log(`[SYNC JOB] Done. Updated: ${result.updated}, Failed: ${result.failed}`);
  } catch (err) {
    console.error('[SYNC JOB] Failed:', err.message);
  }
}

function startSyncJob() {
  const cronExpr = process.env.SYNC_CRON || '*/15 * * * *';

  if (!cron.validate(cronExpr)) {
    console.error(`[SYNC JOB] Invalid cron expression: ${cronExpr}`);
    return;
  }

  scheduledTask = cron.schedule(cronExpr, runScheduledSync);
  console.log(`[SYNC JOB] Scheduled with cron: "${cronExpr}"`);
}

function stopSyncJob() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[SYNC JOB] Stopped');
  }
}

module.exports = { startSyncJob, stopSyncJob, runScheduledSync };