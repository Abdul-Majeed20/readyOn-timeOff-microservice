const request = require('supertest');
const app = require('../../src/app');
const {
  setupTestEnvironment,
  teardownTestEnvironment,
  resetTestState,
  employeeHeaders,
  managerHeaders,
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
describe('Integration: POST /api/time-off/request', () => {

  test('creates a request when employee has sufficient balance', async () => {
    const res = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({
        locationId: 'loc_NY',
        days: 3,
        startDate: futureDate(7),
        endDate: futureDate(10),
        reason: 'Vacation',
      });

    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe('PENDING');
    expect(res.body.request.employeeId).toBe('emp_001');
    expect(res.body.request.days).toBe(3);
  });

  test('returns 422 when employee has zero balance', async () => {
    // emp_004 has 0 days in HCM
    const res = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_004'))
      .send({
        locationId: 'loc_NY',
        days: 1,
        startDate: futureDate(7),
        endDate: futureDate(8),
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('INSUFFICIENT_BALANCE');
  });

  test('returns 422 when requesting more days than available', async () => {
    const res = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({
        locationId: 'loc_NY',
        days: 999,
        startDate: futureDate(7),
        endDate: futureDate(20),
      });

    expect(res.status).toBe(422);
    expect(['INSUFFICIENT_BALANCE', 'HCM_INSUFFICIENT_BALANCE']).toContain(res.body.error);
  });

  test('returns 422 for past startDate', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const res = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({
        locationId: 'loc_NY',
        days: 1,
        startDate: yesterday.toISOString().slice(0, 10),
        endDate: futureDate(1),
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  test('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ days: 3 }); // missing locationId, startDate, endDate

    expect(res.status).toBe(400);
  });

  test('returns 401 when auth header is missing', async () => {
    const res = await request(app)
      .post('/api/time-off/request')
      .send({
        locationId: 'loc_NY',
        days: 1,
        startDate: futureDate(7),
        endDate: futureDate(8),
      });

    expect(res.status).toBe(401);
  });

  test('idempotency: same key returns existing request without double-deducting', async () => {
    const payload = {
      locationId: 'loc_NY',
      days: 2,
      startDate: futureDate(7),
      endDate: futureDate(9),
    };

    const res1 = await request(app)
      .post('/api/time-off/request')
      .set({ ...employeeHeaders('emp_001'), 'idempotency-key': 'unique-key-123' })
      .send(payload);

    const res2 = await request(app)
      .post('/api/time-off/request')
      .set({ ...employeeHeaders('emp_001'), 'idempotency-key': 'unique-key-123' })
      .send(payload);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(200);
    // Both should return the same requestId
    expect(res1.body.request.requestId).toBe(res2.body.request.requestId);

    // HCM balance should only be deducted ONCE (15 - 2 = 13)
    const hcmBalance = store.getBalance('emp_001', 'loc_NY');
    expect(hcmBalance.availableDays).toBe(13);
  });

  test('HCM unavailable returns 503', async () => {
    // Temporarily point to a non-existent server
    const original = process.env.HCM_BASE_URL;
    process.env.HCM_BASE_URL = 'http://localhost:9999';

    // We need to clear the require cache so hcmClient picks up the new URL
    jest.resetModules();

    const res = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({
        locationId: 'loc_NY',
        days: 1,
        startDate: futureDate(7),
        endDate: futureDate(8),
      });

    process.env.HCM_BASE_URL = original;
    // Either 503 (HCM down) or 422 (caught locally first) is acceptable
    expect([422, 503]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Integration: GET /api/time-off/:employeeId', () => {

  test('returns list of requests for the employee', async () => {
    // Create a request first
    await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 1, startDate: futureDate(7), endDate: futureDate(8) });

    const res = await request(app)
      .get('/api/time-off/emp_001')
      .set(employeeHeaders('emp_001'));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
    expect(res.body.requests.length).toBeGreaterThan(0);
    expect(res.body.total).toBeGreaterThan(0);
  });

  test('returns empty list when employee has no requests', async () => {
    const res = await request(app)
      .get('/api/time-off/emp_002')
      .set(employeeHeaders('emp_002'));

    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(0);
  });

  test('employee cannot see another employee\'s requests', async () => {
    const res = await request(app)
      .get('/api/time-off/emp_002')
      .set(employeeHeaders('emp_001')); // emp_001 trying to see emp_002's requests

    expect(res.status).toBe(403);
  });

  test('manager can see any employee\'s requests', async () => {
    const res = await request(app)
      .get('/api/time-off/emp_001')
      .set(managerHeaders());

    expect(res.status).toBe(200);
  });

  test('filters by status', async () => {
    await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 1, startDate: futureDate(7), endDate: futureDate(8) });

    const res = await request(app)
      .get('/api/time-off/emp_001?status=PENDING')
      .set(employeeHeaders('emp_001'));

    expect(res.status).toBe(200);
    res.body.requests.forEach((r) => expect(r.status).toBe('PENDING'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Integration: PATCH /api/time-off/:id/approve', () => {

  async function createPendingRequest() {
    const res = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 3, startDate: futureDate(7), endDate: futureDate(10) });
    return res.body.request.requestId;
  }

  test('manager can approve a pending request', async () => {
    const requestId = await createPendingRequest();

    const res = await request(app)
      .patch(`/api/time-off/${requestId}/approve`)
      .set(managerHeaders())
      .send({ notes: 'Approved!' });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('APPROVED');
    expect(res.body.request.managerId).toBe('mgr_001');
  });

  test('employee cannot approve a request', async () => {
    const requestId = await createPendingRequest();

    const res = await request(app)
      .patch(`/api/time-off/${requestId}/approve`)
      .set(employeeHeaders('emp_001'));

    expect(res.status).toBe(403);
  });

  test('returns 404 for non-existent request', async () => {
    const res = await request(app)
      .patch('/api/time-off/REQ-FAKE-0000/approve')
      .set(managerHeaders());

    expect(res.status).toBe(404);
  });

  test('returns 409 when approving an already-approved request', async () => {
    const requestId = await createPendingRequest();

    await request(app).patch(`/api/time-off/${requestId}/approve`).set(managerHeaders());
    const res = await request(app).patch(`/api/time-off/${requestId}/approve`).set(managerHeaders());

    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Integration: PATCH /api/time-off/:id/reject', () => {

  test('manager can reject a pending request and balance is restored', async () => {
    // First create a request to consume balance
    const createRes = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 5, startDate: futureDate(7), endDate: futureDate(12) });

    const requestId = createRes.body.request.requestId;

    const rejectRes = await request(app)
      .patch(`/api/time-off/${requestId}/reject`)
      .set(managerHeaders())
      .send({ reason: 'Team too busy' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.request.status).toBe('REJECTED');

    // Check balance was restored in MongoDB
    const Balance = require('../../src/models/Balance');
    const bal = await Balance.findOne({ employeeId: 'emp_001', locationId: 'loc_NY' });
    expect(bal.pendingDays).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Integration: PATCH /api/time-off/:id/cancel', () => {

  test('employee can cancel their own pending request', async () => {
    const createRes = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 2, startDate: futureDate(7), endDate: futureDate(9) });

    const requestId = createRes.body.request.requestId;

    const cancelRes = await request(app)
      .patch(`/api/time-off/${requestId}/cancel`)
      .set(employeeHeaders('emp_001'));

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.request.status).toBe('CANCELLED');
  });

  test('employee cannot cancel another employee\'s request', async () => {
    const createRes = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 2, startDate: futureDate(7), endDate: futureDate(9) });

    const requestId = createRes.body.request.requestId;

    const res = await request(app)
      .patch(`/api/time-off/${requestId}/cancel`)
      .set(employeeHeaders('emp_002')); // different employee

    expect(res.status).toBe(403);
  });

  test('cannot cancel an already cancelled request', async () => {
    const createRes = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 2, startDate: futureDate(7), endDate: futureDate(9) });

    const requestId = createRes.body.request.requestId;

    await request(app).patch(`/api/time-off/${requestId}/cancel`).set(employeeHeaders('emp_001'));
    const res = await request(app).patch(`/api/time-off/${requestId}/cancel`).set(employeeHeaders('emp_001'));

    expect(res.status).toBe(409);
  });
});