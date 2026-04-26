/**
 * In-memory balance store for the Mock HCM server.
 * Simulates what Workday/SAP would hold as the source of truth.
 *
 * Structure: { "employeeId:locationId": { availableDays, employeeId, locationId } }
 */

const store = {
  'emp_001:loc_NY': { employeeId: 'emp_001', locationId: 'loc_NY', availableDays: 15 },
  'emp_001:loc_LA': { employeeId: 'emp_001', locationId: 'loc_LA', availableDays: 10 },
  'emp_002:loc_NY': { employeeId: 'emp_002', locationId: 'loc_NY', availableDays: 20 },
  'emp_003:loc_NY': { employeeId: 'emp_003', locationId: 'loc_NY', availableDays: 5 },
  'emp_004:loc_NY': { employeeId: 'emp_004', locationId: 'loc_NY', availableDays: 0 },
};

function key(employeeId, locationId) {
  return `${employeeId}:${locationId}`;
}

function getBalance(employeeId, locationId) {
  return store[key(employeeId, locationId)] || null;
}

function setBalance(employeeId, locationId, availableDays) {
  store[key(employeeId, locationId)] = { employeeId, locationId, availableDays };
}

function deduct(employeeId, locationId, days) {
  const record = getBalance(employeeId, locationId);
  if (!record) return { success: false, reason: 'NOT_FOUND' };
  if (record.availableDays < days) return { success: false, reason: 'INSUFFICIENT_BALANCE' };
  record.availableDays -= days;
  return { success: true, newBalance: record.availableDays };
}

function restore(employeeId, locationId, days) {
  const record = getBalance(employeeId, locationId);
  if (!record) {
    // Create the record if it doesn't exist (edge case)
    setBalance(employeeId, locationId, days);
    return { success: true, newBalance: days };
  }
  record.availableDays += days;
  return { success: true, newBalance: record.availableDays };
}

function getAllBalances() {
  return Object.values(store);
}

function seed(balances) {
  balances.forEach(({ employeeId, locationId, availableDays }) => {
    setBalance(employeeId, locationId, availableDays);
  });
}

function reset() {
  Object.keys(store).forEach((k) => delete store[k]);
  // Restore defaults
  seed([
    { employeeId: 'emp_001', locationId: 'loc_NY', availableDays: 15 },
    { employeeId: 'emp_001', locationId: 'loc_LA', availableDays: 10 },
    { employeeId: 'emp_002', locationId: 'loc_NY', availableDays: 20 },
    { employeeId: 'emp_003', locationId: 'loc_NY', availableDays: 5 },
    { employeeId: 'emp_004', locationId: 'loc_NY', availableDays: 0 },
  ]);
}

module.exports = { getBalance, setBalance, deduct, restore, getAllBalances, seed, reset };