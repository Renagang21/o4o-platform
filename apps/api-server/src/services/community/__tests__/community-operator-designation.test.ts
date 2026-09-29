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
const sql: string[] = [];

const tx = {
  query: async (q: string, p: any[] = []) => {
    const s = q.replace(/\s+/g, ' ').trim();
    sql.push(s);
    if (s.startsWith('SELECT id, name FROM communities')) return [C1, C2].includes(p[0]) ? [{ id: p[0], name: 'c' }] : [];
    if (s.startsWith('SELECT id, user_id, role, status FROM community_memberships')) {
      expect(s).toContain('FOR UPDATE');
      return rows.filter((r) => r.community_id === p[0] && (r.id === p[1] || (r.role === 'operator' && r.status === 'active')));
    }
    if (s.startsWith('SELECT status FROM service_memberships')) return service[p[0]] ? [{ status: service[p[0]] }] : [];
    if (s.startsWith('UPDATE community_memberships')) {
      const r = rows.find((x) => x.id === p[1] && x.community_id === p[2] && x.status === 'active');
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
    { id: M_OP, community_id: C1, user_id: 'u-op', role: 'operator', status: 'active' },
    { id: M_MEM, community_id: C1, user_id: 'u-mem', role: 'member', status: 'active' },
    { id: M_PEND, community_id: C1, user_id: 'u-pend', role: 'member', status: 'pending' },
  ];
  service = { 'u-op': 'active', 'u-mem': 'active', 'u-pend': 'active' };
});

const set = (communityId: string, membershipId: string, role: any) => svc().setRole({ communityId, membershipId, role });

it('active 회원을 운영자로 지정한다 — role_assignments 는 건드리지 않는다', async () => {
  await expect(set(C1, M_MEM, 'operator')).resolves.toEqual({ membershipId: M_MEM, role: 'operator', changed: true });
  expect(rows.find((r) => r.id === M_MEM)!.role).toBe('operator');
  expect(sql.some((s) => /role_assignments/i.test(s))).toBe(false);
});

it('운영자가 둘 이상이면 해제할 수 있다', async () => {
  rows.find((r) => r.id === M_MEM)!.role = 'operator';
  await expect(set(C1, M_OP, 'member')).resolves.toMatchObject({ changed: true });
});

it('마지막 운영자는 해제할 수 없다', async () => {
  await expect(set(C1, M_OP, 'member')).rejects.toMatchObject({ statusCode: 409, code: 'LAST_OPERATOR_PROTECTED' });
  expect(rows.find((r) => r.id === M_OP)!.role).toBe('operator');
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

it('role 값은 operator/member 만', async () => {
  await expect(set(C1, M_MEM, 'admin')).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_ROLE' });
});

it('같은 역할이면 쓰지 않는다(멱등)', async () => {
  await expect(set(C1, M_OP, 'operator')).resolves.toMatchObject({ changed: false });
  expect(sql.some((s) => s.startsWith('UPDATE'))).toBe(false);
});

it('없는 커뮤니티 → 404', async () => {
  await expect(set('33333333-3333-4333-8333-333333333333', M_MEM, 'operator')).rejects.toMatchObject({
    code: 'COMMUNITY_NOT_FOUND',
  });
});
