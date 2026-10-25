import { bulkSchema, scheduleSchema, controlSchema, renewalSchema } from './periodic.contracts.js';
const id = '00000000-0000-4000-8000-000000000001';
it('requires an explicit admin schedule, Korean timezone and bounded interval', () => {
  const value = {
    revision: 0,
    enabled: false,
    intervalDays: 30,
    timeZone: 'Asia/Seoul',
    nextDueAt: '2030-01-01T00:00:00Z',
  };
  expect(scheduleSchema.safeParse(value).success).toBe(true);
  expect(scheduleSchema.safeParse({ ...value, timeZone: 'UTC' }).success).toBe(false);
  expect(scheduleSchema.safeParse({ ...value, intervalDays: 0 }).success).toBe(false);
  expect(scheduleSchema.safeParse({ ...value, intervalDays: 366 }).success).toBe(false);
  expect(scheduleSchema.safeParse({ ...value, autoApply: true }).success).toBe(false);
});
it('bounds manual bulk inputs and does not accept executable conditions or auto-apply commands', () => {
  expect(bulkSchema.safeParse({ ruleId: id, revision: 1, search: '' }).success).toBe(true);
  expect(
    bulkSchema.safeParse({ ruleId: id, revision: 1, search: '', sql: 'anything' }).success,
  ).toBe(false);
  expect(controlSchema.safeParse({ revision: 1, action: 'apply' }).success).toBe(false);
});
it('requires a source fingerprint, purpose and review note before closing a renewal', () => {
  const value = {
    revision: 1,
    fingerprint: 'a'.repeat(64),
    state: 'done',
    purposes: ['consumer-qr'],
    notes: '확인',
  };
  expect(renewalSchema.safeParse(value).success).toBe(true);
  expect(renewalSchema.safeParse({ ...value, notes: '' }).success).toBe(false);
  expect(renewalSchema.safeParse({ ...value, purposes: [] }).success).toBe(false);
  expect(renewalSchema.safeParse({ ...value, publish: true }).success).toBe(false);
});
