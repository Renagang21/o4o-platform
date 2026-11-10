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
