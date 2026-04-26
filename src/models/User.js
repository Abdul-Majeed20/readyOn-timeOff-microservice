const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['employee', 'manager', 'admin'], default: 'employee' },
    companyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    // employeeId is what the HCM uses — auto-generated on registration
    employeeId:   { type: String, required: true, unique: true },
    locationId:   { type: String, default: 'loc_NY' },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Never return passwordHash in any query result
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

// Hash password before saving
userSchema.statics.hashPassword = async function (plain) {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
  return bcrypt.hash(plain, rounds);
};

// Compare plain password against stored hash
userSchema.methods.verifyPassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);