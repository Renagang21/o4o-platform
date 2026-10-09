import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StoreHandledProductsPage from '../pharmacy/StoreHandledProductsPage';
import MyServicesPage from '../MyServicesPage';
import SupplyOptionsPage from '../neture-pharmacy/SupplyOptionsPage';
import PharmacyContentSourcesPage from '../neture-pharmacy/PharmacyContentSourcesPage';
import PharmacyOrdersPage from '../neture-pharmacy/PharmacyOrdersPage';

const mocks = vi.hoisted(() => ({
  products: vi.fn(), create: vi.fn(), update: vi.fn(), single: vi.fn(),
  businesses: vi.fn(), supply: vi.fn(), contents: vi.fn(), orders: vi.fn(), copy: vi.fn(),
}));
vi.mock('../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ organizationId: 'store-a', effectiveServiceKey: 'kpa-society' }) }));
vi.mock('../../contexts/AuthContext', () => ({ getAccessToken: () => null, useAuth: () => ({ user: { id: 'user-a' } }) }));
vi.mock('../../api/handledProducts', () => ({ fetchHandledProducts: mocks.products, removeHandledProducts: vi.fn() }));
vi.mock('../../api/localProducts', () => ({ createLocalProduct: mocks.create, updateLocalProduct: mocks.update, getLocalProduct: mocks.single }));
vi.mock('../../api/neturePharmacy', () => ({
  neturePharmacyApi: { listSemiFranchises: mocks.businesses, listSupplyOptions: mocks.supply, listContents: mocks.contents, listOrders: mocks.orders, copyContent: mocks.copy },
  pharmacyErrorMessage: (e: Error) => e.message, pharmacyErrorCode: () => null,
}));
vi.mock('../pharmacy/StoreLocalProductsPage', () => ({ ProductFormModal: ({ onSave }: { onSave: (v: unknown) => void }) => <button onClick={() => onSave({ name: '직접 등록 샘플' })}>제품 저장</button> }));
vi.mock('../pharmacy/StoreDescriptionViewModal', () => ({ StoreDescriptionViewModal: () => null }));
vi.mock('../pharmacy/StoreProductQrModal', () => ({ StoreProductQrModal: () => null }));
vi.mock('../pharmacy/AddO4oStandardProductModal', () => ({ AddO4oStandardProductModal: () => null }));
vi.mock('../pharmacy/StoreNewProductRequestModal', () => ({ StoreNewProductRequestModal: () => null }));
vi.mock('../pharmacy/StoreProductRequestsListModal', () => ({ StoreProductRequestsListModal: () => null }));
vi.mock('../neture-pharmacy/PaymentGroupPay', () => ({ usePaymentMode: () => 'disabled', PaymentGroupPay: () => null }));
vi.mock('@o4o/content-editor', () => ({ ContentRenderer: () => null }));
vi.mock('@o4o/error-handling', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const businesses = [
  { key: 'pharmacy', name: '기본 약국 사업', membershipStatus: 'active', communityKey: null },
  { key: 'diabetes', name: '혈당관리 사업', membershipStatus: 'active', communityKey: null },
  { key: 'waiting', name: '승인 대기 사업', membershipStatus: 'pending', communityKey: null },
];
function mount(node: React.ReactNode, path = '/') { return render(<MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>); }
beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  mocks.products.mockResolvedValue({ items: [], pagination: { total: 0 } });
  mocks.create.mockResolvedValue({ id: 'local-new' });
  mocks.businesses.mockResolvedValue(businesses);
  mocks.supply.mockResolvedValue({ items: [], total: 0 });
  mocks.contents.mockResolvedValue({ items: [], total: 0 });
  mocks.orders.mockResolvedValue([]);
});

