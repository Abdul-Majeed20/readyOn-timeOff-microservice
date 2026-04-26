const request = require('supertest');
const app = require('../../src/app');
const {
  setupTestEnvironment,
  teardownTestEnvironment,
  resetTestState,
  employeeHeaders,
  hcmHeaders,
  futureDate,
} = require('../testHelper');
const store = require('../../mock-hcm/data/store');

beforeAll(async () => {
  await setupTestEnvironment();
});

afterAll(async () => {
  await teardownTestEnvironment();
});

beforeEach(async () => {
  await resetTestState();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Integration: GET /api/balances/:employeeId/:locationId', () => {

  test('returns synced balance from HCM', async () => {
    const res = await request(app)
      .get('/api/balances/emp_001/loc_NY')
      .set(employeeHeaders('emp_001'));

    expect(res.status).toBe(200);
    expect(res.body.availableDays).toBe(15); // seeded value in mock HCM
    expect(res.body.employeeId).toBe('emp_001');
    expect(res.body.locationId).toBe('loc_NY');
    expect(res.body.lastSyncedAt).toBeTruthy();
  });

  test('balance reflects HCM as source of truth', async () => {
    // Manually update HCM balance
    store.setBalance('emp_001', 'loc_NY', 25);

    const res = await request(app)
      .get('/api/balances/emp_001/loc_NY')
      .set(employeeHeaders('emp_001'));

    expect(res.status).toBe(200);
    expect(res.body.availableDays).toBe(25); // should reflect HCM change
  });

  test('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/balances/emp_001/loc_NY');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Integration: POST /api/balances/sync', () => {

  test('manually syncs balance from HCM', async () => {
    // Set HCM balance to something different
    store.setBalance('emp_002', 'loc_NY', 30);

    const res = await request(app)
      .post('/api/balances/sync')
      .set(employeeHeaders('emp_002'))
      .send({ employeeId: 'emp_002', locationId: 'loc_NY' });

    expect(res.status).toBe(200);
    expect(res.body.newBalance).toBe(30);
    expect(res.body.syncedAt).toBeTruthy();
  });

  test('returns 400 when body is incomplete', async () => {
    const res = await request(app)
      .post('/api/balances/sync')
      .set(employeeHeaders('emp_001'))
      .send({ employeeId: 'emp_001' }); // missing locationId

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Integration: POST /api/balances/batch (HCM push)', () => {

  test('updates multiple balances from a batch push', async () => {
    const res = await request(app)
      .post('/api/balances/batch')
      .set(hcmHeaders())
      .send({
        balances: [
          { employeeId: 'emp_001', locationId: 'loc_NY', availableDays: 18 },
          { employeeId: 'emp_002', locationId: 'loc_NY', availableDays: 22 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);
    expect(res.body.failed).toBe(0);
  });

  test('returns 401 when HCM key is missing', async () => {
    const res = await request(app)
      .post('/api/balances/batch')
      .send({ balances: [{ employeeId: 'emp_001', locationId: 'loc_NY', availableDays: 10 }] });

    expect(res.status).toBe(401);
  });

  test('returns 401 when HCM key is wrong', async () => {
    const res = await request(app)
      .post('/api/balances/batch')
      .set({ 'x-hcm-api-key': 'wrong-key' })
      .send({ balances: [{ employeeId: 'emp_001', locationId: 'loc_NY', availableDays: 10 }] });

    expect(res.status).toBe(401);
  });

  test('returns 400 when balances array is empty', async () => {
    const res = await request(app)
      .post('/api/balances/batch')
      .set(hcmHeaders())
      .send({ balances: [] });

    expect(res.status).toBe(400);
  });

  test('simulates anniversary bonus: batch increases balance', async () => {
    // First seed the local DB so there is a starting record
    await request(app)
      .post('/api/balances/sync')
      .set(employeeHeaders('emp_001'))
      .send({ employeeId: 'emp_001', locationId: 'loc_NY' });

    // HCM sends anniversary bonus via batch
    const res = await request(app)
      .post('/api/balances/batch')
      .set(hcmHeaders())
      .send({
        balances: [{ employeeId: 'emp_001', locationId: 'loc_NY', availableDays: 20 }],
      });

    expect(res.status).toBe(200);

    // Confirm local balance is now updated
    const Balance = require('../../src/models/Balance');
    const bal = await Balance.findOne({ employeeId: 'emp_001', locationId: 'loc_NY' });
    expect(bal.availableDays).toBe(20);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Integration: Sync log creation', () => {

  test('sync log is created after a balance sync', async () => {
    await request(app)
      .get('/api/balances/emp_001/loc_NY')
      .set(employeeHeaders('emp_001'));

    const SyncLog = require('../../src/models/SyncLog');
    const logs = await SyncLog.find({ employeeId: 'emp_001', locationId: 'loc_NY' });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].success).toBe(true);
  });
});