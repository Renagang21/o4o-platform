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
function req(body: any = {}, keys = ['community', 'kpa-society'], platform = false): any {
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
    const out = res(); await new MembershipConsoleController().reactivateMember(req({ serviceKey: 'community' }), out);
    expect(mockApproval.reactivateMembership).toHaveBeenCalledWith(expect.objectContaining({ serviceKeys: ['community'], isPlatformAdmin: false }));
  });
  it('a sole service remains unambiguous', async () => {
    await new MembershipConsoleController().reactivateMember(req({}, ['community']), res());
    expect(mockApproval.reactivateMembership).toHaveBeenCalledWith(expect.objectContaining({ serviceKeys: ['community'] }));
  });
  it('membership type cannot select another service even when target belongs to both', async () => {
    const out = res(); await new MembershipConsoleController().updateMember(req({ membershipRole: 'member', membershipServiceKey: 'kpa-society', firstName: 'changed' }, ['community']), out);
    expect(out.status).toHaveBeenCalledWith(403);
    expect(mockQuery.mock.calls.some(([sql]) => /^UPDATE/.test(sql))).toBe(false);
  });
  it('conflicting service selectors reject the entire update', async () => {
    const out = res(); await new MembershipConsoleController().updateMember(req({ membershipRole: 'member', membershipServiceKey: 'community', serviceKey: 'kpa-society' }), out);
    expect(out.status).toHaveBeenCalledWith(400);
    expect(mockQuery.mock.calls.some(([sql]) => /^UPDATE/.test(sql))).toBe(false);
  });
  it('membership type update uses the requested, authorized service', async () => {
    await new MembershipConsoleController().updateMember(req({ membershipRole: 'member', membershipServiceKey: 'community' }), res());
    const writes = mockQuery.mock.calls.filter(([sql]) => /^UPDATE service_memberships/.test(sql));
    expect(writes).toHaveLength(1); expect(writes[0][1]).toEqual(['member', ID, 'community']);
  });

});


it('membership type cannot carry another service role into approval or suspension', async () => {
  const out = res();
  await new MembershipConsoleController().updateMember(req({ membershipRole: 'neture:member', membershipServiceKey: 'community' }), out);
  expect(out.status).toHaveBeenCalledWith(400);
  expect(mockQuery.mock.calls.some(([sql]) => /^UPDATE/.test(sql))).toBe(false);
});
