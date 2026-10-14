import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../../../lib/apiClient', () => ({ api: { post } }));
import CommunitySelfWithdrawal from '../CommunitySelfWithdrawal';

beforeEach(() => post.mockReset());
afterEach(cleanup);
const open = () => fireEvent.click(screen.getByRole('button', { name: '이 커뮤니티 탈퇴' }));
describe('본인 탈퇴 확인', () => {
  it('취소는 요청을 보내지 않는다', () => {
    render(<CommunitySelfWithdrawal communityKey="fixture" name="테스트 커뮤니티" onWithdrawn={vi.fn()} />);
    open();
    expect(screen.getByText(/작성한 글과 변경 이력은 보존/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '이 커뮤니티 탈퇴' })).toBeTruthy();
  });
  it('확정 후 중복 요청을 막고 성공 콜백을 실행한다', async () => {
    let resolve!: (v: unknown) => void;
    post.mockReturnValue(new Promise(r => { resolve = r; }));
    const onWithdrawn = vi.fn();
    render(<CommunitySelfWithdrawal communityKey="fixture key" name="테스트 커뮤니티" onWithdrawn={onWithdrawn} />);
    open(); fireEvent.click(screen.getByRole('button', { name: '탈퇴 확정' }));
    fireEvent.click(screen.getByRole('button', { name: '탈퇴 처리 중…' }));
    expect(post).toHaveBeenCalledExactlyOnceWith('/communities/fixture%20key/leave', {});
    expect((screen.getByRole('button', { name: '취소' }) as HTMLButtonElement).disabled).toBe(true);
    resolve({}); await waitFor(() => expect(onWithdrawn).toHaveBeenCalledOnce());
  });
  it('마지막 admin 보호 오류를 표시하고 재시도를 허용한다', async () => {
    post.mockRejectedValueOnce({ response: { data: { error: '다른 admin을 먼저 지정하세요.' } } }).mockResolvedValue({});
    const done = vi.fn();
    render(<CommunitySelfWithdrawal communityKey="fixture" name="테스트 커뮤니티" onWithdrawn={done} />);
    open(); fireEvent.click(screen.getByRole('button', { name: '탈퇴 확정' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', '다른 admin을 먼저 지정하세요.');
    expect(done).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '탈퇴 확정' }));
    await waitFor(() => expect(done).toHaveBeenCalledOnce());
  });
  it('화면 이탈 후 늦은 성공을 새 화면에 적용하지 않는다', async () => {
    let resolve!: (v: unknown) => void;
    post.mockReturnValue(new Promise(r => { resolve = r; }));
    const done = vi.fn();
    const view = render(<CommunitySelfWithdrawal communityKey="fixture" name="테스트 커뮤니티" onWithdrawn={done} />);
    open(); fireEvent.click(screen.getByRole('button', { name: '탈퇴 확정' }));
    view.unmount(); resolve({}); await Promise.resolve();
    expect(done).not.toHaveBeenCalled();
  });
});
