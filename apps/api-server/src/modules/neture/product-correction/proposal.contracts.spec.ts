import { randomUUID } from 'node:crypto';
import { proposalSchema, reviewSchema, applySchema } from './proposal.contracts.js';
const id = randomUUID();
const proposal = {
  fingerprint: 'a'.repeat(64),
  evidence: [{ id, kind: 'product-fact', source: '합성 자료', checkedOn: '2026-10-24', fields: ['name'], status: 'confirmed' }],
  changes: [{ field: 'name', after: '상품명', reason: '포장과 대조', evidenceIds: [id] }],
};
describe('상품 변경안 입력 계약', () => {
  it('accepts explicit linked evidence without accepting client approval or baseline values', () => {
    expect(proposalSchema.safeParse(proposal).success).toBe(true);
    for (const extra of [{ decision: 'approved' }, { before: '임의 값' }, { appliedBy: id }]) {
      expect(proposalSchema.safeParse({ ...proposal, changes: [{ ...proposal.changes[0], ...extra }] }).success).toBe(false);
    }
  });
  it.each(['barcode', 'manufacturerName', 'regulatoryType', 'mfdsPermitNumber', 'status', 'categoryId'])('rejects protected/out-of-scope field %s', field => {
    expect(proposalSchema.safeParse({ ...proposal, changes: [{ ...proposal.changes[0], field }] }).success).toBe(false);
  });
  it.each(['2026-02-30', '2999-01-01', 'not-date'])('rejects invalid evidence date %s', checkedOn => {
    expect(proposalSchema.safeParse({ ...proposal, evidence: [{ ...proposal.evidence[0], checkedOn }] }).success).toBe(false);
  });
  it('requires explicit review and apply requests and nonempty selection', () => {
    expect(reviewSchema.safeParse({ revision: 1, note: '검토', decisions: [{ field: 'name', decision: 'approved' }] }).success).toBe(true);
    expect(reviewSchema.safeParse({ revision: 1, note: '', decisions: [] }).success).toBe(false);
    expect(applySchema.safeParse({ revision: 2, fields: [] }).success).toBe(false);
    expect(applySchema.safeParse({ revision: 2, fields: ['name'], overrideConflict: true }).success).toBe(false);
  });
});
