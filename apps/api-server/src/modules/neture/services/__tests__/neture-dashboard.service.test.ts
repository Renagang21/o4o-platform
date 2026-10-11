import { AppDataSource } from '../../../../database/connection.js';
import logger from '../../../../utils/logger.js';
import { NetureSupplier, SupplierProductOffer } from '../../entities/index.js';
import { NetureDashboardService } from '../neture-dashboard.service.js';
import { NetureSupplierDashboardService } from '../supplier-dashboard.service.js';
import { NetureAdminDashboardService } from '../admin-dashboard.service.js';
import { NetureSellerDashboardService } from '../seller-dashboard.service.js';

jest.mock('../../../../database/connection.js', () => ({ AppDataSource: { getRepository: jest.fn(), query: jest.fn() } }));
jest.mock('../../../../utils/logger.js', () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock('../../entities/index.js', () => ({
  NetureSupplier: class {}, SupplierProductOffer: class {},
  SupplierStatus: { ACTIVE: 'ACTIVE', PENDING: 'PENDING' },
  OfferApprovalStatus: { PENDING: 'PENDING' },
  OfferDistributionType: { PUBLIC: 'PUBLIC', SERVICE: 'SERVICE', PRIVATE: 'PRIVATE' },
}));
jest.mock('../../../../config/service-catalog.js', () => ({ getServiceOrigin: () => 'https://fixture.invalid' }));

const find = jest.fn();
const supplierCount = jest.fn();
const offerCount = jest.fn();
const query = AppDataSource.query as jest.Mock;
const counts = { totalRequests: 9, pendingRequests: 2, approvedRequests: 6, rejectedRequests: 1 };

beforeEach(() => {
  jest.resetAllMocks();
  (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
    if (entity === NetureSupplier) return { count: supplierCount };
    if (entity === SupplierProductOffer) return { count: offerCount, find };
    throw new Error('Unexpected repository');
  });
  find.mockResolvedValue([{ isActive: true }, { isActive: false }, { isActive: true }]);
  supplierCount.mockImplementation(async (options) => options?.where?.status === 'ACTIVE' ? 3 : options?.where?.status === 'PENDING' ? 2 : 7);
  offerCount.mockImplementation(async (options) => options?.where?.approvalStatus ? 4 : options?.where?.distributionType === 'PUBLIC' ? 5 : options?.where?.distributionType === 'SERVICE' ? 6 : options?.where?.distributionType === 'PRIVATE' ? 7 : 20);
});

function supplierSummaryRows(sql: string) {
  if (sql.includes('"totalRequests"')) return [counts];
  if (sql.includes('COUNT(DISTINCT pa.service_key)')) return [{ count: '2' }];
  if (sql.includes('pa.decided_at >= $2')) return [{ count: '3' }];
  return [{ serviceId: 'fixture-service', serviceName: 'Fixture', pending: 2, approved: 6, rejected: 1 }];
}

function orderRows(sql: string, bindings: string[]) {
  if (sql.includes('MAX(pa.decided_at)')) return [
    { serviceId: 'k-cosmetics', serviceName: 'Fixture service', approvedCount: '3', lastApprovedAt: 'fixture-date' },
    { serviceId: 'unknown-fixture-service', serviceName: 'Unknown', approvedCount: '2', lastApprovedAt: null },
  ];
  return [{ cnt: bindings[1] === 'k-cosmetics' ? 1 : 4 }];
}

function adminRows(sql: string) {
  if (sql.includes('"totalRequests"')) return [counts];
  if (sql.includes('GROUP BY approval_type')) return [{ approval_type: 'service', total: 9, pending: 2, approved: 6, rejected: 1 }];
  if (sql.includes('GROUP BY pa.service_key')) return [{ serviceId: 'fixture-service', serviceName: 'Fixture', suppliers: 3, organizations: 4 }];
  return [{ id: 'fixture-request', sellerId: 'fixture-store', createdAt: new Date('2026-01-01') }];
}

const actions = {
  products: '/store/manage/products/library', requests: '/store/manage/products',
  exposure: '/store/my-products', operations: '/store/orders',
};

