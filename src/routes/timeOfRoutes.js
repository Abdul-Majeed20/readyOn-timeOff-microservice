const express = require('express');
const router = express.Router();
const controller = require('../controllers/requestController');
const { authenticate, requireManager } = require('../middleware/auth');
const { requestLimiter } = require('../middleware/rateLimiter');

// All routes require authentication
router.use(authenticate);

// Employee submits a new time-off request
router.post('/request', requestLimiter, controller.createRequest);

// Get all requests for an employee
router.get('/:employeeId', controller.getEmployeeRequests);

// Manager actions
router.patch('/:id/approve', requireManager, controller.approveRequest);
router.patch('/:id/reject', requireManager, controller.rejectRequest);

// Employee cancels their own request
router.patch('/:id/cancel', controller.cancelRequest);

module.exports = router;