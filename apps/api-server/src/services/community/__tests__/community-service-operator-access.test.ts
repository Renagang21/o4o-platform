import { CommunityLifecycleService } from '../community-lifecycle.service.js';
import { hasCommunityServiceOperator } from '../community-service-operator-access.js';
import { resolveCommunityWorkspace } from '../community-workspace.service.js';

function executor(role: string | null, serviceStatus = 'active', accountStatus = 'active', communityStatus = 'active') {
  const query = jest.fn(async (sql: string, params: unknown[] = []) => {
    if (sql.includes('FROM users u')) return [{ account_status: accountStatus, account_active: true, email_verified: true }];
    if (sql.includes('FROM role_assignments ra')) {
      expect(sql).toContain("ra.role IN ('community:admin', 'community:operator')");
      expect(sql).toContain('ra.is_active = true');
      expect(sql).toContain("sm.service_key = 'community' AND sm.status = 'active'");
      return serviceStatus === 'active' && ['community:admin', 'community:operator'].includes(role ?? '') && (!params[1] || role === 'community:admin') ? [{ exists: 1 }] : [];
    }
    if (sql.includes('FROM communities')) return [{ id: 'c1', name: 'Example', status: communityStatus }];
    return [];
  });
  return { query };
}

describe('중앙 지정 커뮤니티 서비스 역할', () => {
  it.each(['active', 'suspended'])('가입이 active여도 workspace는 커뮤니티 상태 %s를 별도로 반환한다', async communityStatus => {
    const exec = executor(null, 'active', 'active', communityStatus);
    const original = exec.query.getMockImplementation()!;
    exec.query.mockImplementation(async (sql, params) => sql.includes('FROM community_memberships')
      ? [{ status: 'active', role: 'member' }] as never
      : original(sql, params));
    const space = await resolveCommunityWorkspace(exec, { id: 'u1' }, 'example');
    expect(space).toMatchObject({ communityStatus, membershipStatus: 'active', allowed: communityStatus === 'active' });
  });
  it.each(['community:admin', 'community:operator'])('%s는 개별 가입 없이 운영한다', async role => {
    const exec = executor(role);
    expect(await hasCommunityServiceOperator(exec, 'u1')).toBe(true);
    const space = await resolveCommunityWorkspace(exec, { id: 'u1' }, 'example');
    expect(space).toMatchObject({ allowed: true, canManage: true, canJoin: false, membershipStatus: null });
  });
  it.each([null, 'platform:super_admin', 'neture:admin', 'neture:operator', 'supplier:admin'])('%s는 커뮤니티 운영을 열지 않는다', async role => {
    const space = await resolveCommunityWorkspace(executor(role), { id: 'u1' }, 'example');
    expect(space).toMatchObject({ allowed: false, canManage: false });
  });
  it.each(['suspended', 'withdrawn', 'pending'])('서비스 상태 %s는 거부한다', async status => {
    expect(await hasCommunityServiceOperator(executor('community:operator', status), 'u1')).toBe(false);
  });
  it('중앙 운영 권한은 현재 유효 기간 안의 역할만 조회한다', async () => {
    const exec = executor('community:operator');
    await hasCommunityServiceOperator(exec, 'u1');
    const call = exec.query.mock.calls.find(([sql]) => sql.includes('FROM role_assignments ra'));
    expect(call).toBeDefined();
    expect(call![0]).toContain('ra.valid_from <= CURRENT_TIMESTAMP');
    expect(call![0]).toContain('(ra.valid_until IS NULL OR ra.valid_until >= CURRENT_TIMESTAMP)');
  });
  it('중앙 운영자의 심사 목록은 활성 독립 커뮤니티를 조회한다', async () => {
    const exec = executor('community:operator');
    const service = new CommunityLifecycleService(exec as never);
    await service.listOperatedCommunities('u1');
    expect(exec.query.mock.calls.some(([sql]) => sql.includes("FROM communities c WHERE c.status = 'active'"))).toBe(true);
  });
  it('정지된 메인 계정은 역할이 있어도 거부한다', async () => {
    expect(await hasCommunityServiceOperator(executor('community:admin', 'active', 'suspended'), 'u1')).toBe(false);
  });
  it('폐쇄 커뮤니티는 서비스 Admin도 열지 않는다', async () => {
    const space = await resolveCommunityWorkspace(executor('community:admin', 'active', 'active', 'suspended'), { id: 'u1' }, 'example');
    expect(space).toMatchObject({ allowed: false, canManage: false });
  });
});
