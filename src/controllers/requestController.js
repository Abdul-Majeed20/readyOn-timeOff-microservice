const requestService = require('../services/requestService');
const User = require('../models/User');

async function createRequest(req, res, next) {
  try {
    // employeeId and locationId come from the JWT payload (set in authService.signToken)
    const { employeeId, locationId: tokenLocation } = req.user;
    console.log(`employeeId: ${employeeId}`)
    const { locationId, days, startDate, endDate, reason } = req.body;
    const idempotencyKey = req.headers['idempotency-key'];

    if (!days || !startDate || !endDate) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'days, startDate, and endDate are required',
      });
    }

    // Use body locationId if provided, otherwise fall back to the user's registered location
    const resolvedLocation = locationId || tokenLocation;

    const { request, duplicate } = await requestService.createRequest({
      employeeId,
      locationId: resolvedLocation,
      days: Number(days),
      startDate,
      endDate,
      reason,
      idempotencyKey,
    });

    res.status(duplicate ? 200 : 201).json({
      message: duplicate ? 'Duplicate request — returning existing' : 'Request created successfully',
      request,
    });
  } catch (err) {
    next(err);
  }
}

async function getEmployeeRequests(req, res, next) {
  try {
    const { employeeId } = req.params;
    const { status, page, limit } = req.query;
    const { role, employeeId: tokenEmployeeId } = req.user;

    // Employees can only see their own requests; managers and admins can see anyone's
    if (role === 'employee' && tokenEmployeeId !== employeeId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied' });
    }

    const result = await requestService.getEmployeeRequests(employeeId, {
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function approveRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const managerId = req.user.employeeId;

    const request = await requestService.approveRequest(id, managerId, notes);
    res.json({ message: 'Request approved', request });
  } catch (err) {
    next(err);
  }
}

async function rejectRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const managerId = req.user.employeeId;

    const request = await requestService.rejectRequest(id, managerId, reason);
    res.json({ message: 'Request rejected', request });
  } catch (err) {
    next(err);
  }
}

async function cancelRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { employeeId } = req.user;

    const request = await requestService.cancelRequest(id, employeeId);
    res.json({ message: 'Request cancelled', request });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRequest,
  getEmployeeRequests,
  approveRequest,
  rejectRequest,
  cancelRequest,
};