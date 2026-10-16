import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Page from './OperatorContactMessagesPage';
const api = vi.hoisted(() => ({ list: vi.fn(), bulkMarkRead: vi.fn() }));
vi.mock('../../lib/api', () => ({ operatorContactApi: api }));
const row = { id: 'fixture', name: '합성 문의자', contactType: 'supplier', status: 'new', createdAt: '2026-01-01' };
const result = { items: [row], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };
beforeEach(() => { vi.resetAllMocks(); api.list.mockResolvedValue(result); });
afterEach(cleanup);
it('shows a bulk failure and retries the list without an unhandled rejection', async () => {
  api.bulkMarkRead.mockRejectedValue(new Error('일괄 처리 실패'));
  render(<Page />); await screen.findByText('합성 문의자');
  fireEvent.click(screen.getByRole('button', { name: '공급자 신규 문의 일괄 확인' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByText('합성 문의자');
});
it('ignores a slow response for the previous filter', async () => {
  let first!: (value: unknown) => void;
  api.list.mockImplementationOnce(() => new Promise(resolve => { first = resolve; }));
  render(<Page />);
  fireEvent.change(screen.getByLabelText('문의 상태'), { target: { value: 'resolved' } });
  await screen.findByText('합성 문의자');
  await act(async () => first({ ...result, items: [] }));
  expect(screen.getByText('합성 문의자')).toBeTruthy();
});
it('preserves bulk success when refresh fails and retries only the query', async () => {
  api.bulkMarkRead.mockResolvedValue({ updated: 1, scope: ['supplier', 'partner'] });
  render(<Page />); await screen.findByText('합성 문의자'); api.list.mockRejectedValueOnce(new Error('갱신 실패'));
  fireEvent.click(screen.getByRole('button', { name: '공급자 신규 문의 일괄 확인' }));
  await screen.findByText('갱신 실패'); expect(screen.getByRole('status').textContent).toContain('완료');
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' })); await screen.findByText('합성 문의자'); expect(api.bulkMarkRead).toHaveBeenCalledTimes(1);
});
it('locks duplicate bulk commands and filter changes while the post-save query is pending', async () => {
  let finish!: (value: unknown) => void;
  api.bulkMarkRead.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<Page />); await screen.findByText('합성 문의자'); const button=screen.getByRole('button', { name: '공급자 신규 문의 일괄 확인' });
  fireEvent.click(button); fireEvent.click(button); expect(api.bulkMarkRead).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText('문의 상태'), { target: { value: 'resolved' } }); expect((screen.getByLabelText('문의 상태') as HTMLSelectElement).value).toBe('');
  let read!: (value: unknown) => void; api.list.mockImplementationOnce(() => new Promise(resolve => { read = resolve; }));
  await act(async () => finish({updated:1})); expect((screen.getByLabelText('문의 상태') as HTMLSelectElement).disabled).toBe(true);
  await act(async () => read(result)); await screen.findByText('합성 문의자');
});
it('does not refresh after a bulk action completes following unmount', async () => {
  let finish!: (value: unknown) => void; api.bulkMarkRead.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view=render(<Page />);await screen.findByText('합성 문의자');fireEvent.click(screen.getByRole('button', { name: '공급자 신규 문의 일괄 확인' }));view.unmount();
  await act(async()=>finish({updated:1}));expect(api.list).toHaveBeenCalledTimes(1);
});
