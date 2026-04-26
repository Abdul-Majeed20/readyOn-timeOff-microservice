const store = require('../../mock-hcm/data/store');

beforeEach(() => {
  store.reset();
});

describe('Unit: HCM Store — getBalance', () => {
  test('returns balance for a known employee+location', () => {
    const record = store.getBalance('emp_001', 'loc_NY');
    expect(record).not.toBeNull();
    expect(record.availableDays).toBe(15);
  });

  test('returns null for unknown combination', () => {
    const record = store.getBalance('emp_999', 'loc_UNKNOWN');
    expect(record).toBeNull();
  });
});

describe('Unit: HCM Store — deduct', () => {
  test('deducts days when balance is sufficient', () => {
    const result = store.deduct('emp_001', 'loc_NY', 5);
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(10);
  });

  test('returns INSUFFICIENT_BALANCE when not enough days', () => {
    const result = store.deduct('emp_001', 'loc_NY', 100);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('INSUFFICIENT_BALANCE');
  });

  test('returns NOT_FOUND for unknown employee', () => {
    const result = store.deduct('emp_999', 'loc_NY', 1);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('NOT_FOUND');
  });

  test('allows deducting entire balance (exact amount)', () => {
    const result = store.deduct('emp_003', 'loc_NY', 5); // emp_003 has 5
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(0);
  });

  test('fails when balance is zero', () => {
    const result = store.deduct('emp_004', 'loc_NY', 1); // emp_004 has 0
    expect(result.success).toBe(false);
    expect(result.reason).toBe('INSUFFICIENT_BALANCE');
  });
});

describe('Unit: HCM Store — restore', () => {
  test('restores days back to balance', () => {
    store.deduct('emp_001', 'loc_NY', 5); // 15 → 10
    const result = store.restore('emp_001', 'loc_NY', 5); // 10 → 15
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(15);
  });

  test('creates record if employee not found (edge case)', () => {
    const result = store.restore('emp_new', 'loc_NY', 3);
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(3);
  });
});

describe('Unit: HCM Store — seed and reset', () => {
  test('seed overwrites existing balances', () => {
    store.seed([{ employeeId: 'emp_001', locationId: 'loc_NY', availableDays: 99 }]);
    expect(store.getBalance('emp_001', 'loc_NY').availableDays).toBe(99);
  });

  test('reset restores default balances', () => {
    store.seed([{ employeeId: 'emp_001', locationId: 'loc_NY', availableDays: 99 }]);
    store.reset();
    expect(store.getBalance('emp_001', 'loc_NY').availableDays).toBe(15);
  });

  test('getAllBalances returns all seeded records', () => {
    const all = store.getAllBalances();
    expect(all.length).toBeGreaterThanOrEqual(5);
  });
});