import { AppDataSource } from '../../../../database/connection.js';
import { SupplierProductOffer } from '../../entities/index.js';
import { NetureOfferService } from '../offer.service.js';

jest.mock('@o4o/ai-prompts/store', () => ({ PRODUCT_CONTENT_PROMPTS: {} }), { virtual: true });
jest.mock('../../../../database/connection.js', () => ({ AppDataSource: { getRepository: jest.fn(), query: jest.fn() } }));
jest.mock('../../../../utils/logger.js', () => ({ __esModule: true, default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));
const query = AppDataSource.query as jest.Mock;
const find = jest.fn();
const qb: Record<string, jest.Mock> = {};
for (const name of ['leftJoinAndSelect', 'andWhere', 'orderBy', 'skip', 'take', 'select', 'addSelect', 'groupBy']) qb[name] = jest.fn(() => qb);
qb.getManyAndCount = jest.fn();
qb.getRawMany = jest.fn();
const createQueryBuilder = jest.fn(() => qb);
const fixture = { id: 'offer-fixture', supplierId: 'supplier-fixture', masterId: 'master-fixture', isActive: true,
  isPublic: false, distributionType: 'PRIVATE', approvalStatus: 'PENDING', priceGeneral: 100, priceGold: 90, pricePlatinum: 80,
  consumerReferencePrice: 200, consumerShortDescription: 'Fixture short', consumerDetailDescription: 'Fixture detail',
  businessShortDescription: 'Fixture B2B short', businessDetailDescription: 'Fixture B2B detail',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  supplier: { organizationId: 'organization-fixture', status: 'ACTIVE' },
  master: { name: 'Fixture product', barcode: 'fixture-barcode', categoryId: 'category-fixture',
    category: { name: 'Fixture category' }, brand: { name: 'Fixture brand' } } };
let service: NetureOfferService;
beforeEach(() => {
  jest.clearAllMocks();
  service = new NetureOfferService({} as never);
  (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
    if (entity !== SupplierProductOffer) throw new Error('Unexpected repository');
    return { find, createQueryBuilder }; // read-only repositories: no save/update/delete available
  });
  find.mockResolvedValue([fixture]);
  qb.getManyAndCount.mockResolvedValue([[fixture], 1]);
  qb.getRawMany.mockResolvedValue([]);
  query.mockResolvedValue([]);
});

it('supplier unpaged list keeps ownership, enrichment and derived purpose', async () => {
  query.mockImplementation(async (sql: string) => sql.includes('is_primary') ? [{ master_id: fixture.masterId, image_url: 'fixture-image' }]
    : sql.includes("approval_status = 'pending'") ? [{ offer_id: fixture.id, cnt: 2 }]
    : [{ offer_id: fixture.id, cnt: 3 }]);
  expect(await service.getSupplierProducts(fixture.supplierId)).toEqual([expect.objectContaining({
    id: fixture.id, name: 'Fixture product', pendingRequestCount: 2, activeServiceCount: 3,
    purpose: 'ACTIVE_SALES', primaryImageUrl: 'fixture-image', categoryName: 'Fixture category', brandName: 'Fixture brand',
  })]);
  expect(find).toHaveBeenCalledWith(expect.objectContaining({ where: { supplierId: fixture.supplierId } }));
  for (const [sql, params] of query.mock.calls) if (!sql.includes('product_images')) {
    expect(sql).toContain('spo.supplier_id = $1'); expect(params).toEqual([fixture.supplierId]);
  }
});

it.each([
  [true, 1, 'ACTIVE_SALES'], [true, 0, 'APPLICATION'], [false, 3, 'CATALOG'],
])('supplier page derives purpose for active=%s/services=%s', async (isActive, activeServiceCount, purpose) => {
  query.mockResolvedValueOnce([{ total: 4 }]).mockResolvedValueOnce([{ isActive, activeServiceCount, approvalStatus: 'pending', completenessScore: 70 }]);
  const result = await service.getSupplierProductsPaginated('supplier-fixture', { page: 2, limit: 3 });
  expect(result.data[0]).toMatchObject({ purpose, completenessStatus: 'READY' });
  expect(result.pagination).toEqual({ page: 2, limit: 3, total: 4, totalPages: 2 });
  expect(query.mock.calls[1][1]).toEqual(['supplier-fixture', 3, 3]);
});
it.each([['approved', 0, 'APPROVED'], ['pending', 70, 'READY'], ['pending', 69, 'INCOMPLETE'], ['pending', 0, 'DRAFT']])(
  'supplier completeness %s/%s -> %s', async (approvalStatus, completenessScore, completenessStatus) => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ approvalStatus, completenessScore }]);
    expect((await service.getSupplierProductsPaginated('supplier-fixture')).data[0].completenessStatus).toBe(completenessStatus);
  });

