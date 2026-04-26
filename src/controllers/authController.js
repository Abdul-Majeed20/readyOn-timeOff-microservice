const authService = require('../services/authService');

async function companySignup(req, res, next) {
  try {
    const { companyName, name, email, password, locationId } = req.body;
    if (!companyName || !name || !email || !password) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'companyName, name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Password must be at least 6 characters' });
    }
    const result = await authService.companySignup({ companyName, name, email, password, locationId });
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function register(req, res, next) {
  try {
    const { name, email, password, joinCode, locationId } = req.body;
    if (!name || !email || !password || !joinCode) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'name, email, password and joinCode are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Password must be at least 6 characters' });
    }
    const result = await authService.register({ name, email, password, joinCode, locationId });
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'email and password are required' });
    }
    const result = await authService.login({ email, password });
    res.json(result);
  } catch (err) { next(err); }
}

async function getMe(req, res, next) {
  try {
    const result = await authService.getMe(req.user.userId);
    res.json(result);
  } catch (err) { next(err); }
}

async function getTeam(req, res, next) {
  try {
    const users = await authService.getTeam(req.user.companyId);
    res.json({ users });
  } catch (err) { next(err); }
}

async function updateRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['employee', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'role must be employee, manager or admin' });
    }
    const user = await authService.updateRole(id, role, req.user);
    res.json({ message: 'Role updated', user });
  } catch (err) { next(err); }
}

module.exports = { companySignup, register, login, getMe, getTeam, updateRole };