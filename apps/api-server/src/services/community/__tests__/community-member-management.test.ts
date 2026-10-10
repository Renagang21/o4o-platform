import { CommunityMemberManagementService } from '../community-member-management.service.js';

type Member = { id: string; community_id: string; user_id: string; role: string; status: string };
let members: Member[];
let serviceRole: string | null;
let serviceActive: boolean;
let auditFails: boolean;
let audit: unknown[][];
const query = jest.fn(async (sql: string, params: any[] = []) => {
  if (sql.includes('FROM communities')) return params[0] === 'a' ? [{ id: 'a' }] : [];
  if (sql.startsWith('SELECT role, status')) return members.filter(m => m.community_id === params[0] && m.user_id === params[1]).map(m => ({ ...m }));
  if (sql.startsWith('SELECT id, user_id, role, status')) return members.filter(m => m.id === params[0] && m.community_id === params[1]).map(m => ({ ...m }));
  if (sql.startsWith('SELECT id, user_id FROM')) return members.filter(m => m.community_id === params[0] && m.id !== params[1] && m.role === 'admin' && m.status === 'active');
  if (sql.includes('FROM role_assignments')) return serviceRole === 'community:admin' && serviceActive ? [{ exists: 1 }] : [];
  if (sql.startsWith('SELECT id FROM users')) return [];
  if (sql.includes('FROM users u')) return [{ account_status: 'active', account_active: true, email_verified: true }];
  if (sql.startsWith('SELECT service_key, status')) return [{ service_key: 'community', status: serviceActive ? 'active' : 'suspended' }];
  if (sql.includes('FROM demo_accounts')) return [];
  if (sql.startsWith('UPDATE community_memberships')) {
    Object.assign(members.find(m => m.id === params[2] && m.community_id === params[3])!, { status: params[0], role: params[1] }); return [];
  }
  if (sql.startsWith('INSERT INTO community_membership_changes')) {
    if (auditFails) throw new Error('audit unavailable'); audit.push(params); return [];
  }
  throw new Error(`unexpected SQL: ${sql}`);
});
const db = { transaction: async (fn: any) => {
  const before = structuredClone(members); const beforeAudit = structuredClone(audit);
  try { return await fn({ query }); } catch (e) { members = before; audit = beforeAudit; throw e; }
} } as any;
const service = new CommunityMemberManagementService(db);
const change = (action: 'suspend' | 'restore' | 'withdraw', target = 'member', actor = 'admin-user') =>
  service.change({ communityId: 'a', membershipId: target, actorUserId: actor, action, reason: '회원 관리 사유' });

beforeEach(() => {
  members = [
    { id: 'admin', community_id: 'a', user_id: 'admin-user', role: 'admin', status: 'active' },
    { id: 'operator', community_id: 'a', user_id: 'operator-user', role: 'operator', status: 'active' },
    { id: 'member', community_id: 'a', user_id: 'member-user', role: 'member', status: 'active' },
    { id: 'other', community_id: 'b', user_id: 'other-user', role: 'member', status: 'active' },
  ]; serviceRole = null; serviceActive = true; auditFails = false; audit = []; query.mockClear();
});

it.each(['suspend','restore','withdraw'] as const)('operator는 %s를 처리할 수 없다', async action => {
  await expect(change(action, 'member', 'operator-user')).rejects.toMatchObject({ statusCode: 403, code: 'COMMUNITY_ADMIN_REQUIRED' });
  expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
});
it('admin의 정지·해제·탈퇴는 개별 행과 이력만 바꾼다', async () => {
  const unrelated = structuredClone(members.filter(m => m.id !== 'member'));
  await change('suspend'); await change('restore'); await change('withdraw');
  expect(members.find(m => m.id === 'member')).toMatchObject({ status: 'withdrawn', role: 'member' });
  expect(members.filter(m => m.id !== 'member')).toEqual(unrelated);
  expect(audit.map(p => p[3])).toEqual(['suspend','restore','withdraw']);
  expect(query.mock.calls.filter(([sql]) => sql.startsWith('UPDATE')).every(([sql]) => sql.startsWith('UPDATE community_memberships'))).toBe(true);
});
it('다른 커뮤니티의 행은 404', async () => {
  await expect(change('suspend','other')).rejects.toMatchObject({ statusCode: 404 });
});
it.each(['suspend','withdraw'] as const)('마지막 admin의 %s는 보호한다', async action => {
  await expect(change(action,'admin')).rejects.toMatchObject({ code: 'LAST_ADMIN_PROTECTED' });
  expect(audit).toEqual([]);
});
it('이력 저장 실패는 상태 변경도 되돌린다', async () => {
  auditFails = true;
  await expect(change('suspend')).rejects.toThrow('audit unavailable');
  expect(members.find(m => m.id === 'member')!.status).toBe('active');
});
it('정지된 본인은 자신의 정지를 해제할 수 없다', async () => {
  members.find(m => m.id === 'admin')!.status = 'suspended';
  await expect(change('restore','admin')).rejects.toMatchObject({ statusCode: 403 });
});
it('서비스 operator는 제재할 수 없고 admin은 운영자 공백을 복구할 수 있다', async () => {
  serviceRole = 'community:operator';
  await expect(change('suspend','member','central')).rejects.toMatchObject({ statusCode: 403 });
  serviceRole = 'community:admin'; members.find(m => m.id === 'admin')!.status = 'suspended';
  await expect(change('restore','admin','central')).resolves.toMatchObject({ changed: true, status: 'active' });
});
it('서비스 정지는 개별 가입 해제로 복구하지 않는다', async () => {
  members.find(m => m.id === 'member')!.status = 'suspended';
  serviceRole = 'community:admin'; serviceActive = false;
  await expect(change('restore','member','central')).rejects.toMatchObject({ statusCode: 403 });
});
it('반려/탈퇴 회원을 정지 해제로 재가입시키지 않는다', async () => {
  members.find(m => m.id === 'member')!.status = 'withdrawn';
  await expect(change('restore')).rejects.toMatchObject({ code: 'INVALID_MEMBERSHIP_TRANSITION' });
});
