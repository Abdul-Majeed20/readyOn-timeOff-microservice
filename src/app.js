require('dotenv').config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

const express = require('express');
const { connectDB } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

const authRoutes    = require('./routes/authRoutes');
const timeOffRoutes = require('./routes/timeOfRoutes');
const balanceRoutes = require('./routes/balanceRoutes');
const { startSyncJob } = require('./jobs/syncJob');

const app = express();
app.use(express.json());
app.use(generalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/time-off', timeOffRoutes);
app.use('/api/balances', balanceRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'time-off-microservice', timestamp: new Date() })
);

app.use((req, res) =>
  res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.path} not found` })
);

app.use(errorHandler);

async function start() {
  await connectDB();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`[APP] Running on port ${PORT}`));
  if (process.env.NODE_ENV !== 'test') startSyncJob();
}

if (require.main === module) {
  start().catch((err) => { console.error('[APP] Failed to start:', err); process.exit(1); });
}

module.exports = app;