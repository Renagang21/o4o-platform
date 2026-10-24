import { certificateRenewalExpiry } from '../modules/lms/services/certificate-renewal-expiry';

describe('certificate renewal preserves the existing calendar rule', () => {
  it.each([
    [2026, 0, 31, 1, 2026, 2, 3],
    [2024, 0, 31, 1, 2024, 2, 2],
    [2024, 1, 29, 12, 2025, 2, 1],
    [2026, 11, 15, 2, 2027, 1, 15],
  ])('%i/%i/%i plus %i months', (year, month, day, months, endYear, endMonth, endDay) => {
    const now = new Date(year, month, day, 13, 24, 35, 123);
    const original = now.getTime();
    const expiry = certificateRenewalExpiry(months, now);
    expect(expiry).toEqual(new Date(endYear, endMonth, endDay, 13, 24, 35, 123));
    expect(now.getTime()).toBe(original);
  });
});
