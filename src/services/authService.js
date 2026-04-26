const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User    = require('../models/User');
const Company = require('../models/Company');

function signToken(user) {
  return jwt.sign(
    {
      userId:     user._id,
      employeeId: user.employeeId,
      companyId:  user.companyId,
      role:       user.role,
    },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );
}

/**
 * Step 1 for a new company.
 * Creates the Company record, then creates the admin User.
 * Returns a JWT so the admin is logged in immediately.
 */
async function companySignup({ companyName, name, email, password, locationId }) {
  // Check email not already taken
  const exists = await User.findOne({ email });
  if (exists) throw Object.assign(new Error('Email already registered'), { code: 'EMAIL_TAKEN' });

  // Create company first (adminId filled in after user is created)
  const company = await Company.create({ name: companyName });

  const employeeId = `emp_${uuidv4().slice(0, 6)}`;
  const passwordHash = await User.hashPassword(password);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role: 'admin',
    companyId: company._id,
    employeeId,
    locationId: locationId || 'loc_HQ',
  });

  // Link company → admin
  company.adminId = user._id;
  await company.save();

  return { token: signToken(user), user, company };
}

/**
 * Employee / manager registration using a company join code.
 */
async function register({ name, email, password, joinCode, locationId }) {
  const company = await Company.findOne({ joinCode: joinCode.toUpperCase() });
  if (!company) throw Object.assign(new Error('Invalid company code'), { code: 'INVALID_CODE' });

  const exists = await User.findOne({ email });
  if (exists) throw Object.assign(new Error('Email already registered'), { code: 'EMAIL_TAKEN' });

  const employeeId  = `emp_${uuidv4().slice(0, 6)}`;
  const passwordHash = await User.hashPassword(password);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role: 'employee',
    companyId: company._id,
    employeeId,
    locationId: locationId || 'loc_NY',
  });

  return { token: signToken(user), user, company };
}

/**
 * Login with email + password. Returns JWT on success.
 */
async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw Object.assign(new Error('Invalid email or password'), { code: 'INVALID_CREDENTIALS' });
  if (!user.isActive) throw Object.assign(new Error('Account is deactivated'), { code: 'DEACTIVATED' });

  const valid = await user.verifyPassword(password);
  if (!valid) throw Object.assign(new Error('Invalid email or password'), { code: 'INVALID_CREDENTIALS' });

  const company = await Company.findById(user.companyId);
  return { token: signToken(user), user, company };
}

/**
 * Decode token and return the current user + company.
 */
async function getMe(userId) {
  const user    = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
  const company = await Company.findById(user.companyId);
  return { user, company };
}

/**
 * Get all users in a company (for manager team view).
 */
async function getTeam(companyId) {
  return User.find({ companyId }).sort({ name: 1 });
}

/**
 * Update a user's role — admin only.
 */
async function updateRole(targetUserId, newRole, requestingUser) {
  if (requestingUser.role !== 'admin') {
    throw Object.assign(new Error('Only admins can change roles'), { code: 'FORBIDDEN' });
  }
  const user = await User.findByIdAndUpdate(
    targetUserId,
    { role: newRole },
    { new: true }
  );
  if (!user) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
  return user;
}

module.exports = { companySignup, register, login, getMe, getTeam, updateRole };