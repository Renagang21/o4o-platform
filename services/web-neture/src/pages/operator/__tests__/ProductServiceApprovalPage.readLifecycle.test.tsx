import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProductServiceApprovalPage from '../ProductServiceApprovalPage';
import type { ApprovalAnalytics, ServiceApprovalItem, ServiceApprovalStats } from '../../../lib/api/serviceApproval';

const api = vi.hoisted(() => ({ list: vi.fn(), stats: vi.fn(), analytics: vi.fn(), approve: vi.fn(), reject: vi.fn() }));
const auth = vi.hoisted(() => ({ id: 'fixture-session', roles: ['neture:operator'] }));
vi.mock('../../../lib/api/serviceApproval', () => ({ operatorServiceApprovalApi: api }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: auth }) }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((r, j) => { resolve = r; reject = j; });
  return { promise, resolve, reject };
}
function item(id: string): ServiceApprovalItem {
  return { id, approvalStatus: 'pending', offerId: `offer-${id}`, serviceKey: 'kpa-society', productName: `검증상품-${id}`, barcode: '', supplierName: '검증공급자', decidedBy: null, decidedAt: null, reason: null, createdAt: '2026-01-01', regulatoryType: 'GENERAL', mfdsPermitNumber: null, isMfdsVerified: false, offerApprovalStatus: 'approved', distributionType: 'PUBLIC', completenessScore: 80, imageUrl: null, brandName: null, priceGeneral: 100, hasShortDescription: true, hasDetailDescription: true, imageCount: 0, isStale: false, isLowQualitySupplier: false, priority: 'LOW' };
}
function list(id = 'a', page = 1, totalPages = 1) {
  return { data: [item(id)], pagination: { page, limit: 30, total: totalPages * 30, totalPages } };
}
const stats = (total = 1): ServiceApprovalStats => ({ total, pending: 1, approved: 0, rejected: 0, todayPending: 0 });
function analysis(rate = 11): ApprovalAnalytics {
  return { summary: { total: 100, approved: rate, rejected: 0, pending: 100 - rate, approvalRate: rate }, topRejectionReasons: [], avgProcessingTimeHours: 1, supplierApprovalRates: [], alerts: { stalePendingCount: 0, lowQualitySuppliers: [{ supplierId: 'fixture-supplier', supplierName: '바로가기 공급자', approvalRate: 50, total: 10 }] } };
}
const search = () => screen.getByPlaceholderText('상품명 / 바코드 / 공급사 검색');
const status = (label: string) => screen.getByRole('button', { name: label, exact: true });
beforeEach(() => {
  vi.resetAllMocks(); auth.id = 'fixture-session'; window.history.replaceState(null, '', '/');
  api.list.mockResolvedValue(list()); api.stats.mockResolvedValue(stats()); api.analytics.mockResolvedValue(null);
  api.approve.mockResolvedValue({ success: true }); api.reject.mockResolvedValue({ success: true });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('ignores older list/statistics success without clearing the latest selection', async () => {
  const old = deferred<ReturnType<typeof list>>();
  api.list.mockReturnValueOnce(old.promise).mockResolvedValue(list('latest'));
  api.stats.mockResolvedValueOnce(stats(99)).mockResolvedValue(stats(2));
  render(<ProductServiceApprovalPage />);
  fireEvent.click(status('승인대기'));
  await screen.findByText('검증상품-latest');
  fireEvent.click(screen.getByRole('checkbox', { name: '전체 선택' }));
  await act(async () => { old.resolve(list('old')); });
  expect(screen.getByText('검증상품-latest')).toBeTruthy();
  expect(screen.queryByText('검증상품-old')).toBeNull(); expect(screen.queryByText('99')).toBeNull();
  expect((screen.getByRole('checkbox', { name: '전체 선택' }) as HTMLInputElement).checked).toBe(true);
});

it('ignores older list failure after a newer filter result', async () => {
  const old = deferred<ReturnType<typeof list>>();
  api.list.mockReturnValueOnce(old.promise).mockResolvedValue(list('latest'));
  render(<ProductServiceApprovalPage />); fireEvent.click(status('승인대기'));
  await screen.findByText('검증상품-latest');
  await act(async () => { old.reject(new Error('이전 조회 실패')); });
  expect(screen.queryByText('이전 조회 실패')).toBeNull(); expect(screen.getByText('검증상품-latest')).toBeTruthy();
});

it('does not release the newer loading state when an older request finishes', async () => {
  const old = deferred<ReturnType<typeof list>>(), latest = deferred<ReturnType<typeof list>>();
  api.list.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
  render(<ProductServiceApprovalPage />); fireEvent.click(status('승인대기'));
  await act(async () => { old.resolve(list('old')); });
  expect(screen.getByText('로딩 중...')).toBeTruthy(); expect(screen.queryByText('검증상품-old')).toBeNull();
  await act(async () => { latest.resolve(list('latest')); });
  expect(screen.getByText('검증상품-latest')).toBeTruthy();
});

it('keeps the latest page when responses arrive out of order', async () => {
  const page2 = deferred<ReturnType<typeof list>>(), page3 = deferred<ReturnType<typeof list>>();
  api.list.mockResolvedValueOnce(list('a', 1, 3)).mockReturnValueOnce(page2.promise).mockReturnValueOnce(page3.promise);
  render(<ProductServiceApprovalPage />); await screen.findByText('검증상품-a');
  fireEvent.click(status('2')); fireEvent.click(status('3'));
  await act(async () => { page3.resolve(list('page3', 3, 3)); });
  await act(async () => { page2.resolve(list('page2', 2, 3)); });
  expect(screen.getByText('검증상품-page3')).toBeTruthy(); expect(screen.queryByText('검증상품-page2')).toBeNull();
});

it('shows current errors and recovers on a new filter request', async () => {
  api.list.mockRejectedValueOnce(new Error('현재 조회 실패')).mockResolvedValue(list('recovered'));
  render(<ProductServiceApprovalPage />); await screen.findByText('현재 조회 실패');
  fireEvent.click(status('승인대기')); await screen.findByText('검증상품-recovered');
  expect(screen.queryByText('현재 조회 실패')).toBeNull();
});

it('invalidates a response belonging to the previous user scope', async () => {
  const old = deferred<ReturnType<typeof list>>();
  api.list.mockReturnValueOnce(old.promise).mockResolvedValue(list('new-session'));
  const view = render(<ProductServiceApprovalPage />);
  auth.id = 'fixture-new-session'; view.rerender(<ProductServiceApprovalPage />);
  await screen.findByText('검증상품-new-session');
  await act(async () => { old.resolve(list('old-session')); });
  expect(screen.queryByText('검증상품-old-session')).toBeNull();
});

it('keeps period controls while replacing old analytics with the latest period only', async () => {
  const days7 = deferred<ApprovalAnalytics | null>(), days30 = deferred<ApprovalAnalytics | null>();
  api.analytics.mockResolvedValueOnce(analysis()).mockReturnValueOnce(days7.promise).mockReturnValueOnce(days30.promise);
  render(<ProductServiceApprovalPage />); await screen.findByText('11%');
  fireEvent.click(status('7일'));
  expect(screen.queryByText('11%')).toBeNull(); expect(screen.getByRole('status').textContent).toContain('분석을 불러오는 중');
  fireEvent.click(status('30일'));
  await act(async () => { days30.resolve(analysis(30)); });
  await act(async () => { days7.resolve(analysis(70)); });
  expect(screen.getByText('30%')).toBeTruthy(); expect(screen.queryByText('70%')).toBeNull();
  expect(api.list).toHaveBeenCalledTimes(1);
});

it('does not hide current analytics on a previous period failure', async () => {
  const days7 = deferred<ApprovalAnalytics | null>();
  api.analytics.mockResolvedValueOnce(analysis()).mockReturnValueOnce(days7.promise).mockResolvedValueOnce(analysis(30));
  render(<ProductServiceApprovalPage />); await screen.findByText('11%');
  fireEvent.click(status('7일')); fireEvent.click(status('30일')); await screen.findByText('30%');
  await act(async () => { days7.reject(new Error('old analytics failure')); });
  expect(screen.getByText('30%')).toBeTruthy();
});

it('removes prior analytics on an empty current result without hiding the list', async () => {
  api.analytics.mockResolvedValueOnce(analysis()).mockResolvedValueOnce(null);
  render(<ProductServiceApprovalPage />); await screen.findByText('11%'); fireEvent.click(status('7일'));
  await waitFor(() => expect(screen.queryByRole('button', { name: /승인 분석/ })).toBeNull());
  expect(screen.getByText('검증상품-a')).toBeTruthy();
});

it('keeps list access independent of a current analytics failure', async () => {
  api.analytics.mockResolvedValueOnce(analysis()).mockRejectedValueOnce(new Error('current analytics failure'));
  render(<ProductServiceApprovalPage />); await screen.findByText('11%'); fireEvent.click(status('7일'));
  await waitFor(() => expect(screen.queryByRole('button', { name: /승인 분석/ })).toBeNull());
  expect(screen.getByText('검증상품-a')).toBeTruthy();
});

it('debounces rapid typing into one request at the original 300ms boundary', async () => {
  render(<ProductServiceApprovalPage />); await screen.findByText('검증상품-a'); vi.useFakeTimers();
  fireEvent.change(search(), { target: { value: '이전' } });
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
  fireEvent.change(search(), { target: { value: '최신' } });
  await act(async () => { await vi.advanceTimersByTimeAsync(299); });
  expect(api.list).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(api.list).toHaveBeenCalledTimes(2);
  expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: '최신' }));
});

