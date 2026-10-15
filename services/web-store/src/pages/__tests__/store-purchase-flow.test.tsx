import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PharmacyCartPage from '../neture-pharmacy/PharmacyCartPage';
import PharmacyOrdersPage from '../neture-pharmacy/PharmacyOrdersPage';

const api = vi.hoisted(() => ({
  getCart: vi.fn(), updateCartItem: vi.fn(), removeCartItem: vi.fn(), checkout: vi.fn(),
  listOrders: vi.fn(), listSemiFranchises: vi.fn(), cancelOrder: vi.fn(),
}));
vi.mock('../../api/neturePharmacy', () => ({
  neturePharmacyApi: api, pharmacyErrorMessage: (e: Error) => e.message,
}));
vi.mock('../neture-pharmacy/PaymentGroupPay', () => ({
  usePaymentMode: () => 'test',
  PaymentGroupPay: ({ paymentGroupId }: { paymentGroupId: string }) => <button>결제 {paymentGroupId}</button>,
}));
vi.mock('../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ effectiveServiceKey: 'kpa-society' }) }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const cartItem = (id: string) => ({ id, productName: `상품 ${id}`, quantity: 1, unitPrice: 1000, available: true, kind: 'default' });
const order = (id: string) => ({
  id, orderNumber: id, status: 'created', paymentStatus: 'pending', totalAmount: 1000,
  createdAt: '2026-10-14T00:00:00Z', items: [{ productName: '상품' }], paymentGroupId: id,
});
const mount = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.listSemiFranchises.mockResolvedValue([]);
  api.listOrders.mockResolvedValue([]);
  api.getCart.mockResolvedValue([cartItem('A'), cartItem('B')]);
  api.updateCartItem.mockResolvedValue({});
  api.removeCartItem.mockResolvedValue({});
  api.checkout.mockResolvedValue({ createdOrders: [], paymentGroups: [], failedItems: [] });
});

describe('store purchase actions use current server state', () => {
  it('hides stale orders and payment actions after a refresh fails, without claiming an empty order history', async () => {
    api.listOrders.mockResolvedValueOnce([order('OLD')]).mockRejectedValueOnce(new Error('조회 실패'));
    mount(<PharmacyOrdersPage />);
    await screen.findByRole('button', { name: '결제 OLD' });
    fireEvent.click(screen.getByRole('button', { name: /새로고침/ }));
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: '결제 OLD' })).toBeNull();
    expect(screen.queryByText('OLD', { exact: true })).toBeNull();
    expect(screen.queryByText('주문 내역이 없습니다.')).toBeNull();
  });

  it('does not let an older initial response resurrect unpaid orders after the newer response', async () => {
    const old = deferred<ReturnType<typeof order>[]>();
    const latest = deferred<ReturnType<typeof order>[]>();
    api.listOrders.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
    render(<StrictMode><MemoryRouter><PharmacyOrdersPage /></MemoryRouter></StrictMode>);
    await waitFor(() => expect(api.listOrders).toHaveBeenCalledTimes(2));
    await act(async () => { latest.resolve([{ ...order('NEW'), status: 'paid', paymentStatus: 'paid' }]); });
    await screen.findByText('NEW', { exact: true });
    await act(async () => { old.resolve([order('OLD')]); });
    expect(screen.queryByText('OLD', { exact: true })).toBeNull();
    expect(screen.getByText('NEW', { exact: true })).toBeTruthy();
  });

  it('blocks checkout and other row mutations until a quantity update and its reload finish', async () => {
    const update = deferred<unknown>();
    api.updateCartItem.mockReturnValueOnce(update.promise);
    mount(<PharmacyCartPage />);
    const quantity = await screen.findByRole('spinbutton', { name: '상품 A 수량' });
    fireEvent.change(quantity, { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button', { name: '변경' })[0]);
    const checkout = screen.getByTestId('cart-checkout') as HTMLButtonElement;
    expect(checkout.disabled).toBe(true);
    expect((screen.getAllByRole('button', { name: '삭제' })[1] as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(checkout);
    expect(api.checkout).not.toHaveBeenCalled();
    await act(async () => { update.resolve({}); });
    await waitFor(() => expect((screen.getByTestId('cart-checkout') as HTMLButtonElement).disabled).toBe(false));
  });

  it('blocks quantity changes and deletion while checkout is pending', async () => {
    const pending = deferred<unknown>();
    api.checkout.mockReturnValueOnce(pending.promise);
    mount(<PharmacyCartPage />);
    fireEvent.click(await screen.findByTestId('cart-checkout'));
    expect((screen.getByRole('spinbutton', { name: '상품 A 수량' }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getAllByRole('button', { name: '삭제' })[0] as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { pending.resolve({ createdOrders: [], paymentGroups: [], failedItems: [] }); });
  });

  it('does not permit checkout from an old cart when the post-update reload fails', async () => {
    api.getCart.mockResolvedValueOnce([cartItem('A')]).mockRejectedValueOnce(new Error('카트 조회 실패'));
    mount(<PharmacyCartPage />);
    fireEvent.change(await screen.findByRole('spinbutton', { name: '상품 A 수량' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: '변경' }));
    await screen.findByRole('alert');
    expect(screen.queryByTestId('cart-checkout')).toBeNull();
    expect(screen.queryByText('장바구니가 비어 있습니다.')).toBeNull();
    api.getCart.mockResolvedValueOnce([{ ...cartItem('A'), quantity: 2 }]);
    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
    await screen.findByTestId('cart-checkout');
    expect((screen.getByRole('spinbutton', { name: '상품 A 수량' }) as HTMLInputElement).value).toBe('2');
  });

  it('requires an edited quantity to be applied before checkout', async () => {
    mount(<PharmacyCartPage />);
    fireEvent.change(await screen.findByRole('spinbutton', { name: '상품 A 수량' }), { target: { value: '3' } });
    const checkout = screen.getByTestId('cart-checkout') as HTMLButtonElement;
    expect(checkout.disabled).toBe(true);
    fireEvent.click(checkout);
    expect(api.checkout).not.toHaveBeenCalled();
    expect(screen.getByText('수량 변경을 적용한 후 주문을 확정해 주세요.')).toBeTruthy();
  });

  it('shows delivery and tracking separately from the checkout payment status', async () => {
    api.listOrders.mockResolvedValue([{ ...order('DELIVERY'), status: 'paid', paymentStatus: 'paid',
      fulfillmentStatus: 'delivered', shipment: { status: 'delivered', carrierName: '테스트 운송사', trackingNumber: 'TRACK-1' } }]);
    mount(<PharmacyOrdersPage />);
    await screen.findByText('DELIVERY', { exact: true });
    expect(screen.getByText('배송 완료')).toBeTruthy();
    expect(screen.getByText('테스트 운송사 · TRACK-1')).toBeTruthy();
    expect(screen.getAllByText('결제 완료')).toHaveLength(2);
  });

  it('uses the fulfillment status when a shipment record has not caught up', async () => {
    api.listOrders.mockResolvedValue([{ ...order('DIRECT-DELIVERY'), status: 'paid', paymentStatus: 'paid',
      fulfillmentStatus: 'delivered', shipment: { status: 'shipped', carrierName: '테스트 운송사', trackingNumber: 'TRACK-2' } }]);
    mount(<PharmacyOrdersPage />);
    await screen.findByText('배송 완료');
    expect(screen.queryByText('배송 중')).toBeNull();
    expect(screen.getByText('테스트 운송사 · TRACK-2')).toBeTruthy();
  });
});
