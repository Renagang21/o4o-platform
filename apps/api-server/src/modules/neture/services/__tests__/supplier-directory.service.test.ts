import { AppDataSource } from '../../../../database/connection.js';
import { NetureSupplierDirectoryService, applySupplierListQuery } from '../supplier-directory.service.js';
import { NetureSupplierService, applySupplierListQuery as compatibilityListQuery } from '../supplier.service.js';
import { NetureSupplierBusinessService } from '../supplier-business.service.js';
import { listOwnedSupplierIds } from '../../middleware/supplier-context.resolver.js';

jest.mock('../../../../database/connection.js', () => ({ AppDataSource: { getRepository: jest.fn(), query: jest.fn() } }));
jest.mock('../../entities/index.js', () => ({ NetureSupplier: class {}, SupplierStatus: { ACTIVE: 'ACTIVE', PENDING: 'PENDING', REJECTED: 'REJECTED', INACTIVE: 'INACTIVE' }, ContactVisibility: { PUBLIC: 'PUBLIC', PRIVATE: 'PRIVATE', PARTNERS: 'PARTNERS' } }));
jest.mock('../../../../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }));
jest.mock('../../middleware/supplier-context.resolver.js', () => ({ listOwnedSupplierIds: jest.fn() }));
jest.mock('../../../auth/services/role-assignment.service.js', () => ({}));
jest.mock('../neture-main-membership.js', () => ({}));
jest.mock('../../../organization/services/organization-ops.service.js', () => ({}));
jest.mock('../../../../services/NotificationService.js', () => ({}));
jest.mock('../../../../services/auth/demo-account.service.js', () => ({}));

const business = { getOrgData: jest.fn(), getOrgDataBatch: jest.fn(), getMissingProfileFields: jest.fn() } as unknown as NetureSupplierBusinessService;
const findOne = jest.fn();
const find = jest.fn();
const queryBuilder: any = { leftJoinAndSelect: jest.fn(), andWhere: jest.fn(), orderBy: jest.fn(), getMany: jest.fn() };
let supplier: any;
let service: NetureSupplierDirectoryService;

beforeEach(() => {
  jest.resetAllMocks();
  supplier = { id: 'fixture-supplier', organizationId: 'fixture-org', userId: 'legacy-user', slug: 'fixture', status: 'ACTIVE', offers: [{ id: 'fixture-offer', master: { name: 'Fixture product', brandName: 'Fixture brand' } }], createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02'), contactEmail: 'fixture-email', contactPhone: 'fixture-phone', contactWebsite: 'fixture-site', contactKakao: 'fixture-channel', contactEmailVisibility: 'PUBLIC', contactPhoneVisibility: 'PARTNERS', contactWebsiteVisibility: 'PRIVATE', contactKakaoVisibility: 'PARTNERS', settlementAccountNumber: '123-456-7890', minOrderAmount: 0, minOrderSurcharge: 20 };
  findOne.mockResolvedValue(supplier);
  find.mockResolvedValue([supplier]);
  for (const name of ['leftJoinAndSelect', 'andWhere', 'orderBy']) queryBuilder[name].mockReturnValue(queryBuilder);
  queryBuilder.getMany.mockResolvedValue([supplier]);
  (AppDataSource.getRepository as jest.Mock).mockReturnValue({ findOne, find, createQueryBuilder: jest.fn(() => queryBuilder) });
  (business.getOrgData as jest.Mock).mockResolvedValue({ name: 'Fixture organization' });
  (business.getOrgDataBatch as jest.Mock).mockResolvedValue(new Map([['fixture-org', { name: 'Fixture organization', business_number: 'fixture-number', managerEmail: 'person@example.invalid' }]]));
  (business.getMissingProfileFields as jest.Mock).mockReturnValue(['managerName']);
  (listOwnedSupplierIds as jest.Mock).mockResolvedValue([]);
  (AppDataSource.query as jest.Mock).mockImplementation(async (sql: string) => sql.includes('COUNT(') ? [{ count: 0 }] : []);
  service = new NetureSupplierDirectoryService(business);
});

describe('supplier directory contracts', () => {
  it('retains the old pure helper export identity', () => {
    expect(compatibilityListQuery).toBe(applySupplierListQuery);
  });

  it('anonymous detail hides all contact values while retaining public hints and zero order amounts', async () => {
    const result = await service.getSupplierBySlug('fixture');
    expect(result).toMatchObject({ name: 'Fixture organization', contact: { email: null, phone: null, website: null, kakao: null }, contactHints: { email: 'available', phone: 'approved_buyers_only', website: 'private', kakao: 'approved_buyers_only' }, orderCondition: { minOrderAmount: 0, minOrderSurcharge: 20, note: null }, products: [{ id: 'fixture-offer', name: 'Fixture product', category: 'Fixture brand' }] });
    expect(findOne).toHaveBeenCalledWith({ where: { slug: 'fixture', status: 'ACTIVE' }, relations: ['offers'] });
    expect(listOwnedSupplierIds).not.toHaveBeenCalled();
  });

  it('a legacy user pointer alone does not reveal private or buyer-only contacts', async () => {
    expect(await service.getSupplierBySlug('fixture', 'legacy-user')).toMatchObject({ contact: { email: 'fixture-email', phone: null, website: null, kakao: null } });
    expect(listOwnedSupplierIds).toHaveBeenCalledWith(AppDataSource, 'legacy-user');
  });

  it('canonical organization ownership reveals registered contacts without a private-supply query', async () => {
    supplier.userId = null;
    (listOwnedSupplierIds as jest.Mock).mockResolvedValue([supplier.id]);
    const approved = jest.spyOn(service, 'hasApprovedPrivateSupply');
    expect(await service.getSupplierBySlug('fixture', 'canonical-owner')).toMatchObject({ contact: { email: 'fixture-email', phone: 'fixture-phone', website: 'fixture-site', kakao: 'fixture-channel' }, contactHints: { website: 'available' } });
    expect(approved).not.toHaveBeenCalled();
  });

  it('approved private buyers see PARTNERS contacts but never PRIVATE contacts', async () => {
    (AppDataSource.query as jest.Mock).mockResolvedValue([{ count: 1 }]);
    expect(await service.getSupplierBySlug('fixture', 'fixture-buyer')).toMatchObject({ contact: { email: 'fixture-email', phone: 'fixture-phone', website: null, kakao: 'fixture-channel' }, contactHints: { phone: 'approved_buyer_exclusive' } });
    expect(AppDataSource.query).toHaveBeenCalledWith(expect.stringContaining('pa.organization_id = $2'), ['fixture-supplier', 'fixture-buyer']);
  });

  it('private-supply lookup failure is fail-closed without hiding an otherwise available detail', async () => {
    (AppDataSource.query as jest.Mock).mockImplementation(async (sql: string) => { if (sql.includes('pa.organization_id')) throw new Error('fixture lookup unavailable'); return [{ count: 0 }]; });
    expect(await service.getSupplierBySlug('fixture', 'fixture-buyer')).toMatchObject({ contact: { phone: null, website: null } });
  });

  it('an absent or inactive detail returns null without enrichment', async () => {
    findOne.mockResolvedValue(null);
    expect(await service.getSupplierBySlug('missing')).toBeNull();
    expect(business.getOrgData).not.toHaveBeenCalled();
    expect(AppDataSource.query).not.toHaveBeenCalled();
  });

  it('public listing defaults to ACTIVE and exposes no private contact or settlement fields', async () => {
    expect(await service.getSuppliers({ category: 'fixture-category' })).toEqual([expect.objectContaining({ id: 'fixture-supplier', name: 'Fixture organization', productCount: 1, trustSignals: { contactCompleteness: 1, hasApprovedBuyers: false, recentActivity: false } })]);
    expect(queryBuilder.andWhere.mock.calls).toEqual([['supplier.category = :category', { category: 'fixture-category' }], ['supplier.status = :status', { status: 'ACTIVE' }]]);
    const [result] = await service.getSuppliers();
    expect(result).not.toHaveProperty('contactEmail');
    expect(result).not.toHaveProperty('managerEmail');
    expect(result).not.toHaveProperty('settlementAccountNumber');
  });

  it('operator listing masks the account and preserves profile-completion compatibility aliases', async () => {
    (AppDataSource.query as jest.Mock).mockResolvedValue([{ id: 'legacy-user', status: 'active', email: 'fixture-user-email' }]);
    const [result] = await service.getAllSuppliers({ status: 'ACTIVE' as any });
    expect(result).toMatchObject({ name: 'Fixture organization', businessNumber: 'fixture-number', managerEmail: 'person@example.invalid', identityStatus: 'active', userEmail: 'fixture-user-email', settlementAccountNumberMasked: '***-***-7890', profileComplete: false, activationReady: false, missingProfileFields: ['managerName'], missingActivationFields: ['managerName'] });
    expect(result).not.toHaveProperty('settlementAccountNumber');
    expect(find).toHaveBeenCalledWith({ where: { status: 'ACTIVE' }, order: { createdAt: 'DESC' } });
  });

  it('pending listing preserves FIFO ordering and canonical name enrichment', async () => {
    expect(await service.getPendingSuppliers()).toEqual([expect.objectContaining({ id: supplier.id, name: 'Fixture organization', slug: 'fixture', contactEmail: 'fixture-email', identityStatus: null })]);
    expect(find).toHaveBeenCalledWith({ where: { status: 'PENDING' }, order: { createdAt: 'ASC' } });
  });

  it('paged listing searches enriched names while keeping summary independent of status filtering', async () => {
    find.mockResolvedValue([supplier, { ...supplier, id: 'fixture-pending', status: 'PENDING' }]);
    const result = await service.getAllSuppliersPaged({ search: 'Fixture organization', status: 'ACTIVE' as any, limit: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.pagination).toMatchObject({ total: 1, totalPages: 1 });
    expect(result.summary).toEqual({ total: 2, active: 1, pending: 1, rejected: 0, inactive: 0 });
  });

  it('governance aggregates both order sources and keeps the latest state-change projection', async () => {
    (AppDataSource.query as jest.Mock).mockImplementation(async (sql: string) => {
      if (sql.includes('action_logs')) return [{ supplier_id: supplier.id, created_at: 'fixture-time', user_id: 'fixture-admin', actor_name: 'Fixture actor', reason: 'Fixture reason' }];
      if (sql.includes('neture_orders o')) return [{ sid: supplier.id, c: '2' }];
      if (sql.includes('checkout_orders co')) return [{ sid: supplier.id, c: '3' }];
      if (sql.includes('neture_settlements')) return [{ sid: supplier.id, c: '1' }];
      return [];
    });
    expect(await service.getGovernanceSuppliers()).toEqual([expect.objectContaining({ id: supplier.id, activeOrderCount: 5, unsettledCount: 1, hasActiveOrders: true, hasUnsettled: true, lastChangedBy: 'Fixture actor', lastChangeReason: 'Fixture reason' })]);
    expect(find).toHaveBeenCalledWith({ where: [{ status: 'ACTIVE' }, { status: 'INACTIVE' }], order: { updatedAt: 'DESC' } });
  });

  it('empty governance lists do not query enrichment or aggregates', async () => {
    find.mockResolvedValue([]);
    expect(await service.getGovernanceSuppliers()).toEqual([]);
    expect(AppDataSource.query).not.toHaveBeenCalled();
    expect(business.getOrgDataBatch).not.toHaveBeenCalled();
  });

  it('retains existing optional governance enrichment fallback', async () => {
    (AppDataSource.query as jest.Mock).mockRejectedValue(new Error('fixture enrich failed'));
    expect(await service.getGovernanceSuppliers()).toEqual([expect.objectContaining({ activeOrderCount: 0, unsettledCount: 0, lastChangedBy: null })]);
  });

  it.each(['getAllSuppliers', 'getPendingSuppliers'] as const)('%s propagates required repository failures', async (method) => {
    const failure = new Error('fixture repository failed');
    find.mockRejectedValue(failure);
    await expect(service[method]()).rejects.toBe(failure);
  });

  it('the compatibility facade retains list defaults and required error propagation', async () => {
    const facade = new NetureSupplierService();
    queryBuilder.getMany.mockResolvedValue([]);
    expect(await facade.getSuppliers()).toEqual([]);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('supplier.status = :status', { status: 'ACTIVE' });
    findOne.mockRejectedValue(new Error('fixture unavailable'));
    await expect(facade.getSupplierBySlug('fixture')).rejects.toThrow('fixture unavailable');
  });
});
