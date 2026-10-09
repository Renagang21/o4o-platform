/**
 * 커뮤니티 권한 경계 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §10 (V1~V4)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 spec 이 막는 것
 *
 *   `community_id` 일치만으로 운영 기능을 통과시키면, **승인된 일반 회원도 같은
 *   `community_id`** 를 갖기 때문에 회원이 가입 승인·중재를 할 수 있게 된다.
 *   판정은 세 조건이다 — 개체 일치 · `status='active'` · (운영자 요구 시) `role='operator'`.
 */
import * as fs from 'fs';
import * as path from 'path';

const store: {
  communities: Array<{ id: string; slug: string; name: string; status: string }>;
  memberships: Array<{ id: string; communityId: string; userId: string; role: string; status: string }>;
  centralOperators: string[];
  serviceMemberships: Array<{ userId: string; status: string }>;
} = { communities: [], memberships: [], serviceMemberships: [], centralOperators: [] };

jest.mock('../../database/connection.js', () => ({
  AppDataSource: {
    // 운영자 수준의 서비스 가입 조회만 흉내낸다 (service_key 는 'community' 고정).
    query: async (_sql: string, params: string[]) =>
      /FROM role_assignments ra/.test(_sql) ? (store.centralOperators.includes(params[0]) && store.serviceMemberships.some(s => s.userId === params[0] && s.status === 'active') ? [{ exists: 1 }] : []) : /FROM users u/.test(_sql) ? [{ account_status: 'active', account_active: true, email_verified: true }] : params[1] === 'community'
        ? store.serviceMemberships.filter((s) => s.userId === params[0]).map((s) => ({ status: s.status }))
        : [],
    getRepository: (entity: { name?: string }) => {
      const name = entity?.name ?? '';
      if (name === 'Community') {
        return {
          findOne: async ({ where }: { where: { slug: string } }) =>
            store.communities.find((c) => c.slug === where.slug) ?? null,
        };
      }
      return {
        findOne: async ({ where }: { where: { communityId: string; userId: string } }) =>
          store.memberships.find(
            (m) => m.communityId === where.communityId && m.userId === where.userId,
          ) ?? null,
      };
    },
  },
}));

import {
  resolveCommunity,
  requireCommunityScope,
  COMMUNITY_MEMBERSHIP_REQUIRED,
  COMMUNITY_OPERATOR_REQUIRED,
  COMMUNITY_NOT_FOUND,
  COMMUNITY_SERVICE_MEMBERSHIP_REQUIRED,
} from '../community-scope.middleware.js';

const C_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const C_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const OPERATOR_A = 'u-operator-a';
const MEMBER_A = 'u-member-a';
const PENDING_A = 'u-pending-a';
const SUSPENDED_OP_A = 'u-suspended-operator-a';
const NO_SERVICE_OP_A = 'u-no-service-operator-a';
const WITHDRAWN_A = 'u-withdrawn-operator-a';

function seed() {
  store.centralOperators = [];
  store.communities = [
    { id: C_A, slug: 'alpha', name: 'Alpha', status: 'active' },
    { id: C_B, slug: 'beta', name: 'Beta', status: 'active' },
  ];
  store.memberships = [
    { id: 'm1', communityId: C_A, userId: OPERATOR_A, role: 'operator', status: 'active' },
    { id: 'm2', communityId: C_A, userId: MEMBER_A, role: 'member', status: 'active' },
    { id: 'm3', communityId: C_A, userId: PENDING_A, role: 'member', status: 'pending' },
    { id: 'm4', communityId: C_A, userId: SUSPENDED_OP_A, role: 'operator', status: 'active' },
    { id: 'm5', communityId: C_A, userId: NO_SERVICE_OP_A, role: 'operator', status: 'active' },
    { id: 'm6', communityId: C_A, userId: WITHDRAWN_A, role: 'operator', status: 'withdrawn' },
  ];
  store.serviceMemberships = [
    { userId: OPERATOR_A, status: 'active' },
    { userId: MEMBER_A, status: 'active' },
    { userId: SUSPENDED_OP_A, status: 'suspended' },
    { userId: WITHDRAWN_A, status: 'active' },
  ];
}

function makeRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const makeReq = (slug: string, userId?: string) =>
  ({ params: { communitySlug: slug }, user: userId ? { id: userId } : undefined }) as any;

/** resolve → scope 를 순서대로 태우고 최종 통과 여부를 돌려준다. */
async function run(slug: string, userId: string | undefined, level: 'member' | 'operator') {
  const req = makeReq(slug, userId);
  const res = makeRes();
  let resolved = false;
  await (resolveCommunity as any)(req, res, () => {
    resolved = true;
  });
  if (!resolved) return { passed: false, res };
  let passed = false;
  await (requireCommunityScope(level) as any)(req, res, () => {
    passed = true;
  });
  return { passed, res };
}

