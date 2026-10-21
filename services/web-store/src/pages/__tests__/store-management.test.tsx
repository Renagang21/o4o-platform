import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import StoreHandledProductsPage from '../pharmacy/StoreHandledProductsPage';
import { StoreLibraryNavigation } from '../../components/StoreLibraryNavigation';
import MyServicesPage from '../MyServicesPage';
import SupplyOptionsPage from '../neture-pharmacy/SupplyOptionsPage';
import PharmacyContentSourcesPage from '../neture-pharmacy/PharmacyContentSourcesPage';
import PharmacyOrdersPage from '../neture-pharmacy/PharmacyOrdersPage';

const mocks = vi.hoisted(() => ({
  organizationId: 'store-a', serviceKey: 'kpa-society', products: vi.fn(), create: vi.fn(), update: vi.fn(), single: vi.fn(),
  businesses: vi.fn(), supply: vi.fn(), contents: vi.fn(), orders: vi.fn(), copy: vi.fn(),
}));
vi.mock('../../lib/storeOrganizationHeader', async original => ({ ...(await original<object>()), getActiveStoreOrganizationId: () => mocks.organizationId }));
vi.mock('../../lib/serviceContext', async original => ({ ...(await original<object>()), getActiveServiceKey: () => mocks.serviceKey }));
vi.mock('../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ organizationId: mocks.organizationId, effectiveServiceKey: mocks.serviceKey }) }));
vi.mock('../../contexts/AuthContext', () => ({ getAccessToken: () => null, useAuth: () => ({ user: { id: 'user-a' } }) }));
vi.mock('../../api/handledProducts', () => ({ fetchHandledProducts: mocks.products, removeHandledProducts: vi.fn() }));
vi.mock('../../api/localProducts', () => ({ createLocalProduct: mocks.create, updateLocalProduct: mocks.update, getLocalProduct: mocks.single }));
vi.mock('../../api/neturePharmacy', () => ({
  neturePharmacyApi: { listSemiFranchises: mocks.businesses, listSupplyOptions: mocks.supply, listContents: mocks.contents, listOrders: mocks.orders, copyContent: mocks.copy },
  pharmacyErrorMessage: (e: Error) => e.message, pharmacyErrorCode: () => null,
}));
vi.mock('../pharmacy/StoreLocalProductsPage', () => ({ ProductFormModal: ({ onSave, product }: { onSave: (v: unknown) => void; product: { name: string } | null }) => <div><output data-testid="local-form">{product?.name ?? '신규 제품'}</output><button onClick={() => onSave({ name: '직접 등록 샘플' })}>제품 저장</button></div> }));
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
function LocationProbe() { const location = useLocation(); return <output data-testid="location">{location.pathname + location.search}</output>; }
function mount(node: React.ReactNode, path = '/') { return render(<MemoryRouter initialEntries={[path]}>{node}<LocationProbe /></MemoryRouter>); }
beforeEach(() => {
  cleanup(); vi.clearAllMocks(); mocks.organizationId = 'store-a'; mocks.serviceKey = 'kpa-society';
  mocks.products.mockResolvedValue({ items: [], pagination: { total: 0 } });
  mocks.create.mockResolvedValue({ id: 'local-new' });
  mocks.businesses.mockResolvedValue(businesses);
  mocks.supply.mockResolvedValue({ items: [], total: 0 });
  mocks.contents.mockResolvedValue({ items: [], total: 0 });
  mocks.orders.mockResolvedValue([]);
});

it('returning from product guidance restores selection only from the current confirmed product page', async () => {
  const path = '/store/workspace/commerce?q=Sample&source=local&page=2&limit=50';
  const row = { sourceType: 'local', sourceId: 'one', name: 'Sample', isActive: true };
  mocks.products.mockResolvedValue({ items: [row], pagination: { total: 51 } });
  render(<MemoryRouter initialEntries={[{ pathname: '/store/workspace/commerce', search: '?q=Sample&source=local&page=2&limit=50',
    state: { productReturn: { path, scope: 'store-a:kpa-society', selectedKey: 'local:one' } },
  }]}><StoreHandledProductsPage workspace /></MemoryRouter>);
  await screen.findByText('1개 선택됨');
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Sample');
  expect(mocks.products).toHaveBeenCalledWith({ page: 2, limit: 50, search: 'Sample', source: 'local' });
});
it('browser back from guidance also restores the originating product selection and query', async () => {
  mocks.products.mockResolvedValue({ items: [{ sourceType: 'local', sourceId: 'one', name: 'Sample', isActive: true }], pagination: { total: 51 } });
  function Back() { const navigate = useNavigate(); return <button onClick={() => navigate(-1)}>브라우저 뒤로</button>; }
  render(<MemoryRouter initialEntries={['/store/workspace/commerce?q=Sample&source=local&page=2&limit=50']}><Routes>
    <Route path="/store/workspace/commerce" element={<StoreHandledProductsPage workspace />} />
    <Route path="/store/library/contents" element={<Back />} />
  </Routes></MemoryRouter>);
  await screen.findByText('Sample');
  fireEvent.click(screen.getAllByRole('checkbox')[1]);
  fireEvent.click(screen.getByRole('button', { name: '콘텐츠 만들기' }));
  fireEvent.click(await screen.findByRole('button', { name: '브라우저 뒤로' }));
  await screen.findByText('1개 선택됨');
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Sample');
});

describe('내 매장 경영지원', () => {
  it('약국 문맥에서 자료 가져오기 입구를 제공한다', () => {
    mount(<StoreLibraryNavigation section="mine" />);
    expect(screen.getByRole('link', { name: '제공 자료' }).getAttribute('href')).toBe('/store/pharmacy/contents');
  });
  it('PharmacyHub 문맥에서는 약국 전용 자료 입구를 숨기고 내 자료함 기능을 보존한다', () => {
    mocks.serviceKey = 'pharmacy-hub';
    mount(<StoreLibraryNavigation section="mine" />);
    expect(screen.queryByRole('link', { name: '자료 가져오기' })).toBeNull();
    expect(screen.getByRole('link', { name: '파일 · 참고 자료' })).toBeTruthy();
  });
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
    await screen.findByRole('heading', { name: '혈당관리 사업' });
    expect(screen.getByRole('heading', { name: '이용 사업 · 가입 관리' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: '공급 상품' }).map(x => x.getAttribute('href'))).toEqual([
      '/store/pharmacy/supply?source=sf%3Apharmacy', '/store/pharmacy/supply?source=sf%3Adiabetes',
    ]);
    expect(screen.queryByText('KPA Society')).toBeNull();
  });
  it('공급 탭은 승인 사업만 제공하고 선택한 사업 조건을 서버에 전달한다', async () => {
    mount(<SupplyOptionsPage />, '/store/pharmacy/supply');
    fireEvent.click(await screen.findByRole('button', { name: '혈당관리 사업' }));
    await waitFor(() => expect(mocks.supply).toHaveBeenLastCalledWith(expect.objectContaining({ business: 'diabetes' })));
    expect(screen.queryByRole('button', { name: '승인 대기 사업' })).toBeNull();
  });
  it('공급 제안의 승인된 배송조건과 최소금액을 약국에 표시한다', async () => {
    mocks.supply.mockResolvedValue({items:[{kind:'proposal',optionId:'proposal-a',offerId:'offer-a',productName:'조건 제품',supplierName:'가상 공급자',semiFranchiseKey:'diabetes',semiFranchiseName:'혈당관리 사업',unitPrice:1000,
      termsSnapshot:{version:1,baseShippingFee:2000,freeShippingThreshold:50000,minOrderAmount:10000}}],total:1});
    mount(<SupplyOptionsPage />, '/store/pharmacy/supply');
    await screen.findByText('조건 제품');
    expect(screen.getByText(/배송비 2,000원/)).toBeTruthy();
    expect(screen.getByText(/50,000원 이상 무료배송/)).toBeTruthy();
    expect(screen.getByText(/최소 주문 10,000원/)).toBeTruthy();
  });
  it('과거 제안에 고정 조건을 만들어 표시하지 않는다', async () => {
    mocks.supply.mockResolvedValue({items:[{kind:'proposal',optionId:'proposal-a',offerId:'offer-a',productName:'기존 제품',supplierName:'가상 공급자',semiFranchiseKey:'pharmacy',semiFranchiseName:'기본 약국 사업',unitPrice:1000,termsSnapshot:null}],total:1});
    mount(<SupplyOptionsPage />, '/store/pharmacy/supply');
    await screen.findByText('기존 제품');expect(screen.getByText(/기존 제안 · 공급자 공통 배송정책 적용/)).toBeTruthy();
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const sourceRow = (title: string) => ({ id: title, title, summary: null, body: null, tags: [], semiFranchiseKey: 'diabetes', semiFranchiseName: '사업', publishedAt: null });
const supplyRow = (productName: string) => ({ productName, kind: 'default', optionId: productName, supplierName: '공급자', unitPrice: 100, semiFranchiseName: '사업', semiFranchiseKey: 'diabetes' });

describe('사업 조회 응답 순서', () => {
  it.each(['자료', '공급'] as const)('%s: 이전 사업 응답이 늦게 도착해도 현재 목록을 덮어쓰지 않는다', async kind => {
    const previous = deferred<{ items: unknown[]; total: number }>();
    const current = deferred<{ items: unknown[]; total: number }>();
    const api = kind === '자료' ? mocks.contents : mocks.supply;
    const row = kind === '자료' ? sourceRow : supplyRow;
    api.mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise);
    mount(kind === '자료' ? <PharmacyContentSourcesPage /> : <SupplyOptionsPage />);
    fireEvent.click(await screen.findByRole('button', { name: '혈당관리 사업' }));
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    await act(async () => { current.resolve({ items: [row('현재 항목')], total: 1 }); });
    await screen.findByText('현재 항목');
    await act(async () => { previous.resolve({ items: [row('이전 항목')], total: 1 }); });
    expect(screen.queryByText('이전 항목')).toBeNull();
    expect(screen.getByText('현재 항목')).toBeTruthy();
  });
  it('이전 사업의 실패가 현재 성공 목록에 오류를 표시하지 않는다', async () => {
    const previous = deferred<{ items: unknown[]; total: number }>();
    mocks.contents.mockReturnValueOnce(previous.promise).mockResolvedValueOnce({ items: [sourceRow('현재 자료')], total: 1 });
    mount(<PharmacyContentSourcesPage />);
    fireEvent.click(await screen.findByRole('button', { name: '혈당관리 사업' }));
    await screen.findByText('현재 자료');
    await act(async () => { previous.reject(new Error('이전 사업 조회 실패')); });
    expect(screen.queryByText('이전 사업 조회 실패')).toBeNull();
  });
  it('현재 사업 조회 실패 시 이전 자료의 복사 버튼을 남기지 않는다', async () => {
    mocks.contents.mockResolvedValueOnce({ items: [sourceRow('이전 자료')], total: 1 }).mockRejectedValueOnce(new Error('현재 사업 조회 실패'));
    mount(<PharmacyContentSourcesPage />);
    await screen.findByText('이전 자료');
    fireEvent.click(await screen.findByRole('button', { name: '혈당관리 사업' }));
    await screen.findByText('현재 사업 조회 실패');
    expect(screen.queryByText('이전 자료')).toBeNull();
  });
});

describe('제작·사본 동선', () => {
  it('직접 등록 제품을 선택해 제작을 시작하면 제품 문맥을 유지한다', async () => {
    mocks.products.mockResolvedValue({ items: [{ sourceType: 'local', sourceId: 'local-a', name: '제품 문맥', imageUrl: null, price: null, originLabel: '직접 등록', ownerLabel: '내 매장', isActive: true, classificationCode: '', classificationLabel: '', updatedAt: '', managePath: '' }], pagination: { total: 1 } });
    mount(<StoreHandledProductsPage />, '/store/my-products');
    fireEvent.click(await screen.findByRole('checkbox', { name: 'local:local-a 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '콘텐츠 만들기' }));
    const url = new URL(screen.getByTestId('location').textContent!, 'http://local.test');
    expect(url.pathname).toBe('/store/library/contents');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ create: '1', pType: 'local', pId: 'local-a', pName: '제품 문맥' });
  });
  it('사업 자료 사본을 만든 뒤 내 자료함의 동일 관리 흐름으로 연결한다', async () => {
    mocks.contents.mockResolvedValue({ items: [sourceRow('복사 자료')], total: 1 });
    mocks.copy.mockResolvedValue({ snapshotId: 'snapshot-a' });
    mount(<PharmacyContentSourcesPage />);
    fireEvent.click(await screen.findByRole('button', { name: '내 매장 사본 만들기' }));
    await waitFor(() => expect(mocks.copy).toHaveBeenCalledWith('복사 자료'));
    expect((await screen.findByRole('link', { name: '내 매장 자료함에서 보기' })).getAttribute('href')).toBe('/store/library/contents');
  });
});

const localRow = (id: string) => ({ sourceType: 'local', sourceId: id, name: id, imageUrl: null, price: null, originLabel: '직접 등록', ownerLabel: '내 매장', isActive: true, classificationCode: '', classificationLabel: '', updatedAt: '', managePath: '' });
it('늦은 제품 조회가 새 직접 등록 양식을 덮어쓰지 않는다', async () => {
  const pending = deferred<{ id: string; name: string }>(); mocks.single.mockReturnValue(pending.promise);
  mocks.products.mockResolvedValue({ items: [localRow('local-a')], pagination: { total: 1 } });
  mount(<StoreHandledProductsPage />);
  fireEvent.click(await screen.findByRole('checkbox', { name: 'local:local-a 선택' }));
  fireEvent.click(screen.getByRole('button', { name: '직접 등록 제품 수정' }));
  fireEvent.click(screen.getByRole('button', { name: /^직접 등록하기$/ }));
  await act(async () => pending.resolve({ id: 'local-a', name: '이전 제품' }));
  expect(screen.getByTestId('local-form').textContent).toBe('신규 제품');
});
it('제품 변경 후 늦은 이전 조회가 현재 수정 대상을 덮어쓰지 않는다', async () => {
  const old = deferred<{ id: string; name: string }>();
  mocks.single.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ id: 'local-b', name: '현재 제품' });
  mocks.products.mockResolvedValue({ items: [localRow('local-a'), localRow('local-b')], pagination: { total: 2 } });
  mount(<StoreHandledProductsPage />);
  const first = await screen.findByRole('checkbox', { name: 'local:local-a 선택' });
  fireEvent.click(first); fireEvent.click(screen.getByRole('button', { name: '직접 등록 제품 수정' }));
  fireEvent.click(first); fireEvent.click(screen.getByRole('checkbox', { name: 'local:local-b 선택' }));
  fireEvent.click(screen.getByRole('button', { name: '직접 등록 제품 수정' }));
  await screen.findByText('현재 제품');
  await act(async () => old.resolve({ id: 'local-a', name: '이전 제품' }));
  expect(screen.getByTestId('local-form').textContent).toBe('현재 제품');
});
it('매장 전환 후 이전 제품 조회 실패를 표시하지 않는다', async () => {
  const pending = deferred<{ id: string; name: string }>(); mocks.single.mockReturnValue(pending.promise);
  mocks.products.mockResolvedValue({ items: [localRow('local-a')], pagination: { total: 1 } });
  const view = mount(<StoreHandledProductsPage />);
  fireEvent.click(await screen.findByRole('checkbox', { name: 'local:local-a 선택' }));
  fireEvent.click(screen.getByRole('button', { name: '직접 등록 제품 수정' }));
  mocks.organizationId = 'store-b'; view.rerender(<MemoryRouter><StoreHandledProductsPage /></MemoryRouter>);
  await act(async () => pending.reject(new Error('이전 제품 조회 실패')));
  const { toast } = await import('@o4o/error-handling');
  expect(toast.error).not.toHaveBeenCalled();
  expect(screen.queryByTestId('local-form')).toBeNull();
});
it('저장 중 중복 제출과 다른 등록 화면 진입을 막는다', async () => {
  const pending = deferred<{ id: string }>(); mocks.create.mockReturnValue(pending.promise);
  mount(<StoreHandledProductsPage />);
  fireEvent.click(screen.getByRole('button', { name: /^직접 등록하기$/ }));
  const save = screen.getByRole('button', { name: '제품 저장' });
  fireEvent.click(save); fireEvent.click(save);
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect((screen.getByRole('button', { name: /^직접 등록하기$/ }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => pending.resolve({ id: 'new-local' }));
  expect(screen.queryByTestId('local-form')).toBeNull();
});
it('매장 전환 후 이전 저장 완료가 성공 알림이나 새 목록 갱신을 만들지 않는다', async () => {
  const pending = deferred<{ id: string }>(); mocks.create.mockReturnValue(pending.promise);
  const view = mount(<StoreHandledProductsPage />);
  fireEvent.click(screen.getByRole('button', { name: /^직접 등록하기$/ }));
  fireEvent.click(screen.getByRole('button', { name: '제품 저장' }));
  mocks.organizationId = 'store-b'; view.rerender(<MemoryRouter><StoreHandledProductsPage /></MemoryRouter>);
  await waitFor(() => expect(mocks.products).toHaveBeenCalledTimes(2));
  await act(async () => pending.resolve({ id: 'new-local' }));
  const { toast } = await import('@o4o/error-handling');
  expect(toast.success).not.toHaveBeenCalled();
  expect(mocks.products).toHaveBeenCalledTimes(2);
});
