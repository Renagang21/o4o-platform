import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../lib/apiClient', () => ({ api: { get, post } }));
import CreationRequestsPanel from '../community/CreationRequestsPanel';
const row = {
  id: 'request-fixture',
  requesterUserId: 'fixture-user',
  desiredSlug: 'fixture',
  name: '검증 커뮤니티',
  description: null,
  status: 'pending',
  createdAt: '2026-10-15T00:00:00Z',
};
const ok = (data: unknown) => ({ data: { success: true, data } });
const failure = { response: { data: { error: '검증 서버 장애' } } };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
async function rejectDraft(reason = '보완 후 신청해주세요') {
  fireEvent.click(
    await screen.findByRole('button', { name: '거절' }),
  );
  fireEvent.change(screen.getByLabelText('거절 사유'), {
    target: { value: reason },
  });
}
beforeEach(() => {
  get.mockReset().mockResolvedValue(ok({ requests: [row] }));
  post.mockReset().mockResolvedValue(ok({ outcome: 'created' }));
});
afterEach(cleanup);
describe('community creation review recovery', () => {
  it('keeps read failure separate from an empty result and retries', async () => {
    get.mockRejectedValueOnce(failure);
    render(<CreationRequestsPanel />);
    expect((await screen.findByRole('alert')).textContent).toContain(
      '검증 서버 장애',
    );
    expect(
      screen.queryByText('심사 대기 중인 개설 신청이 없습니다.'),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
    await screen.findByText('검증 커뮤니티');
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it.each([
    { success: false, error: '응답 거부' },
    { success: true, data: {} },
  ])(
    'does not turn invalid successful HTTP responses into an empty list: %j',
    async (data) => {
      get.mockResolvedValueOnce({ data });
      render(<CreationRequestsPanel />);
      await screen.findByRole('alert');
      expect(
        screen.queryByText('심사 대기 중인 개설 신청이 없습니다.'),
      ).toBeNull();
    },
  );
  it('retains rejection target and reason after failure and retries the same request', async () => {
    post.mockRejectedValueOnce(failure);
    render(<CreationRequestsPanel />);
    await rejectDraft();
    fireEvent.click(screen.getByRole('button', { name: '반려 확인' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      '검증 서버 장애',
    );
    expect(
      (screen.getByLabelText('거절 사유') as HTMLTextAreaElement).value,
    ).toBe('보완 후 신청해주세요');
    expect(screen.getByRole('dialog').textContent).toContain('검증 커뮤니티');
    get.mockResolvedValueOnce(ok({ requests: [] }));
    fireEvent.click(screen.getByRole('button', { name: '반려 확인' }));
    await screen.findByText('심사 대기 중인 개설 신청이 없습니다.');
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/communities/requests/request-fixture/reject',
      { reason: '보완 후 신청해주세요' },
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('validates blank reasons and cancels without sending a mutation', async () => {
    render(<CreationRequestsPanel />);
    await rejectDraft('   ');
    fireEvent.click(screen.getByRole('button', { name: '반려 확인' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      '거절 사유가 필요',
    );
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(post).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('guards duplicate form submissions until the post-save read finishes', async () => {
    const write = deferred<ReturnType<typeof ok>>();
    post.mockReturnValueOnce(write.promise);
    render(<CreationRequestsPanel />);
    await rejectDraft();
    const form = screen.getByLabelText('거절 사유').closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(post).toHaveBeenCalledTimes(1);
    const read = deferred<ReturnType<typeof ok>>();
    get.mockReturnValueOnce(read.promise);
    await act(async () => write.resolve(ok({})));
    expect(screen.getByText('불러오는 중입니다…')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: '승인' }),
    ).toBeNull();
    await act(async () => read.resolve(ok({ requests: [] })));
    await screen.findByText('심사 대기 중인 개설 신청이 없습니다.');
  });
  it('retains save success when refresh fails and retries only the read', async () => {
    render(<CreationRequestsPanel />);
    const approve = await screen.findByRole('button', {
      name: '승인',
      });
    get.mockRejectedValueOnce(failure);
    fireEvent.click(approve);
    await screen.findByText(
      '처리는 완료했지만 최신 목록을 확인하지 못했습니다.',
    );
    expect(screen.getByRole('status').textContent).toContain('개설했습니다');
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
    await screen.findByText('검증 커뮤니티');
    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('preserves slug-conflict outcome from the server', async () => {
    post.mockResolvedValueOnce(ok({ outcome: 'slug_conflict' }));
    render(<CreationRequestsPanel />);
    fireEvent.click(
      await screen.findByRole('button', { name: '승인' }),
    );
    expect((await screen.findByRole('status')).textContent).toContain(
      '재신청을 요청했습니다',
    );
  });
  it('does not read again when an in-flight action completes after unmount', async () => {
    const pending = deferred<ReturnType<typeof ok>>();
    post.mockReturnValueOnce(pending.promise);
    const view = render(<CreationRequestsPanel />);
    fireEvent.click(
      await screen.findByRole('button', { name: '승인' }),
    );
    view.unmount();
    await act(async () => pending.resolve(ok({ outcome: 'created' })));
    expect(get).toHaveBeenCalledTimes(1);
  });
});
