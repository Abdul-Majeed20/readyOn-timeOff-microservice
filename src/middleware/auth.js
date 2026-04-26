/**
 * Auth Middleware
 * In a real system this would verify a JWT token from the Authorization header.
 * For this assessment we simulate it — the client passes employeeId and role
 * in headers so tests are simple and focused on business logic.
 *
 * Header format:
 *   x-employee-id: emp_001
 *   x-role: employee | manager
 */

function authenticate(req, res, next) {
  const employeeId = req.headers['x-employee-id'];
  console.log("EmployeeId: ",employeeId)
  const role = req.headers['x-role'] || 'employee';

  if (!employeeId) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing x-employee-id header',
    });
  }

  req.user = { employeeId, role };
  next();
}

function requireManager(req, res, next) {
  if (req.user?.role !== 'manager') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'This action requires manager role',
    });
  }
  next();
}

function requireHcmKey(req, res, next) {
  const key = req.headers['x-hcm-api-key'];
  if (!key || key !== process.env.HCM_API_KEY) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or missing HCM API key',
    });
  }
  next();
}

module.exports = { authenticate, requireManager, requireHcmKey };