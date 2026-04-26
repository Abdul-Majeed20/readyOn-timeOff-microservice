const express = require('express');
const router = express.Router();
const store = require('../data/store');

// Simulate realistic HCM network latency
function simulateLatency() {
  const ms = Math.floor(Math.random() * 150) + 50; // 50–200ms
  return new Promise((r) => setTimeout(r, ms));
}

// ── GET /hcm/balance/:employeeId/:locationId ───────────────────────────────
// Returns the current balance for one employee at one location
router.get('/balance/:employeeId/:locationId', async (req, res) => {
  await simulateLatency();
  const { employeeId, locationId } = req.params;
  const record = store.getBalance(employeeId, locationId);
  if (!record) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `No balance found for employee ${employeeId} at location ${locationId}`,
    });
  }

  res.json({ employeeId, locationId, availableDays: record.availableDays });
});

// ── POST /hcm/deduct ──────────────────────────────────────────────────────
// Deducts days from an employee's balance
router.post('/deduct', async (req, res) => {
  await simulateLatency();
  const { employeeId, locationId, days } = req.body;

  if (!employeeId || !locationId || days == null) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'employeeId, locationId, days required' });
  }

  const result = store.deduct(employeeId, locationId, Number(days));

  if (!result.success) {
    if (result.reason === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee/location combination not found in HCM' });
    }
    return res.status(422).json({
      error: 'INSUFFICIENT_BALANCE',
      message: 'HCM rejected: employee does not have enough leave balance',
      available: store.getBalance(employeeId, locationId)?.availableDays,
      requested: days,
    });
  }

  res.json({ success: true, newBalance: result.newBalance });
});

// ── POST /hcm/restore ─────────────────────────────────────────────────────
// Restores days to an employee's balance (on rejection/cancellation)
router.post('/restore', async (req, res) => {
  await simulateLatency();
  const { employeeId, locationId, days } = req.body;

  if (!employeeId || !locationId || days == null) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'employeeId, locationId, days required' });
  }

  const result = store.restore(employeeId, locationId, Number(days));
  res.json({ success: true, newBalance: result.newBalance });
});

// ── GET /hcm/balances ─────────────────────────────────────────────────────
// Returns ALL balances — used by the scheduled batch sync
router.get('/balances', async (req, res) => {
  await simulateLatency();
  const balances = store.getAllBalances();
  res.json({ balances, count: balances.length });
});

// ── POST /hcm/admin/seed ──────────────────────────────────────────────────
// Test utility — seed the HCM with specific balance data
router.post('/admin/seed', (req, res) => {
  const { balances } = req.body;
  if (!Array.isArray(balances)) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'balances array required' });
  }
  store.seed(balances);
  res.json({ message: 'HCM seeded', count: balances.length });
});

// ── POST /hcm/admin/reset ─────────────────────────────────────────────────
// Test utility — reset HCM to default state
router.post('/admin/reset', (req, res) => {
  store.reset();
  res.json({ message: 'HCM reset to defaults' });
});

// ── POST /hcm/admin/anniversary ───────────────────────────────────────────
// Test utility — simulate a work anniversary bonus grant
router.post('/admin/anniversary', (req, res) => {
  const { employeeId, locationId, bonusDays } = req.body;
  if (!employeeId || !locationId || !bonusDays) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'employeeId, locationId, bonusDays required' });
  }

  const current = store.getBalance(employeeId, locationId);
  if (!current) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee not found in HCM' });
  }

  store.setBalance(employeeId, locationId, current.availableDays + Number(bonusDays));
  const updated = store.getBalance(employeeId, locationId);
  res.json({
    message: 'Anniversary bonus applied',
    employeeId,
    locationId,
    previousBalance: current.availableDays,
    bonusDays: Number(bonusDays),
    newBalance: updated.availableDays,
  });
});

// ── POST /hcm/admin/year-reset ────────────────────────────────────────────
// Test utility — simulate a new year balance reset for all employees
router.post('/admin/year-reset', (req, res) => {
  const { defaultDays } = req.body;
  if (defaultDays == null) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'defaultDays required' });
  }

  const all = store.getAllBalances();
  all.forEach(({ employeeId, locationId }) => {
    store.setBalance(employeeId, locationId, Number(defaultDays));
  });

  res.json({ message: 'Year-end reset complete', employeesReset: all.length, newBalance: defaultDays });
});

module.exports = router;