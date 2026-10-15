import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SupplierContentApprovalPage from './SupplierContentApprovalPage';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../api/client', () => ({ apiClient: api }));
const item = { id: 'fixture-a', entity_type: 'hub_content_submission', payload: { title: '검증 콘텐츠' }, status: 'pending', requester_name: '검증 신청자', created_at: '2026-10-15T00:00:00Z' };
const list = (title = '검증 콘텐츠') => ({ success: true, data: [{ ...item, payload: { title } }], total: 1, totalPages: 1 });
beforeEach(() => { vi.resetAllMocks(); api.get.mockResolvedValue(list()); api.post.mockResolvedValue({ success: true }); });
afterEach(cleanup);
const openReject = async () => {
  await screen.findByText('검증 콘텐츠');
  fireEvent.click(screen.getByTitle('더보기'));
  fireEvent.click(screen.getByRole('button', { name: '반려' }));
};
it('ignores an old filter response arriving after the new one', async () => {
  let resolve!: (value: unknown) => void;
  api.get.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  render(<SupplierContentApprovalPage />);
  fireEvent.click(screen.getByRole('button', { name: '승인됨' }));
  await screen.findByText('검증 콘텐츠');
  await act(async () => resolve(list('이전 필터 콘텐츠')));
  expect(screen.queryByText('이전 필터 콘텐츠')).toBeNull();
  expect(api.get.mock.calls[1][1].status).toBe('approved');
});
it('preserves the target and reason on failure and prevents competing actions while pending', async () => {
  let resolve!: (value: unknown) => void;
  api.post.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  render(<SupplierContentApprovalPage />); await openReject();
  const reason = screen.getByPlaceholderText('반려 사유를 입력하세요');
  fireEvent.change(reason, { target: { value: '확인할 내용' } });
  const submit = screen.getByRole('button', { name: '반려' });
  fireEvent.click(submit); fireEvent.click(submit);
  expect(api.post).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: '승인됨' }));
  expect(api.get).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ success: false }));
  await screen.findByRole('alert');
  expect((reason as HTMLTextAreaElement).value).toBe('확인할 내용');
  fireEvent.click(submit);
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
  expect(api.post.mock.calls[1]).toEqual(['/operator/approvals/fixture-a/reject', { reason: '확인할 내용' }]);
});
it('retries only the list after successful approval and failed refresh', async () => {
  render(<SupplierContentApprovalPage />); await openReject();
  api.get.mockRejectedValueOnce(new Error('fixture'));
  fireEvent.click(screen.getByRole('button', { name: '반려' }));
  await screen.findByText(/처리는 완료됐지만 목록 갱신/);
  fireEvent.click(screen.getByRole('button', { name: '목록 다시 조회' }));
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(3));
  expect(api.post).toHaveBeenCalledTimes(1);
});
it('shows an unsuccessful read as an error with a retry instead of an empty queue', async () => {
  api.get.mockResolvedValueOnce({ success: false, data: [] });
  render(<SupplierContentApprovalPage />);
  await screen.findByRole('alert');
  expect(screen.queryByText('대기 중인 승인 요청이 없습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '목록 다시 조회' }));
  await screen.findByText('검증 콘텐츠');
});
it('keeps the loaded list actionable when the current filter is clicked again', async () => {
  render(<SupplierContentApprovalPage />); await screen.findByText('검증 콘텐츠');
  fireEvent.click(screen.getByRole('button', { name: '대기중' }));
  fireEvent.click(screen.getAllByRole('button', { name: '전체' })[0]);
  await openReject();
  expect(screen.getByPlaceholderText('반려 사유를 입력하세요')).toBeTruthy();
  expect(api.get).toHaveBeenCalledTimes(1);
});
