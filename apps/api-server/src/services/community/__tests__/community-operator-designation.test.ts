/**
 * 개별 커뮤니티 운영자 지정·해제 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (권한 경계 정리)
 *
 * 고정하는 것
 *   - 그 커뮤니티의 active 가입 행만 대상 (pending → 409, 다른 커뮤니티 행 → 404)
 *   - 서비스 membership(community)이 active 가 아니면 운영자로 올리지 않는다 · 되살리지 않는다
 *   - 마지막 운영자는 내리지 않는다 (잠금 후 판정)
 *   - role_assignments 는 건드리지 않는다 — 개체 역할만 바꾼다
 */
import { CommunityOperatorDesignationService } from '../community-operator-designation.service.js';

const C1 = '11111111-1111-4111-8111-111111111111';
const C2 = '22222222-2222-4222-8222-222222222222';
const M_OP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const M_MEM = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const M_PEND = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

type Row = { id: string; community_id: string; user_id: string; role: string; status: string };
let rows: Row[];
let service: Record<string, string>;
let mainStatus: Record<string, string>;
let demoUsers: string[];
let demoLookupFails: boolean;
const sql: string[] = [];

const tx = {
  query: async (q: string, p: any[] = []) => {
    const s = q.replace(/\s+/g, ' ').trim();
    sql.push(s);
    if (s.includes('FROM demo_accounts')) {
      if (demoLookupFails) throw new Error('db down');
      return demoUsers.includes(p[0]) ? [{ '?column?': 1 }] : [];
    }
    if (s.startsWith('SELECT id, name FROM communities')) return [C1, C2].includes(p[0]) ? [{ id: p[0], name: 'c' }] : [];
    if (s.startsWith('SELECT cm.id AS membership_id')) return rows.filter(r => r.community_id === p[0] && ['active', 'suspended'].includes(r.status)).map(r => ({
      membership_id: r.id, user_id: r.user_id, role: r.role, status: r.status,
      user_name: '테스트 회원', user_email: null, service_status: service[r.user_id] ?? null,
    }));
    if (s.startsWith('SELECT id, user_id, role, status FROM community_memberships')) {
      expect(s).toContain('FOR UPDATE');
      return rows.filter((r) => r.community_id === p[0] && (r.id === p[1] || (r.role === 'admin' && r.status === 'active')));
    }
    if (s.startsWith('SELECT id FROM users')) return [];
    if (s.startsWith('SELECT service_key, status FROM service_memberships')) {
      expect(s).toContain('FOR UPDATE');
      return service[p[0]] ? [{ service_key: 'community', status: service[p[0]] }] : [];
    }
    if (s.startsWith('SELECT id, user_id FROM community_memberships')) return rows.filter(r => r.community_id === p[0] && r.id !== p[1] && r.role === 'admin' && r.status === 'active');
    if (s.startsWith('INSERT INTO community_membership_changes')) return [];
    if (s.includes('FROM users u')) return [{ account_status: 'active', account_active: true, email_verified: mainStatus[p[0]] !== 'pending', membership_status: mainStatus[p[0]] }];
    if (s.startsWith('UPDATE community_memberships')) {
      const r = rows.find((x) => x.id === p[1] && x.community_id === p[2] );
      if (r) r.role = p[0];
      return [];
    }
    throw new Error(`unexpected SQL: ${s}`);
  },
};
const runner = { ...tx, transaction: async <T>(run: (m: typeof tx) => Promise<T>) => run(tx) };
const svc = () => new CommunityOperatorDesignationService(runner);

beforeEach(() => {
  sql.length = 0;
  rows = [
    { id: M_OP, community_id: C1, user_id: 'u-op', role: 'admin', status: 'active' },
    { id: M_MEM, community_id: C1, user_id: 'u-mem', role: 'member', status: 'active' },
    { id: M_PEND, community_id: C1, user_id: 'u-pend', role: 'member', status: 'pending' },
  ];
  service = { 'u-op': 'active', 'u-mem': 'active', 'u-pend': 'active' };
  mainStatus = {};
  demoUsers = [];
  demoLookupFails = false;
});

// WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1 — Demo 의 개체 role 은 고정
it.each([
  ['지정', M_MEM, 'u-mem', 'operator', 'member'],
  ['해제', M_OP, 'u-op', 'member', 'admin'],
])('Demo 계정 %s → 403 · UPDATE 0', async (_label, membershipId, userId, role, before) => {
  rows.push({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', community_id: C1, user_id: 'u-op2', role: 'admin', status: 'active' });
  demoUsers = [userId];
  await expect(svc().setRole({ communityId: C1, membershipId, role: role as any, actorUserId: 'u-actor', reason: '역할 변경 사유' })).rejects.toMatchObject({
    statusCode: 403,
    code: 'DEMO_ACCOUNT_FORBIDDEN',
  });
  expect(rows.find((r) => r.id === membershipId)!.role).toBe(before);
  expect(sql.some((s) => s.startsWith('UPDATE'))).toBe(false);
});

it('Demo 조회가 실패하면 바꾸지 않는다 (fail-closed)', async () => {
  demoLookupFails = true;
  await expect(svc().setRole({ communityId: C1, membershipId: M_MEM, role: 'operator', actorUserId: 'u-actor', reason: '역할 변경 사유' })).rejects.toThrow('db down');
  expect(rows.find((r) => r.id === M_MEM)!.role).toBe('member');
  expect(sql.some((s) => s.startsWith('UPDATE'))).toBe(false);
});

const set = (communityId: string, membershipId: string, role: any) => svc().setRole({ communityId, membershipId, role, actorUserId: 'u-actor', reason: '역할 변경 사유' });

it('active 회원을 운영자로 지정한다 — role_assignments 는 건드리지 않는다', async () => {
  await expect(set(C1, M_MEM, 'operator')).resolves.toEqual({ membershipId: M_MEM, role: 'operator', changed: true });
  expect(rows.find((r) => r.id === M_MEM)!.role).toBe('operator');
  expect(sql.some((s) => /role_assignments/i.test(s))).toBe(false);
});

it('운영자가 둘 이상이면 해제할 수 있다', async () => {
  rows.find((r) => r.id === M_MEM)!.role = 'admin';
  await expect(set(C1, M_OP, 'member')).resolves.toMatchObject({ changed: true });
});

it('마지막 운영자는 해제할 수 없다', async () => {
  await expect(set(C1, M_OP, 'member')).rejects.toMatchObject({ statusCode: 409, code: 'LAST_ADMIN_PROTECTED' });
  expect(rows.find((r) => r.id === M_OP)!.role).toBe('admin');
});

it('가입 대기(pending) 행은 지정할 수 없다', async () => {
  await expect(set(C1, M_PEND, 'operator')).rejects.toMatchObject({ statusCode: 409, code: 'MEMBERSHIP_NOT_ACTIVE' });
});

it('다른 커뮤니티 id 로는 그 행을 찾지 못한다', async () => {
  await expect(set(C2, M_MEM, 'operator')).rejects.toMatchObject({ statusCode: 404, code: 'MEMBERSHIP_NOT_FOUND' });
});

it.each(['pending', 'suspended', undefined])('서비스 membership %s → 운영자로 올리지 않는다', async (status) => {
  if (status) service['u-mem'] = status;
  else delete service['u-mem'];
  await expect(set(C1, M_MEM, 'operator')).rejects.toMatchObject({ code: 'SERVICE_MEMBERSHIP_NOT_ACTIVE' });
  expect(sql.some((s) => s.startsWith('UPDATE'))).toBe(false);
});

it('role 값은 admin/operator/member 만', async () => {
  await expect(set(C1, M_MEM, 'owner')).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_ROLE' });
});

it('같은 역할이면 쓰지 않는다(멱등)', async () => {
  await expect(set(C1, M_OP, 'admin')).resolves.toMatchObject({ changed: false });
  expect(sql.some((s) => s.startsWith('UPDATE'))).toBe(false);
});

it('없는 커뮤니티 → 404', async () => {
  await expect(set('33333333-3333-4333-8333-333333333333', M_MEM, 'operator')).rejects.toMatchObject({
    code: 'COMMUNITY_NOT_FOUND',
  });
});

// 대체자는 실제 운영 화면 접근 자격을 가진 같은 커뮤니티 운영자여야 한다.
it.each(['suspended', 'withdrawn', 'pending', undefined])('다른 운영자의 서비스 가입이 %s 이면 마지막 운영자를 해제하지 않는다', async (status) => {
  rows.find((r) => r.id === M_MEM)!.role = 'admin';
  if (status) service['u-mem'] = status;
  else delete service['u-mem'];
  await expect(set(C1, M_OP, 'member')).rejects.toMatchObject({ code: 'LAST_ADMIN_PROTECTED' });
  expect(rows.find((r) => r.id === M_OP)!.role).toBe('admin');
});

it.each(['suspended', 'withdrawn'])('다른 운영자의 메인 이용이 %s 이면 마지막 운영자를 해제하지 않는다', async (status) => {
  rows.find((r) => r.id === M_MEM)!.role = 'admin';
  mainStatus['u-mem'] = status;
  await expect(set(C1, M_OP, 'member')).rejects.toMatchObject({ code: 'LAST_ADMIN_PROTECTED' });
});

it('메인 이용이 정지된 회원은 운영자로 지정하지 않는다', async () => {
  mainStatus['u-mem'] = 'suspended';
  await expect(set(C1, M_MEM, 'operator')).rejects.toMatchObject({ code: 'SERVICE_MEMBERSHIP_NOT_ACTIVE' });
  expect(rows.find((r) => r.id === M_MEM)!.role).toBe('member');
});

describe('서버 지정 후보 자격 안내', () => {
  it.each([
    ['개별 가입 정지', 'MEMBERSHIP_NOT_ACTIVE', () => { rows.find(r => r.id === M_MEM)!.status = 'suspended'; }],
    ['Demo 계정', 'DEMO_ACCOUNT_FORBIDDEN', () => { demoUsers = ['u-mem']; }],
    ['메인 이메일 미확인', 'MAIN_MEMBERSHIP_NOT_ACTIVE', () => { mainStatus['u-mem'] = 'pending'; }],
    ['메인 이용 정지', 'MAIN_MEMBERSHIP_NOT_ACTIVE', () => { mainStatus['u-mem'] = 'suspended'; }],
    ['커뮤니티 서비스 미가입', 'SERVICE_MEMBERSHIP_NOT_ACTIVE', () => { delete service['u-mem']; }],
    ['커뮤니티 서비스 정지', 'SERVICE_MEMBERSHIP_NOT_ACTIVE', () => { service['u-mem'] = 'suspended'; }],
  ] as const)('%s의 조회 사유와 실제 지정 거부가 일치한다', async (_label, code, prepare) => {
    prepare();
    const { members } = await svc().listMembers(C1);
    const target = members.find(m => m.membershipId === M_MEM)!;
    expect(target.designationEligibility).toMatchObject({ eligible: false, code, message: expect.any(String) });
    expect(sql.some(s => /^(UPDATE|INSERT|DELETE)/.test(s))).toBe(false);
    await expect(set(C1, M_MEM, 'operator')).rejects.toMatchObject({ statusCode: code === 'DEMO_ACCOUNT_FORBIDDEN' ? 403 : 409 });
  });
  it('적격 후보는 안내와 실제 지정이 일치한다', async () => {
    const { members } = await svc().listMembers(C1);
    expect(members.find(m => m.membershipId === M_MEM)!.designationEligibility).toEqual({ eligible: true, code: null, message: null });
    await expect(set(C1, M_MEM, 'admin')).resolves.toMatchObject({ changed: true });
  });
  it('조회 후 자격이 변경되면 실제 지정은 현재 자격으로 거부한다', async () => {
    const { members } = await svc().listMembers(C1);
    expect(members.find(m => m.membershipId === M_MEM)!.designationEligibility.eligible).toBe(true);
    mainStatus['u-mem'] = 'suspended';
    await expect(set(C1, M_MEM, 'operator')).rejects.toMatchObject({ code: 'SERVICE_MEMBERSHIP_NOT_ACTIVE' });
    expect(rows.find(r => r.id === M_MEM)!.role).toBe('member');
  });
  it('Demo 조회 오류를 적격 후보 안내로 바꾸지 않는다', async () => {
    demoLookupFails = true;
    await expect(svc().listMembers(C1)).rejects.toThrow('db down');
  });
});


it('operator가 남아 있어도 마지막 admin을 operator로 내릴 수 없다', async () => {
  rows.find(r => r.id === M_MEM)!.role = 'operator';
  await expect(set(C1,M_OP,'operator')).rejects.toMatchObject({ code: 'LAST_ADMIN_PROTECTED' });
});
it('비활성 개별 역할은 상태 복구 없이 회수할 수 있다', async () => {
  rows.find(r => r.id === M_OP)!.status = 'suspended';
  await expect(set(C1,M_OP,'member')).resolves.toMatchObject({ changed: true });
  expect(rows.find(r => r.id === M_OP)).toMatchObject({ role:'member', status:'suspended' });
});
