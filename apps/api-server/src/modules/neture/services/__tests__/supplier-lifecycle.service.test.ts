import { AppDataSource } from '../../../../database/connection.js';
import { NetureSupplierLifecycleService } from '../supplier-lifecycle.service.js';
import { NetureSupplierService } from '../supplier.service.js';
import { NetureSupplierBusinessService } from '../supplier-business.service.js';
import { SupplierStatus } from '../../entities/index.js';
import { demoAccountService, DEMO_ACCOUNT_FORBIDDEN_CODE } from '../../../../services/auth/demo-account.service.js';
import { roleAssignmentService } from '../../../auth/services/role-assignment.service.js';
import { getCachedRoles, setCachedRoles } from '../../../auth/utils/role-cache.js';
import { notificationService } from '../../../../services/NotificationService.js';
import { getNetureMainMembershipStatus } from '../neture-main-membership.js';
import { organizationOpsService } from '../../../organization/services/organization-ops.service.js';

jest.mock('../../../../database/connection.js', () => ({ AppDataSource: { getRepository: jest.fn(), query: jest.fn(), transaction: jest.fn() } }));
jest.mock('../../entities/index.js', () => ({ NetureSupplier: class {}, SupplierStatus: { ACTIVE: 'ACTIVE', PENDING: 'PENDING', REJECTED: 'REJECTED', INACTIVE: 'INACTIVE' }, ContactVisibility: { PUBLIC: 'PUBLIC', PRIVATE: 'PRIVATE', PARTNERS: 'PARTNERS' } }));
jest.mock('../../../../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }));
jest.mock('../../middleware/supplier-context.resolver.js', () => ({}));
jest.mock('../../../auth/services/role-assignment.service.js', () => ({ roleAssignmentService: { assignRole: jest.fn(), removeRole: jest.fn() } }));
jest.mock('../neture-main-membership.js', () => ({ getNetureMainMembershipStatus: jest.fn() }));
jest.mock('../../../organization/services/organization-ops.service.js', () => ({ organizationOpsService: { ensureOrganization: jest.fn(), setOwner: jest.fn(), enrollService: jest.fn() } }));
jest.mock('../../../../services/NotificationService.js', () => ({ notificationService: { createNotification: jest.fn() } }));
jest.mock('../../../../services/auth/demo-account.service.js', () => ({ DEMO_ACCOUNT_FORBIDDEN_CODE: 'DEMO_ACCOUNT_FORBIDDEN', demoAccountService: { isDemoAccount: jest.fn(), isDemoOrganization: jest.fn() } }));

const business = { getOrgData: jest.fn() } as unknown as NetureSupplierBusinessService;
const findOne = jest.fn();
const save = jest.fn();
const create = jest.fn();
const query = jest.fn();
const manager = { getRepository: () => ({ findOne, save, create }), query, queryRunner: { query } };
let supplier: any;
let locked: any;
let events: string[];
let service: NetureSupplierLifecycleService;
const updates = () => query.mock.calls.filter(([sql]) => /^\s*UPDATE/i.test(sql));

beforeEach(() => {
  jest.resetAllMocks();
  events = [];
  supplier = { id: 'fixture-supplier', userId: 'fixture-user', organizationId: 'fixture-org', status: SupplierStatus.PENDING, slug: 'fixture', businessRegistrationDocumentId: 'fixture-document', representativeName: 'Fixture', businessType: 'fixture', businessItem: 'fixture' };
  locked = { status: SupplierStatus.ACTIVE, user_id: supplier.userId, organization_id: supplier.organizationId };
  findOne.mockResolvedValue(supplier);
  save.mockImplementation(async (s) => s);
  create.mockImplementation((s) => ({ ...s, id: supplier.id }));
  (AppDataSource.getRepository as jest.Mock).mockReturnValue({ findOne, save, create });
  (AppDataSource.query as jest.Mock).mockResolvedValue([{ id: 'fixture-document' }]);
  (business.getOrgData as jest.Mock).mockResolvedValue({ name: 'Fixture organization', business_number: 'fixture', address: 'Fixture address' });
  (getNetureMainMembershipStatus as jest.Mock).mockResolvedValue('active');
  (demoAccountService.isDemoAccount as jest.Mock).mockResolvedValue(false);
  (demoAccountService.isDemoOrganization as jest.Mock).mockResolvedValue(false);
  (organizationOpsService.ensureOrganization as jest.Mock).mockResolvedValue({ id: 'fixture-org' });
  query.mockImplementation(async (sql: string) => {
    if (sql.includes('FOR UPDATE')) return [locked];
    if (sql.includes('COUNT(')) return [{ c: '0' }];
    if (sql.includes('JOIN kyc_documents')) return [{ id: 'fixture-document' }];
    if (/^\s*UPDATE/i.test(sql)) return [[], 2];
    return [];
  });
  (AppDataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
    try { const result = await callback(manager); events.push('commit'); return result; }
    catch (error) { events.push('rollback'); throw error; }
  });
  (roleAssignmentService.removeRole as jest.Mock).mockImplementation(async () => { events.push('remove-role'); });
  (roleAssignmentService.assignRole as jest.Mock).mockImplementation(async () => { events.push('assign-role'); });
  (notificationService.createNotification as jest.Mock).mockImplementation(async () => { events.push('notify'); });
  service = new NetureSupplierLifecycleService(business);
});

