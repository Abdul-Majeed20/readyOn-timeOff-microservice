const jwt = require('jsonwebtoken');

/**
 * Verifies the Bearer JWT token in the Authorization header.
 * Attaches decoded payload to req.user.
 */
function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = payload; // { userId, employeeId, companyId, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token expired or invalid' });
  }
}

function requireManager(req, res, next) {
  if (!['manager', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Manager or admin role required' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin role required' });
  }
  next();
}

function requireHcmKey(req, res, next) {
  const key = req.headers['x-hcm-api-key'];
  if (!key || key !== process.env.HCM_API_KEY) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or missing HCM API key' });
  }
  next();
}

module.exports = { authenticate, requireManager, requireAdmin, requireHcmKey };