it('cancels pending search on unmount', async () => {
  const view = render(<ProductServiceApprovalPage />); await screen.findByText('검증상품-a'); vi.useFakeTimers();
  fireEvent.change(search(), { target: { value: '예약 검색' } }); expect(vi.getTimerCount()).toBe(1);
  view.unmount(); expect(vi.getTimerCount()).toBe(0);
  await act(async () => { await vi.advanceTimersByTimeAsync(400); });
  expect(api.list).toHaveBeenCalledTimes(1);
});

it('cancels earlier typed search when an analytics shortcut applies immediately', async () => {
  api.analytics.mockResolvedValue(analysis());
  render(<ProductServiceApprovalPage />); await screen.findByText('11%'); vi.useFakeTimers();
  fireEvent.change(search(), { target: { value: '이전 입력' } });
  fireEvent.click(status('바로가기 공급자 (50%)'));
  await act(async () => { await vi.advanceTimersByTimeAsync(400); });
  expect(api.list).toHaveBeenCalledTimes(2);
  expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: '바로가기 공급자' }));
  expect((search() as HTMLInputElement).value).toBe('바로가기 공급자');
});

it('refreshes the latest search after a write instead of a captured old filter', async () => {
  const pendingRead = deferred<ReturnType<typeof list>>(), write = deferred<{ success: boolean }>();
  api.list.mockResolvedValueOnce(list()).mockReturnValueOnce(pendingRead.promise).mockResolvedValue(list('after-write'));
  api.approve.mockReturnValueOnce(write.promise);
  render(<ProductServiceApprovalPage />); await screen.findByText('검증상품-a'); vi.useFakeTimers();
  fireEvent.change(search(), { target: { value: '변경한 검색' } });
  fireEvent.click(status('승인')); fireEvent.click(status('승인 확인'));
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(api.list).toHaveBeenCalledTimes(2);
  await act(async () => { write.resolve({ success: true }); });
  expect(api.list).toHaveBeenCalledTimes(3);
  expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: '변경한 검색', page: 1 }));
  await act(async () => { pendingRead.resolve(list('before-write')); });
  expect(screen.getByText('검증상품-after-write')).toBeTruthy(); expect(screen.queryByText('검증상품-before-write')).toBeNull();
});

