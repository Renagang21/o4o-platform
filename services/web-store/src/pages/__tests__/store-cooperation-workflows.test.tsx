import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import SupplyOptionsPage from '../neture-pharmacy/SupplyOptionsPage';
import PharmacyRecruitmentsPage from '../neture-pharmacy/PharmacyRecruitmentsPage';
import PharmacyOrdersPage from '../neture-pharmacy/PharmacyOrdersPage';

const api = vi.hoisted(() => ({
  store: 'A', user: 'owner-a', listSemiFranchises: vi.fn(), listSupplyOptions: vi.fn(), addCartItem: vi.fn(),
  listRecruitments: vi.fn(), applyRecruitment: vi.fn(), listOrders: vi.fn(), cancelOrder: vi.fn(),
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: api.user } }) }));
vi.mock('../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ organizationId: api.store }) }));
vi.mock('../../lib/storeOrganizationHeader', async original => ({ ...(await original<object>()), getActiveStoreOrganizationId: () => api.store }));
vi.mock('../../lib/serviceContext', async original => ({ ...(await original<object>()), getActiveServiceKey: () => 'kpa-society' }));
vi.mock('../../api/neturePharmacy', () => ({ neturePharmacyApi: api, pharmacyErrorMessage: (error: Error, fallback: string) => error.message || fallback }));
vi.mock('../neture-pharmacy/PaymentGroupPay', () => ({ usePaymentMode: () => 'disabled', PaymentGroupPay: () => null }));
const businesses = [
  { key: 'network-a', name: '협업체 A', membershipStatus: 'active', communityKey: null },
  { key: 'network-b', name: '협업체 B', membershipStatus: 'active', communityKey: null },
];
const option = { kind: 'recruitment', optionId: 'rec-a', productName: '합성 제품', supplierName: '합성 공급자', semiFranchiseKey: null, semiFranchiseName: '일반 공개', unitPrice: 2500 };
function Probe() {
  const location = useLocation(), navigate = useNavigate();
  return <><output data-testid="location">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>뒤로</button></>;
}
function show(node: React.ReactNode, entry = '/store/pharmacy/supply') {
  return render(<MemoryRouter initialEntries={[entry]}>{node}<Probe /></MemoryRouter>);
}
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.resetAllMocks(); api.store = 'A'; api.user = 'owner-a';
  api.listSemiFranchises.mockResolvedValue(businesses);
  api.listSupplyOptions.mockResolvedValue({ items: [], total: 0 });
  api.listRecruitments.mockResolvedValue([]);
  api.listOrders.mockResolvedValue([]);
  api.addCartItem.mockResolvedValue({});
});
afterEach(cleanup);

