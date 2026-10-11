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
const mockAudienceResolver = jest.fn();
jest.mock('../service-audience.service.js', () => ({
  ServiceAudienceService: jest.fn().mockImplementation(() => ({
    getPharmacyAudienceResolver: mockAudienceResolver,
  })),
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
    mockCategoryGate, mockAudienceResolver]) mock.mockReset();
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
  mockAudienceResolver.mockResolvedValue((key: string) => key === 'kpa-society');
});

describe('operator decisions: idempotency, permit and atomic service approvals', () => {
  it.each(['approveProduct', 'rejectProduct'] as const)('%s missing offer does not start a transaction', async (method) => {
    repo.findOne.mockResolvedValue(null);
    expect(await runDecision(method)).toEqual({ success: false, error: 'PRODUCT_NOT_FOUND' });
    expect(AppDataSource.createQueryRunner).not.toHaveBeenCalled();
  });
  it.each([['approveProduct', 'APPROVED'], ['rejectProduct', 'REJECTED']] as const)(
    '%s is idempotent for %s', async (method, status) => {
      repo.findOne.mockResolvedValue(fixture({ approvalStatus: status, isActive: method === 'approveProduct' }));
      expect(await runDecision(method)).toEqual({ success: true, data: {
        id: 'offer-fixture', masterId: 'master-fixture', isActive: method === 'approveProduct', approvalStatus: status,
        ...(method === 'approveProduct' ? { autoListedCount: 0 } : {}),
      } });
      expect(query).not.toHaveBeenCalled();
      expect(AppDataSource.createQueryRunner).not.toHaveBeenCalled();
    });
  it('approval requires the regulated permit before starting a transaction', async () => {
    query.mockResolvedValue([{ is_regulated: true, mfds_permit_number: null }]);
    expect(await runDecision('approveProduct')).toEqual({ success: false, error: 'PERMIT_REQUIRED_FOR_APPROVAL' });
    expect(query.mock.calls[0][1]).toEqual(['master-fixture']);
    expect(tx.startTransaction).not.toHaveBeenCalled();
  });
  it.each(['approveProduct', 'rejectProduct'] as const)('%s creates unique missing service approvals in the same transaction', async (method) => {
    repo.findOne.mockResolvedValue(fixture({ serviceKeys: ['kpa-society', 'kpa-society', 'k-cosmetics'] }));
    await runDecision(method);
    const insert = tx.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO offer_service_approvals'));
    expect(insert?.[1]).toEqual(['offer-fixture', 'kpa-society', 'k-cosmetics']);
    expect(insert?.[0]).toContain("VALUES ($1, $2, 'pending', NOW(), NOW()), ($1, $3, 'pending', NOW(), NOW())");
    expect([...new Set(insert?.[0].match(/\$\d+/g))]).toEqual(['$1', '$2', '$3']);
    expect(insert?.[0]).toContain('ON CONFLICT (offer_id, service_key) DO NOTHING');
    expect(mockSync).toHaveBeenCalledWith('offer-fixture', 'actor-fixture', tx);
    expect(events).toEqual(['startTransaction', 'select', 'write', 'write', 'sync', 'commitTransaction', 'release']);
    expect(tx.rollbackTransaction).not.toHaveBeenCalled();
  });
  it.each(['approveProduct', 'rejectProduct'] as const)('%s existing service approvals skip creation', async (method) => {
    tx.query.mockResolvedValue([{ id: 'approval-fixture' }]);
    await runDecision(method);
    expect(tx.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO'))).toBe(false);
    expect(mockSync).toHaveBeenCalledWith('offer-fixture', 'actor-fixture', tx);
    expect(tx.commitTransaction).toHaveBeenCalledTimes(1);
  });
  it.each(['approveProduct', 'rejectProduct'] as const)('%s existing approvals with empty targets still use derived sync', async (method) => {
    repo.findOne.mockResolvedValue(fixture({ serviceKeys: [] }));
    tx.query.mockResolvedValue([{ id: 'approval-fixture' }]);
    await runDecision(method);
    expect(mockSync).toHaveBeenCalledWith('offer-fixture', 'actor-fixture', tx);
    expect(tx.query.mock.calls.some(([sql]) => sql.includes('UPDATE supplier_product_offers'))).toBe(false);
    expect(tx.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO'))).toBe(false);
    expect(tx.commitTransaction).toHaveBeenCalledTimes(1);
  });
  it.each([
    ['approveProduct', 'select'], ['approveProduct', 'insert'],
    ['rejectProduct', 'select'], ['rejectProduct', 'insert'],
  ] as const)('%s preparation %s failure rolls back before decision', async (method, stage) => {
    const failure = new Error('Fixture preparation failure');
    if (stage === 'insert') tx.query.mockResolvedValueOnce([]);
    tx.query.mockRejectedValueOnce(failure);
    await expect(runDecision(method)).rejects.toBe(failure);
    expect(mockSync).not.toHaveBeenCalled();
    expect(tx.query.mock.calls.some(([sql]) => sql.includes('UPDATE'))).toBe(false);
    expect(tx.commitTransaction).not.toHaveBeenCalled();
    expect(tx.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(tx.release).toHaveBeenCalledTimes(1);
  });
  it('rejection preserves actor and explicit reason bindings', async () => {
    await service.rejectProduct('offer-fixture', 'actor-fixture', 'Fixture reason');
    const decision = tx.query.mock.calls.find(([sql]) => sql.includes("SET approval_status = 'rejected'"));
    expect(decision?.[1]).toEqual(['offer-fixture', 'actor-fixture', 'Fixture reason']);
  });
  it('targetless rejection cascades before commit using fallback reason and actor UUID cast', async () => {
    repo.findOne.mockResolvedValue(fixture({ serviceKeys: [] }));
    expect(await runDecision('rejectProduct')).toEqual({ success: true, data: {
      id: 'offer-fixture', masterId: 'master-fixture', isActive: false, approvalStatus: 'REJECTED',
    } });
    const revoke = tx.query.mock.calls.find(([sql]) => sql.includes('UPDATE product_approvals'));
    expect(revoke?.[0]).toContain('$2::uuid');
    expect(revoke?.[1]).toEqual(['offer-fixture', 'actor-fixture', 'Offer rejected by admin']);
    expect(events).toEqual(['startTransaction', 'select', 'write', 'write', 'write', 'commitTransaction', 'release']);
    expect(mockSync).not.toHaveBeenCalled();
  });
  it.each(['approveProduct', 'rejectProduct'] as const)('%s sync failure rolls back and releases, rethrowing original error', async (method) => {
    const failure = new Error('fixture sync failure');
    mockSync.mockRejectedValue(failure);
    await expect(runDecision(method)).rejects.toBe(failure);
    expect(tx.commitTransaction).not.toHaveBeenCalled();
    expect(events.slice(-2)).toEqual(['rollbackTransaction', 'release']);
  });
  it.each(['approveProduct', 'rejectProduct'] as const)('%s decision SQL failure rolls back without sync', async (method) => {
    const failure = new Error('fixture write failure');
    tx.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockRejectedValueOnce(failure);
    await expect(runDecision(method)).rejects.toBe(failure);
    expect(mockSync).not.toHaveBeenCalled();
    expect(tx.commitTransaction).not.toHaveBeenCalled();
    expect(tx.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(tx.release).toHaveBeenCalledTimes(1);
  });
  it('targetless rejection cascade failure rolls back every write', async () => {
    repo.findOne.mockResolvedValue(fixture({ serviceKeys: [] }));
    const failure = new Error('fixture cascade failure');
    tx.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockRejectedValueOnce(failure);
    await expect(runDecision('rejectProduct')).rejects.toBe(failure);
    expect(tx.commitTransaction).not.toHaveBeenCalled();
    expect(tx.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(tx.release).toHaveBeenCalledTimes(1);
  });
  it('commit failure also rolls back and releases', async () => {
    const failure = new Error('fixture commit failure');
    tx.commitTransaction.mockRejectedValue(failure);
    await expect(runDecision('approveProduct')).rejects.toBe(failure);
    expect(tx.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(tx.release).toHaveBeenCalledTimes(1);
  });
});

describe('supplier approval requests preserve saved policy and truthful batch outcome', () => {
  const owned = (id: string, over: Record<string, unknown> = {}) => ({ id, service_keys: ['kpa-society'], ...over });
  it('ownership, missing eligible keys and inserts are counted separately', async () => {
    query.mockResolvedValue([owned('owned'), owned('no-target', { service_keys: ['neture'] })]);
    expect(await service.submitForApproval('supplier-fixture', ['foreign', 'owned', 'no-target'])).toEqual({
      submitted: 1, errors: [{ id: 'foreign', error: 'NOT_OWNED' }],
      skipped: [{ id: 'no-target', reason: 'NO_ELIGIBLE_SERVICE_KEYS' }],
    });
    expect(query.mock.calls[0][0]).toContain('o.deleted_at IS NULL');
    expect(query.mock.calls[0][1]).toEqual([['foreign', 'owned', 'no-target'], 'supplier-fixture']);
    expect(mockPending).toHaveBeenCalledWith('owned', ['kpa-society']);
    expect(mockSync).not.toHaveBeenCalled();
  });
  it('rejected/cancelled resubmission syncs pending state and counts exactly once', async () => {
    query.mockResolvedValue([owned('owned')]);
    mockPending.mockResolvedValue({ insertedServiceKeys: [], resubmittedServiceKeys: ['kpa-society'] });
    expect(await service.submitForApproval('supplier-fixture', ['owned'])).toEqual({ submitted: 1, skipped: [], errors: [] });
    expect(mockSync).toHaveBeenCalledWith('owned', 'supplier-fixture', AppDataSource);
  });
  it('already pending/approved requests are skipped with no sync', async () => {
    query.mockResolvedValue([owned('owned')]);
    mockPending.mockResolvedValue({ insertedServiceKeys: [], resubmittedServiceKeys: [] });
    expect(await service.submitForApproval('supplier-fixture', ['owned'])).toEqual({
      submitted: 0, skipped: [{ id: 'owned', reason: 'ALREADY_REQUESTED_OR_DECIDED' }], errors: [],
    });
    expect(mockSync).not.toHaveBeenCalled();
  });
  it.each(['SUPPLIER_CATEGORY_PENDING', undefined])('category denial keeps reason/fallback %s and writes nothing', async (reasonCode) => {
    query.mockResolvedValue([owned('owned')]);
    mockCategoryGate.mockReturnValue({ allowed: false, reasonCode });
    expect(await service.submitForApproval('supplier-fixture', ['owned'])).toEqual({
      submitted: 0, skipped: [{ id: 'owned', reason: reasonCode || 'SUPPLIER_CATEGORY_NOT_APPROVED' }], errors: [],
    });
    expect(mockPending).not.toHaveBeenCalled();
  });
  it('regulated non-pharmacy service is skipped', async () => {
    query.mockResolvedValue([owned('owned', { is_regulated: true, service_keys: ['k-cosmetics'] })]);
    expect(await service.submitForApproval('supplier-fixture', ['owned'])).toEqual({
      submitted: 0, skipped: [{ id: 'owned', reason: 'DRUG_SERVICE_NOT_PHARMACY_AUDIENCE' }], errors: [],
    });
    expect(mockPending).not.toHaveBeenCalled();
  });
  it('per-offer DB failure is masked and later offers still execute', async () => {
    query.mockResolvedValue([owned('first'), owned('second')]);
    mockPending.mockRejectedValueOnce(new Error('internal fixture detail'));
    expect(await service.submitForApproval('supplier-fixture', ['first', 'second'])).toEqual({
      submitted: 1, skipped: [], errors: [{ id: 'first', error: 'INTERNAL_ERROR' }],
    });
    expect(mockPending.mock.calls.map(([id]) => id)).toEqual(['first', 'second']);
  });
  it('resubmission sync failure is counted as an error rather than submitted', async () => {
    query.mockResolvedValue([owned('owned')]);
    mockPending.mockResolvedValue({ insertedServiceKeys: [], resubmittedServiceKeys: ['kpa-society'] });
    mockSync.mockRejectedValue(new Error('fixture sync failure'));
    expect(await service.submitForApproval('supplier-fixture', ['owned'])).toEqual({
      submitted: 0, skipped: [], errors: [{ id: 'owned', error: 'INTERNAL_ERROR' }],
    });
  });
});

describe('distribution writes preserve scope, diff and transaction order', () => {
  it.each([[[], 'OFFER_NOT_FOUND'], [[rawFixture({ supplier_id: 'foreign' })], 'NOT_OWNED']] as const)(
    'denies invalid ownership with %s / %s before writes', async (rows, error) => {
      query.mockResolvedValue(rows);
      expect(await service.updateDistribution('offer-fixture', 'supplier-fixture', 'actor-fixture', {})).toEqual({ success: false, error });
      expect(tx.startTransaction).not.toHaveBeenCalled();
    });
  it('preserves non-approval keys, deduplicates input and cancels/adds/syncs in one transaction', async () => {
    query.mockResolvedValue([rawFixture({ service_keys: ['kpa-society', 'fixture-other'] })]);
    const result = await service.updateDistribution('offer-fixture', 'supplier-fixture', 'actor-fixture', {
      isPublic: true, serviceKeys: ['k-cosmetics', 'k-cosmetics', 'neture'],
    });
    expect(tx.query.mock.calls[0][1]).toEqual(['offer-fixture', ['k-cosmetics', 'fixture-other'], true, 'PUBLIC']);
    expect(mockCancel).toHaveBeenCalledWith('offer-fixture', ['kpa-society'], tx);
    expect(mockPending).toHaveBeenCalledWith('offer-fixture', ['k-cosmetics'], tx);
    expect(mockSync).toHaveBeenCalledWith('offer-fixture', 'actor-fixture', tx);
    expect(events).toEqual(['connect', 'startTransaction', 'write', 'cancel', 'pending', 'sync', 'commitTransaction', 'release']);
    expect(result).toMatchObject({ success: true, data: {
      added: ['k-cosmetics'], removed: ['kpa-society'], serviceKeys: ['k-cosmetics', 'fixture-other'], distributionType: 'PUBLIC',
    } });
  });
  it('unchanged targets do not create/cancel approvals but still sync', async () => {
    query.mockResolvedValue([rawFixture()]);
    await service.updateDistribution('offer-fixture', 'supplier-fixture', 'actor-fixture', {});
    expect(mockPending).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockSync).toHaveBeenCalledTimes(1);
    expect(tx.query.mock.calls[0][1]).toEqual(['offer-fixture', ['kpa-society'], false, 'SERVICE']);
  });
  it('drug gate denies the proposed final scope without opening a transaction', async () => {
    query.mockResolvedValue([rawFixture()]);
    drugGate.mockResolvedValue({ allowed: false, code: 'DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN' });
    expect(await service.updateDistribution('offer-fixture', 'supplier-fixture', 'actor-fixture', { isPublic: true })).toEqual({
      success: false, error: 'DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN',
    });
    expect(drugGate).toHaveBeenCalledWith(AppDataSource, {
      action: 'OFFER_PUBLISH', masterId: 'master-fixture', serviceKeys: ['kpa-society'], isPublic: true,
    });
    expect(tx.startTransaction).not.toHaveBeenCalled();
  });
  it.each(['write', 'cancel', 'pending', 'sync'] as const)('%s failure rolls back and releases the same query runner', async (stage) => {
    query.mockResolvedValue([rawFixture()]);
    const failure = new Error(`fixture ${stage} failure`);
    if (stage === 'write') tx.query.mockRejectedValue(failure);
    if (stage === 'cancel') mockCancel.mockRejectedValue(failure);
    if (stage === 'pending') mockPending.mockRejectedValue(failure);
    if (stage === 'sync') mockSync.mockRejectedValue(failure);
    await expect(service.updateDistribution('offer-fixture', 'supplier-fixture', 'actor-fixture', { serviceKeys: ['k-cosmetics'] })).rejects.toBe(failure);
    expect(tx.commitTransaction).not.toHaveBeenCalled();
    expect(events.slice(-2)).toEqual(['rollbackTransaction', 'release']);
  });
  it('single-service price edit retains other keys and common price and never touches approvals', async () => {
    query.mockResolvedValue([rawFixture({ service_keys: ['fixture-other', 'pharmacy-hub'] })]);
    expect(await service.setServiceDelivery('offer-fixture', 'supplier-fixture', 'pharmacy-hub', { enabled: true, unitPrice: 123.9 })).toMatchObject({
      success: true, data: { changed: false, unitPrice: 123, serviceKeys: ['fixture-other', 'pharmacy-hub'] },
    });
    expect(tx.query.mock.calls[1][1]).toEqual(['offer-fixture', 'pharmacy-hub', 123]);
    expect(tx.query.mock.calls[1][0]).toContain('ON CONFLICT (offer_id, service_key)');
    const sql = tx.query.mock.calls.map(([s]) => s).join('\n');
    expect(sql).not.toMatch(/offer_service_approvals|organization_product_listings|product_approvals|price_general|product_masters/);
    expect(events).toEqual(['connect', 'startTransaction', 'write', 'write', 'commitTransaction', 'release']);
  });
  it('single-service price DB failure rolls back and propagates', async () => {
    query.mockResolvedValue([rawFixture({ service_keys: ['fixture-other', 'pharmacy-hub'] })]);
    const failure = new Error('fixture price failure');
    tx.query.mockResolvedValueOnce([]).mockRejectedValueOnce(failure);
    await expect(service.setServiceDelivery('offer-fixture', 'supplier-fixture', 'pharmacy-hub', { enabled: true, unitPrice: 100 })).rejects.toBe(failure);
    expect(tx.commitTransaction).not.toHaveBeenCalled();
    expect(tx.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(tx.release).toHaveBeenCalledTimes(1);
  });
  it('approval service keys cannot bypass the approval flow', async () => {
    expect(await service.setServiceDelivery('offer-fixture', 'supplier-fixture', 'kpa-society', { enabled: true })).toEqual({
      success: false, error: 'SERVICE_KEY_REQUIRES_APPROVAL_FLOW',
    });
    expect(query).not.toHaveBeenCalled();
    expect(tx.startTransaction).not.toHaveBeenCalled();
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
    drugGate.mockResolvedValue({ allowed: false, code: 'DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN', message: 'Fixture denial' });
    expect(await service.updateSupplierOffer('offer-fixture', 'supplier-fixture', { isPublic: true })).toEqual({
      success: false, error: 'DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN', message: 'Fixture denial',
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
