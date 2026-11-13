import { describe, expect, it } from 'vitest';
import { erasureStatus } from './member-workspace-model';

describe('member list erasure status (2026-11-10)', () => {
  it('shows an unfinished deletion instead of the stopped service status', () => {
    expect(erasureStatus('review_required')?.label).toBe('삭제 확인 필요');
    expect(erasureStatus('retry_required')?.label).toBe('삭제 재시도 필요');
    expect(erasureStatus('pending')?.label).toBe('삭제 중');
    expect(erasureStatus('processing')?.label).toBe('삭제 중');
  });
  it('falls back to the service status when no deletion is open', () => {
    expect(erasureStatus(null)).toBeNull();
    expect(erasureStatus(undefined)).toBeNull();
    expect(erasureStatus('completed')).toBeNull();
  });
});

describe('erasure stop reason (2026-11-13)', () => {
  it('names the table a pre-deletion review stopped on instead of a generic retry message', async () => {
    const { deletionMessage } = await import('../platform/account-governance/AccountErasureControls');
    const message = deletionMessage('REVIEW:public.example_table');
    expect(message).toContain('example_table');
    expect(message).not.toBe('삭제를 완료하지 못했습니다. 다시 시도해 주시기 바랍니다.');
    expect(deletionMessage('ERASURE_RESIDUAL_REVIEW_REQUIRED')).toContain('되돌렸습니다');
    expect(deletionMessage(undefined)).toBe('삭제를 완료하지 못했습니다. 다시 시도해 주시기 바랍니다.');
  });
});
