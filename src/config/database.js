const mongoose = require('mongoose');

async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/timeoff_db';
  await mongoose.connect(mongoUri);
  console.log(`[DB] Connected to MongoDB: ${mongoUri}`);
}

async function disconnectDB() {
  await mongoose.disconnect();
  console.log('[DB] Disconnected from MongoDB');
}

module.exports = { connectDB, disconnectDB };