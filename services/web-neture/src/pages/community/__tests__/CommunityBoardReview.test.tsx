import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('../../../lib/apiClient', () => ({ api: { get, patch } }));
import CommunityBoardReview from '../CommunityBoardReview';

const request = { id: 'r1', name: '테스트 게시판', requesterName: '테스트 신청자' };
const ok = (data: unknown) => ({ data: { success: true, data } });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('CommunityBoardReview', () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue(ok([request]));
    patch.mockReset().mockResolvedValue(ok({}));
  });
  afterEach(cleanup);

  it('최초 조회가 끝나기 전에 빈 목록으로 안내하지 않는다', async () => {
    const pending = deferred<ReturnType<typeof ok>>();
    get.mockReturnValue(pending.promise);
    render(<CommunityBoardReview communityKey="alpha" />);
    expect(screen.getByRole('status').textContent).toContain('불러오는 중');
    expect(screen.queryByText('대기 중인 신청이 없습니다.')).toBeNull();
    await act(async () => pending.resolve(ok([])));
    expect(await screen.findByText('대기 중인 신청이 없습니다.')).toBeTruthy();
  });

  it('조회 실패는 오류로 안내하고 재시도 성공 시 지운다', async () => {
    get.mockRejectedValueOnce(new Error('offline'));
    render(<CommunityBoardReview communityKey="alpha" />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('대기 중인 신청이 없습니다.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '목록 다시 불러오기' }));
    await screen.findByText(request.name);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(get).toHaveBeenLastCalledWith('/communities/alpha/board-requests?review=true');
  });

  it('목록 응답 형식 오류를 빈 목록 성공으로 처리하지 않는다', async () => {
    get.mockResolvedValue(ok({}));
    render(<CommunityBoardReview communityKey="alpha" />);
    await screen.findByRole('alert');
    expect(screen.queryByText('대기 중인 신청이 없습니다.')).toBeNull();
  });

  it('승인 처리 중 중복 요청을 막고 성공 안내와 목록 갱신을 제공한다', async () => {
    const pending = deferred<ReturnType<typeof ok>>();
    patch.mockReturnValue(pending.promise);
    get.mockResolvedValueOnce(ok([request])).mockResolvedValue(ok([]));
    render(<CommunityBoardReview communityKey="alpha" />);
    const approve = await screen.findByRole('button', { name: '승인' });
    fireEvent.click(approve);
    fireEvent.click(approve);
    expect(patch).toHaveBeenCalledTimes(1);
    expect((screen.getByRole('button', { name: '승인 중…' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '반려' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => pending.resolve(ok({})));
    await screen.findByText(/신청을 승인했습니다/);
    expect(await screen.findByText('대기 중인 신청이 없습니다.')).toBeTruthy();
    expect(get).toHaveBeenCalledTimes(2);
    expect(patch).toHaveBeenCalledWith('/communities/alpha/board-requests/r1', { action: 'approve' });
  });

  it('반려 취소는 변경하지 않고 버튼으로 초점을 돌린다', async () => {
    render(<CommunityBoardReview communityKey="alpha" />);
    const reject = await screen.findByRole('button', { name: '반려' });
    fireEvent.click(reject);
    expect(document.activeElement).toBe(screen.getByLabelText('반려 사유 (선택)'));
    fireEvent.change(screen.getByLabelText('반려 사유 (선택)'), { target: { value: '취소할 사유' } });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(patch).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(reject);
    fireEvent.click(reject);
    expect((screen.getByLabelText('반려 사유 (선택)') as HTMLTextAreaElement).value).toBe('');
  });

  it('반려 확정 시 사유를 trim하여 기존 reviewComment로 전송한다', async () => {
    get.mockResolvedValueOnce(ok([request])).mockResolvedValue(ok([]));
    render(<CommunityBoardReview communityKey="alpha" />);
    fireEvent.click(await screen.findByRole('button', { name: '반려' }));
    fireEvent.change(screen.getByLabelText('반려 사유 (선택)'), { target: { value: '  중복 게시판  ' } });
    fireEvent.click(screen.getByRole('button', { name: '반려 확정' }));
    await screen.findByText(/신청을 반려했습니다/);
    expect(patch).toHaveBeenCalledWith('/communities/alpha/board-requests/r1', { action: 'reject', reviewComment: '중복 게시판' });
  });

  it('반려 사유는 기존 서버 계약대로 선택 사항이다', async () => {
    render(<CommunityBoardReview communityKey="alpha" />);
    fireEvent.click(await screen.findByRole('button', { name: '반려' }));
    fireEvent.change(screen.getByLabelText('반려 사유 (선택)'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: '반려 확정' }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/communities/alpha/board-requests/r1', { action: 'reject' }));
  });

  it('반려 실패 시 신청·입력 사유를 보존하고 다시 처리할 수 있다', async () => {
    patch.mockRejectedValueOnce(new Error('denied'));
    render(<CommunityBoardReview communityKey="alpha" />);
    fireEvent.click(await screen.findByRole('button', { name: '반려' }));
    fireEvent.change(screen.getByLabelText('반려 사유 (선택)'), { target: { value: '중복 게시판' } });
    fireEvent.click(screen.getByRole('button', { name: '반려 확정' }));
    await screen.findByRole('alert');
    expect(screen.getByText(request.name)).toBeTruthy();
    expect((screen.getByLabelText('반려 사유 (선택)') as HTMLTextAreaElement).value).toBe('중복 게시판');
    expect((screen.getByRole('button', { name: '반려 확정' }) as HTMLButtonElement).disabled).toBe(false);
    get.mockResolvedValue(ok([]));
    fireEvent.click(screen.getByRole('button', { name: '반려 확정' }));
    await screen.findByText(/신청을 반려했습니다/);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('승인 성공 후 목록 갱신 실패는 승인 실패로 표시하거나 같은 신청을 다시 노출하지 않는다', async () => {
    get.mockResolvedValueOnce(ok([request])).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(ok([]));
    render(<CommunityBoardReview communityKey="alpha" />);
    fireEvent.click(await screen.findByRole('button', { name: '승인' }));
    await screen.findByRole('alert');
    expect(screen.getByText(/신청을 승인했습니다/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: '승인' })).toBeNull();
    expect(screen.queryByText('대기 중인 신청이 없습니다.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '목록 다시 불러오기' }));
    await screen.findByText('대기 중인 신청이 없습니다.');
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it('커뮤니티 전환 후 이전 목록 응답을 현재 목록에 섞지 않는다', async () => {
    const old = deferred<ReturnType<typeof ok>>();
    get.mockReturnValueOnce(old.promise).mockResolvedValue(ok([{ ...request, name: '새 커뮤니티 신청' }]));
    const view = render(<CommunityBoardReview communityKey="alpha" />);
    view.rerender(<CommunityBoardReview communityKey="beta" />);
    await screen.findByText('새 커뮤니티 신청');
    await act(async () => old.resolve(ok([request])));
    expect(screen.queryByText(request.name)).toBeNull();
    expect(screen.getByText('새 커뮤니티 신청')).toBeTruthy();
  });

  it('처리 중 커뮤니티 전환 시 이전 성공 안내·재조회를 새 화면에 적용하지 않는다', async () => {
    const old = deferred<ReturnType<typeof ok>>();
    patch.mockReturnValue(old.promise);
    const view = render(<CommunityBoardReview communityKey="alpha" />);
    fireEvent.click(await screen.findByRole('button', { name: '승인' }));
    get.mockResolvedValue(ok([{ ...request, name: '새 커뮤니티 신청' }]));
    view.rerender(<CommunityBoardReview communityKey="beta" />);
    await screen.findByText('새 커뮤니티 신청');
    await act(async () => old.resolve(ok({})));
    expect(screen.queryByText(/신청을 승인했습니다/)).toBeNull();
    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.getByText('새 커뮤니티 신청')).toBeTruthy();
  });
});
