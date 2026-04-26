/**
 * Central error handler.
 * All controllers call next(err) and this formats the response consistently.
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${err.code || 'UNKNOWN'}: ${err.message}`);

  // Map internal error codes to HTTP status codes
  const statusMap = {
    VALIDATION_ERROR: 422,
    INSUFFICIENT_BALANCE: 422,
    HCM_INSUFFICIENT_BALANCE: 422,
    HCM_UNAVAILABLE: 503,
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    UNAUTHORIZED: 401,
    INVALID_STATUS: 409,
    LOCK_CONFLICT: 409,
    BALANCE_NOT_FOUND: 404,
  };

  const status = statusMap[err.code] || 500;

  const body = {
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
  };

  // Add extra context for specific errors
  if (err.code === 'VALIDATION_ERROR') body.errors = err.errors;
  if (err.code === 'INSUFFICIENT_BALANCE') {
    body.available = err.available;
    body.requested = err.requested;
  }

  res.status(status).json(body);
}

module.exports = { errorHandler };