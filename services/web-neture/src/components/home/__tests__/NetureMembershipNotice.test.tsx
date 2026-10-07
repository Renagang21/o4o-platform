/**
 * CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 E5
 *
 * AI 입력창 자리의 Neture 가입 상태 안내.
 *   - none     → "Neture 가입 승인이 필요합니다" + 가입 신청
 *   - pending  → "가입 승인 대기 중입니다" (신청 버튼 없음)
 *   - rejected → 반려 안내 + 다시 신청
 *   - suspended · withdrawn → 안내만 (신청 버튼 없음)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const post = vi.fn();
vi.mock('../../../lib/apiClient', () => ({ api: { post: (...a: unknown[]) => post(...a) } }));

import { NetureMembershipNotice } from '../NetureMembershipNotice';

describe('NetureMembershipNotice', () => {
  afterEach(() => {
    cleanup();
    post.mockReset();
  });

  it('none — 승인 필요 안내 + 가입 신청 → 신청 후 상태 재조회', async () => {
    post.mockResolvedValue({ data: { success: true } });
    const onApplied = vi.fn();
    render(<NetureMembershipNotice status="none" onApplied={onApplied} />);
    expect(screen.getByText('Neture 가입 승인이 필요합니다')).toBeTruthy();
    fireEvent.click(screen.getByTestId('home-neture-membership-apply'));
    await waitFor(() => expect(onApplied).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith('/auth/services/neture/join');
  });

  it('pending — 대기 안내, 신청 버튼 없음', () => {
    render(<NetureMembershipNotice status="pending" onApplied={vi.fn()} />);
    expect(screen.getByText('가입 승인 대기 중입니다')).toBeTruthy();
    expect(screen.queryByTestId('home-neture-membership-apply')).toBeNull();
  });

  it('rejected — 다시 신청 가능', () => {
    render(<NetureMembershipNotice status="rejected" onApplied={vi.fn()} />);
    expect(screen.getByText('Neture 가입이 반려되었습니다')).toBeTruthy();
    expect(screen.getByTestId('home-neture-membership-apply').textContent).toBe('다시 신청하기');
  });

  it.each(['suspended', 'withdrawn'] as const)('%s — 안내만, 신청 버튼 없음', (status) => {
    render(<NetureMembershipNotice status={status} onApplied={vi.fn()} />);
    expect(screen.getByTestId('home-neture-membership-notice').getAttribute('data-status')).toBe(status);
    expect(screen.queryByTestId('home-neture-membership-apply')).toBeNull();
  });

  it('신청 실패는 서버 메시지를 보이고 재조회하지 않는다', async () => {
    post.mockRejectedValue({ response: { data: { error: '이미 신청했습니다.' } } });
    const onApplied = vi.fn();
    render(<NetureMembershipNotice status="none" onApplied={onApplied} />);
    fireEvent.click(screen.getByTestId('home-neture-membership-apply'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('이미 신청했습니다.'));
    expect(onApplied).not.toHaveBeenCalled();
  });
});
