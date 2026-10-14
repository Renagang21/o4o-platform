import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import Page from '../ProductServiceApprovalPage';
import type { ServiceApprovalItem } from '../../../lib/api/serviceApproval';
const api = vi.hoisted(() => ({ list: vi.fn(), stats: vi.fn(), analytics: vi.fn(), approve: vi.fn(), reject: vi.fn(), deletePendingOffer: vi.fn() }));
const cleanupApi = vi.hoisted(() => ({ softDelete: vi.fn() }));
const auth = vi.hoisted(() => ({ id: 'fixture-session', roles: ['neture:operator'] as string[] }));
vi.mock('../../../lib/api/serviceApproval', () => ({ operatorServiceApprovalApi: api }));
vi.mock('../../../lib/api/operatorProductCleanup', () => ({ productCleanupApi: cleanupApi }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: auth }) }));
function item(id: string, approvalStatus: string): ServiceApprovalItem {
  return { id, approvalStatus, offerId: `offer-${id}`, serviceKey: 'kpa-society', productName: `검증상품-${id}`, barcode: '', supplierName: '검증공급자', decidedBy: null, decidedAt: null, reason: null, createdAt: '2026-01-01', regulatoryType: 'GENERAL', mfdsPermitNumber: null, isMfdsVerified: false, offerApprovalStatus: 'approved', distributionType: 'PUBLIC', completenessScore: 80, imageUrl: null, brandName: null, priceGeneral: 100, hasShortDescription: true, hasDetailDescription: true, imageCount: 0, isStale: false, isLowQualitySupplier: false, priority: 'LOW' };
}

