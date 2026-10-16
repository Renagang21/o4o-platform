import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
const api = vi.hoisted(() => ({ list: vi.fn(), updateStatus: vi.fn() }));
vi.mock('../../../api/contactRequest', () => ({
  collaborationRequestApi: api,
}));
import Page from '../CollaborationRequestsPage';
const row = {
  id: 'fixture',
  type: 'partner',
  name: '검증 문의자',
  email: 'fixture@example.test',
  status: 'pending',
  message: '검증 본문',
  createdAt: '2026-10-15',
  updatedAt: '2026-10-15',
};
const result = {
  success: true,
  data: { items: [row], total: 1, page: 1, limit: 20, totalPages: 1 },
};
beforeEach(() => {
  vi.resetAllMocks();
  api.list.mockResolvedValue(result);
  api.updateStatus.mockResolvedValue({
    success: true,
    data: { id: 'fixture', status: 'reviewing' },
  });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});
it('distinguishes a list failure from an empty result and retries', async () => {
  api.list.mockResolvedValueOnce({ success: false, error: '조회 거부' });
  render(<Page />);
  await screen.findByRole('alert');
  expect(screen.queryByText('접수된 협업 문의가 없습니다')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
  await screen.findByText('검증 문의자');
});
it('ignores late responses from the previous filter', async () => {
  let finish!: (v: unknown) => void;
  api.list.mockImplementationOnce(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  render(<Page />);
  fireEvent.change(screen.getByLabelText('협업 문의 상태'), {
    target: { value: 'reviewing' },
  });
  await screen.findByText('검증 문의자');
  await act(async () =>
    finish({
      ...result,
      data: { ...result.data, items: [{ ...row, name: '이전 문의' }] },
    }),
  );
  expect(screen.queryByText('이전 문의')).toBeNull();
});
it('preserves success and refresh failure in the selected drawer and retries reads only', async () => {
  render(<Page />);
  fireEvent.click(await screen.findByText('검증 문의자'));
  api.list.mockRejectedValueOnce(new Error('갱신 장애'));
  fireEvent.click(screen.getByRole('button', { name: '검토 중' }));
  await screen.findByText('갱신 장애');
  expect(screen.getByRole('status').textContent).toContain('상태가 변경');
  fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
  await screen.findByText('검증 문의자');
  expect(api.updateStatus).toHaveBeenCalledTimes(1);
});
it('locks target changes, close and duplicate saves while writing', async () => {
  let finish!: (v: unknown) => void;
  api.updateStatus.mockImplementationOnce(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  render(<Page />);
  fireEvent.click(await screen.findByText('검증 문의자'));
  const button = screen.getByRole('button', { name: '검토 중' });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(api.updateStatus).toHaveBeenCalledTimes(1);
  expect(
    (screen.getByLabelText('협업 문의 상태') as HTMLSelectElement).disabled,
  ).toBe(true);
  await act(async () => finish({ success: true }));
  await screen.findByRole('status');
});
it('keeps the selected target and a visible error on write failure', async () => {
  api.updateStatus.mockRejectedValueOnce(new Error('저장 거부'));
  render(<Page />);
  fireEvent.click(await screen.findByText('검증 문의자'));
  fireEvent.click(screen.getByRole('button', { name: '검토 중' }));
  expect((await screen.findByRole('alert')).textContent).toContain('저장 거부');
  expect(screen.getByText('검증 본문')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '검토 중' }));
  await screen.findByRole('status');
  expect(api.updateStatus).toHaveBeenNthCalledWith(2, 'fixture', 'reviewing');
});
it('does not refresh after unmounting an in-flight status change', async () => {
  let finish!: (v: unknown) => void;
  api.updateStatus.mockImplementationOnce(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const view = render(<Page />);
  fireEvent.click(await screen.findByText('검증 문의자'));
  fireEvent.click(screen.getByRole('button', { name: '검토 중' }));
  view.unmount();
  await act(async () => finish({ success: true }));
  expect(api.list).toHaveBeenCalledTimes(1);
});
