const request = require('supertest');
const app = require('../../src/app');
const {
  setupTestEnvironment,
  teardownTestEnvironment,
  resetTestState,
  employeeHeaders,
  managerHeaders,
  hcmHeaders,
  futureDate,
} = require('../testHelper');
const store = require('../../mock-hcm/data/store');
const Balance = require('../../src/models/Balance');

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
describe('E2E: Full request lifecycle — submit → approve', () => {

  test('employee submits, manager approves, balance is permanently deducted', async () => {
    // Step 1: Employee checks balance
    const balRes = await request(app)
      .get('/api/balances/emp_001/loc_NY')
      .set(employeeHeaders('emp_001'));
    expect(balRes.body.availableDays).toBe(15);

    // Step 2: Employee submits request for 5 days
    const createRes = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 5, startDate: futureDate(7), endDate: futureDate(12) });

    expect(createRes.status).toBe(201);
    const requestId = createRes.body.request.requestId;

    // Step 3: Verify balance has 5 days locked as pending
    const pendingBal = await Balance.findOne({ employeeId: 'emp_001', locationId: 'loc_NY' });
    expect(pendingBal.pendingDays).toBe(5);
    expect(pendingBal.availableDays).toBe(15); // still 15 until approved

    // Step 4: Manager approves
    const approveRes = await request(app)
      .patch(`/api/time-off/${requestId}/approve`)
      .set(managerHeaders())
      .send({ notes: 'Enjoy your vacation!' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.request.status).toBe('APPROVED');

    // Step 5: Verify balance is now permanently deducted
    const finalBal = await Balance.findOne({ employeeId: 'emp_001', locationId: 'loc_NY' });
    expect(finalBal.availableDays).toBe(10); // 15 - 5
    expect(finalBal.pendingDays).toBe(0);    // lock released
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('E2E: Request lifecycle — submit → reject → re-request', () => {

  test('after rejection, employee can use their restored balance for a new request', async () => {
    // emp_003 only has 5 days
    const createRes = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_003'))
      .send({ locationId: 'loc_NY', days: 5, startDate: futureDate(7), endDate: futureDate(12) });

    expect(createRes.status).toBe(201);
    const requestId = createRes.body.request.requestId;

    // Manager rejects
    await request(app)
      .patch(`/api/time-off/${requestId}/reject`)
      .set(managerHeaders())
      .send({ reason: 'Busy period' });

    // Employee should be able to request again with the restored balance
    const retryRes = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_003'))
      .send({ locationId: 'loc_NY', days: 3, startDate: futureDate(14), endDate: futureDate(17) });

    expect(retryRes.status).toBe(201);
    expect(retryRes.body.request.status).toBe('PENDING');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('E2E: Cancel pending request restores balance', () => {

  test('cancelled pending request makes balance available for new request', async () => {
    // emp_003 has 5 days — use all of them
    const createRes = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_003'))
      .send({ locationId: 'loc_NY', days: 5, startDate: futureDate(7), endDate: futureDate(12) });

    const requestId = createRes.body.request.requestId;

    // Second request should fail — no balance left
    const failRes = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_003'))
      .send({ locationId: 'loc_NY', days: 1, startDate: futureDate(14), endDate: futureDate(15) });

    expect(failRes.status).toBe(422);

    // Cancel the first request
    await request(app)
      .patch(`/api/time-off/${requestId}/cancel`)
      .set(employeeHeaders('emp_003'));

    // Now second request should succeed
    const retryRes = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_003'))
      .send({ locationId: 'loc_NY', days: 1, startDate: futureDate(14), endDate: futureDate(15) });

    expect(retryRes.status).toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('E2E: Anniversary bonus via HCM batch push', () => {

  test('HCM pushes anniversary bonus, employee can use extra days', async () => {
    // emp_003 starts with 5 days — all used up by a pending request
    await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_003'))
      .send({ locationId: 'loc_NY', days: 5, startDate: futureDate(7), endDate: futureDate(12) });

    // Another request fails — no balance
    const failRes = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_003'))
      .send({ locationId: 'loc_NY', days: 1, startDate: futureDate(20), endDate: futureDate(21) });
    expect(failRes.status).toBe(422);

    // HCM grants anniversary bonus of 5 extra days via batch push
    await request(app)
      .post('/api/balances/batch')
      .set(hcmHeaders())
      .send({
        balances: [{ employeeId: 'emp_003', locationId: 'loc_NY', availableDays: 10 }],
      });

    // Now employee can use the bonus days
    const bonusRes = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_003'))
      .send({ locationId: 'loc_NY', days: 1, startDate: futureDate(20), endDate: futureDate(21) });

    expect(bonusRes.status).toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('E2E: Year-end reset via HCM batch push', () => {

  test('year-end reset gives all employees fresh balance', async () => {
    // Use up some of emp_001 balance
    await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 10, startDate: futureDate(7), endDate: futureDate(17) });

    // HCM sends year-end reset — everyone gets 20 days
    await request(app)
      .post('/api/balances/batch')
      .set(hcmHeaders())
      .send({
        balances: [
          { employeeId: 'emp_001', locationId: 'loc_NY', availableDays: 20 },
          { employeeId: 'emp_002', locationId: 'loc_NY', availableDays: 20 },
          { employeeId: 'emp_003', locationId: 'loc_NY', availableDays: 20 },
        ],
      });

    // emp_001 can now request more days again
    const res = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 8, startDate: futureDate(30), endDate: futureDate(38) });

    expect(res.status).toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('E2E: Health check', () => {

  test('returns 200 with service info', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('time-off-microservice');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('E2E: Multiple requests within available balance', () => {

  test('two separate requests that together stay within balance both succeed', async () => {
    // emp_001 has 15 days. Request 6 + 6 = 12 days total. Should both succeed.
    const res1 = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 6, startDate: futureDate(7), endDate: futureDate(13) });

    const res2 = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 6, startDate: futureDate(20), endDate: futureDate(26) });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    const bal = await Balance.findOne({ employeeId: 'emp_001', locationId: 'loc_NY' });
    expect(bal.pendingDays).toBe(12);
  });

  test('third request that would exceed balance is rejected', async () => {
    await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 8, startDate: futureDate(7), endDate: futureDate(15) });

    await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 6, startDate: futureDate(20), endDate: futureDate(26) });

    // 8 + 6 = 14 used, only 1 left, trying to request 2
    const res3 = await request(app)
      .post('/api/time-off/request')
      .set(employeeHeaders('emp_001'))
      .send({ locationId: 'loc_NY', days: 2, startDate: futureDate(30), endDate: futureDate(32) });

    expect(res3.status).toBe(422);
  });
});