beforeEach(() => {
  vi.resetAllMocks(); auth.roles = ['neture:operator']; window.history.replaceState(null, '', '/');
  api.list.mockResolvedValue({ data: [item('a', 'pending')], pagination: { page: 1, limit: 30, total: 1, totalPages: 1 } });
  api.stats.mockResolvedValue({ total: 1, pending: 1, approved: 0, rejected: 0, todayPending: 0 });
  cleanupApi.softDelete.mockResolvedValue({ success: true });
  api.analytics.mockResolvedValue(null); api.deletePendingOffer.mockResolvedValue({ success: true }); api.approve.mockResolvedValue({ success: true }); api.reject.mockResolvedValue({ success: true });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function openDelete() {
  const view = render(<Page />);
  await screen.findByText('검증상품-a');
  fireEvent.click(screen.getAllByRole('checkbox')[1]);
  fireEvent.click(screen.getByRole('button', { name: '삭제', exact: true }));
  return view;
}
const confirmDelete = () => fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }));
it('preserves failed target, selection and list; retry uses Offer ID rather than approval ID', async () => {
  api.deletePendingOffer.mockResolvedValueOnce({ success: false, error: 'NOT_PENDING' }).mockResolvedValueOnce({ success: true });
  await openDelete(); confirmDelete();
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('NOT_PENDING'));
  expect(screen.getByRole('button', { name: '삭제 확인' })).toBeTruthy();
  expect(screen.getByText('1건 선택됨')).toBeTruthy(); expect(api.list).toHaveBeenCalledTimes(1);
  confirmDelete();
  await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
  expect(api.deletePendingOffer.mock.calls).toEqual([['offer-a'], ['offer-a']]);
  expect(screen.queryByText('상품 삭제')).toBeNull();
});
it('recovers unexpected rejection and preserves target for retry', async () => {
  api.deletePendingOffer.mockRejectedValueOnce(new Error('fixture rejection'));
  await openDelete(); confirmDelete();
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect((screen.getByRole('button', { name: '삭제 확인' }) as HTMLButtonElement).disabled).toBe(false);
  expect(api.list).toHaveBeenCalledTimes(1);
  confirmDelete(); await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
});
it('blocks duplicate confirmation and cancellation until the same request finishes', async () => {
  let finish!: (result: {success: boolean; error?: string}) => void;
  api.deletePendingOffer.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await openDelete(); confirmDelete();
  const busy = screen.getByRole('button', { name: '삭제 중...' });
  fireEvent.click(busy); fireEvent.click(screen.getByRole('button', { name: '취소', exact: true }));
  expect(api.deletePendingOffer).toHaveBeenCalledTimes(1);
  expect((screen.getByRole('button', { name: '취소', exact: true }) as HTMLButtonElement).disabled).toBe(true);
  finish({success: false, error: 'NETWORK_ERROR'});
  await screen.findByRole('alert'); expect(screen.getByText('상품 삭제')).toBeTruthy();
});
it('cancels without writes and hides old error when another target is opened', async () => {
  api.deletePendingOffer.mockResolvedValue({ success: false, error: 'NOT_PENDING' });
  await openDelete(); confirmDelete(); await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: '취소', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: '삭제', exact: true }));
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '취소', exact: true }));
  expect(api.deletePendingOffer).toHaveBeenCalledTimes(1);
});
it('rechecks current management permission before confirming', async () => {
  const view = await openDelete(); auth.roles = ['neture:user']; view.rerender(<Page />);
  confirmDelete(); expect(api.deletePendingOffer).not.toHaveBeenCalled();
});
it('does not refresh after unmount while deletion is pending', async () => {
  let finish!: (result: {success: boolean}) => void;
  api.deletePendingOffer.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = await openDelete(); confirmDelete(); view.unmount(); finish({success: true});
  await new Promise(resolve => setTimeout(resolve, 0)); expect(api.list).toHaveBeenCalledTimes(1);
});
it('keeps the open product detail on failure and closes it only after confirmed deletion', async () => {
  api.deletePendingOffer.mockResolvedValueOnce({ success: false, error: 'HAS_ACTIVE_LISTINGS' }).mockResolvedValueOnce({ success: true });
  render(<Page />); fireEvent.click(await screen.findByText('검증상품-a'));
  expect(screen.getByText('상품명')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '삭제', exact: true })); confirmDelete();
  await screen.findByRole('alert'); expect(screen.getByText('상품명')).toBeTruthy();
  confirmDelete(); await waitFor(() => expect(screen.queryByText('상품명')).toBeNull());
});
it('keeps the captured target during writing and does not close a different current detail on success', async () => {
  api.list.mockResolvedValue({ data: [item('a', 'pending'), item('b', 'pending')], pagination: { page: 1, limit: 30, total: 2, totalPages: 1 } });
  let finish!: (result: {success: boolean}) => void;
  api.deletePendingOffer.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<Page />); await screen.findByText('검증상품-a');
  const actions = screen.getAllByRole('button', { name: '삭제', exact: true });
  fireEvent.click(actions[0]); confirmDelete(); fireEvent.click(actions[1]);
  expect(within(screen.getByRole('dialog', { name: '상품 삭제' })).getByText('검증상품-a')).toBeTruthy();
  // A different current detail must survive completion of the captured Offer request.
  fireEvent.click(screen.getByText('검증상품-b'));
  finish({success: true}); await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
  expect(screen.getByText('상품명')).toBeTruthy();
  expect(api.deletePendingOffer).toHaveBeenCalledWith('offer-a');
});

