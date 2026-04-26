const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { startMockHcm } = require('../../mock-hcm/server');
const store = require('../../mock-hcm/data/store');

let mongod;
let hcmServer;

/**
 * Call this in a beforeAll() block.
 * Starts an in-memory MongoDB and a real Mock HCM HTTP server.
 */
async function setupTestEnvironment() {
  // Start in-memory MongoDB
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // Start Mock HCM on test port (4001 to avoid conflict with dev server)
  process.env.HCM_BASE_URL = 'http://localhost:4001';
  process.env.HCM_API_KEY = 'test-hcm-key';
  hcmServer = await startMockHcm(4001);

  return { uri };
}

/**
 * Call this in an afterAll() block.
 */
async function teardownTestEnvironment() {
  if (hcmServer) hcmServer.close();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

/**
 * Call this in a beforeEach() block to get a clean state before every test.
 */
async function resetTestState() {
  // Clear all MongoDB collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  // Reset Mock HCM to default balances
  store.reset();
}

/**
 * Returns auth headers for an employee
 */
function employeeHeaders(employeeId = 'emp_001') {
  return { 'x-employee-id': employeeId, 'x-role': 'employee' };
}

/**
 * Returns auth headers for a manager
 */
function managerHeaders(managerId = 'mgr_001') {
  return { 'x-employee-id': managerId, 'x-role': 'manager' };
}

/**
 * Returns HCM auth headers
 */
function hcmHeaders() {
  return { 'x-hcm-api-key': 'test-hcm-key' };
}

/**
 * Returns a valid future date string (N days from now)
 */
function futureDate(daysFromNow = 7) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

module.exports = {
  setupTestEnvironment,
  teardownTestEnvironment,
  resetTestState,
  employeeHeaders,
  managerHeaders,
  hcmHeaders,
  futureDate,
};