it('keeps every joined business tab when both businesses have zero products', async () => {
  show(<SupplyOptionsPage />);
  fireEvent.click(await screen.findByRole('button', { name: '협업체 B' }));
  await screen.findByText('협업체 B에서 지금 주문할 수 있는 상품이 없습니다.');
  expect(screen.getByRole('button', { name: '협업체 A' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '협업체 B' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.queryByText(/가입 승인된 협업체가 없습니다/)).toBeNull();
});
it('membership failure is retryable and is never described as an unjoined store', async () => {
  api.listSemiFranchises.mockRejectedValueOnce(new Error('Synthetic unavailable'));
  show(<SupplyOptionsPage />);
  fireEvent.click(await screen.findByRole('button', { name: '협업체 다시 확인' }));
  await screen.findByRole('button', { name: '협업체 B' });
  expect(api.listSemiFranchises).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByText(/가입 승인된 협업체가 없습니다/)).toBeNull();
});
it('business, kind and search remain independent and browser back restores the previous query', async () => {
  show(<SupplyOptionsPage />, '/work/kpa-society/store/pharmacy/supply?source=sf%3Anetwork-a&q=old&page=2');
  await screen.findByRole('button', { name: '협업체 A' });
  fireEvent.click(screen.getByText('공급 종류 선택'));
  fireEvent.click(screen.getByRole('tab', { name: '모집 참여' }));
  await waitFor(() => expect(api.listSupplyOptions).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'recruitment', business: 'network-a', q: 'old', page: 1 })));
  fireEvent.change(screen.getByRole('textbox', { name: '주문 상품 검색' }), { target: { value: 'new' } });
  fireEvent.click(screen.getByRole('button', { name: '검색' }));
  await waitFor(() => expect(api.listSupplyOptions).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'recruitment', business: 'network-a', q: 'new' })));
  fireEvent.click(screen.getByRole('button', { name: '뒤로' }));
  await waitFor(() => expect((screen.getByRole('textbox', { name: '주문 상품 검색' }) as HTMLInputElement).value).toBe('old'));
  expect(screen.getByRole('link', { name: '판매처 모집' }).getAttribute('href')).toBe('/work/kpa-society/store/pharmacy/recruitments');
});
it('duplicate add is locked, and a failure preserves the product and typed quantity for retry', async () => {
  const pending = deferred<object>();
  api.listSupplyOptions.mockResolvedValue({ items: [option], total: 1 });
  api.addCartItem.mockReturnValueOnce(pending.promise);
  show(<SupplyOptionsPage />);
  const quantity = await screen.findByRole('spinbutton', { name: '합성 제품 수량' });
  fireEvent.change(quantity, { target: { value: '3' } });
  const add = screen.getByRole('button', { name: '장바구니 담기' });
  fireEvent.click(add); fireEvent.click(add);
  expect(api.addCartItem).toHaveBeenCalledTimes(1);
  await act(async () => pending.reject(new Error('Synthetic add failed')));
  await screen.findByRole('alert');
  expect((quantity as HTMLInputElement).value).toBe('3');
  expect(screen.getByText('합성 제품')).toBeTruthy();
  fireEvent.click(add);
  await screen.findByText(/3개를 장바구니에 담았습니다/);
  expect(api.addCartItem).toHaveBeenLastCalledWith('recruitment', 'rec-a', 3);
});
it.each(['store', 'account'])('discards late membership and product responses after a %s switch', async mode => {
  const oldBusinesses = deferred<typeof businesses>(), oldProducts = deferred<object>();
  api.listSemiFranchises.mockReturnValueOnce(oldBusinesses.promise).mockResolvedValue([businesses[1]]);
  api.listSupplyOptions.mockReturnValueOnce(oldProducts.promise);
  const tree = () => <MemoryRouter><SupplyOptionsPage /></MemoryRouter>;
  const { rerender } = render(tree());
  if (mode === 'store') api.store = 'B'; else api.user = 'owner-b';
  rerender(tree());
  await screen.findByRole('button', { name: '협업체 B' });
  await act(async () => { oldBusinesses.resolve([businesses[0]]); oldProducts.resolve({ items: [option], total: 1 }); });
  expect(screen.queryByRole('button', { name: '협업체 A' })).toBeNull();
  expect(screen.queryByText('합성 제품')).toBeNull();
});
it('approved recruitment links to the one ordering page only when conditions are orderable', async () => {
  api.listRecruitments.mockResolvedValue([
    { id: 'rec-a', productName: '주문 가능', applicationStatus: 'approved', orderable: true, supplyUnitPrice: 2500 },
    { id: 'rec-b', productName: '조건 미확정', applicationStatus: 'approved', orderable: false, supplyUnitPrice: null },
  ]);
  show(<PharmacyRecruitmentsPage />, '/work/kpa-society/store/pharmacy/recruitments');
  fireEvent.click(await screen.findByRole('button', { name: '일반 공개 모집' }));
  const link = await screen.findByRole('link', { name: /상품 주문으로/ });
  expect(link.getAttribute('href')).toBe('/work/kpa-society/store/pharmacy/supply?source=recruitment&recruitment=rec-a');
  expect(screen.getByText('주문 조건 확인 필요')).toBeTruthy();
});
it('application failure retains the selected business and the same retry action', async () => {
  api.listRecruitments.mockResolvedValue([{ id: 'rec-a', semiFranchiseKey: 'network-b', productName: '신청 제품', applicationStatus: null }]);
  api.applyRecruitment.mockRejectedValueOnce(new Error('Synthetic apply failed')).mockResolvedValue({});
  show(<PharmacyRecruitmentsPage />, '/store/pharmacy/recruitments?business=network-b');
  fireEvent.click(await screen.findByRole('button', { name: '참여 신청' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: '협업체 B' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '참여 신청' }));
  await screen.findByText(/모집에 참여 신청했습니다/);
  expect(api.applyRecruitment).toHaveBeenCalledTimes(2);
});
it('past orders remain readable without active memberships and public orders use their saved provenance', async () => {
  api.listSemiFranchises.mockResolvedValue([]);
  api.listOrders.mockResolvedValue([
    { id: 'old', orderNumber: 'ORDER-OLD', totalAmount: 1000, status: 'paid', paymentStatus: 'paid', items: [{ productName: '과거 제품', metadata: { semiFranchiseKey: 'terminated-business' } }] },
    { id: 'public', orderNumber: 'ORDER-PUBLIC', totalAmount: 2500, status: 'paid', paymentStatus: 'paid', items: [{ productName: '공개 제품', metadata: { supplyKind: 'recruitment', semiFranchiseKey: null } }] },
  ]);
  show(<PharmacyOrdersPage />, '/store/pharmacy/orders?business=terminated-business');
  await screen.findByText('ORDER-OLD');
  fireEvent.click(screen.getByRole('button', { name: '일반 공개 모집' }));
  await screen.findByText('ORDER-PUBLIC');
  expect(within(screen.getByRole('table', { name: '주문 목록' })).queryByText('ORDER-OLD')).toBeNull();
});
