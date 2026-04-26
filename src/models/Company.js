const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

function generateJoinCode() {
  // e.g. WIZDA-4X9K — easy to share with employees
  return uuidv4().slice(0, 8).toUpperCase();
}

const companySchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    joinCode: { type: String, unique: true, default: generateJoinCode },
    adminId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    plan:     { type: String, enum: ['free', 'pro'], default: 'free' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);