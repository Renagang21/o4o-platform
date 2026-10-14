import { describe, expect, it } from 'vitest';
import { getServiceApprovalDecisionOutcome } from '../serviceApprovalDecisionResult';

describe('service approval decision outcomes', () => {
  it.each(['approve', 'reject'] as const)('keeps %s API failure separate from success', decision => {
    const outcome = getServiceApprovalDecisionOutcome(decision, { success: false, error: 'NETWORK_ERROR' }, false);
    expect(outcome.kind).toBe('failure');
    expect(outcome.message).toContain('입력 내용을 유지');
    expect(outcome.message).not.toContain('NETWORK_ERROR');
  });
  it.each(['approve', 'reject'] as const)('accepts a successful single %s', decision => {
    expect(getServiceApprovalDecisionOutcome(decision, { success: true }, false).kind).toBe('success');
  });
  it.each(['approve', 'reject'] as const)('distinguishes partial %s counts', decision => {
    const data = decision === 'approve' ? { approved: 2, failed: 1 } : { rejected: 2, failed: 1 };
    const outcome = getServiceApprovalDecisionOutcome(decision, { success: true, data }, true);
    expect(outcome.kind).toBe('partial');
    expect(outcome.message).toContain('2건 완료, 1건 실패');
    expect(outcome.message).toContain('다시 선택');
  });
  it.each(['approve', 'reject'] as const)('does not report all-failed %s as completed', decision => {
    const data = decision === 'approve' ? { approved: 0, failed: 3 } : { rejected: 0, failed: 3 };
    const outcome = getServiceApprovalDecisionOutcome(decision, { success: true, data }, true);
    expect(outcome.kind).toBe('failure');
    expect(outcome.message).toContain('3건');
    expect(outcome.message).toContain('선택과 입력을 유지');
  });
  it.each(['approve', 'reject'] as const)('reports all-successful batch %s', decision => {
    const data = decision === 'approve' ? { approved: 3, failed: 0 } : { rejected: 3, failed: 0 };
    expect(getServiceApprovalDecisionOutcome(decision, { success: true, data }, true).kind).toBe('success');
  });
  it('preserves the optional data success contract', () => {
    expect(getServiceApprovalDecisionOutcome('approve', { success: true }, true).kind).toBe('success');
  });
});
