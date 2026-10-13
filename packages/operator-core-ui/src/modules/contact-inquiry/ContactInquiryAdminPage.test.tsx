import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ContactInquiryAdminPage } from './ContactInquiryAdminPage';
afterEach(cleanup);
const row = { id: 'inquiry', serviceKey: 'lecture', name: '합성 문의자', subject: '검토 문의', status: 'received', createdAt: '2026-01-01' };
const detail = { ...row, message: '문의 본문', internalNote: null } as any;
const result = { items: [row], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } as any;

it('retries the failed note without repeating a successful status change', async () => {
  const api = { list: vi.fn(async () => result), getDetail: vi.fn(async () => detail),
    setStatus: vi.fn(async () => ({ ...detail, status: 'answered' })),
    setNote: vi.fn().mockRejectedValueOnce(new Error('메모 저장 실패')).mockResolvedValueOnce({ ...detail, status: 'answered', internalNote: '보존할 메모' }) };
  render(<ContactInquiryAdminPage serviceKey="lecture" api={api} />);
  fireEvent.click(await screen.findByText('검토 문의'));
  await screen.findByText('문의 본문');
  fireEvent.change(screen.getByLabelText('문의 처리 상태'), { target: { value: 'answered' } });
  fireEvent.change(screen.getByLabelText('문의 내부 메모'), { target: { value: '보존할 메모' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('문의 내부 메모') as HTMLTextAreaElement).value).toBe('보존할 메모');
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await screen.findByRole('status');
  expect(api.setStatus).toHaveBeenCalledTimes(1);
  expect(api.setNote).toHaveBeenCalledTimes(2);
});

it('discards an old list response after changing the status filter', async () => {
  let first!: (value: unknown) => void;
  const api = { list: vi.fn().mockImplementationOnce(() => new Promise(resolve => { first = resolve; })).mockResolvedValueOnce(result), getDetail: vi.fn(), setStatus: vi.fn(), setNote: vi.fn() };
  render(<ContactInquiryAdminPage serviceKey="lecture" api={api} />);
  fireEvent.change(screen.getByLabelText('문의 상태 필터'), { target: { value: 'answered' } });
  await screen.findByText('검토 문의');
  await act(async () => first({ items: [], pagination: result.pagination }));
  expect(screen.getByText('검토 문의')).toBeTruthy();
});

it('a failed list does not claim there are no inquiries and can be retried', async () => {
  const api = { list: vi.fn().mockRejectedValueOnce(new Error('목록 실패')).mockResolvedValueOnce(result), getDetail: vi.fn(), setStatus: vi.fn(), setNote: vi.fn() };
  render(<ContactInquiryAdminPage serviceKey="lecture" api={api} />);
  await screen.findByRole('alert');
  expect(screen.queryByText('접수된 문의가 없습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
  await screen.findByText('검토 문의');
});
