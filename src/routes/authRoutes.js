const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/authController');
const { authenticate, requireManager } = require('../middleware/auth');

// Public — no token needed
router.post('/company/signup', ctrl.companySignup);
router.post('/register',       ctrl.register);
router.post('/login',          ctrl.login);

// Protected
router.get('/me',              authenticate, ctrl.getMe);
router.get('/team',            authenticate, requireManager, ctrl.getTeam);
router.patch('/users/:id/role', authenticate, ctrl.updateRole);

module.exports = router;