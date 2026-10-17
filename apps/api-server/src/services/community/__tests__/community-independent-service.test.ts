jest.mock('../../../modules/policy-acceptance/service-enrollment-policy.service.js', () => ({
  recordEnrollmentPolicies: jest.fn(async () => []), recordEnrollmentApplication: jest.fn(async () => undefined),
}));
import { resolveCommunityWorkspace, listCommunityWorkspaces, createCommunityBoard } from '../community-workspace.service.js';
import { requestCommunityServiceMembership } from '../community-service-membership.js';
import { recordEnrollmentPolicies, recordEnrollmentApplication } from '../../../modules/policy-acceptance/service-enrollment-policy.service.js';
import { CATALOG_FORUM_STORAGE_CODES, O4O_COMMUNITIES, isReservedCommunityKey } from '../../../config/community-catalog.js';

function database(status: string | null = 'active', role = 'community:operator', eligible = true) {
  const query = jest.fn(async (sql: string, args?: unknown[]) => {
    if (sql.includes('AS verified FROM users')) return [{ status: 'active', active: eligible, verified: true }];
    if (sql.startsWith('SELECT id, status FROM service_memberships')) return status ? [{ id: 'membership', status }] : [];
    if (sql.includes('FROM role_assignments ra')) return role.startsWith('community:') ? [{ exists: 1 }] : [];
    if (sql.startsWith('INSERT INTO service_memberships')) return [{ id: 'new-membership', status: 'pending' }];
    if (sql.startsWith('INSERT INTO forum_category_requests')) return [{ id: 'board', service_code: args?.[3] }];
    return [];
  });
  return { query };
}
beforeEach(() => jest.clearAllMocks());
describe('independent community membership and ownership', () => {
  it('has no former industry catalog, but keeps generic-query exclusion tombstones', () => {
    expect(O4O_COMMUNITIES).toEqual([]);
    for (const key of ['community', 'pharmacy', 'cosmetics', 'o4o-general']) expect(isReservedCommunityKey(key)).toBe(true);
    expect(isReservedCommunityKey('business-example')).toBe(false);
    expect(CATALOG_FORUM_STORAGE_CODES).toEqual(expect.arrayContaining(['neture', 'kpa-society', 'pharmacy-hub', 'k-cosmetics', 'community']));
  });
  it('lists only the service even when historical community rows still exist', async () => {
    const exec = database();
    expect(await listCommunityWorkspaces(exec as never, null)).toMatchObject([{ communityKey: 'community', allowed: false }]);
    expect(exec.query).not.toHaveBeenCalled();
  });
  it.each(['pharmacy', 'cosmetics', 'o4o-general'])('retires %s without adopting its old ledger', async key => {
    const exec = database();
    expect(await resolveCommunityWorkspace(exec as never, { id: 'user' }, key)).toBeNull();
    expect(exec.query).not.toHaveBeenCalled();
  });
  it('uses own active membership and current community role, regardless of other services', async () => {
    const exec = database();
    expect(await resolveCommunityWorkspace(exec as never, { id: 'user', memberships: [{ serviceKey: 'neture', status: 'suspended' }] }, 'community'))
      .toMatchObject({ allowed: true, canManage: true, forumStorageCodes: ['community'] });
    expect(exec.query.mock.calls.every(([, args]) => !args?.includes('neture'))).toBe(true);
  });
  it.each(['pending', 'suspended', 'withdrawn', 'rejected'])('denies service state %s even with an operator role', async status => {
    expect(await resolveCommunityWorkspace(database(status) as never, { id: 'user' }, 'community')).toMatchObject({ allowed: false, canManage: false });
  });
  it.each(['neture:admin', 'kpa:admin', 'supplier:admin'])('does not inherit moderation from %s', async role => {
    expect(await resolveCommunityWorkspace(database('active', role) as never, { id: 'user' }, 'community')).toMatchObject({ allowed: true, canManage: false });
  });
  it('denies disabled common identity independently of membership', async () => {
    expect(await resolveCommunityWorkspace(database('active', 'community:admin', false) as never, { id: 'user' }, 'community')).toMatchObject({ allowed: false });
  });
  it('creates boards under only the community service storage code', async () => {
    const exec = database();
    const space = (await resolveCommunityWorkspace(exec as never, { id: 'user' }, 'community'))!;
    await createCommunityBoard(exec as never, space, 'user', { name: 'New board' });
    expect(exec.query.mock.calls.find(([sql]) => sql.startsWith('INSERT INTO forum_category_requests'))?.[1]?.[3]).toBe('community');
  });
  it.each([null, 'rejected'])('requests pending service membership from %s, recording service policy evidence', async status => {
    const exec = database(status);
    expect(await requestCommunityServiceMembership(exec as never, 'user', [])).toEqual({ status: 'pending', requestSubmitted: true });
    expect(recordEnrollmentPolicies).toHaveBeenCalledWith(exec, 'user', 'community', []);
    expect(recordEnrollmentApplication).toHaveBeenCalledWith(exec, 'user', 'community', { type: 'service_membership', id: 'new-membership' }, []);
    expect(exec.query.mock.calls.filter(([sql]) => /INSERT|UPDATE/.test(sql)).every(([sql]) => !/community_memberships|role_assignments/.test(sql))).toBe(true);
  });
  it.each(['active', 'pending'])('joining again preserves %s and creates no audit duplicate', async status => {
    const exec = database(status);
    expect(await requestCommunityServiceMembership(exec as never, 'user')).toEqual({ status, requestSubmitted: false });
    expect(recordEnrollmentPolicies).not.toHaveBeenCalled();
    expect(exec.query.mock.calls.some(([sql]) => sql.startsWith('INSERT'))).toBe(false);
  });
  it.each(['suspended', 'withdrawn'])('joining never revives %s', async status => {
    await expect(requestCommunityServiceMembership(database(status) as never, 'user')).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_ACTIVE' });
  });
  it('does not create membership when policy evidence fails', async () => {
    (recordEnrollmentPolicies as jest.Mock).mockRejectedValueOnce(new Error('policy unavailable'));
    const exec = database(null);
    await expect(requestCommunityServiceMembership(exec as never, 'user')).rejects.toThrow('policy unavailable');
    expect(exec.query.mock.calls.some(([sql]) => sql.startsWith('INSERT'))).toBe(false);
  });
});
