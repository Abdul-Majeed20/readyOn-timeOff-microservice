const mongoose = require('mongoose');

const REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

const timeOffRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true },
    locationId: { type: String, required: true },
    days: { type: Number, required: true, min: 0.5 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: REQUEST_STATUSES, default: 'PENDING' },
    // idempotency — client sends a unique key so retries don't double-submit
    idempotencyKey: { type: String, sparse: true, unique: true },
    hcmConfirmed: { type: Boolean, default: false },
    managerId: { type: String, default: null },
    managerNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

timeOffRequestSchema.index({ employeeId: 1, status: 1 });
timeOffRequestSchema.index({ employeeId: 1, startDate: 1 });

module.exports = mongoose.model('TimeOffRequest', timeOffRequestSchema);
module.exports.REQUEST_STATUSES = REQUEST_STATUSES;