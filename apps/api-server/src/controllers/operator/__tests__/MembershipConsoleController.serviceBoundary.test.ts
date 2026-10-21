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
function makeReq(body: any = {}, keys = ['neture', 'lecture'], platform = false): any {
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
  const request = makeReq({}, keys, platform);
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
describe.each([
  { primary: 'neture', secondary: 'lecture' },
  { primary: 'community', secondary: 'kpa-society' },
])('$primary service membership boundaries', ({ primary, secondary }) => {
  function req(body: any = {}, keys = [primary, secondary], platform = false) {
    return makeReq(body, keys, platform);
  }
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
    { name: 'reactivation cannot select an unowned service', method: 'reactivateMember', body: { serviceKey: 'lecture' }, keys: [primary], platform: false, status: 403 },
  ])('$name before any DB access', async ({ method, body, keys, platform, status }) => {
    const out = res();
    await (new MembershipConsoleController() as any)[method](req(body, keys, platform), out);
    expect(out.status).toHaveBeenCalledWith(status);
    expect(mockQuery).not.toHaveBeenCalled();
  });
  it('selected reactivation never passes all owned services to approval', async () => {
    const out = res(); await new MembershipConsoleController().reactivateMember(req({ serviceKey: primary }), out);
    expect(mockApproval.reactivateMembership).toHaveBeenCalledWith(expect.objectContaining({ serviceKeys: [primary], isPlatformAdmin: false }));
  });
  it('a sole service remains unambiguous', async () => {
    await new MembershipConsoleController().reactivateMember(req({}, [primary]), res());
    expect(mockApproval.reactivateMembership).toHaveBeenCalledWith(expect.objectContaining({ serviceKeys: [primary] }));
  });
  it.each([
    { name: 'unowned membership service', body: { membershipRole: 'member', membershipServiceKey: secondary, firstName: 'changed' }, keys: [primary], status: 403 },
    { name: 'conflicting service selectors', body: { membershipRole: 'member', membershipServiceKey: primary, serviceKey: secondary }, keys: [primary, secondary], status: 400 },
  ])('rejects $name without a partial profile write', async ({ body, keys, status }) => {
    const out = res();
    await new MembershipConsoleController().updateMember(req(body, keys), out);
    expect(out.status).toHaveBeenCalledWith(status);
    expect(mockQuery.mock.calls.some(([sql]) => /^UPDATE/.test(sql))).toBe(false);
  });
  it('membership type update uses the requested, authorized service', async () => {
    await new MembershipConsoleController().updateMember(req({ membershipRole: 'member', membershipServiceKey: primary }), res());
    const writes = mockQuery.mock.calls.filter(([sql]) => /^UPDATE service_memberships/.test(sql));
    expect(writes).toHaveLength(1); expect(writes[0][1]).toEqual(['member', ID, primary]);
  });
});

