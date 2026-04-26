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

app.use((req, res, next) => {
  const allowed = [
    'http://localhost:3001',
    process.env.FRONTEND_URL, // set this in Vercel env vars
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-hcm-api-key,Idempotency-Key');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(generalLimiter);

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


if (require.main === module) {
  start().catch((err) => { console.error('[APP] Failed to start:', err); process.exit(1); });
}

module.exports = app;