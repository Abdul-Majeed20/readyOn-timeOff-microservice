const rateLimit = require('express-rate-limit');

// Limit time-off submissions to 20 per 15 minutes per IP
const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many requests. Please wait before trying again.',
  },
});

// General API limiter — 200 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many requests.',
  },
});

module.exports = { requestLimiter, generalLimiter };