describe('canonical member read scopes', () => {
  it.each(['getMembers', 'getMemberDetail'] as const)('%s omits retired assignments while preserving current service roles', async method => {
    const historical = [
      { id: 'old', role: 'kpa:pharmacist' },
      { id: 'current', role: 'kpa:operator' },
    ];
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT 1')) return [{ ok: 1 }];
      if (sql.includes('COUNT(*)')) return [{ total: 1 }];
      if (sql.includes('SELECT u.id') || sql.includes('FROM users WHERE')) return [{ id: ID }];
      if (sql.includes('FROM role_assignments')) return method === 'getMembers'
        ? [{ user_id: ID, roles: historical.map(row => row.role) }]
        : historical;
      return [];
    });
    const response = await readMembers(method, ['kpa-society'], { serviceKey: 'kpa-society' });
    const payload = response.json.mock.calls[0][0];
    expectReadScope(method === 'getMembers' ? [ID] : ID, 'kpa-society', 'kpa');
    if (method === 'getMembers') expect(payload.users[0].roles).toEqual(['kpa:operator']);
    else expect(payload.roles).toEqual([expect.objectContaining({ id: 'current', role: 'kpa:operator' })]);
    expect(historical).toHaveLength(2);
    expect(mockQuery.mock.calls.every(([sql]) => /^SELECT/.test(sql))).toBe(true);
  });
  it('central detail needs an explicit scope before personal data access', async () => {
    const out = await readMembers('getMemberDetail', [], {}, true);
    expect(out.status).toHaveBeenCalledWith(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });
  it('detail scopes memberships and role query to the selected canonical service', async () => {
    await readMembers('getMemberDetail', ['neture', 'lecture'], { serviceKey: 'neture' });
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
  it.each([['neture', 'neture'], ['kpa-society', 'kpa'], ['k-cosmetics', 'cosmetics'], ['community', 'community'], ['lecture', 'lecture'], ['supplier', 'supplier'], ['funding', 'funding']])('limits %s detail data to its role prefix %s', async (serviceKey, prefix) => {
    await readMembers('getMemberDetail', [serviceKey, 'other-service'], { serviceKey });
    expectReadScope(ID, serviceKey, prefix);
  });

  it('keeps the explicit platform all-services view', async () => {
    await readMembers('getMemberDetail', [], { all: 'true' }, true);
    expectReadScope(ID, null, null);
  });
  it.each([
    { name: 'target has no selected-service membership', keys: ['neture', 'lecture'], serviceKey: 'neture' },
    { name: 'selected service is not owned', keys: ['neture'], serviceKey: 'lecture' },
  ])('returns no personal data when $name', async ({ keys, serviceKey }) => {
    mockQuery.mockResolvedValue([]);
    const out = await readMembers('getMemberDetail', keys, { serviceKey });
    expect(out.status).toHaveBeenCalledWith(404);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(out.json).toHaveBeenCalledWith({ success: false, error: 'User not found' });
  });
});

it('membershipServiceKey cannot change a pending retired membership through an admin profile update',async()=>{
 const response = res();
 await new MembershipConsoleController().updateMember(makeReq({membershipRole:'member',membershipServiceKey:' pharmacy-hub '},[],true),response);
 expect(response.status).toHaveBeenCalledWith(410);
 expect(mockQuery).not.toHaveBeenCalled();
});


describe('list/detail membership projection preserves distinct response contracts', () => {
  const createdAt = new Date('2026-01-01T00:00:00Z');
  const updatedAt = new Date('2026-01-02T00:00:00Z');
  const membership = {
    id: 'fixture-membership', user_id: ID, service_key: 'neture', status: 'active',
    role: 'member', approved_by: null, approved_at: null, rejection_reason: null,
    created_at: createdAt, updated_at: updatedAt,
  };
  const summary = {
    id: 'fixture-membership', serviceKey: 'neture', status: 'active', role: 'member',
    approvedBy: null, approvedAt: null, rejectionReason: null, createdAt,
  };
  beforeEach(() => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT 1')) return [{ ok: 1 }];
      if (sql.includes('COUNT(*)')) return [{ total: 1 }];
      if (sql.includes('SELECT u.id') || sql.includes('FROM users WHERE')) return [{ id: ID, status: 'inactive' }];
      if (sql.includes('FROM service_memberships')) return [membership];
      if (sql.includes('FROM role_assignments')) return [];
      return [];
    });
  });

  it('list uses membership status, preserves nulls, and omits detail-only updatedAt', async () => {
    const response = await readMembers('getMembers', ['neture'], { serviceKey: 'neture' });
    const payload = response.json.mock.calls[0][0];
    expect(payload.users[0].status).toBe('active');
    expect(payload.users[0].memberships).toEqual([summary]);
    expect(payload.users[0].memberships[0]).not.toHaveProperty('updatedAt');
    expect(payload.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it('detail keeps account status and adds membership updatedAt', async () => {
    const response = await readMembers('getMemberDetail', ['neture'], { serviceKey: 'neture' });
    const payload = response.json.mock.calls[0][0];
    expect(payload.user.status).toBe('inactive');
    expect(payload.memberships).toEqual([{ ...summary, updatedAt }]);
    expect(payload.roles).toEqual([]);
  });

  it('empty list returns pagination without fetching roles or memberships', async () => {
    mockQuery.mockImplementation(async sql => sql.includes('COUNT(*)') ? [{ total: 0 }] : []);
    const response = await readMembers('getMembers', ['neture'], { serviceKey: 'neture' });
    expect(response.json).toHaveBeenCalledWith({ success: true, users: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});
