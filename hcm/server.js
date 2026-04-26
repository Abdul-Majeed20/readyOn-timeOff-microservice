require('dotenv').config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

const express = require('express');
const hcmRoutes = require('./routes/hcmRoutes');

const app = express();
app.use(express.json());
app.use('/hcm', hcmRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mock-hcm', timestamp: new Date() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: `HCM route ${req.path} not found` });
});

function startMockHcm(port) {
  const PORT = port || process.env.HCM_PORT || 4000;
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`[MOCK HCM] Running on port ${PORT}`);
      resolve(server);
    });
  });
}

// Only auto-start when run directly
if (require.main === module) {
  startMockHcm();
}

module.exports = { app, startMockHcm };