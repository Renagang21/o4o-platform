import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import Page from '../ProductServiceApprovalPage';
import type { ServiceApprovalItem } from '../../../lib/api/serviceApproval';
const api = vi.hoisted(() => ({ list: vi.fn(), stats: vi.fn(), analytics: vi.fn(), approve: vi.fn(), reject: vi.fn() }));
const auth = vi.hoisted(() => ({ id: 'fixture-session', roles: ['neture:operator'] as string[] }));
vi.mock('../../../lib/api/serviceApproval', () => ({ operatorServiceApprovalApi: api }));
vi.mock('../../../contexts/AuthContext', () => ({ getAccessToken: () => null, useAuth: () => ({ user: auth }) }));
function item(id: string, approvalStatus: string): ServiceApprovalItem {
  return { id, approvalStatus, offerId: `offer-${id}`, serviceKey: 'kpa-society', productName: `검증상품-${id}`, barcode: '', supplierName: '검증공급자', decidedBy: null, decidedAt: null, reason: null, createdAt: '2026-01-01', regulatoryType: 'GENERAL', mfdsPermitNumber: null, isMfdsVerified: false, offerApprovalStatus: 'approved', distributionType: 'PUBLIC', completenessScore: 80, imageUrl: null, brandName: null, priceGeneral: 100, hasShortDescription: true, hasDetailDescription: true, imageCount: 0, isStale: false, isLowQualitySupplier: false, priority: 'LOW' };
}

beforeEach(() => {
  vi.resetAllMocks(); auth.roles = ['neture:operator']; window.history.replaceState(null, '', '/');
  api.list.mockResolvedValue({ data: [item('a', 'pending')], pagination: { page: 1, limit: 30, total: 1, totalPages: 1 } });
  api.stats.mockResolvedValue({ total: 1, pending: 1, approved: 0, rejected: 0, todayPending: 0 });
  api.analytics.mockResolvedValue(null); api.approve.mockResolvedValue({ success: true }); api.reject.mockResolvedValue({ success: true });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function openDrawer() {
  render(<Page />); fireEvent.click(await screen.findByText('검증상품-a'));
  return within(screen.getByRole('dialog', { name: '상품 상세' }));
}
it('opens full product detail and closes without another read', async () => {
  const drawer = await openDrawer();
  expect(drawer.getByText('검증상품-a')).toBeTruthy(); expect(drawer.getByText('APPROVED (80/100)', { exact: false })).toBeTruthy();
  expect(drawer.getByText('완성도 상세 (각 20점)')).toBeTruthy();
  fireEvent.click(drawer.getByRole('button', { name: '상품 상세 닫기' }));
  expect(screen.queryByRole('dialog', { name: '상품 상세' })).toBeNull(); expect(api.list).toHaveBeenCalledTimes(1);
});
it.each(['approve', 'reject'])('decides from Drawer with correct approval record and reason: %s', async (decision) => {
  const drawer = await openDrawer(); const reject = decision === 'reject';
  fireEvent.click(drawer.getByRole('button', { name: reject ? '거절' : '승인', exact: true }));
  const modal = within(screen.getByRole('dialog', { name: reject ? '승인 거절' : '상품 승인' }));
  fireEvent.change(modal.getByRole('textbox'), { target: { value: '상세에서 입력' } });
  fireEvent.click(modal.getByRole('button', { name: reject ? '거절 확인' : '승인 확인' }));
  await waitFor(() => expect(reject ? api.reject : api.approve).toHaveBeenCalledWith('a', '상세에서 입력'));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '상품 상세' })).toBeNull());
});
it('keeps rejection template and cancel input entirely in parent flow', async () => {
  const drawer = await openDrawer(); fireEvent.click(drawer.getByRole('button', { name: '거절', exact: true }));
  const modal = within(screen.getByRole('dialog', { name: '승인 거절' }));
  fireEvent.click(modal.getByRole('button', { name: /상품 이미지가 없습니다/ }));
  expect((modal.getByRole('textbox') as HTMLTextAreaElement).value).toBe('상품 이미지가 없습니다. 이미지를 추가한 후 다시 요청해 주세요.');
  fireEvent.click(modal.getByRole('button', { name: '취소' }));
  expect(screen.queryByRole('dialog', { name: '승인 거절' })).toBeNull(); expect(screen.getByRole('dialog', { name: '상품 상세' })).toBeTruthy(); expect(api.reject).not.toHaveBeenCalled();
});
it('keeps read-only role action guards in Drawer', async () => {
  auth.roles = ['neture:user']; const drawer = await openDrawer();
  for (const name of ['승인','거절']) expect((drawer.getByRole('button', { name, exact: true }) as HTMLButtonElement).disabled).toBe(true);
  expect(api.approve).not.toHaveBeenCalled(); expect(api.reject).not.toHaveBeenCalled();
});
it('shows completed decision reason with no pending actions', async () => {
  api.list.mockResolvedValue({ data: [{...item('a', 'rejected'), reason: '보완 필요'}], pagination: { page: 1, limit: 30, total: 1, totalPages: 1 } });
  const drawer = await openDrawer(); expect(drawer.getByText('거절 사유')).toBeTruthy(); expect(drawer.getByText('보완 필요')).toBeTruthy();
  expect(drawer.queryByRole('button', { name: '승인', exact: true })).toBeNull(); expect(drawer.queryByRole('button', { name: '거절', exact: true })).toBeNull();
});
