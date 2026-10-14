import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SupplierOrdersPage from '../SupplierOrdersPage';
import SupplierDashboardPage from '../SupplierDashboardPage';
import SupplierEventOfferPage from '../SupplierEventOfferPage';

const api = vi.hoisted(() => ({
  summary: vi.fn(), unified: vi.fn(), kpi: vi.fn(), orders: vi.fn(), inventory: vi.fn(), settlements: vi.fn(), approval: vi.fn(), profile: vi.fn(), recruitments: vi.fn(), descriptions: vi.fn(), trials: vi.fn(), stats: vi.fn(), performance: vi.fn(), distribution: vi.fn(), trending: vi.fn(), offers: vi.fn(), proposals: vi.fn(), available: vi.fn(), propose: vi.fn(),
  success: vi.fn(), error: vi.fn(),
}));
vi.mock('../../../lib/api', () => ({
  supplierApi: { getOrdersSummary: api.summary, getUnifiedOrders: api.unified, getOrderKpi: api.orders, getInventory: api.inventory, getSettlementKpi: api.settlements, getApprovalCounts: api.approval },
  supplierCopilotApi: { getKpi: api.kpi, getProductPerformance: api.performance, getDistribution: api.distribution, getTrendingProducts: api.trending },
  supplierProfileApi: { getProfile: api.profile }, supplierStoreDescriptionApi: { listMine: api.descriptions },
  supplierKpaEventOfferApi: { getStats: api.stats, listMyProposals: api.proposals, listMyOffers: api.available, proposeEventOfferToServices: api.propose },
  netureEventOfferApi: { getEnrichedOffers: api.offers }, PROFILE_FIELD_LABELS: {}, getInventoryStatus: () => 'untracked',
}));
vi.mock('../../../lib/api/supplier', () => ({ supplierRecruitmentApi: { listMine: api.recruitments } }));
vi.mock('../../../api/trial', () => ({ getMyTrials: api.trials }));
vi.mock('../../../api/guideContent', () => ({ fetchGuidePageContent: async () => ({}) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Fixture' } }) }));
vi.mock('../../../components/supplier/SupplierActivationGate', () => ({ default: ({ children }: {children: React.ReactNode}) => children }));
vi.mock('../../../components/supplier/SelectedSupplierProductBanner', () => ({ default: () => null }));
vi.mock('@o4o/shared-space-ui', () => ({ GuideBlock: () => null }));
vi.mock('@o4o/error-handling', () => ({ toast: { success: api.success, error: api.error } }));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.summary.mockResolvedValue({ services: [], totalApprovedSellers: 0, totalPendingRequests: 0 });
  api.unified.mockResolvedValue({ data: [], meta: { total: 0 } });
  api.kpi.mockResolvedValue({}); api.orders.mockResolvedValue({}); api.inventory.mockResolvedValue([]); api.settlements.mockResolvedValue({}); api.approval.mockResolvedValue({ total: 0, pending: 0, approved: 0, rejected: 0, unrequested: 0 }); api.profile.mockResolvedValue(null);
  for (const fn of [api.recruitments, api.descriptions, api.trials, api.performance, api.distribution, api.trending, api.proposals, api.available]) fn.mockResolvedValue([]);
  api.stats.mockResolvedValue(null); api.offers.mockResolvedValue({ data: [], meta: { total: 0, totalPages: 1 } });
});
const mount = (page: React.ReactNode, path = '/') => render(<MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>);

describe('supplier workspace read and proposal contracts', () => {
  it('keeps summary and unified failures independent and retries the selected area', async () => {
    api.summary.mockRejectedValueOnce(new Error('summary unavailable'));
    mount(<SupplierOrdersPage />);
    const retry = await screen.findByRole('button', { name: '다시 시도' });
    expect(api.unified).toHaveBeenCalledWith({ page: 1, limit: 20, source: 'all' });
    fireEvent.click(retry);
    await waitFor(() => expect(api.summary).toHaveBeenCalledTimes(2));
    expect(api.unified).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '이벤트/서비스 주문' }));
    await waitFor(() => expect(api.unified).toHaveBeenLastCalledWith({ page: 1, limit: 20, source: 'checkout' }));
  });
  it('stops dashboard secondary requests when the primary permission request fails', async () => {
    api.kpi.mockRejectedValue(new Error('403'));
    mount(<SupplierDashboardPage />);
    await screen.findByText('공급자 권한이 필요합니다.');
    expect(api.orders).not.toHaveBeenCalled();
    expect(api.performance).not.toHaveBeenCalled();
  });
  it('retries dashboard recruitment failure without refreshing other areas', async () => {
    api.recruitments.mockRejectedValueOnce(new Error('unavailable'));
    mount(<SupplierDashboardPage />);
    const message = await screen.findByText('판매자 모집 현황을 불러오지 못했습니다.');
    fireEvent.click(message.parentElement!.querySelector('button')!);
    await waitFor(() => expect(api.recruitments).toHaveBeenCalledTimes(2));
    expect(api.kpi).toHaveBeenCalledTimes(1);
    expect(api.orders).toHaveBeenCalledTimes(1);
  });
  it('retries event list failure without reloading proposals', async () => {
    api.offers.mockRejectedValueOnce(new Error('unavailable'));
    mount(<SupplierEventOfferPage />);
    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(api.offers).toHaveBeenCalledTimes(2));
    expect(api.proposals).toHaveBeenCalledTimes(1);
  });
  it('binds an incoming product once and preserves multi-service partial success', async () => {
    api.available.mockResolvedValue([{ id: 'offer-1', masterId: 'master-1', title: 'Fixture product', price: 1000 }]);
    api.propose.mockResolvedValue({ results: [{ targetServiceKey: 'kpa-society', status: 'created' }, { targetServiceKey: 'k-cosmetics', status: 'already_proposed' }] });
    const { container } = mount(<SupplierEventOfferPage />, '/?supplierProductId=offer-1');
    await screen.findByText('Fixture product');
    await waitFor(() => expect((container.querySelector('input[type="radio"]') as HTMLInputElement).checked).toBe(true));
    fireEvent.click(screen.getByLabelText('K-Cosmetics'));
    const values = ['900', '2030-01-01T10:00', '2030-01-02T10:00', '', '', ''];
    container.querySelectorAll('input[type="number"], input[type="datetime-local"]').forEach((input, i) => fireEvent.change(input, { target: { value: values[i] } }));
    fireEvent.click(screen.getByRole('button', { name: '제안하기' }));
    await waitFor(() => expect(api.propose).toHaveBeenCalledWith('offer-1', ['kpa-society', 'k-cosmetics'], {
      eventPrice: 900, startAt: new Date(values[1]).toISOString(), endAt: new Date(values[2]).toISOString(), totalQuantity: null, perOrderLimit: null, perStoreLimit: null,
    }));
    await waitFor(() => expect(api.success).toHaveBeenCalledWith('KPA Society: 제안되었습니다.'));
    expect(api.error).toHaveBeenCalledWith('K-Cosmetics: 이미 제안된 상품입니다.');
    await waitFor(() => expect(api.proposals).toHaveBeenCalledTimes(2));
  });
  it('names service expansion and preserves keyboard-accessible state', async () => {
    api.summary.mockResolvedValue({ services: [{ serviceId: 'fixture', serviceName: 'Fixture service', summary: { approvedSellerCount: 1, pendingRequestCount: 0 }, navigation: {}, features: ['Fixture feature'], recentActivity: [], notice: '' }], totalApprovedSellers: 1, totalPendingRequests: 0 });
    mount(<SupplierOrdersPage />);
    const expand = await screen.findByRole('button', { name: 'Fixture service 상세 펼치기' });
    expect(expand.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(expand);
    expect(screen.getByText('Fixture feature')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fixture service 상세 접기' }).getAttribute('aria-expanded')).toBe('true');
  });
  it('keeps the metric panel expanded across a failed refresh and retry', async () => {
    mount(<SupplierDashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: /지표 분석/ }));
    await screen.findByText('상품 성과 (매출 TOP 5)');
    api.kpi.mockRejectedValueOnce(new Error('403'));
    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
    await screen.findByText('공급자 권한이 필요합니다.');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await screen.findByText('상품 성과 (매출 TOP 5)');
    expect(screen.getByRole('button', { name: /지표 분석/ }).getAttribute('aria-expanded')).toBe('true');
  });
  it('associates event inputs with labels and blocks an excessive event price', async () => {
    api.available.mockResolvedValue([{ id: 'offer-1', title: 'Fixture product', price: 1000 }]);
    mount(<SupplierEventOfferPage />, '/?supplierProductId=offer-1');
    await screen.findByText('Fixture product');
    fireEvent.change(screen.getByLabelText(/이벤트 공급가/), { target: { value: '1001' } });
    expect(screen.getByRole('button', { name: '제안하기' }).hasAttribute('disabled')).toBe(true);
    expect(api.propose).not.toHaveBeenCalled();
    for (const label of [/시작 일시/, /종료 일시/, /총 수량/, /1회 주문 제한/, /매장별 제한/]) expect(screen.getByLabelText(label)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '이벤트 제안 닫기' }));
    expect(screen.queryByText('Fixture product')).toBeNull();
  });

});
