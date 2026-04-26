const rateLimit = require('express-rate-limit');

const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }, // ← fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
  message: { error: 'RATE_LIMITED', message: 'Too many requests. Please wait before trying again.' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }, // ← fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
  message: { error: 'RATE_LIMITED', message: 'Too many requests.' },
});

module.exports = { requestLimiter, generalLimiter };