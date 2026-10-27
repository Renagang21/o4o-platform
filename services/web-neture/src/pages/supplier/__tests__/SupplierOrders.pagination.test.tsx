import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SupplierOrdersPage from '../SupplierOrdersPage';

const api = vi.hoisted(() => ({ summary: vi.fn(), unified: vi.fn() }));
vi.mock('../../../lib/api', () => ({ supplierApi: { getOrdersSummary: api.summary, getUnifiedOrders: api.unified } }));
function order(n: number) {
  return { id: `order-${n}`, source: 'neture_order', orderNumber: `TEST-${n}`, serviceKey: 'neture', orderType: 'neture', status: 'paid',
    paymentStatus: 'paid', fulfillmentStatus: null, supplierId: 'synthetic', buyerName: null, buyerOrganizationName: '검증 약국', testPayment: true,
    subtotal: 1000, shippingFee: 0, totalAmount: 1000, itemCount: 1, itemsPreview: [{ name: `검증 상품 ${n}`, quantity: 1 }],
    createdAt: '2026-10-27T00:00:00.000Z', updatedAt: null, canFulfill: true, fulfillmentUrl: `/supplier/orders/manage/order-${n}`, readOnlyReason: null };
}
function response(page = 1, total = 21) {
  const start = (page - 1) * 20;
  return { data: Array.from({ length: Math.min(20, Math.max(0, total - start)) }, (_, i) => order(start + i + 1)), meta: { page, limit: 20, total, totalPages: Math.ceil(total / 20) } };
}
const mount = () => render(<MemoryRouter><SupplierOrdersPage /></MemoryRouter>);
beforeEach(() => {
  vi.resetAllMocks();
  api.summary.mockResolvedValue({ services: [], totalApprovedSellers: 0, totalPendingRequests: 0 });
  api.unified.mockImplementation(async ({ page }) => response(page));
});
afterEach(cleanup);
it('lets the supplier reach the 21st order and its fulfillment link, then return to the first page', async () => {
  mount();
  await screen.findByText('TEST-1');
  fireEvent.click(screen.getByRole('button', { name: '통합 주문 다음 페이지' }));
  await screen.findByText('TEST-21');
  expect(api.unified).toHaveBeenLastCalledWith({ page: 2, limit: 20, source: 'all' });
  expect(screen.queryByText('TEST-1')).toBeNull();
  expect(screen.getByRole('link', { name: '주문 처리' }).getAttribute('href')).toBe('/supplier/orders/manage/order-21');
  expect((screen.getByRole('button', { name: '통합 주문 다음 페이지' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '통합 주문 이전 페이지' }));
  await screen.findByText('TEST-1');
  expect(api.unified).toHaveBeenLastCalledWith({ page: 1, limit: 20, source: 'all' });
});
it('keeps a page failure explicit and retries that page, while still allowing a return to page one', async () => {
  api.unified.mockResolvedValueOnce(response()).mockRejectedValueOnce(Error('fixture failure')).mockResolvedValueOnce(response(2));
  mount();await screen.findByText('TEST-1');
  fireEvent.click(screen.getByRole('button', { name: '통합 주문 다음 페이지' }));
  await screen.findByText('통합 주문을 불러오지 못했습니다.', { exact: false });
  expect(screen.queryByText('표시할 주문이 없습니다.')).toBeNull();
  expect((screen.getByRole('button', { name: '통합 주문 이전 페이지' }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByText('TEST-21');
  expect(api.unified).toHaveBeenLastCalledWith({ page: 2, limit: 20, source: 'all' });
});
it('resets the source to page one and discards the previous page response', async () => {
  let resolveOld!: (r: ReturnType<typeof response>) => void;
  const old = new Promise<ReturnType<typeof response>>(resolve => { resolveOld = resolve; });
  api.unified.mockResolvedValueOnce(response()).mockReturnValueOnce(old).mockResolvedValueOnce(response(1, 1));
  mount();await screen.findByText('TEST-1');
  fireEvent.click(screen.getByRole('button', { name: '통합 주문 다음 페이지' }));
  await waitFor(() => expect(api.unified).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole('button', { name: '이벤트/서비스 주문' }));
  await waitFor(() => expect(api.unified).toHaveBeenLastCalledWith({ page: 1, limit: 20, source: 'checkout' }));
  await screen.findByText('TEST-1');
  await act(async () => resolveOld(response(2)));
  expect(screen.queryByText('TEST-21')).toBeNull();
  expect(screen.getByText('TEST-1')).toBeTruthy();
  expect(api.summary).toHaveBeenCalledTimes(1);
});
it('keeps a way back when the last page disappears between requests', async () => {
  api.unified.mockResolvedValueOnce(response()).mockResolvedValueOnce(response(2, 20)).mockResolvedValueOnce(response(1, 20));
  mount();await screen.findByText('TEST-1');
  fireEvent.click(screen.getByRole('button', { name: '통합 주문 다음 페이지' }));
  await screen.findByText('이 페이지에 표시할 주문이 없습니다. 이전 페이지로 이동해 주세요.');
  expect(screen.getByText('2페이지 · 이전 페이지 확인')).toBeTruthy();
  expect((screen.getByRole('button', { name: '통합 주문 다음 페이지' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '통합 주문 이전 페이지' }));
  await screen.findByText('TEST-1');
});
