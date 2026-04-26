import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 8000 });

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('timeoff_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// If token is expired/invalid, force logout
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('timeoff_token');
      localStorage.removeItem('timeoff_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const apiCompanySignup = (data) => api.post('/auth/company/signup', data).then(r => r.data);
export const apiRegister      = (data) => api.post('/auth/register', data).then(r => r.data);
export const apiLogin         = (data) => api.post('/auth/login', data).then(r => r.data);
export const apiGetMe         = ()     => api.get('/auth/me').then(r => r.data);
export const apiGetTeam       = ()     => api.get('/auth/team').then(r => r.data);
export const apiUpdateRole    = (id, role) => api.patch(`/auth/users/${id}/role`, { role }).then(r => r.data);

// ── Time-Off Requests ─────────────────────────────────────────────────────────
export const submitRequest  = (data)       => api.post('/time-off/request', data).then(r => r.data);
export const getMyRequests  = (employeeId, params = {}) => api.get(`/time-off/${employeeId}`, { params }).then(r => r.data);
export const approveRequest = (id, data)   => api.patch(`/time-off/${id}/approve`, data).then(r => r.data);
export const rejectRequest  = (id, data)   => api.patch(`/time-off/${id}/reject`, data).then(r => r.data);
export const cancelRequest  = (id)         => api.patch(`/time-off/${id}/cancel`).then(r => r.data);

// ── Balances ──────────────────────────────────────────────────────────────────
export const getBalance  = (empId, locId) => api.get(`/balances/${empId}/${locId}`).then(r => r.data);
export const syncBalance = (empId, locId) => api.post('/balances/sync', { employeeId: empId, locationId: locId }).then(r => r.data);
export const getSyncLogs = (empId, locId) => api.get(`/balances/${empId}/${locId}/logs`).then(r => r.data);