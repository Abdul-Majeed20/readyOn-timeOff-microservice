const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema(
  {
    syncType: {
      type: String,
      enum: ['REALTIME', 'BATCH', 'SCHEDULED', 'WEBHOOK'],
      required: true,
    },
    employeeId: { type: String, default: null },
    locationId: { type: String, default: null },
    previousBalance: { type: Number, default: null },
    newBalance: { type: Number, default: null },
    triggeredBy: { type: String, default: 'unknown' },
    success: { type: Boolean, required: true },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SyncLog', syncLogSchema);