describe('supplier lifecycle contracts', () => {
  it.each([
    [{ name: ' ', slug: 'fixture' }, 'MISSING_NAME'],
    [{ name: 'Fixture', slug: 'not valid' }, 'INVALID_SLUG'],
  ])('rejects malformed registration %j before membership or writes', async (data, error) => {
    expect(await service.registerSupplier('fixture-user', data)).toEqual({ success: false, error });
    expect(getNetureMainMembershipStatus).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('registration requires active Neture membership and does not write the membership ledger', async () => {
    (getNetureMainMembershipStatus as jest.Mock).mockResolvedValue('pending');
    expect(await service.registerSupplier('fixture-user', { name: 'Fixture', slug: 'fixture' })).toEqual({ success: false, error: 'NETURE_MEMBERSHIP_REQUIRED' });
    expect(findOne).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('normalizes registration and provisions an inactive canonical owner organization', async () => {
    findOne.mockResolvedValue(null);
    expect(await service.registerSupplier('fixture-user', { name: ' Fixture ', slug: ' FIXTURE ' })).toMatchObject({ success: true, data: { name: 'Fixture', slug: 'fixture', status: 'PENDING' } });
    expect(organizationOpsService.ensureOrganization).toHaveBeenCalledWith(expect.objectContaining({ name: 'Fixture', isActive: false, type: 'supplier' }), manager.queryRunner);
    expect(organizationOpsService.setOwner).toHaveBeenCalledWith('fixture-org', 'fixture-user', manager.queryRunner);
    expect(organizationOpsService.enrollService).not.toHaveBeenCalled();
    const audit = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO action_logs'));
    expect(audit).toBeDefined();
    expect(JSON.parse(audit![1][2])).toEqual({ application: { type: 'supplier_application', id: supplier.id, resourceId: 'fixture-org' }, policies: [] });
  });

  it.each(['approveSupplier', 'rejectSupplier'] as const)('%s rejects a Demo organization even without a legacy user pointer', async (method) => {
    supplier.userId = null;
    (demoAccountService.isDemoOrganization as jest.Mock).mockResolvedValue(true);
    expect(await service[method](supplier.id, 'fixture-operator')).toEqual({ success: false, error: DEMO_ACCOUNT_FORBIDDEN_CODE });
    expect(save).not.toHaveBeenCalled();
    expect(roleAssignmentService.assignRole).not.toHaveBeenCalled();
    expect(roleAssignmentService.removeRole).not.toHaveBeenCalled();
  });

  it('approval checks current membership before business proof or save', async () => {
    (getNetureMainMembershipStatus as jest.Mock).mockResolvedValue('suspended');
    expect(await service.approveSupplier(supplier.id, 'fixture-operator')).toEqual({ success: false, error: 'APPLICANT_NETURE_MEMBERSHIP_NOT_ACTIVE' });
    expect(AppDataSource.query).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('approval rejects unowned or unavailable business evidence before any write', async () => {
    (AppDataSource.query as jest.Mock).mockResolvedValue([]);
    expect(await service.approveSupplier(supplier.id, 'fixture-operator')).toEqual({ success: false, error: 'BUSINESS_REGISTRATION_REQUIRED' });
    expect(AppDataSource.query).toHaveBeenCalledWith(expect.stringContaining('user_id = $2'), ['fixture-document', 'fixture-user']);
    expect(save).not.toHaveBeenCalled();
  });

  it('approval grants only the existing scoped role and sends a single canonical notification', async () => {
    expect(await service.approveSupplier(supplier.id, 'fixture-operator')).toMatchObject({ success: true, data: { status: 'ACTIVE', name: 'Fixture organization' } });
    expect(roleAssignmentService.assignRole).toHaveBeenCalledWith({ userId: 'fixture-user', role: 'neture:supplier', assignedBy: 'fixture-operator' });
    expect(notificationService.createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'fixture-user', serviceKey: 'neture', metadata: { supplierId: supplier.id, status: 'ACTIVE', targetUrl: '/supplier/dashboard' } }));
    expect(organizationOpsService.enrollService).toHaveBeenCalledWith({ organizationId: 'fixture-org', serviceCode: 'neture' });
  });

  it('rejection removes both compatibility roles and uses the guard-safe profile link', async () => {
    expect(await service.rejectSupplier(supplier.id, 'fixture-operator', 'Fixture reason')).toMatchObject({ success: true, data: { status: 'REJECTED', rejectedReason: 'Fixture reason' } });
    expect(roleAssignmentService.removeRole.mock.calls).toEqual([['fixture-user', 'supplier'], ['fixture-user', 'neture:supplier']]);
    expect(notificationService.createNotification).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ targetUrl: '/mypage/business-profile' }) }));
  });

  it.each(['deactivateSupplier', 'reactivateSupplier'] as const)('%s requires a reason before a transaction', async (method) => {
    expect(await service[method](supplier.id, 'fixture-admin', ' ')).toEqual({ success: false, error: 'REASON_REQUIRED' });
    expect(AppDataSource.transaction).not.toHaveBeenCalled();
  });

  it.each(['deactivateSupplier', 'reactivateSupplier'] as const)('%s fails closed on Demo lookup failure before state mutation', async (method) => {
    locked.status = method === 'deactivateSupplier' ? 'ACTIVE' : 'INACTIVE';
    const failure = new Error('fixture Demo lookup failed');
    (demoAccountService.isDemoOrganization as jest.Mock).mockRejectedValue(failure);
    await expect(service[method](supplier.id, 'fixture-admin', 'Fixture reason')).rejects.toBe(failure);
    expect(updates()).toHaveLength(0);
    expect(events).toEqual(['rollback']);
  });

  it.each(['neture_orders', 'checkout_orders', 'neture_settlements'])('blocks deactivation for obligations in %s without writes or role changes', async (table) => {
    query.mockImplementation(async (sql: string) => sql.includes('FOR UPDATE') ? [locked] : [{ c: sql.includes(`FROM ${table}`) ? '1' : '0' }]);
    expect(await service.deactivateSupplier(supplier.id, 'fixture-admin', 'Fixture reason')).toMatchObject({ success: false, error: 'SUPPLIER_DEACTIVATION_BLOCKED' });
    expect(updates()).toHaveLength(0);
    expect(roleAssignmentService.removeRole).not.toHaveBeenCalled();
  });

  it.each([
    ['deactivateSupplier', null, 'SUPPLIER_NOT_FOUND'],
    ['reactivateSupplier', null, 'SUPPLIER_NOT_FOUND'],
    ['deactivateSupplier', 'PENDING', 'INVALID_STATUS'],
    ['reactivateSupplier', 'ACTIVE', 'INVALID_STATUS'],
  ] as const)('%s rejects locked status %s before Demo checks or writes', async (method, status, error) => {
    query.mockResolvedValue(status === null ? [] : [{ ...locked, status }]);
    expect(await service[method](supplier.id, 'fixture-admin', 'Fixture reason')).toEqual({ success: false, error });
    expect(demoAccountService.isDemoAccount).not.toHaveBeenCalled();
    expect(updates()).toHaveLength(0);
    expect(roleAssignmentService.assignRole).not.toHaveBeenCalled();
    expect(roleAssignmentService.removeRole).not.toHaveBeenCalled();
  });

  it.each(['deactivateSupplier', 'reactivateSupplier'] as const)('%s protects Demo organization ownership under the transaction manager', async (method) => {
    locked.status = method === 'deactivateSupplier' ? 'ACTIVE' : 'INACTIVE';
    locked.user_id = null;
    (demoAccountService.isDemoOrganization as jest.Mock).mockResolvedValue(true);
    expect(await service[method](supplier.id, 'fixture-admin', 'Fixture reason')).toEqual({ success: false, error: DEMO_ACCOUNT_FORBIDDEN_CODE });
    expect(demoAccountService.isDemoOrganization).toHaveBeenCalledWith('fixture-org', manager);
    expect(updates()).toHaveLength(0);
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('deactivation writes state and roles in one transaction before notification', async () => {
    expect(await service.deactivateSupplier(supplier.id, 'fixture-admin', 'Fixture reason')).toMatchObject({ success: true, data: { status: 'INACTIVE', revokedApprovalCount: 2, guard: { activeOrderCount: 0, unsettledCount: 0, settlementInProgressCount: 0 } } });
    expect(updates().map(([sql]) => sql.match(/UPDATE\s+(\w+)/)[1])).toEqual(['neture_suppliers', 'product_approvals', 'organization_product_listings', 'organizations']);
    expect(events).toEqual(['remove-role', 'remove-role', 'commit', 'notify']);
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE');
  });

  it('failed cascade propagates and leaves roles and notifications untouched', async () => {
    const failure = new Error('fixture cascade failed');
    const answer = query.getMockImplementation()!;
    query.mockImplementation(async (sql: string) => { if (sql.includes('UPDATE organization_product_listings')) throw failure; return answer(sql); });
    await expect(service.deactivateSupplier(supplier.id, 'fixture-admin', 'Fixture reason')).rejects.toBe(failure);
    expect(events).toEqual(['rollback']);
    expect(roleAssignmentService.removeRole).not.toHaveBeenCalled();
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('reactivation restores access atomically without restoring approvals or listings', async () => {
    locked.status = 'INACTIVE';
    expect(await service.reactivateSupplier(supplier.id, 'fixture-admin', 'Fixture reason')).toMatchObject({ success: true, data: { status: 'ACTIVE', previousStatus: 'INACTIVE' } });
    expect(updates().map(([sql]) => sql.match(/UPDATE\s+(\w+)/)[1])).toEqual(['neture_suppliers', 'organizations']);
    expect(getNetureMainMembershipStatus).toHaveBeenCalledWith(manager, 'fixture-user');
    expect(events).toEqual(['assign-role', 'commit', 'notify']);
  });

  it.each(['membership', 'proof'])('reactivation rejects invalid %s without any state or role write', async (gate) => {
    locked.status = 'INACTIVE';
    if (gate === 'membership') (getNetureMainMembershipStatus as jest.Mock).mockResolvedValue('pending');
    else { const answer = query.getMockImplementation()!; query.mockImplementation((sql: string) => sql.includes('JOIN kyc_documents') ? [] : answer(sql)); }
    expect(await service.reactivateSupplier(supplier.id, 'fixture-admin', 'Fixture reason')).toMatchObject({ success: false, error: gate === 'membership' ? 'APPLICANT_NETURE_MEMBERSHIP_NOT_ACTIVE' : 'BUSINESS_REGISTRATION_REQUIRED' });
    expect(updates()).toHaveLength(0);
    expect(roleAssignmentService.assignRole).not.toHaveBeenCalled();
  });

  it.each(['deactivateSupplier', 'reactivateSupplier'] as const)('%s rolls back when the role write fails and sends no notification', async method => {
    locked.status = method === 'deactivateSupplier' ? 'ACTIVE' : 'INACTIVE';
    const error = new Error('fixture role failure');
    (method === 'deactivateSupplier' ? roleAssignmentService.removeRole : roleAssignmentService.assignRole as jest.Mock).mockRejectedValueOnce(error);
    await expect(service[method](supplier.id, 'fixture-admin', 'Fixture reason')).rejects.toBe(error);
    expect(events).toEqual(['rollback']);
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });
  it.each(['deactivateSupplier', 'reactivateSupplier'] as const)('%s rolls back on mandatory audit failure', async method => {
    locked.status = method === 'deactivateSupplier' ? 'ACTIVE' : 'INACTIVE';
    const answer = query.getMockImplementation()!;
    query.mockImplementation(async (sql: string) => { if (sql.includes('INSERT INTO action_logs')) throw new Error('audit unavailable'); return answer(sql); });
    await expect(service[method](supplier.id, 'fixture-admin', 'Fixture reason')).rejects.toThrow('audit unavailable');
    expect(events).toContain('rollback'); expect(events).not.toContain('commit');
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it.each(['deactivateSupplier', 'reactivateSupplier'] as const)('%s clears roles repopulated by a concurrent pre-commit read', async method => {
    locked.status = method === 'deactivateSupplier' ? 'ACTIVE' : 'INACTIVE';
    (AppDataSource.transaction as jest.Mock).mockImplementation(async callback => {
      const result = await callback(manager);
      // Another /auth/me reads the old committed roles after the role writer's invalidation.
      setCachedRoles('fixture-user', method === 'deactivateSupplier' ? ['neture:supplier'] : []);
      events.push('commit');
      return result;
    });
    (notificationService.createNotification as jest.Mock).mockImplementation(async () => {
      expect(getCachedRoles('fixture-user')).toBeNull();
      events.push('notify');
    });
    expect(await service[method](supplier.id, 'fixture-admin', 'Fixture reason')).toMatchObject({ success: true });
    expect(getCachedRoles('fixture-user')).toBeNull();
    expect(events.indexOf('commit')).toBeLessThan(events.indexOf('notify'));
  });

  it('notification failure preserves a successful state transition', async () => {
    (notificationService.createNotification as jest.Mock).mockRejectedValue(new Error('fixture notification failed'));
    expect(await service.deactivateSupplier(supplier.id, 'fixture-admin', 'Fixture reason')).toMatchObject({ success: true });
  });

  it('the compatibility facade forwards lifecycle failures unchanged', async () => {
    const facade = new NetureSupplierService();
    expect(await facade.deactivateSupplier(supplier.id, 'fixture-admin', '')).toEqual({ success: false, error: 'REASON_REQUIRED' });
    (demoAccountService.isDemoOrganization as jest.Mock).mockRejectedValue(new Error('fixture lookup failed'));
    await expect(facade.approveSupplier(supplier.id, 'fixture-operator')).rejects.toThrow('fixture lookup failed');
  });
});
