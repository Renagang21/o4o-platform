/** Behavioral baseline for offer writes: no real DB or production mutations. */
import 'reflect-metadata';
import { AppDataSource } from '../../../../database/connection.js';
import { NetureOfferService } from '../offer.service.js';
import { assertDrugOfferAllowed } from '../../guards/drug-access.guard.js';
import { autoExpandPublicProduct } from '../../../../utils/auto-listing.utils.js';

jest.mock('@o4o/ai-prompts/store', () => ({ PRODUCT_CONTENT_PROMPTS: {} }), { virtual: true });
jest.mock('../../../../database/connection.js', () => ({
  AppDataSource: { getRepository: jest.fn(), query: jest.fn(), createQueryRunner: jest.fn() },
}));
jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../../guards/drug-access.guard.js', () => ({ assertDrugOfferAllowed: jest.fn() }));
jest.mock('../../../../utils/auto-listing.utils.js', () => ({ autoExpandPublicProduct: jest.fn() }));
const mockSync = jest.fn();
const mockPending = jest.fn();
const mockCancel = jest.fn();
jest.mock('../offer-service-approval.service.js', () => ({
  OfferServiceApprovalService: jest.fn().mockImplementation(() => ({
    syncOfferFromServiceApprovals: mockSync, createPendingApprovals: mockPending,
    cancelServiceApprovals: mockCancel,
  })),
}));
const mockCategoryStatuses = jest.fn();
const mockCategoryGate = jest.fn();
jest.mock('../supplier-regulated-category.service.js', () => ({
  SupplierRegulatedCategoryService: jest.fn().mockImplementation(() => ({
    getStatusMap: mockCategoryStatuses, evaluateGate: mockCategoryGate,
  })),
  resolveRegulatedCategoryFromProduct: jest.fn(() => 'general'),
}));
const query = AppDataSource.query as jest.Mock;
const getRepository = AppDataSource.getRepository as jest.Mock;
const drugGate = assertDrugOfferAllowed as jest.Mock;
const expand = autoExpandPublicProduct as jest.Mock;
const repo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn(), update: jest.fn(), softDelete: jest.fn() };
const tx = {
  connect: jest.fn(), startTransaction: jest.fn(), query: jest.fn(),
  commitTransaction: jest.fn(), rollbackTransaction: jest.fn(), release: jest.fn(),
};
let service: NetureOfferService;
let events: string[];
const fixture = (over: Record<string, unknown> = {}) => ({
  id: 'offer-fixture', supplierId: 'supplier-fixture', masterId: 'master-fixture',
  isActive: false, isPublic: false, serviceKeys: ['kpa-society'], allowedSellerIds: [],
  approvalStatus: 'PENDING', distributionType: 'SERVICE', priceGeneral: 100,
  priceGold: null, pricePlatinum: null, consumerReferencePrice: null,
  businessShortDescription: 'previous short', businessDetailDescription: 'previous detail',
  updatedAt: new Date('2026-01-01T00:00:00Z'), ...over,
});
const rawFixture = (over: Record<string, unknown> = {}) => ({
  id: 'offer-fixture', supplier_id: 'supplier-fixture', master_id: 'master-fixture',
  is_public: false, service_keys: ['kpa-society'], is_regulated: false, regulatory_type: 'GENERAL', ...over,
});
const runDecision = (method: 'approveProduct' | 'rejectProduct') =>
  service[method]('offer-fixture', 'actor-fixture');

