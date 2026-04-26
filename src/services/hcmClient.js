const axios = require('axios');

/**
 * All communication with the HCM system goes through this module.
 * Centralising it here means we can swap the real HCM for the mock
 * simply by changing HCM_BASE_URL in the environment.
 */

function getClient() {
  return axios.create({
    baseURL: process.env.HCM_BASE_URL || 'http://localhost:4000',
    timeout: parseInt(process.env.HCM_TIMEOUT_MS) || 5000,
    headers: {
      'Content-Type': 'application/json',
      'X-HCM-API-Key': process.env.HCM_API_KEY || '',
    },
  });
}

/**
 * Fetch the current balance for an employee at a location from HCM.
 * Returns { availableDays } or throws on failure.
 */
async function getBalance(employeeId, locationId) {
  const client = getClient();
  const res = await client.get(`/hcm/balance/${employeeId}/${locationId}`);
  return res.data;
}

/**
 * Tell HCM to deduct days from an employee's balance.
 * HCM returns an error if balance is insufficient (but we also check locally first).
 */
async function deductBalance(employeeId, locationId, days) {
  const client = getClient();
  const res = await client.post('/hcm/deduct', { employeeId, locationId, days });
  return res.data;
}

/**
 * Tell HCM to restore days (on rejection or cancellation).
 */
async function restoreBalance(employeeId, locationId, days) {
  const client = getClient();
  const res = await client.post('/hcm/restore', { employeeId, locationId, days });
  return res.data;
}

/**
 * Fetch all balances from HCM in one batch call.
 * Used by the scheduled sync job.
 */
async function getAllBalances() {
  const client = getClient();
  const res = await client.get('/hcm/balances');
  return res.data; // { balances: [{ employeeId, locationId, availableDays }] }
}

module.exports = { getBalance, deductBalance, restoreBalance, getAllBalances };