it('supplier filters remain bound and unknown sorting cannot become SQL', async () => {
  const options = { keyword: ' fixture ', distributionType: 'PRIVATE', isActive: 'false', barcodeSource: 'manual',
    hasImage: 'false', hasDescription: 'true', completenessStatus: 'READY', serviceApprovalStatus: 'approved',
    sort: 'DROP TABLE fixture', order: 'invalid', page: -3, limit: 1000 };
  await service.getSupplierProductsPaginated('supplier-fixture', options);
  const [countSql, bindings] = query.mock.calls[0];
  expect(bindings).toEqual(['supplier-fixture', '%fixture%', 'PRIVATE', false, 'manual']);
  expect(countSql).toContain('spo.deleted_at IS NULL');
  expect(countSql).toContain('NOT EXISTS (SELECT 1 FROM product_images');
  expect(countSql).toContain("osa.approval_status != 'approved'");
  expect(countSql).toContain("jsonb_typeof(pm.tags) = 'array'");
  const [rowSql, rowBindings] = query.mock.calls[1];
  expect(rowSql).toContain('ORDER BY pm.id, spo.created_at DESC');
  expect(rowSql).not.toContain('DROP TABLE');
  expect(rowBindings).toEqual([...bindings, 100, 0]);
});
it.each(['unrequested', 'pending', 'approved', 'rejected'])('supplier approval tab %s keeps service-approval SSOT', async (status) => {
  await service.getSupplierProductsPaginated('supplier-fixture', { serviceApprovalStatus: status });
  const sql = query.mock.calls[0][0];
  expect(sql).toContain('offer_service_approvals');
  if (status === 'unrequested') expect(sql).toContain('NOT EXISTS');
  else expect(sql).toContain(`'${status}'`);
});
it('approval counts use same auxiliary filters and empty fallback', async () => {
  expect(await service.getSupplierProductApprovalCounts('supplier-fixture', { keyword: 'needle', isActive: 'false' })).toEqual({ total: 0, unrequested: 0, pending: 0, approved: 0, rejected: 0 });
  expect(query.mock.calls[0][1]).toEqual(['supplier-fixture', '%needle%', false]);
  expect(query.mock.calls[0][0]).toContain('COUNT(*) FILTER');
  query.mockResolvedValueOnce([{ total: 8, unrequested: 2, pending: 3, approved: 2, rejected: 1 }]);
  expect((await service.getSupplierProductApprovalCounts('supplier-fixture')).total).toBe(8);
});
it.each(['getPendingProducts', 'getAllProducts', 'getAllProductsPaged'] as const)('admin %s enriches names from Organization', async (method) => {
  query.mockResolvedValue([{ id: 'organization-fixture', name: 'Fixture organization' }]);
  const result = await service[method]();
  const items = Array.isArray(result) ? result : result.items;
  expect(items[0]).toMatchObject({ supplierName: 'Fixture organization', masterName: 'Fixture product' });
  expect(query).toHaveBeenCalledWith('SELECT id, name FROM organizations WHERE id = ANY($1)', [['organization-fixture']]);
});
it.each(['getPendingProducts', 'getAllProducts', 'getAllProductsPaged'] as const)('admin %s organization enrichment failure remains non-fatal', async (method) => {
  query.mockRejectedValue(new Error('fixture lookup unavailable'));
  const result = await service[method]();
  const items = Array.isArray(result) ? result : result.items;
  expect(items[0].supplierName).toBe('');
});
it('admin false filter, search, pagination cap and sort whitelist remain intact', async () => {
  await service.getAllProductsPaged({ isActive: false, search: ' needle ', sortBy: 'unsafe', sortOrder: 'ASC', page: 2, limit: 999 });
  expect(qb.andWhere).toHaveBeenCalledWith('offer.isActive = :isActive', { isActive: false });
  expect(qb.andWhere).toHaveBeenCalledWith('master.name ILIKE :search', { search: '%needle%' });
  expect(qb.orderBy).toHaveBeenCalledWith('offer.createdAt', 'ASC');
  expect(qb.skip).toHaveBeenCalledWith(100); expect(qb.take).toHaveBeenCalledWith(100);
});
it('admin legacy paged entry without pagination still returns all', async () => {
  await service.getAllProductsPaged(); expect(qb.skip).not.toHaveBeenCalled(); expect(qb.take).not.toHaveBeenCalled();
});
it('admin summary totals every row and preserves named buckets', async () => {
  qb.getRawMany.mockResolvedValue([{ status: 'PENDING', count: '2' }, { status: 'APPROVED', count: '3' }, { status: 'REJECTED', count: '1' }, { status: 'other', count: '4' }]);
  expect(await service.getProductsSummary({ isActive: false })).toEqual({ total: 10, pending: 2, approved: 3, rejected: 1 });
});
it('operator supply only returns active supplier rows and enriches request state', async () => {
  find.mockResolvedValue([fixture, { ...fixture, id: 'inactive', supplier: { status: 'PENDING' } }]);
  query.mockImplementation(async (sql: string) => sql.includes('pa.organization_id') ? [{ offer_id: fixture.id, supplier_id: fixture.supplierId, status: 'rejected', id: 'request-fixture', reason: 'Fixture reason' }]
    : sql.includes('organizations') ? [{ id: 'organization-fixture', name: 'Fixture organization' }] : []);
  expect(await service.getOperatorSupplyProducts('operator-fixture')).toEqual([expect.objectContaining({ id: fixture.id, supplyStatus: 'rejected', rejectReason: 'Fixture reason', supplierName: 'Fixture organization' })]);
  expect(query.mock.calls[0][1]).toEqual(['operator-fixture']);
});
it('operator all-offers binds filters while KPI stays global', async () => {
  query.mockResolvedValueOnce([{ total: 5 }]).mockResolvedValueOnce([{ id: 'fixture' }]).mockResolvedValueOnce([{ total: 9, active: 7 }]);
  const result = await service.getAllRegisteredOffers({ keyword: ' fixture ', isActive: 'false', category: ' category ', regulatoryType: 'DRUG', approvalStatus: 'REJECTED', sort: 'unsafe', page: 2, limit: 2 });
  expect(result.pagination).toEqual({ total: 5, page: 2, limit: 2, totalPages: 3 });
  expect(result.kpi).toMatchObject({ total: 9, active: 7, approvalRejected: 0 });
  expect(query.mock.calls[0][1]).toEqual(['%fixture%', false, '%category%', 'DRUG']);
  expect(query.mock.calls[1][1]).toEqual(['%fixture%', false, '%category%', 'DRUG', 2, 2]);
  expect(query.mock.calls[1][0]).toContain('ORDER BY spo.created_at DESC');
  expect(query.mock.calls[2][1]).toBeUndefined();
});
const methods = ['getPendingProducts', 'getAllProducts', 'getAllProductsPaged', 'getProductsSummary', 'getSupplierProducts', 'getSupplierProductsPaginated', 'getSupplierProductApprovalCounts', 'getOperatorSupplyProducts', 'getAllRegisteredOffers'] as const;
it.each(methods)('%s preserves empty responses', async (method) => {
  find.mockResolvedValue([]); qb.getManyAndCount.mockResolvedValue([[], 0]);
  const result = await (service[method] as (...args: unknown[]) => Promise<unknown>)(method.startsWith('getSupplier') || method === 'getOperatorSupplyProducts' ? 'supplier-fixture' : undefined);
  if (Array.isArray(result)) expect(result).toEqual([]); else {
    if (method === 'getAllProductsPaged') expect(result).toEqual({ items: [], total: 0 });
    if (method === 'getSupplierProductsPaginated' || method === 'getAllRegisteredOffers') expect(result).toMatchObject({ data: [], pagination: { total: 0, totalPages: 0 } });
    if (method === 'getProductsSummary') expect(result).toEqual({ total: 0, pending: 0, approved: 0, rejected: 0 });
    if (method === 'getSupplierProductApprovalCounts') expect(result).toEqual({ total: 0, unrequested: 0, pending: 0, approved: 0, rejected: 0 });
  }
});
it.each(methods)('%s propagates required query failure', async (method) => {
  const error = new Error('fixture required read failure');
  find.mockRejectedValue(error); qb.getManyAndCount.mockRejectedValue(error); qb.getRawMany.mockRejectedValue(error); query.mockRejectedValue(error);
  await expect((service[method] as (...args: unknown[]) => Promise<unknown>)(method.startsWith('getSupplier') || method === 'getOperatorSupplyProducts' ? 'supplier-fixture' : undefined)).rejects.toBe(error);
});

