const express = require('express');
const router = express.Router();
const controller = require('../controllers/balanceController');
const { authenticate, requireHcmKey } = require('../middleware/auth');

// Get current balance (triggers live HCM sync)
router.get('/:employeeId/:locationId', authenticate, controller.getBalance);

// Manually trigger a sync for a specific employee+location
router.post('/sync', authenticate, controller.syncBalance);

// HCM pushes a bulk balance update (secured by HCM API key, no JWT needed)
router.post('/batch', requireHcmKey, controller.batchSync);

// View sync history for an employee+location
router.get('/:employeeId/:locationId/logs', authenticate, controller.getSyncLogs);

module.exports = router;