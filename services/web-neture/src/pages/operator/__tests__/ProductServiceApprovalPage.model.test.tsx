import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProductServiceApprovalPage from '../ProductServiceApprovalPage';
import type { ServiceApprovalItem } from '../../../lib/api/serviceApproval';

const mocks = vi.hoisted(() => ({
  list: vi.fn(), stats: vi.fn(), analytics: vi.fn(), batchApprove: vi.fn(), batchReject: vi.fn(),
  auth: { roles: ['neture:operator'] as string[] },
}));
vi.mock('../../../lib/api/serviceApproval', () => ({ operatorServiceApprovalApi: mocks }));
vi.mock('../../../contexts/AuthContext', () => ({ getAccessToken: () => null, useAuth: () => ({ user: mocks.auth }) }));
function item(id: string, approvalStatus: string): ServiceApprovalItem {
  return { id, approvalStatus, offerId: `offer-${id}`, serviceKey: 'kpa-society', productName: `검증상품-${id}`, barcode: '', supplierName: '검증공급자', decidedBy: null, decidedAt: null, reason: null, createdAt: '2026-01-01', regulatoryType: 'GENERAL', mfdsPermitNumber: null, isMfdsVerified: false, offerApprovalStatus: 'approved', distributionType: 'PUBLIC', completenessScore: 80, imageUrl: null, brandName: null, priceGeneral: 100, hasShortDescription: true, hasDetailDescription: true, imageCount: 0, isStale: false, isLowQualitySupplier: false, priority: 'LOW' };
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.auth.roles = ['neture:operator']; window.history.replaceState(null, '', '/');
  mocks.list.mockResolvedValue({ data: [item('pending-a', 'pending'), item('approved-b', 'approved'), item('rejected-c', 'rejected')], pagination: { page: 1, limit: 30, total: 3, totalPages: 1 } });
  mocks.stats.mockResolvedValue({ pending: 1, approved: 1, rejected: 1, total: 3, todayPending: 0 });
  mocks.analytics.mockResolvedValue(null); mocks.batchApprove.mockResolvedValue({ success: true }); mocks.batchReject.mockResolvedValue({ success: true });
});
afterEach(cleanup);

it('forwards combined page filters and preserves the search debounce input', async () => {
  render(<ProductServiceApprovalPage />);
  await screen.findByText('검증상품-pending-a');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'kpa-society' } });
  fireEvent.click(screen.getByRole('button', { name: '60-79', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: '문제 있음만', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'HIGH', exact: true }));
  fireEvent.change(screen.getByPlaceholderText('상품명 / 바코드 / 공급사 검색'), { target: { value: ' 상품 ' } });
  await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 30, serviceKey: 'kpa-society', search: ' 상품 ', minScore: 60, maxScore: 79, hasIssues: 'true', priority: 'HIGH' })));
});

it.each(['approve', 'reject'])('bulk %s passes only pending approval ids with the original memo/reason and refreshes', async action => {
  render(<ProductServiceApprovalPage />);
  await screen.findByText('검증상품-pending-a');
  fireEvent.click(screen.getByRole('checkbox', { name: '전체 선택' }));
  fireEvent.click(screen.getByRole('button', { name: action === 'approve' ? '일괄 승인 (1)' : '일괄 거절 (1)', exact: true }));
  fireEvent.change(screen.getByPlaceholderText(action === 'approve' ? '승인 메모를 입력하세요 (선택)' : '거절 사유를 입력하세요 (선택)'), { target: { value: '검증 사유' } });
  fireEvent.click(screen.getByRole('button', { name: action === 'approve' ? '승인 확인' : '거절 확인', exact: true }));
  await waitFor(() => expect(action === 'approve' ? mocks.batchApprove : mocks.batchReject).toHaveBeenCalledWith(['pending-a'], '검증 사유'));
  await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
});

it('keeps batch actions disabled without Neture management roles', async () => {
  mocks.auth.roles = ['lecture:operator'];
  render(<ProductServiceApprovalPage />);
  await screen.findByText('검증상품-pending-a');
  fireEvent.click(screen.getByRole('checkbox', { name: '전체 선택' }));
  expect((screen.getByRole('button', { name: '일괄 승인 (1)' }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: '일괄 거절 (1)' }) as HTMLButtonElement).disabled).toBe(true);
  expect(mocks.batchApprove).not.toHaveBeenCalled();
});
