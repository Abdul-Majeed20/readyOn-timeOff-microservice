require('dotenv').config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

const express = require('express');
const { connectDB } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const timeOffRoutes = require('./routes/timeOfRoutes');
const balanceRoutes = require('./routes/balanceRoutes');
const { startSyncJob } = require('./jobs/syncJob');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(generalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/time-off', timeOffRoutes);
app.use('/api/balances', balanceRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'time-off-microservice', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.path} not found` });
});

// Central error handler (must be last)
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  await connectDB();

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[APP] Time-Off Microservice running on port ${PORT}`);
  });

  // Start background sync job (not in test mode)
  if (process.env.NODE_ENV !== 'test') {
    startSyncJob();
  }
}

// Only auto-start when run directly, not when imported by tests
if (require.main === module) {
  start().catch((err) => {
    console.error('[APP] Failed to start:', err);
    process.exit(1);
  });
}

module.exports = app;