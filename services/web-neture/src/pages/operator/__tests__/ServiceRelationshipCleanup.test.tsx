import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminMemberDeleteModal } from '../../admin/components/AdminMemberDeleteModal';
const api = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));
vi.mock('../../../lib/apiClient', () => ({ api }));
beforeEach(() => { vi.resetAllMocks(); api.get.mockResolvedValue({ data: { success: true } }); api.delete.mockResolvedValue({ data: { success: true } }); });
afterEach(cleanup);
it('requires a verified scoped target and displays relationship cleanup rather than activity erasure', async () => {
  let finish!: (v: unknown) => void; api.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<AdminMemberDeleteModal userId="fixture" userName="합성 회원" onClose={vi.fn()} onDeleted={vi.fn()} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '가입정리' } });
  fireEvent.click(screen.getByRole('button', { name: '서비스 가입 정리' })); expect(api.delete).not.toHaveBeenCalled();
  finish({ data: { success: true } }); await waitFor(() => expect((screen.getByRole('button', { name: '서비스 가입 정리' }) as HTMLButtonElement).disabled).toBe(false));
  expect(api.get).toHaveBeenCalledWith('/operator/members/fixture?serviceKey=neture');
  expect(screen.getByText(/다른 서비스와 활동·감사 기록은 유지됩니다/)).toBeTruthy();
});
it('keeps a failed cleanup confirmation and retries only the explicitly selected service', async () => {
  api.delete.mockRejectedValueOnce(new Error('격리 실패'));
  const saved = vi.fn(); render(<AdminMemberDeleteModal userId="fixture" userName="합성 회원" onClose={vi.fn()} onDeleted={saved} />);
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '가입정리' } }); fireEvent.click(screen.getByRole('button', { name: '서비스 가입 정리' }));
  await screen.findByRole('alert'); expect(saved).not.toHaveBeenCalled(); expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('가입정리');
  fireEvent.click(screen.getByRole('button', { name: '서비스 가입 정리' })); await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(api.delete.mock.calls).toEqual([['/operator/members/fixture?mode=hard&serviceKey=neture'], ['/operator/members/fixture?mode=hard&serviceKey=neture']]);
});