// Compatibility facade must forward the same arguments/results without opening a write repository.
import { SupplierOfferReadService } from '../supplier-offer-read.service.js';
import { AdminOfferReadService } from '../admin-offer-read.service.js';
import { OperatorOfferReadService } from '../operator-offer-read.service.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const delegation = [
  ['getSupplierProducts', SupplierOfferReadService, ['supplier-fixture']],
  ['getSupplierProductsPaginated', SupplierOfferReadService, ['supplier-fixture', { keyword: 'fixture' }]],
  ['getSupplierProductApprovalCounts', SupplierOfferReadService, ['supplier-fixture', { isActive: 'false' }]],
  ['getPendingProducts', AdminOfferReadService, []],
  ['getAllProducts', AdminOfferReadService, [{ isActive: false }]],
  ['getAllProductsPaged', AdminOfferReadService, [{ page: 2 }]],
  ['getProductsSummary', AdminOfferReadService, [{ supplierId: 'supplier-fixture' }]],
  ['getOperatorSupplyProducts', OperatorOfferReadService, ['operator-fixture']],
  ['getAllRegisteredOffers', OperatorOfferReadService, [{ approvalStatus: 'PENDING' }]],
] as const;
it.each(delegation)('%s delegates exact arguments and preserves result identity', async (method, Reader, args) => {
  const sentinel = { fixture: true };
  const spy = jest.spyOn(Reader.prototype, method as never).mockResolvedValue(sentinel as never);
  try {
    const result = await (service[method] as (...args: unknown[]) => Promise<unknown>)(...args);
    expect(result).toBe(sentinel); expect(spy).toHaveBeenCalledWith(...args);
    expect(AppDataSource.getRepository).not.toHaveBeenCalled(); expect(query).not.toHaveBeenCalled();
  } finally { spy.mockRestore(); }
});
it.each(['supplier-offer-read.service.ts', 'admin-offer-read.service.ts', 'operator-offer-read.service.ts', 'offer-read-enrichment.ts'])(
  '%s remains a read-only implementation and cannot write ProductMaster', (file) => {
    const src = readFileSync(join(__dirname, '..', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(src).not.toMatch(/\.(save|update|insert|delete|softDelete|remove|createQueryRunner)\s*\(/);
    expect(src).not.toMatch(/\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|ALTER\s+TABLE|DROP\s+TABLE)\b/i);
    expect(src).not.toContain('resolveOrCreateMaster('); expect(src).not.toContain('updateProductMaster(');
  });

const adminDto = {
  id: 'offer-fixture', masterId: 'master-fixture', masterName: 'Fixture product',
  supplierName: 'Fixture organization', supplierId: 'supplier-fixture', isPublic: false,
  distributionType: 'PRIVATE', isActive: true, approvalStatus: 'PENDING',
  priceGeneral: 100, priceGold: 90, pricePlatinum: 80, consumerReferencePrice: 200,
  consumerShortDescription: 'Fixture short', consumerDetailDescription: 'Fixture detail',
  businessShortDescription: 'Fixture B2B short', businessDetailDescription: 'Fixture B2B detail',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};
it('admin all-list complete DTO preserves every field and value', async () => {
  query.mockResolvedValue([{ id: 'organization-fixture', name: 'Fixture organization' }]);
  expect(await service.getAllProducts()).toStrictEqual([adminDto]);
});
it('admin paged complete DTO adds only marketingName and category', async () => {
  query.mockResolvedValue([{ id: 'organization-fixture', name: 'Fixture organization' }]);
  expect(await service.getAllProductsPaged()).toStrictEqual({ items: [{ ...adminDto, marketingName: 'Fixture product', category: 'Fixture category' }], total: 1 });
});
it('admin pending complete DTO retains its narrower response fields', async () => {
  query.mockResolvedValue([{ id: 'organization-fixture', name: 'Fixture organization' }]);
  expect(await service.getPendingProducts()).toStrictEqual([{ id: 'offer-fixture', masterId: 'master-fixture', masterName: 'Fixture product', supplierName: 'Fixture organization', supplierId: 'supplier-fixture', isPublic: false, distributionType: 'PRIVATE', createdAt: new Date('2026-01-01T00:00:00Z'), approvalStatus: 'PENDING' }]);
});