describe('내 매장 경영지원', () => {
  it('구매 이력 없이 두 등록 방식의 제품을 조회하고 직접 등록 후 같은 목록을 갱신한다', async () => {
    mount(<StoreHandledProductsPage />, '/store/my-products');
    await waitFor(() => expect(mocks.products).toHaveBeenCalledWith(expect.objectContaining({ source: 'all' })));
    fireEvent.click(screen.getByRole('button', { name: /^직접 등록하기$/ }));
    fireEvent.click(screen.getByRole('button', { name: '제품 저장' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ name: '직접 등록 샘플' }));
    await waitFor(() => expect(mocks.products).toHaveBeenCalledTimes(2));
  });
  it('직접 등록 제품은 지원하지 않는 O4O 고정 QR 대신 콘텐츠 QR을 사용한다', async () => {
    mocks.products.mockResolvedValue({ items: [{ sourceType: 'local', sourceId: 'local-a', name: '직접 제품', imageUrl: null, price: null, originLabel: '직접 등록', ownerLabel: '내 매장', isActive: true, classificationCode: '', classificationLabel: '', updatedAt: '', managePath: '' }], pagination: { total: 1 } });
    mount(<StoreHandledProductsPage />, '/store/my-products');
    fireEvent.click(await screen.findByRole('checkbox', { name: 'local:local-a 선택' }));
    expect(screen.getByRole('button', { name: '콘텐츠 QR 만들기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '상품 QR 출력' })).toBeNull();
    expect(screen.queryByRole('button', { name: '매장용 상세설명서 보기' })).toBeNull();
  });
  it('등록 방식 필터를 API로 전달한다', async () => {
    mount(<StoreHandledProductsPage />, '/store/my-products?source=local');
    await waitFor(() => expect(mocks.products).toHaveBeenCalledWith(expect.objectContaining({ source: 'local' })));
  });
  it('실제 사업 상태와 조건·업무 진입을 표시하며 대기 사업에는 공급 진입을 주지 않는다', async () => {
    mount(<MyServicesPage />, '/services');
    await screen.findByText('혈당관리 사업');
    expect(screen.getByRole('heading', { name: '이용 사업 · 가입 관리' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: '공급 상품' }).map(x => x.getAttribute('href'))).toEqual([
      '/store/pharmacy/supply?source=sf%3Apharmacy', '/store/pharmacy/supply?source=sf%3Adiabetes',
    ]);
    expect(screen.queryByText('KPA Society')).toBeNull();
  });
  it('공급 탭은 승인 사업만 제공하고 선택한 사업 조건을 서버에 전달한다', async () => {
    mount(<SupplyOptionsPage />, '/store/pharmacy/supply');
    fireEvent.click(await screen.findByRole('button', { name: '혈당관리 사업' }));
    await waitFor(() => expect(mocks.supply).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'sf:diabetes' })));
    expect(screen.queryByRole('button', { name: '승인 대기 사업' })).toBeNull();
  });
  it('제공 자료는 사업별 조회하고 독립 사본 원칙을 표시한다', async () => {
    mount(<PharmacyContentSourcesPage />, '/store/pharmacy/contents?business=diabetes');
    await waitFor(() => expect(mocks.contents).toHaveBeenCalledWith(expect.objectContaining({ sf: 'diabetes' })));
    expect(screen.getByText(/원본이 변경되어도 자동으로 업데이트되지 않습니다/)).toBeTruthy();
  });
  it('주문 탭은 저장된 사업 출처로 필터링하며 다른 사업 주문과 금액을 섞지 않는다', async () => {
    mocks.orders.mockResolvedValue([
      { id: 'a', orderNumber: 'ORDER-A', totalAmount: 1000, items: [{ productName: 'A제품', metadata: { semiFranchiseKey: 'pharmacy' } }], status: 'paid', paymentStatus: 'paid' },
      { id: 'b', orderNumber: 'ORDER-B', totalAmount: 2000, items: [{ productName: 'B제품', metadata: { semiFranchiseKey: 'diabetes' } }], status: 'paid', paymentStatus: 'paid' },
    ]);
    mount(<PharmacyOrdersPage />, '/store/pharmacy/orders?business=diabetes');
    await screen.findByText('ORDER-B');
    expect(screen.queryByText('ORDER-A')).toBeNull();
    expect(screen.getByText('2,000원')).toBeTruthy();
  });
});