describe('supplier dashboard read contracts', () => {
  it.each([NetureSupplierDashboardService, NetureDashboardService])('%p retains supplier statistics and approval totals', async (Reader) => {
    query.mockImplementation(supplierSummaryRows);
    const result = await new Reader().getSupplierDashboardSummary('fixture-supplier');
    expect(result).toEqual({ stats: { ...counts, recentApprovals: 3, totalProducts: 3, activeProducts: 2, totalContents: 0, publishedContents: 0, connectedServices: 2 }, serviceStats: [{ serviceId: 'fixture-service', serviceName: 'Fixture', pending: 2, approved: 6, rejected: 1 }], recentActivity: [] });
    expect(find).toHaveBeenCalledWith({ where: { supplierId: 'fixture-supplier' } });
    for (const [sql, bindings] of query.mock.calls) {
      expect(sql).toContain('spo.supplier_id = $1');
      expect(bindings[0]).toBe('fixture-supplier');
    }
    expect(supplierCount).not.toHaveBeenCalled();
    expect(offerCount).not.toHaveBeenCalled();
  });

  it('retains the seven-day cutoff as a bound Date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-20T12:00:00Z'));
    try {
      query.mockImplementation(supplierSummaryRows);
      await new NetureSupplierDashboardService().getSupplierDashboardSummary('fixture-supplier');
      expect(query.mock.calls[1][1]).toEqual(['fixture-supplier', new Date('2026-01-13T12:00:00Z')]);
    } finally { jest.useRealTimers(); }
  });

  it.each([NetureSupplierDashboardService, NetureDashboardService])('%p preserves service summaries, fallback links and request totals', async (Reader) => {
    query.mockImplementation(orderRows);
    const result = await new Reader().getSupplierOrdersSummary('fixture-supplier');
    expect(result.totalApprovedSellers).toBe(5);
    expect(result.totalPendingRequests).toBe(5);
    expect(result.services[0]).toMatchObject({ summary: { approvedSellerCount: 3, pendingRequestCount: 1, lastApprovedAt: 'fixture-date' }, navigation: { serviceUrl: 'https://fixture.invalid', ordersUrl: 'https://fixture.invalid/supplier/orders' }, recentActivity: [] });
    expect(result.services[1]).toMatchObject({ summary: { approvedSellerCount: 2, pendingRequestCount: 4, lastApprovedAt: null }, navigation: { serviceUrl: null, ordersUrl: null, supportEmail: null }, features: [], recentActivity: [] });
    expect(query.mock.calls.map(([, values]) => values)).toEqual([['fixture-supplier'], ['fixture-supplier', 'k-cosmetics'], ['fixture-supplier', 'unknown-fixture-service']]);
    expect(AppDataSource.getRepository).not.toHaveBeenCalled();
  });

  it('returns a genuinely empty service summary without extra queries', async () => {
    query.mockResolvedValue([]);
    expect(await new NetureSupplierDashboardService().getSupplierOrdersSummary('fixture-supplier')).toEqual({ services: [], totalApprovedSellers: 0, totalPendingRequests: 0 });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each([1, 2, 3, 4, 5])('propagates a required dashboard lookup failure at step %i', async (step) => {
    const error = new Error('fixture summary unavailable');
    let lookup = 0;
    query.mockImplementation(async (sql: string) => { if (++lookup === step) throw error; return supplierSummaryRows(sql); });
    find.mockImplementation(async () => { if (++lookup === step) throw error; return []; });
    await expect(new NetureDashboardService().getSupplierDashboardSummary('fixture-supplier')).rejects.toBe(error);
    expect(logger.error).toHaveBeenCalledWith('[NetureDashboardService] Error fetching supplier dashboard summary:', error);
  });

  it.each([1, 2, 3])('does not report zero when order summary lookup %i fails', async (step) => {
    const error = new Error('fixture order summary unavailable');
    let lookup = 0;
    query.mockImplementation(async (sql: string, bindings: string[]) => { if (++lookup === step) throw error; return orderRows(sql, bindings); });
    await expect(new NetureDashboardService().getSupplierOrdersSummary('fixture-supplier')).rejects.toBe(error);
    expect(logger.error).toHaveBeenCalledWith('[NetureDashboardService] Error fetching order summary:', error);
  });
});