it('blocks an already-open approval confirmation while deletion is writing', async () => {
  let finish!: (result: {success: boolean; error?: string}) => void;
  api.deletePendingOffer.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<Page />); await screen.findByText('검증상품-a');
  fireEvent.click(screen.getByRole('button', { name: '승인', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: '삭제', exact: true })); confirmDelete();
  fireEvent.click(within(screen.getByRole('dialog', { name: '상품 승인', exact: true })).getByRole('button', { name: '승인 확인' }));
  expect(api.approve).not.toHaveBeenCalled();
  finish({success: false, error: 'NOT_PENDING'}); await screen.findByRole('alert');
});
it('releases the mutation lock before a slow refresh so remaining selections stay actionable', async () => {
  const initial = { data: [item('a', 'pending'), item('b', 'pending')], pagination: { page: 1, limit: 30, total: 2, totalPages: 1 } };
  let finishRead!: (result: typeof initial) => void;
  api.list.mockResolvedValueOnce(initial).mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
  render(<Page />); await screen.findByText('검증상품-a');
  fireEvent.click(screen.getAllByRole('checkbox')[2]);
  fireEvent.click(screen.getAllByRole('button', { name: '삭제', exact: true })[0]); confirmDelete();
  await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole('button', { name: '일괄 승인 (1)' }));
  expect(screen.getByRole('dialog', { name: '일괄 승인 (1건)', exact: true })).toBeTruthy();
  finishRead({ ...initial, data: [item('b', 'pending')] });
  await waitFor(() => expect(screen.queryByText('1건 선택됨')).toBeNull());
});

async function openApproved() {
  api.list.mockResolvedValue({ data: [item('a', 'approved')], pagination: { page: 1, limit: 30, total: 1, totalPages: 1 } });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const view = render(<Page />);
  await screen.findByText('검증상품-a');
  fireEvent.click(screen.getAllByRole('checkbox')[1]);
  return view;
}
const moveToTrash = () => fireEvent.click(screen.getByRole('button', { name: '삭제 (휴지통으로 이동)' }));
it('preserves approved Offer, selection and detail on trash failure and allows retry', async () => {
  cleanupApi.softDelete.mockResolvedValueOnce({ success: false, error: 'BLOCKED' }).mockResolvedValueOnce({ success: true });
  await openApproved(); fireEvent.click(screen.getByText('검증상품-a')); moveToTrash();
  expect((await screen.findByRole('alert')).textContent).toContain('BLOCKED');
  expect(screen.getByText('상품명')).toBeTruthy(); expect(screen.getByText('1건 선택됨')).toBeTruthy();
  expect(api.list).toHaveBeenCalledTimes(1);
  moveToTrash(); await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
  expect(cleanupApi.softDelete.mock.calls).toEqual([['offer-a'], ['offer-a']]);
  expect(screen.queryByText('상품명')).toBeNull(); expect(screen.queryByRole('alert')).toBeNull();
});
it('releases trash loading after exception and retries without changing target', async () => {
  cleanupApi.softDelete.mockRejectedValueOnce(new Error('fixture'));
  await openApproved(); moveToTrash(); await screen.findByRole('alert');
  expect((screen.getByRole('button', { name: '삭제 (휴지통으로 이동)' }) as HTMLButtonElement).disabled).toBe(false);
  moveToTrash(); await waitFor(() => expect(cleanupApi.softDelete).toHaveBeenCalledTimes(2));
});
it('blocks duplicate trash requests and decision confirmation while trash is writing', async () => {
  let finish!: (result: {success: boolean}) => void;
  cleanupApi.softDelete.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await openApproved(); moveToTrash(); moveToTrash();
  expect(cleanupApi.softDelete).toHaveBeenCalledTimes(1);
  expect(window.confirm).toHaveBeenCalledTimes(1);
  finish({success: false}); await screen.findByRole('alert');
});
it('does not mutate when trash confirmation is cancelled or current permission is absent', async () => {
  const view = await openApproved(); vi.mocked(window.confirm).mockReturnValue(false); moveToTrash();
  expect(cleanupApi.softDelete).not.toHaveBeenCalled();
  auth.roles = ['neture:user']; view.rerender(<Page />); moveToTrash();
  expect(cleanupApi.softDelete).not.toHaveBeenCalled();
});
it('does not refresh when an approved Offer finishes moving after unmount', async () => {
  let finish!: (result: {success: boolean}) => void;
  cleanupApi.softDelete.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = await openApproved(); moveToTrash(); view.unmount(); finish({success: true});
  await new Promise(resolve => setTimeout(resolve, 0)); expect(api.list).toHaveBeenCalledTimes(1);
});
