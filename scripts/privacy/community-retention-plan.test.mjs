import test from 'node:test';
import assert from 'node:assert/strict';
import { retentionAnniversary, planCommunityRetention, evaluateErasureCompletion } from './community-retention-plan.mjs';

test('calendar year crosses leap day without using a 365-day cutoff', () => {
  assert.equal(retentionAnniversary('2023-03-01T00:00:00Z', 1), '2024-03-01T00:00:00.000Z');
  assert.equal(retentionAnniversary('2024-02-29T00:00:00Z', 1), '2025-03-01T00:00:00.000Z');
  assert.equal(retentionAnniversary('2024-02-29T00:00:00Z', 2), '2026-03-01T00:00:00.000Z');
});
test('Korean date boundary, not UTC date, decides the leap-day anniversary', () => {
  assert.equal(retentionAnniversary('2024-02-28T15:00:00.123Z', 1), '2025-02-28T15:00:00.123Z');
  assert.equal(retentionAnniversary('2024-02-29T15:00:00.123Z', 1), '2025-02-28T15:00:00.123Z');
});
for (const [now, decision] of [
  ['2024-02-29T23:59:59.999Z', 'retain-minimum'],
  ['2024-03-01T00:00:00Z', 'expire-history-only'],
  ['2024-03-01T00:00:00.001Z', 'expire-history-only'],
]) test(`one-year expiry boundary ${now}`, () => {
  assert.equal(planCommunityRetention({ createdAt: '2023-03-01T00:00:00Z', now, classification: 'calendar-one-year' }).decision, decision);
});
test('two-year classification requires a basis and preserves the second year', () => {
  const record = { createdAt: '2023-03-01T00:00:00Z', now: '2024-03-01T00:00:00Z', classification: 'statutory-two-years' };
  assert.equal(planCommunityRetention(record).code, 'LEGAL_BASIS_REQUIRED');
  assert.equal(planCommunityRetention({ ...record, legalBasis: 'reviewed-system-classification' }).decision, 'retain-minimum');
});
test('restoration and rejoining never alter the original record anniversary', () => {
  assert.equal(planCommunityRetention({ createdAt: '2023-03-01T00:00:00Z', now: '2025-03-01T00:00:00Z',
    classification: 'calendar-one-year', rejoinedAt: '2025-02-28T00:00:00Z', restoredAt: '2025-02-28T00:00:00Z' }).decision, 'expire-history-only');
});
test('missing, impossible, future and non-UTC anchors need review', () => {
  for (const createdAt of [null, '', '2024-02-30T00:00:00Z', '2026-10-13T00:00:00Z', '2024-01-01']) {
    assert.equal(planCommunityRetention({ createdAt, now: '2026-10-12T00:00:00Z', classification: 'calendar-one-year' }).code, 'INVALID_ANCHOR');
  }
  assert.equal(planCommunityRetention({ createdAt: '2024-01-01T00:00:00Z', now: '2026-10-12T00:00:00Z' }).code, 'CLASSIFICATION_REQUIRED');
});
test('expired review dates or undocumented holds are never automatic extensions', () => {
  const record = { createdAt: '2023-03-01T00:00:00Z', now: '2025-03-01T00:00:00Z', classification: 'calendar-one-year' };
  assert.equal(planCommunityRetention({ ...record, hold: { endEvent: 'dispute-closed' } }).code, 'HOLD_REVIEW_REQUIRED');
  assert.equal(planCommunityRetention({ ...record, hold: { basis: 'reviewed', owner: 'responsible-role', endEvent: 'dispute-closed', reviewAt: '2025-02-28T00:00:00Z' } }).code, 'HOLD_REVIEW_REQUIRED');
});
test('ended dispute still respects baseline; expiry only applies to history', () => {
  const hold = { basis: 'reviewed', owner: 'responsible-role', endEvent: 'dispute-closed', reviewAt: '2025-04-01T00:00:00Z', ended: true };
  assert.equal(planCommunityRetention({ createdAt: '2025-01-01T00:00:00Z', now: '2025-03-01T00:00:00Z', classification: 'calendar-one-year', hold }).decision, 'retain-minimum');
  assert.equal(planCommunityRetention({ createdAt: '2023-01-01T00:00:00Z', now: '2025-03-01T00:00:00Z', classification: 'calendar-one-year', hold }).decision, 'expire-history-only');
});
test('file retry, unverified sessions, residual references and legacy deactivation cannot be completion', () => {
  const complete = { manifestVerified: true, databaseVerified: true, sessionsVerified: true, legalRecordsSeparated: true, personalFiles: [{ status: 'deleted' }, { status: 'already-absent' }], unresolvedReferences: [] };
  assert.deepEqual(evaluateErasureCompletion(complete), { state: 'completed', erased: true });
  for (const patch of [
    { manifestVerified: false }, { databaseVerified: false }, { sessionsVerified: false }, { legalRecordsSeparated: false },
    { personalFiles: [{ status: 'retry-required' }] }, { unresolvedReferences: ['unclassified-json'] },
    { deactivated: true, databaseVerified: false }, { personalFiles: undefined }, { personalFiles: [null] },
  ]) assert.deepEqual(evaluateErasureCompletion({ ...complete, ...patch }), { state: 'incomplete', erased: false });
});
