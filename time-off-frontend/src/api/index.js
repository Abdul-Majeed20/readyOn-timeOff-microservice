import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 8000,
});

// Attach auth headers to every request from localStorage
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('timeoff_user') || '{}');
  if (user.employeeId) {
    config.headers['x-employee-id'] = user.employeeId;
    config.headers['x-role'] = user.role || 'employee';
  }
  return config;
});

// ── Time-Off Requests ────────────────────────────────────────────────────────

export const submitRequest = (data) =>
  api.post('/time-off/request', data).then((r) => r.data);

export const getMyRequests = (employeeId, params = {}) =>
  api.get(`/time-off/${employeeId}`, { params }).then((r) => r.data);

export const approveRequest = (requestId, data) =>
  api.patch(`/time-off/${requestId}/approve`, data).then((r) => r.data);

export const rejectRequest = (requestId, data) =>
  api.patch(`/time-off/${requestId}/reject`, data).then((r) => r.data);

export const cancelRequest = (requestId) =>
  api.patch(`/time-off/${requestId}/cancel`).then((r) => r.data);

// ── Balances ─────────────────────────────────────────────────────────────────

export const getBalance = (employeeId, locationId) =>
  api.get(`/balances/${employeeId}/${locationId}`).then((r) => r.data);

export const syncBalance = (employeeId, locationId) =>
  api.post('/balances/sync', { employeeId, locationId }).then((r) => r.data);

export const getSyncLogs = (employeeId, locationId) =>
  api.get(`/balances/${employeeId}/${locationId}/logs`).then((r) => r.data);