it('refreshes the most recently requested page after a delayed write', async () => {
  const pendingRead = deferred<ReturnType<typeof list>>(), write = deferred<{ success: boolean }>();
  api.list.mockResolvedValueOnce(list('a', 1, 2)).mockReturnValueOnce(pendingRead.promise).mockResolvedValue(list('after-write', 2, 2));
  api.approve.mockReturnValueOnce(write.promise);
  render(<ProductServiceApprovalPage />); await screen.findByText('검증상품-a');
  fireEvent.click(status('승인')); fireEvent.click(status('승인 확인')); fireEvent.click(status('다음'));
  await act(async () => { write.resolve({ success: true }); });
  await waitFor(() => expect(api.list).toHaveBeenCalledTimes(3));
  expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  await act(async () => { pendingRead.resolve(list('before-write', 2, 2)); });
  expect(screen.getByText('검증상품-after-write')).toBeTruthy();
});

it('does not start a follow-up read from a write finishing after unmount', async () => {
  const write = deferred<{ success: boolean }>(); api.approve.mockReturnValueOnce(write.promise);
  const view = render(<ProductServiceApprovalPage />); await screen.findByText('검증상품-a');
  fireEvent.click(status('승인')); fireEvent.click(status('승인 확인')); view.unmount();
  await act(async () => { write.resolve({ success: true }); }); expect(api.list).toHaveBeenCalledTimes(1);
});

it('refreshes the applied page when the server adjusts a requested page', async () => {
  api.list.mockResolvedValueOnce(list('a', 1, 3)).mockResolvedValueOnce(list('adjusted', 2, 2)).mockResolvedValue(list('after-write', 2, 2));
  render(<ProductServiceApprovalPage />); await screen.findByText('검증상품-a');
  fireEvent.click(status('3')); await screen.findByText('검증상품-adjusted');
  fireEvent.click(status('승인')); fireEvent.click(status('승인 확인'));
  await screen.findByText('검증상품-after-write');
  expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
});
