const mockQuery = jest.fn();
const mockApproval = { suspendMembership: jest.fn(async () => ({})), reactivateMembership: jest.fn(async () => ({})) };
jest.mock('../../../database/connection.js', () => ({ AppDataSource: { isInitialized: false, query: (...a: any[]) => mockQuery(...a), getRepository: jest.fn() } }));
jest.mock('../../../services/approval/MembershipApprovalService.js', () => ({ MembershipApprovalService: jest.fn(() => mockApproval) }));
jest.mock('../../../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: {} }));
jest.mock('../../../modules/auth/services/role.service.js', () => ({ roleService: {} }));
jest.mock('../../../services/auth/demo-account.service.js', () => ({ rejectDemoAccountTarget: jest.fn(async () => false) }));
import { MembershipConsoleController } from '../MembershipConsoleController.js';
const ID = '11111111-2222-4333-8444-555555555555';
function req(body: any = {}, keys = ['neture', 'pharmacy-hub'], platform = false): any {
  return { body, query: {}, params: { userId: ID }, user: { id: 'actor' }, serviceScope: { serviceKeys: keys, rolePrefixes: keys, isPlatformAdmin: platform } };
}
function res(): any { const r: any = {}; r.status = jest.fn(() => r); r.json = jest.fn(() => r); return r; }
beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockImplementation(async (sql: string, params: any[]) => {
    if (sql.startsWith('SELECT 1')) return [{ ok: 1 }];
    if (sql.includes('FROM users WHERE')) return [{ id: ID }];
    return [];
  });
});
describe('service membership boundaries', () => {
  it.each(['updateMemberStatus', 'batchUpdateStatus', 'reactivateMember'])('%s rejects an ambiguous service before DB writes', async (method) => {
    const r = req({ status: 'suspended', ids: [ID] }); const out = res();
    await (new MembershipConsoleController() as any)[method](r, out);
    expect(out.status).toHaveBeenCalledWith(400);
    expect(out.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SERVICE_KEY_REQUIRED' }));
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockApproval.suspendMembership).not.toHaveBeenCalled();
    expect(mockApproval.reactivateMembership).not.toHaveBeenCalled();
  });
  it('platform lifecycle mutations require one service', async () => {
    const out = res(); await new MembershipConsoleController().reactivateMember(req({}, [], true), out);
    expect(out.status).toHaveBeenCalledWith(400); expect(mockQuery).not.toHaveBeenCalled();
  });
  it('explicit service outside authority is rejected', async () => {
    const out = res(); await new MembershipConsoleController().reactivateMember(req({ serviceKey: 'lecture' }), out);
    expect(out.status).toHaveBeenCalledWith(403); expect(mockQuery).not.toHaveBeenCalled();
  });
  it('selected reactivation never passes all owned services to approval', async () => {
    const out = res(); await new MembershipConsoleController().reactivateMember(req({ serviceKey: 'neture' }), out);
    expect(mockApproval.reactivateMembership).toHaveBeenCalledWith(expect.objectContaining({ serviceKeys: ['neture'], isPlatformAdmin: false }));
  });
  it('a sole service remains unambiguous', async () => {
    await new MembershipConsoleController().reactivateMember(req({}, ['neture']), res());
    expect(mockApproval.reactivateMembership).toHaveBeenCalledWith(expect.objectContaining({ serviceKeys: ['neture'] }));
  });
  it('membership type cannot select another service even when target belongs to both', async () => {
    const out = res(); await new MembershipConsoleController().updateMember(req({ membershipRole: 'member', membershipServiceKey: 'pharmacy-hub', firstName: 'changed' }, ['neture']), out);
    expect(out.status).toHaveBeenCalledWith(403);
    expect(mockQuery.mock.calls.some(([sql]) => /^UPDATE/.test(sql))).toBe(false);
  });
  it('conflicting service selectors reject the entire update', async () => {
    const out = res(); await new MembershipConsoleController().updateMember(req({ membershipRole: 'member', membershipServiceKey: 'neture', serviceKey: 'pharmacy-hub' }), out);
    expect(out.status).toHaveBeenCalledWith(400);
    expect(mockQuery.mock.calls.some(([sql]) => /^UPDATE/.test(sql))).toBe(false);
  });
  it('membership type update uses the requested, authorized service', async () => {
    await new MembershipConsoleController().updateMember(req({ membershipRole: 'member', membershipServiceKey: 'neture' }), res());
    const writes = mockQuery.mock.calls.filter(([sql]) => /^UPDATE service_memberships/.test(sql));
    expect(writes).toHaveLength(1); expect(writes[0][1]).toEqual(['member', ID, 'neture']);
  });
  it('detail scopes memberships and role query to the selected canonical service', async () => {
    const r = req(); r.query.serviceKey = 'neture'; await new MembershipConsoleController().getMemberDetail(r, res());
    const roles = mockQuery.mock.calls.find(([sql]) => sql.includes('FROM role_assignments'))!;
    expect(roles[0]).toContain('ra.role LIKE ANY($2)'); expect(roles[1]).toEqual([ID, ['neture:%'], ['neture']]);
    const membership = mockQuery.mock.calls.find(([sql]) => sql.includes('SELECT id, service_key'))!;
    expect(membership[1]).toEqual([ID, ['neture']]);
  });
  it('platform list selecting one service scopes both membership and role batches', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(*)')) return [{ total: 1 }];
      if (sql.includes('SELECT u.id')) return [{ id: ID }];
      return [];
    });
    const r = req({}, [], true); r.query.serviceKey = 'neture';
    await new MembershipConsoleController().getMembers(r, res());
    const roles = mockQuery.mock.calls.find(([sql]) => sql.includes('FROM role_assignments'))!;
    expect(roles[0]).toContain('ra.role LIKE ANY($2)');
    expect(roles[1]).toEqual([[ID], ['neture:%'], ['neture']]);
    const membership = mockQuery.mock.calls.find(([sql]) => sql.includes('SELECT id, user_id, service_key'))!;
    expect(membership[1]).toEqual([[ID], ['neture']]);
  });
  it.each([['kpa-society', 'kpa'], ['k-cosmetics', 'cosmetics']])('maps %s to catalog prefix %s for bare roles in list and detail', async (serviceKey, prefix) => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT 1')) return [{ ok: 1 }];
      if (sql.includes('COUNT(*)')) return [{ total: 1 }];
      if (sql.includes('SELECT u.id') || sql.includes('FROM users WHERE')) return [{ id: ID }];
      return [];
    });
    const r = req({}, [serviceKey]); r.query.serviceKey = serviceKey;
    const controller = new MembershipConsoleController();
    await controller.getMembers(r, res());
    await controller.getMemberDetail(r, res());
    const roleCalls = mockQuery.mock.calls.filter(([sql]) => sql.includes('FROM role_assignments'));
    expect(roleCalls).toHaveLength(2);
    for (const [, params] of roleCalls) {
      expect(params[1]).toEqual([`${prefix}:%`]);
      expect(params[2]).toEqual([prefix]);
    }
  });
  it('detail cannot select an unowned service', async () => {
    mockQuery.mockResolvedValue([]); const r = req({}, ['neture']); r.query.serviceKey = 'lecture'; const out = res();
    await new MembershipConsoleController().getMemberDetail(r, out);
    expect(out.status).toHaveBeenCalledWith(404); expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