beforeEach(() => {
  jest.clearAllMocks();
  // Keep dependency constructor factories; reset only per-test behavior.
  for (const mock of [...Object.values(repo), ...Object.values(tx), query, getRepository,
    drugGate, expand, mockSync, mockPending, mockCancel, mockCategoryStatuses,
    mockCategoryGate]) mock.mockReset();
  events = [];
  service = new NetureOfferService({} as never);
  getRepository.mockReturnValue(repo);
  repo.findOne.mockResolvedValue(fixture());
  repo.find.mockResolvedValue([]);
  repo.save.mockImplementation(async (row) => row);
  repo.update.mockResolvedValue({ affected: 1 });
  repo.softDelete.mockResolvedValue({ affected: 1 });
  query.mockResolvedValue([]);
  drugGate.mockResolvedValue({ allowed: true });
  expand.mockResolvedValue(0);
  (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(tx);
  for (const name of ['connect', 'startTransaction', 'commitTransaction', 'rollbackTransaction', 'release'] as const) {
    tx[name].mockImplementation(async () => { events.push(name); });
  }
  tx.query.mockImplementation(async (sql: string) => { events.push(sql.includes('SELECT') ? 'select' : 'write'); return []; });
  mockSync.mockImplementation(async () => {
    events.push('sync');
    return { previousStatus: 'PENDING', derivedStatus: 'APPROVED', autoListedCount: 2 };
  });
  mockPending.mockImplementation(async () => {
    events.push('pending'); return { insertedServiceKeys: ['kpa-society'], resubmittedServiceKeys: [] };
  });
  mockCancel.mockImplementation(async () => {
    events.push('cancel'); return { cancelledServiceKeys: ['kpa-society'], deactivatedListings: 2 };
  });
  mockCategoryStatuses.mockResolvedValue(new Map());
  mockCategoryGate.mockReturnValue({ allowed: true });
});

describe('registration approval is independent from service publication', () => {
  it.each(['approveProduct', 'rejectProduct'] as const)('%s enforces product existence', async method => {
    repo.findOne.mockResolvedValue(null);
    expect(await runDecision(method)).toEqual({ success: false, error: 'PRODUCT_NOT_FOUND' });
    expect(query).not.toHaveBeenCalled();
  });
  it.each([['approveProduct', 'APPROVED'], ['rejectProduct', 'REJECTED']] as const)('%s is idempotent', async (method, status) => {
    repo.findOne.mockResolvedValue(fixture({ approvalStatus: status }));
    expect(await runDecision(method)).toMatchObject({ success: true, data: { approvalStatus: status } });
    expect(query).not.toHaveBeenCalled(); expect(tx.query).not.toHaveBeenCalled();
  });
  it('cannot approve a regulated product without its permit', async () => {
    query.mockResolvedValue([{ is_regulated: true, mfds_permit_number: null }]);
    expect(await runDecision('approveProduct')).toEqual({ success: false, error: 'PERMIT_REQUIRED_FOR_APPROVAL' });
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('approves registration without approving services or publishing a listing', async () => {
    expect(await runDecision('approveProduct')).toMatchObject({ success: true, data: { approvalStatus: 'APPROVED', autoListedCount: 0 } });
    const write = query.mock.calls.find(([sql]) => sql.includes('UPDATE supplier_product_offers'));
    expect(write?.[0]).toContain('default_supply_enabled = false, is_public = false');
    expect(write?.[0]).toContain('registration_rejection_reason = NULL');
    expect(mockSync).not.toHaveBeenCalled(); expect(mockPending).not.toHaveBeenCalled(); expect(expand).not.toHaveBeenCalled();
    expect(tx.query).not.toHaveBeenCalled();
  });
  it.each([
    [[], 'PRIVATE'],
    [['kpa-society'], 'SERVICE'],
  ])('clears legacy PUBLIC distribution on registration approval with targets %j', async (serviceKeys, expected) => {
    repo.findOne.mockResolvedValue(fixture({ isPublic: true, distributionType: 'PUBLIC', serviceKeys }));
    await runDecision('approveProduct');
    const write = query.mock.calls.find(([sql]) => sql.includes('UPDATE supplier_product_offers'));
    expect(write?.[0]).toContain('distribution_type = $2');
    expect(write?.[1]).toEqual(['offer-fixture', expected]);
    expect(expand).not.toHaveBeenCalled();
  });
  it('registration rejection atomically disables the product and existing publication grants', async () => {
    await service.rejectProduct('offer-fixture', 'actor-fixture', 'Fixture reason');
    expect(tx.query.mock.calls.some(([sql]) => sql.includes("approval_status = 'REJECTED'"))).toBe(true);
    const rejection = tx.query.mock.calls.find(([sql]) => sql.includes('UPDATE supplier_product_offers'));
    expect(rejection?.[0]).toContain('registration_rejection_reason = $2');
    expect(rejection?.[1]).toEqual(['offer-fixture', 'Fixture reason']);
    expect(tx.query.mock.calls.some(([sql]) => sql.includes('UPDATE organization_product_listings'))).toBe(true);
    expect(tx.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO'))).toBe(false);
    expect(tx.query.mock.calls.find(([sql]) => sql.includes('UPDATE product_approvals'))?.[1]).toEqual(['offer-fixture', 'actor-fixture', 'Fixture reason']);
    expect(mockSync).not.toHaveBeenCalled(); expect(tx.commitTransaction).toHaveBeenCalledTimes(1);
  });
  it.each(['query', 'commit'] as const)('rejection %s failure rolls back every write', async stage => {
    const error = new Error('Fixture rejection failure');
    if (stage === 'query') tx.query.mockRejectedValueOnce(error); else tx.commitTransaction.mockRejectedValueOnce(error);
    await expect(runDecision('rejectProduct')).rejects.toBe(error);
    expect(tx.rollbackTransaction).toHaveBeenCalledTimes(1); expect(tx.release).toHaveBeenCalledTimes(1);
  });
});

describe('registration resubmission preserves ownership, category gate and batch outcomes', () => {
  const owned = (id: string, approval_status = 'REJECTED') => ({ id, approval_status, service_keys: [] });
  it('resubmits only rejected owned products and does not create service requests', async () => {
    query.mockResolvedValueOnce([owned('a'), owned('b', 'APPROVED'), owned('c', 'PENDING')]).mockResolvedValueOnce([{ id: 'a' }]);
    expect(await service.submitForApproval('supplier-fixture', ['a', 'b', 'c', 'foreign'])).toEqual({ submitted: 1,
      errors: [{ id: 'foreign', error: 'NOT_OWNED' }], skipped: ['b','c'].map(id => ({ id, reason: 'ALREADY_REQUESTED_OR_DECIDED' })) });
    expect(query.mock.calls[1][0]).toContain("approval_status = 'REJECTED'");
    expect(mockPending).not.toHaveBeenCalled(); expect(mockSync).not.toHaveBeenCalled();
  });
  it('category denial does not change the registration', async () => {
    query.mockResolvedValueOnce([owned('a')]); mockCategoryGate.mockReturnValue({ allowed: false, reasonCode: 'SUPPLIER_CATEGORY_PENDING' });
    expect(await service.submitForApproval('supplier-fixture', ['a'])).toMatchObject({ submitted: 0, skipped: [{ id: 'a', reason: 'SUPPLIER_CATEGORY_PENDING' }] });
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('records an individual DB failure and continues the batch', async () => {
    query.mockResolvedValueOnce([owned('a'),owned('b')]).mockRejectedValueOnce(new Error('private')).mockResolvedValueOnce([{ id: 'b' }]);
    expect(await service.submitForApproval('supplier-fixture', ['a','b'])).toEqual({ submitted: 1, skipped: [], errors: [{ id: 'a', error: 'INTERNAL_ERROR' }] });
  });
});

describe('service publication is atomic and cannot mutate registration approval', () => {
  beforeEach(() => tx.query.mockImplementation(async (sql: string) => sql.includes('SELECT id, supplier_id') ? [rawFixture({ approval_status: 'APPROVED', is_active: true, price_general: 100, default_supply_enabled: false })] : []));
  it.each([['missing', 'OFFER_NOT_FOUND'], ['foreign', 'NOT_OWNED']] as const)('refuses %s products under the lock', async (kind, error) => {
    tx.query.mockResolvedValueOnce(kind === 'missing' ? [] : [rawFixture({ supplier_id: 'foreign' })]);
    expect(await service.updateDistribution('offer-fixture','supplier-fixture','actor-fixture',{})).toEqual({ success: false, error });
    expect(tx.rollbackTransaction).toHaveBeenCalledTimes(1); expect(mockPending).not.toHaveBeenCalled();
  });
  it.each([['PENDING',100,'PRODUCT_NOT_APPROVED'],['APPROVED',0,'PRICE_REQUIRED']] as const)('refuses publication for %s / price %s', async (approval_status, price_general, error) => {
    tx.query.mockResolvedValueOnce([rawFixture({ approval_status, price_general, is_active: true })]);
    expect(await service.updateDistribution('offer-fixture','supplier-fixture','actor-fixture',{ defaultSupplyEnabled: true })).toEqual({ success: false, error });
    expect(tx.commitTransaction).not.toHaveBeenCalled();
  });
  it('saves price, explicit Neture publication and selected services together', async () => {
    const r = await service.updateDistribution('offer-fixture','supplier-fixture','actor-fixture',{
      defaultSupplyEnabled: true, priceGeneral: 500, serviceKeys: ['kpa-society'], servicePrices: [{ serviceKey: 'kpa-society', unitPrice: 450 }],
    });
    expect(r).toMatchObject({ success: true, data: { defaultSupplyEnabled: true, priceGeneral: 500 } });
    expect(tx.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO offer_service_prices'))).toBe(true);
    expect(tx.query.mock.calls.some(([sql]) => sql.includes('SET approval_status'))).toBe(false);
    expect(tx.commitTransaction).toHaveBeenCalledTimes(1);
  });
  it('an approved supplier can publish a drug through regular supply without an audience-policy row', async () => {
    drugGate.mockImplementation(jest.requireActual('../../guards/drug-access.guard.js').assertDrugOfferAllowed);
    tx.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, supplier_id')) return [rawFixture({ master_id: '11111111-1111-4111-8111-111111111111', approval_status: 'APPROVED', is_active: true, price_general: 100 })];
      if (sql.includes('FROM product_masters')) return [{ regulatory_type: 'DRUG' }];
      if (sql.includes('service_audience_policies')) throw new Error('retired policy must not be read');
      return [];
    });
    expect(await service.updateDistribution('offer-fixture','supplier-fixture','actor-fixture',{ isPublic: true }))
      .toMatchObject({ success: true, data: { isPublic: true } });
    expect(tx.commitTransaction).toHaveBeenCalledTimes(1);
    expect(expand).toHaveBeenCalled();
  });
  it('withdrawing a service keeps default publication, product approval and service prices', async () => {
    await service.updateDistribution('offer-fixture','supplier-fixture','actor-fixture',{ serviceKeys: [] });
    expect(mockCancel).toHaveBeenCalledWith('offer-fixture',['kpa-society'],tx);
    expect(tx.query.mock.calls.some(([sql]) => /DELETE|SET approval_status|UPDATE organization_product_listings/.test(sql))).toBe(false);
  });
  it('drug denial rolls back before any publication write', async () => {
    drugGate.mockResolvedValue({ allowed: false, code: 'DRUG_PRODUCT_UNRESOLVED' });
    expect(await service.updateDistribution('offer-fixture','supplier-fixture','actor-fixture',{ isPublic: true })).toEqual({ success: false, error: 'DRUG_PRODUCT_UNRESOLVED' });
    expect(tx.commitTransaction).not.toHaveBeenCalled(); expect(expand).not.toHaveBeenCalled();
  });
  it.each(['write','cancel','pending','sync'] as const)('%s failure rolls back the publication', async stage => {
    const error = new Error('Fixture publication failure');
    if (stage === 'write') tx.query.mockResolvedValueOnce([rawFixture({ approval_status:'APPROVED',is_active:true,price_general:100 })]).mockResolvedValueOnce([]).mockRejectedValueOnce(error);
    if (stage === 'cancel') mockCancel.mockRejectedValueOnce(error);
    if (stage === 'pending') mockPending.mockRejectedValueOnce(error);
    if (stage === 'sync') mockSync.mockRejectedValueOnce(error);
    await expect(service.updateDistribution('offer-fixture','supplier-fixture','actor-fixture',{ serviceKeys: ['k-cosmetics'] })).rejects.toBe(error);
    expect(tx.rollbackTransaction).toHaveBeenCalledTimes(1); expect(tx.release).toHaveBeenCalledTimes(1);
  });
});

describe('supplier editing and partial batches preserve ownership and failure outcomes', () => {
  it.each(['updateSupplierOffer', 'updateBusinessContent'] as const)('%s requires the supplier-scoped offer', async (method) => {
    repo.findOne.mockResolvedValue(null);
    expect(await service[method]('offer-fixture', 'foreign', {})).toEqual({ success: false, error: 'PRODUCT_NOT_FOUND' });
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'offer-fixture', supplierId: 'foreign' } });
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('update drug denial prevents save and public expansion', async () => {
    repo.findOne.mockResolvedValue(fixture({ approvalStatus: 'APPROVED' }));
    drugGate.mockResolvedValue({ allowed: false, code: 'DRUG_PRODUCT_UNRESOLVED', message: 'Fixture denial' });
    expect(await service.updateSupplierOffer('offer-fixture', 'supplier-fixture', { isPublic: true })).toEqual({
      success: false, error: 'DRUG_PRODUCT_UNRESOLVED', message: 'Fixture denial',
    });
    expect(repo.save).not.toHaveBeenCalled();
    expect(expand).not.toHaveBeenCalled();
  });
  it.each([['APPROVED', true, true], ['PENDING', true, false], ['APPROVED', false, false]] as const)(
    'public expansion requires approved/active: %s/%s', async (approvalStatus, isActive, expected) => {
      repo.findOne.mockResolvedValue(fixture({ approvalStatus, isActive }));
      await service.updateSupplierOffer('offer-fixture', 'supplier-fixture', { isPublic: true });
      if (expected) expect(expand).toHaveBeenCalledWith(AppDataSource, 'offer-fixture', 'master-fixture');
      else expect(expand).not.toHaveBeenCalled();
    });
  it('nonblocking public expansion failure does not fail the offer update', async () => {
    repo.findOne.mockResolvedValue(fixture({ approvalStatus: 'APPROVED', isActive: true }));
    expand.mockRejectedValue(new Error('fixture expansion failure'));
    expect((await service.updateSupplierOffer('offer-fixture', 'supplier-fixture', { isPublic: true })).success).toBe(true);
    await Promise.resolve();
  });
  it('business content explicitly clears one field and retains omitted fields', async () => {
    expect(await service.updateBusinessContent('offer-fixture', 'supplier-fixture', { businessShortDescription: null })).toEqual({
      success: true, data: { id: 'offer-fixture', businessShortDescription: null, businessDetailDescription: 'previous detail', updatedAt: new Date('2026-01-01T00:00:00Z') },
    });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });
  it.each(['updateSupplierOffer', 'updateBusinessContent'] as const)('%s save failure is rethrown', async (method) => {
    const failure = new Error('fixture save failure');
    repo.save.mockRejectedValue(failure);
    await expect(service[method]('offer-fixture', 'supplier-fixture', {})).rejects.toBe(failure);
  });
  it('batch edits reuse single-offer policy sequentially and continue after denial/DB failure', async () => {
    repo.findOne.mockResolvedValueOnce(fixture({ id: 'first' })).mockResolvedValueOnce(null)
      .mockResolvedValueOnce(fixture({ id: 'broken' })).mockResolvedValueOnce(fixture({ id: 'last' }));
    repo.save.mockResolvedValueOnce(fixture({ id: 'first' })).mockRejectedValueOnce(new Error('fixture failure'))
      .mockResolvedValueOnce(fixture({ id: 'last' }));
    expect(await service.batchUpdateSupplierOffers('supplier-fixture', [
      { offerId: 'first', priceGeneral: 123 }, { offerId: 'foreign' }, { offerId: 'broken' }, { offerId: 'last' },
    ])).toEqual({ updated: ['first', 'last'], failed: [{ id: 'foreign', error: 'PRODUCT_NOT_FOUND' }, { id: 'broken', error: 'fixture failure' }] });
    expect(repo.findOne.mock.calls.map(([o]) => o.where)).toEqual(['first', 'foreign', 'broken', 'last'].map((id) => ({ id, supplierId: 'supplier-fixture' })));
    expect(repo.save.mock.calls[0][0].priceGeneral).toBe(123);
  });
  it('operator activation batch keeps item order and partial successes', async () => {
    repo.findOne.mockResolvedValueOnce(fixture({ id: 'first' })).mockResolvedValueOnce(null)
      .mockResolvedValueOnce(fixture({ id: 'broken' })).mockResolvedValueOnce(fixture({ id: 'last' }));
    repo.save.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('fixture failure')).mockResolvedValueOnce({});
    expect(await service.batchToggleOfferActive(['first', 'missing', 'broken', 'last'], true)).toEqual({
      updated: ['first', 'last'], failed: [{ id: 'missing', error: 'PRODUCT_NOT_FOUND' }, { id: 'broken', error: 'fixture failure' }],
    });
    expect(repo.save.mock.calls.every(([o]) => o.isActive === true)).toBe(true);
  });
  it('soft-delete failures do not increment deleted and do not stop later offers', async () => {
    repo.find.mockResolvedValue([fixture({ id: 'broken' }), fixture({ id: 'last' })]);
    repo.softDelete.mockRejectedValueOnce(new Error('fixture failure'));
    query.mockResolvedValue([{ cnt: 0 }]);
    expect(await service.bulkDeleteOffers('supplier-fixture', ['foreign', 'broken', 'last'])).toEqual({
      deleted: 1, failed: [{ id: 'foreign', error: 'NOT_FOUND_OR_NOT_OWNED' }, { id: 'broken', error: 'fixture failure' }],
    });
    expect(repo.find.mock.calls[0][0].where.supplierId).toBe('supplier-fixture');
    expect(repo.update.mock.calls[1]).toEqual(['last', { isActive: false, deletedBy: null, deleteReason: 'SUPPLIER_DELETE' }]);
    expect(repo.softDelete.mock.calls).toEqual([['broken'], ['last']]);
  });
  it.each(['batchUpdateSupplierOffers', 'bulkDeleteOffers'] as const)('%s empty input writes nothing', async (method) => {
    expect(await service[method]('supplier-fixture', [])).toEqual(method === 'bulkDeleteOffers' ? { deleted: 0, failed: [] } : { updated: [], failed: [] });
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.softDelete).not.toHaveBeenCalled();
  });
});
