import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProductServiceApprovalPage from '../ProductServiceApprovalPage';
import type { ServiceApprovalItem } from '../../../lib/api/serviceApproval';
import type { ServiceApprovalDecision } from '../serviceApprovalDecisionResult';

const api = vi.hoisted(() => ({ list: vi.fn(), stats: vi.fn(), analytics: vi.fn(), approve: vi.fn(), reject: vi.fn(), batchApprove: vi.fn(), batchReject: vi.fn() }));
const auth = vi.hoisted(() => ({ roles: ['neture:operator'] as string[] }));
vi.mock('../../../lib/api/serviceApproval', () => ({ operatorServiceApprovalApi: api }));
vi.mock('../../../contexts/AuthContext', () => ({ getAccessToken: () => null, useAuth: () => ({ user: auth }) }));
function item(id: string, approvalStatus: string): ServiceApprovalItem {
  return { id, approvalStatus, offerId: `offer-${id}`, serviceKey: 'kpa-society', productName: `검증상품-${id}`, barcode: '', supplierName: '검증공급자', decidedBy: null, decidedAt: null, reason: null, createdAt: '2026-01-01', regulatoryType: 'GENERAL', mfdsPermitNumber: null, isMfdsVerified: false, offerApprovalStatus: 'approved', distributionType: 'PUBLIC', completenessScore: 80, imageUrl: null, brandName: null, priceGeneral: 100, hasShortDescription: true, hasDetailDescription: true, imageCount: 0, isStale: false, isLowQualitySupplier: false, priority: 'LOW' };
}
const rows = () => [item('a', 'pending'), item('b', 'pending'), item('c', 'approved')];
const listResult = (data = rows()) => ({ data, pagination: { page: 1, limit: 30, total: 3, totalPages: 1 } });
const batchResult = (decision: ServiceApprovalDecision, completed: number, failed: number) => ({ success: true, data: decision === 'approve' ? { approved: completed, failed } : { rejected: completed, failed } });
const input = (decision: ServiceApprovalDecision) => screen.getByPlaceholderText(decision === 'approve' ? '승인 메모를 입력하세요 (선택)' : '거절 사유를 입력하세요 (선택)') as HTMLTextAreaElement;
const confirm = (decision: ServiceApprovalDecision) => screen.getByRole('button', { name: decision === 'approve' ? '승인 확인' : '거절 확인', exact: true }) as HTMLButtonElement;
async function open(decision: ServiceApprovalDecision, batch = false) {
  await screen.findByText('검증상품-a');
  if (batch) {
    fireEvent.click(screen.getByRole('checkbox', { name: '전체 선택' }));
    fireEvent.click(screen.getByRole('button', { name: decision === 'approve' ? '일괄 승인 (2)' : '일괄 거절 (2)', exact: true }));
  } else {
    fireEvent.click(screen.getAllByRole('button', { name: decision === 'approve' ? '승인' : '거절', exact: true })[0]);
  }
  fireEvent.change(input(decision), { target: { value: '보존할 입력' } });
}
beforeEach(() => {
  vi.resetAllMocks(); auth.roles = ['neture:operator']; window.history.replaceState(null, '', '/');
  api.list.mockResolvedValue(listResult());
  api.stats.mockResolvedValue({ total: 3, pending: 2, approved: 1, rejected: 0, todayPending: 0 });
  api.analytics.mockResolvedValue(null);
  api.approve.mockResolvedValue({ success: true }); api.reject.mockResolvedValue({ success: true });
  api.batchApprove.mockResolvedValue(batchResult('approve', 2, 0)); api.batchReject.mockResolvedValue(batchResult('reject', 2, 0));
});
afterEach(cleanup);

it.each(['approve', 'reject'] as const)('single %s failure preserves input and allows a successful retry', async decision => {
  api[decision].mockResolvedValueOnce({ success: false, error: 'NETWORK_ERROR' });
  render(<ProductServiceApprovalPage />); await open(decision);
  fireEvent.click(confirm(decision));
  await screen.findByRole('alert');
  expect(input(decision).value).toBe('보존할 입력');
  expect(confirm(decision).disabled).toBe(false);
  expect(api.list).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('status')).toBeNull();
  fireEvent.click(confirm(decision));
  await waitFor(() => expect(screen.queryByPlaceholderText(inputPlaceholder(decision))).toBeNull());
  expect(api[decision]).toHaveBeenNthCalledWith(2, 'a', '보존할 입력');
  await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
});
function inputPlaceholder(decision: ServiceApprovalDecision) { return decision === 'approve' ? '승인 메모를 입력하세요 (선택)' : '거절 사유를 입력하세요 (선택)'; }