describe('platform admin read contracts', () => {
  it.each([NetureAdminDashboardService, NetureDashboardService])('%p preserves global product, tier and application summaries', async (Reader) => {
    query.mockImplementation(adminRows);
    const result = await new Reader().getAdminDashboardSummary();
    expect(result.stats).toEqual({ ...counts, totalSuppliers: 7, activeSuppliers: 3, pendingSuppliers: 2, totalContents: 0, publishedContents: 0, totalProducts: 20, pendingProducts: 4, distributionTypeBreakdown: { PUBLIC: 5, SERVICE: 6, PRIVATE: 7 }, approvalByTier: { SERVICE: { total: 9, pending: 2, approved: 6, rejected: 1 }, PRIVATE: { total: 0, pending: 0, approved: 0, rejected: 0 } } });
    expect(result.serviceStatus).toEqual([{ serviceId: 'fixture-service', serviceName: 'Fixture', suppliers: 3, organizations: 4, status: 'active' }]);
    expect(result.recentApplications).toEqual([{ id: 'fixture-request', name: 'fixture-store', type: '공급자 신청', date: new Date('2026-01-01'), status: '대기중' }]);
    expect(result.recentActivities).toEqual([]);
    expect(find).not.toHaveBeenCalled();
    for (const args of query.mock.calls) expect(args).toHaveLength(1);
  });

  it('both missing tiers retain independent empty statistics', async () => {
    query.mockImplementation((sql: string) => sql.includes('"totalRequests"') ? [counts] : []);
    const result = await new NetureAdminDashboardService().getAdminDashboardSummary();
    expect(result.stats.approvalByTier).toEqual({ SERVICE: { total: 0, pending: 0, approved: 0, rejected: 0 }, PRIVATE: { total: 0, pending: 0, approved: 0, rejected: 0 } });
    expect(result.serviceStatus).toEqual([]);
    expect(result.recentApplications).toEqual([]);
  });

  it.each(Array.from({ length: 12 }, (_, i) => i + 1))('propagates each required lookup failure (%i)', async (step) => {
    const error = new Error('fixture admin summary unavailable');
    let lookup = 0;
    supplierCount.mockImplementation(async () => { if (++lookup === step) throw error; return 0; });
    offerCount.mockImplementation(async () => { if (++lookup === step) throw error; return 0; });
    query.mockImplementation(async (sql: string) => { if (++lookup === step) throw error; return adminRows(sql); });
    await expect(new NetureDashboardService().getAdminDashboardSummary()).rejects.toBe(error);
    expect(logger.error).toHaveBeenCalledWith('[NetureDashboardService] Error fetching admin dashboard summary:', error);
  });
});

describe('store-owner read contracts', () => {
  it.each([NetureSellerDashboardService, NetureDashboardService])('%p preserves store scopes, insight counts and canonical links', async (Reader) => {
    query.mockResolvedValueOnce([{ cnt: 8 }]).mockResolvedValueOnce([{ cnt: 2 }]).mockResolvedValueOnce([{ cnt: 3 }]).mockResolvedValueOnce([{ cnt: 4 }]).mockResolvedValueOnce([{ cnt: 5 }]).mockResolvedValueOnce([{ cnt: 1 }]);
    expect(await new Reader().getSellerDashboardInsight('fixture-store')).toEqual({ products: { accessible: 8, newThisWeek: 2, notRequested: 3, actionUrl: actions.products }, requests: { pending: 4, approved: 5, rejected: 1, actionUrl: actions.requests }, exposure: { approvedButNotExposed: 0, actionUrl: actions.exposure }, operations: { recentOrders7d: 0, trend: 'none', actionUrl: actions.operations } });
    expect(query).toHaveBeenCalledTimes(6);
    for (const [, bindings] of query.mock.calls) expect(bindings).toEqual(['fixture-store']);
    for (const [sql] of query.mock.calls.slice(0, 3)) expect(sql).toContain('$1 = ANY(spo.allowed_seller_ids)');
    for (const [sql] of query.mock.calls.slice(3)) expect(sql).toContain('organization_id = $1');
    expect(AppDataSource.getRepository).not.toHaveBeenCalled();
  });

  it('empty lookups are zero and remain store-scoped', async () => {
    query.mockResolvedValue([]);
    const result = await new NetureSellerDashboardService().getSellerDashboardInsight('empty-store');
    expect(result.products).toEqual({ accessible: 0, newThisWeek: 0, notRequested: 0, actionUrl: actions.products });
    expect(result.requests).toEqual({ pending: 0, approved: 0, rejected: 0, actionUrl: actions.requests });
  });

  it.each([1, 2, 3, 4, 5, 6])('propagates lookup failure %i instead of fabricated insights', async (step) => {
    const error = new Error('fixture store insight unavailable');
    let lookup = 0;
    query.mockImplementation(async () => { if (++lookup === step) throw error; return [{ cnt: 0 }]; });
    await expect(new NetureDashboardService().getSellerDashboardInsight('fixture-store')).rejects.toBe(error);
    expect(logger.error).toHaveBeenCalledWith('[NetureDashboardService] Error fetching seller dashboard insight:', error);
  });
});