const codeOf = (res: any) => res.json.mock.calls[0]?.[0]?.code;

beforeEach(seed);

describe('커뮤니티 개체 경계', () => {
  it('운영자는 자기 커뮤니티의 운영 기능을 통과한다', async () => {
    const { passed } = await run('alpha', OPERATOR_A, 'operator');
    expect(passed).toBe(true);
  });

  it('V1 승인된 **일반 회원**은 운영 기능에서 403 (ID 일치만 검사하지 않는다)', async () => {
    const { passed, res } = await run('alpha', MEMBER_A, 'operator');
    expect(passed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(codeOf(res)).toBe(COMMUNITY_OPERATOR_REQUIRED);
  });

  it('회원은 게시글 수준(member)은 통과한다', async () => {
    const { passed } = await run('alpha', MEMBER_A, 'member');
    expect(passed).toBe(true);
  });

  it('V2 pending 회원은 게시글 수준도 403 (승인 우회 차단)', async () => {
    const { passed, res } = await run('alpha', PENDING_A, 'member');
    expect(passed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(codeOf(res)).toBe(COMMUNITY_MEMBERSHIP_REQUIRED);
  });

  it('V3 A 커뮤니티 운영자가 **B 커뮤니티** 로 요청하면 403 (개체 간 월권 차단)', async () => {
    const { passed, res } = await run('beta', OPERATOR_A, 'operator');
    expect(passed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(codeOf(res)).toBe(COMMUNITY_MEMBERSHIP_REQUIRED);
  });

  it('없는 커뮤니티 slug 는 404', async () => {
    const { passed, res } = await run('nope', OPERATOR_A, 'member');
    expect(passed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(codeOf(res)).toBe(COMMUNITY_NOT_FOUND);
  });

  it('비로그인은 401', async () => {
    const { passed, res } = await run('alpha', undefined, 'member');
    expect(passed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('운영자 행이 있어도 커뮤니티 서비스 이용이 **정지**면 운영 기능에서 403', async () => {
    const { passed, res } = await run('alpha', SUSPENDED_OP_A, 'operator');
    expect(passed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(codeOf(res)).toBe(COMMUNITY_SERVICE_MEMBERSHIP_REQUIRED);
  });

  it('커뮤니티 서비스 가입 행이 **없는** 운영자도 403', async () => {
    const { passed, res } = await run('alpha', NO_SERVICE_OP_A, 'operator');
    expect(passed).toBe(false);
    expect(codeOf(res)).toBe(COMMUNITY_SERVICE_MEMBERSHIP_REQUIRED);
  });

  it('개체 가입이 withdrawn 인 전 운영자는 role 이 operator 로 남아 있어도 403', async () => {
    const { passed, res } = await run('alpha', WITHDRAWN_A, 'operator');
    expect(passed).toBe(false);
    expect(codeOf(res)).toBe(COMMUNITY_MEMBERSHIP_REQUIRED);
  });

  it('역할 문자열로 platform 권한을 우회하지 않는다', () => {
    // 전체 관리자가 모든 커뮤니티의 **내부 운영**까지 열지 않도록, 소스에 bypass 가 없음을 고정한다.
    const src = fs.readFileSync(
      path.resolve(__dirname, '..', 'community-scope.middleware.ts'),
      'utf-8',
    );
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((l: string) => !l.trim().startsWith('//'))
      .join('\n');
    expect(code).not.toMatch(/community:admin/);
    expect(code).not.toMatch(/platform:super_admin/);
  });
});


describe('중앙 커뮤니티 운영자 지정', () => {
  beforeEach(seed);
  it('개별 가입이 없어도 두 독립 커뮤니티의 운영을 허용한다', async () => {
    store.centralOperators = ['u-central'];
    store.serviceMemberships.push({ userId: 'u-central', status: 'active' });
    expect((await run('alpha', 'u-central', 'operator')).passed).toBe(true);
    expect((await run('beta', 'u-central', 'operator')).passed).toBe(true);
  });
  it('중앙 역할이 해제되면 다음 요청에서 거부한다', async () => {
    store.serviceMemberships.push({ userId: 'u-central', status: 'active' });
    expect((await run('alpha', 'u-central', 'operator')).passed).toBe(false);
  });
  it('서비스 이용이 정지되면 중앙 역할이 있어도 거부한다', async () => {
    store.centralOperators = ['u-central'];
    store.serviceMemberships.push({ userId: 'u-central', status: 'suspended' });
    expect((await run('alpha', 'u-central', 'operator')).passed).toBe(false);
  });
});