it.each(['approve', 'reject'] as const)('throw from %s releases the lock and preserves draft', async decision => {
  api[decision].mockRejectedValueOnce(new Error('fixture exception'));
  render(<ProductServiceApprovalPage />); await open(decision); fireEvent.click(confirm(decision));
  await screen.findByRole('alert');
  expect(input(decision).value).toBe('보존할 입력'); expect(confirm(decision).disabled).toBe(false);
  expect((screen.getByRole('button', { name: '취소', exact: true }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(confirm(decision)); await screen.findByRole('status');
  expect(api[decision]).toHaveBeenCalledTimes(2);
});

it.each(['approve', 'reject'] as const)('all-failed batch %s retains selection and draft', async decision => {
  const method = decision === 'approve' ? api.batchApprove : api.batchReject;
  method.mockResolvedValueOnce(batchResult(decision, 0, 2));
  render(<ProductServiceApprovalPage />); await open(decision, true); fireEvent.click(confirm(decision));
  expect((await screen.findByRole('alert')).textContent).toContain('2건');
  expect(input(decision).value).toBe('보존할 입력');
  expect((screen.getByRole('checkbox', { name: '전체 선택' }) as HTMLInputElement).checked).toBe(true);
  expect(api.list).toHaveBeenCalledTimes(1);
  fireEvent.click(confirm(decision)); await screen.findByRole('status');
  expect(method).toHaveBeenNthCalledWith(2, ['a', 'b'], '보존할 입력');
});

it.each(['approve', 'reject'] as const)('partial batch %s refreshes and prevents resending completed ids', async decision => {
  const method = decision === 'approve' ? api.batchApprove : api.batchReject;
  method.mockResolvedValueOnce(batchResult(decision, 1, 1));
  api.list.mockResolvedValueOnce(listResult()).mockResolvedValue(listResult([item('a', decision === 'approve' ? 'approved' : 'rejected'), item('b', 'pending'), item('c', 'approved')]));
  render(<ProductServiceApprovalPage />); await open(decision, true); fireEvent.click(confirm(decision));
  expect((await screen.findByRole('status')).textContent).toContain('1건 완료, 1건 실패');
  await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
  await screen.findByText('검증상품-b');
  expect(screen.queryByPlaceholderText(inputPlaceholder(decision))).toBeNull();
  expect((screen.getByRole('checkbox', { name: '전체 선택' }) as HTMLInputElement).checked).toBe(false);
  fireEvent.click(screen.getByRole('checkbox', { name: '전체 선택' }));
  fireEvent.click(screen.getByRole('button', { name: decision === 'approve' ? '일괄 승인 (1)' : '일괄 거절 (1)', exact: true }));
  fireEvent.click(confirm(decision));
  await waitFor(() => expect(method).toHaveBeenNthCalledWith(2, ['b'], undefined));
});

it.each(['approve', 'reject'] as const)('in-flight %s blocks duplicate confirm and cancel', async decision => {
  let resolve!: (value: { success: boolean }) => void;
  api[decision].mockReturnValueOnce(new Promise(r => { resolve = r; }));
  render(<ProductServiceApprovalPage />); await open(decision);
  const button = confirm(decision), cancel = screen.getByRole('button', { name: '취소', exact: true });
  act(() => { fireEvent.click(button); fireEvent.click(button); fireEvent.click(cancel); });
  expect(api[decision]).toHaveBeenCalledTimes(1);
  expect(confirm(decision).disabled).toBe(true); expect(input(decision).disabled).toBe(true);
  expect((cancel as HTMLButtonElement).disabled).toBe(true);
  await act(async () => { resolve({ success: false }); });
  expect(confirm(decision).disabled).toBe(false); expect(input(decision).value).toBe('보존할 입력');
});

it('partial success clears selection even if the follow-up read fails', async () => {
  api.batchApprove.mockResolvedValueOnce(batchResult('approve', 1, 1));
  api.list.mockResolvedValueOnce(listResult()).mockRejectedValueOnce(new Error('검증 조회 실패'));
  render(<ProductServiceApprovalPage />); await open('approve', true); fireEvent.click(confirm('approve'));
  await screen.findByText('검증 조회 실패');
  expect(screen.getByRole('status').textContent).toContain('1건 완료, 1건 실패');
  expect(screen.queryByRole('button', { name: /일괄 승인/ })).toBeNull();
  expect(screen.queryByPlaceholderText(inputPlaceholder('approve'))).toBeNull();
});

it('ignores a late write result after unmount without starting a follow-up read', async () => {
  let resolve!: (value: { success: boolean }) => void;
  api.approve.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  const view = render(<ProductServiceApprovalPage />); await open('approve'); fireEvent.click(confirm('approve'));
  view.unmount(); await act(async () => { resolve({ success: true }); });
  expect(api.list).toHaveBeenCalledTimes(1);
});

it('rechecks management permission before submitting an already open modal', async () => {
  const view = render(<ProductServiceApprovalPage />); await open('approve');
  auth.roles = ['lecture:operator']; view.rerender(<ProductServiceApprovalPage />);
  expect(confirm('approve').disabled).toBe(true);
  fireEvent.click(confirm('approve')); expect(api.approve).not.toHaveBeenCalled();
});
