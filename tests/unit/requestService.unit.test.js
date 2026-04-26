const {
  validateRequestInput,
  generateRequestId,
} = require('../../src/services/requestService');

describe('Unit: validateRequestInput', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);

  const validInput = {
    days: 3,
    startDate: tomorrow.toISOString(),
    endDate: dayAfter.toISOString(),
  };

  test('returns no errors for a valid input', () => {
    const errors = validateRequestInput(validInput);
    expect(errors).toHaveLength(0);
  });

  test('rejects days less than 0.5', () => {
    const errors = validateRequestInput({ ...validInput, days: 0.4 });
    expect(errors).toContain('days must be at least 0.5');
  });

  test('rejects missing days (0)', () => {
    const errors = validateRequestInput({ ...validInput, days: 0 });
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects a startDate in the past', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const errors = validateRequestInput({ ...validInput, startDate: yesterday.toISOString() });
    expect(errors).toContain('startDate must be today or in the future');
  });

  test('rejects endDate before startDate', () => {
    const errors = validateRequestInput({
      ...validInput,
      startDate: dayAfter.toISOString(),
      endDate: tomorrow.toISOString(),
    });
    expect(errors).toContain('endDate must be on or after startDate');
  });

  test('rejects an invalid date string', () => {
    const errors = validateRequestInput({ ...validInput, startDate: 'not-a-date' });
    expect(errors).toContain('startDate is invalid');
  });

  test('allows startDate equal to endDate (same-day leave)', () => {
    const errors = validateRequestInput({
      ...validInput,
      startDate: tomorrow.toISOString(),
      endDate: tomorrow.toISOString(),
    });
    expect(errors).toHaveLength(0);
  });

  test('allows half-day (0.5 days)', () => {
    const errors = validateRequestInput({ ...validInput, days: 0.5 });
    expect(errors).toHaveLength(0);
  });

  test('returns multiple errors when multiple fields are invalid', () => {
    const errors = validateRequestInput({ days: 0, startDate: 'bad', endDate: 'bad' });
    expect(errors.length).toBeGreaterThan(1);
  });
});

describe('Unit: generateRequestId', () => {
  test('generates a string starting with REQ-', () => {
    const id = generateRequestId();
    expect(id).toMatch(/^REQ-\d{8}-[A-Z0-9]{4}$/);
  });

  test('generates unique IDs on each call', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateRequestId()));
    expect(ids.size).toBe(50);
  });
});