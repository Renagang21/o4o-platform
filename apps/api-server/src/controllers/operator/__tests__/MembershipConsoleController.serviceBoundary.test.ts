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
/** Shared read fixture serves both batched list and individual detail queries. */
function primeMemberReads() {
  mockQuery.mockImplementation(async (sql: string) => {
    if (sql.startsWith('SELECT 1')) return [{ ok: 1 }];
    if (sql.includes('COUNT(*)')) return [{ total: 1 }];
    if (sql.includes('SELECT u.id') || sql.includes('FROM users WHERE')) return [{ id: ID }];
    return [];
  });
}

async function readMembers(method: 'getMembers' | 'getMemberDetail', keys: string[], query: Record<string, string>, platform = false) {
  const request = req({}, keys, platform);
  request.query = query;
  const response = res();
  await new MembershipConsoleController()[method](request, response);
  return response;
}

function expectReadScope(subject: string | string[], serviceKey: string | null, prefix: string | null) {
  const roleCall = mockQuery.mock.calls.find(([sql]) => sql.includes('FROM role_assignments'))!;
  expect(roleCall[0]).toContain('ra.role LIKE ANY($2)');
  expect(roleCall[1]).toEqual([subject, prefix === null ? null : [`${prefix}:%`], prefix === null ? null : [prefix]]);
  const memberships = mockQuery.mock.calls.find(([sql]) => /SELECT id, (user_id, )?service_key/.test(sql))!;
  expect(memberships[1]).toEqual(serviceKey === null ? [subject] : [subject, [serviceKey]]);
}

beforeEach(() => {
  jest.clearAllMocks();
  primeMemberReads();
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
  it.each([
    { name: 'platform lifecycle needs one service', method: 'reactivateMember', body: {}, keys: [], platform: true, status: 400 },
    { name: 'central detail needs an explicit scope', method: 'getMemberDetail', body: {}, keys: [], platform: true, status: 400 },
    { name: 'reactivation cannot select an unowned service', method: 'reactivateMember', body: { serviceKey: 'lecture' }, keys: ['neture'], platform: false, status: 403 },
  ])('$name before any DB access', async ({ method, body, keys, platform, status }) => {
    const out = res();
    await (new MembershipConsoleController() as any)[method](req(body, keys, platform), out);
    expect(out.status).toHaveBeenCalledWith(status);
    expect(mockQuery).not.toHaveBeenCalled();
  });
  it('selected reactivation never passes all owned services to approval', async () => {
    const out = res(); await new MembershipConsoleController().reactivateMember(req({ serviceKey: 'neture' }), out);
    expect(mockApproval.reactivateMembership).toHaveBeenCalledWith(expect.objectContaining({ serviceKeys: ['neture'], isPlatformAdmin: false }));
  });
  it('a sole service remains unambiguous', async () => {
    await new MembershipConsoleController().reactivateMember(req({}, ['neture']), res());
    expect(mockApproval.reactivateMembership).toHaveBeenCalledWith(expect.objectContaining({ serviceKeys: ['neture'] }));
  });
  it.each([
    { name: 'unowned membership service', body: { membershipRole: 'member', membershipServiceKey: 'pharmacy-hub', firstName: 'changed' }, keys: ['neture'], status: 403 },
    { name: 'conflicting service selectors', body: { membershipRole: 'member', membershipServiceKey: 'neture', serviceKey: 'pharmacy-hub' }, keys: ['neture', 'pharmacy-hub'], status: 400 },
  ])('rejects $name without a partial profile write', async ({ body, keys, status }) => {
    const out = res();
    await new MembershipConsoleController().updateMember(req(body, keys), out);
    expect(out.status).toHaveBeenCalledWith(status);
    expect(mockQuery.mock.calls.some(([sql]) => /^UPDATE/.test(sql))).toBe(false);
  });
  it('membership type update uses the requested, authorized service', async () => {
    await new MembershipConsoleController().updateMember(req({ membershipRole: 'member', membershipServiceKey: 'neture' }), res());
    const writes = mockQuery.mock.calls.filter(([sql]) => /^UPDATE service_memberships/.test(sql));
    expect(writes).toHaveLength(1); expect(writes[0][1]).toEqual(['member', ID, 'neture']);
  });
  it('detail scopes memberships and role query to the selected canonical service', async () => {
    await readMembers('getMemberDetail', ['neture', 'pharmacy-hub'], { serviceKey: 'neture' });
    expectReadScope(ID, 'neture', 'neture');
  });
  it('platform list selecting one service scopes both membership and role batches', async () => {
    await readMembers('getMembers', [], { serviceKey: 'neture' }, true);
    expectReadScope([ID], 'neture', 'neture');
  });
  it.each([['kpa-society', 'kpa'], ['k-cosmetics', 'cosmetics']])('maps %s to catalog prefix %s for bare roles in list and detail', async (serviceKey, prefix) => {
    for (const method of ['getMembers', 'getMemberDetail'] as const) {
      mockQuery.mockClear();
      await readMembers(method, [serviceKey], { serviceKey });
      expectReadScope(method === 'getMembers' ? [ID] : ID, serviceKey, prefix);
      expect(mockQuery.mock.calls.filter(([sql]) => sql.includes('FROM role_assignments'))).toHaveLength(1);
    }
  });

});

describe('membership read isolation on latest main', () => {
  it.each([['neture', 'neture'], ['pharmacy-hub', 'pharmacy-hub'], ['kpa-society', 'kpa'], ['k-cosmetics', 'cosmetics'], ['community', 'community'], ['lecture', 'lecture'], ['supplier', 'supplier'], ['funding', 'funding']])('limits %s detail data to its role prefix %s', async (serviceKey, prefix) => {
    await readMembers('getMemberDetail', [serviceKey, 'other-service'], { serviceKey });
    expectReadScope(ID, serviceKey, prefix);
  });

  it('keeps the explicit platform all-services view', async () => {
    await readMembers('getMemberDetail', [], { all: 'true' }, true);
    expectReadScope(ID, null, null);
  });
  it.each([
    { name: 'target has no selected-service membership', keys: ['neture', 'pharmacy-hub'], serviceKey: 'neture' },
    { name: 'selected service is not owned', keys: ['neture'], serviceKey: 'lecture' },
  ])('returns no personal data when $name', async ({ keys, serviceKey }) => {
    mockQuery.mockResolvedValue([]);
    const out = await readMembers('getMemberDetail', keys, { serviceKey });
    expect(out.status).toHaveBeenCalledWith(404);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(out.json).toHaveBeenCalledWith({ success: false, error: 'User not found' });
  });
});
