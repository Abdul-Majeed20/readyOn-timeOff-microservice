const mongoose = require('mongoose');

const balanceSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    locationId: { type: String, required: true },
    availableDays: { type: Number, required: true, min: 0 },
    pendingDays: { type: Number, default: 0, min: 0 },
    // optimistic lock — incremented on every write
    version: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: null },
    lastHcmBalance: { type: Number, default: null },
  },
  { timestamps: true }
);

// Fast lookup + uniqueness guarantee per employee+location
balanceSchema.index({ employeeId: 1, locationId: 1 }, { unique: true });

module.exports = mongoose.model('Balance', balanceSchema);