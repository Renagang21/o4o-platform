/**
 * V7 — 게시글 경계는 가입 승인이다 (폴백 커뮤니티도 예외 없음)
 *   WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §10
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 종전 동작
 *   catalog policy(`authenticated` · `service_membership_any`)가 그대로 게시글 권한이었다.
 *   서비스 membership 만 있으면 **가입 승인 없이** 읽고 쓸 수 있었다.
 *
 * 새 계약
 *   ① 참여 자격(정책) AND ② 그 커뮤니티 `community_memberships(status='active')`
 *   카탈로그에만 있는 커뮤니티(`pharmacy` · `cosmetics` · `o4o-general`)도 같은 검사를 받는다.
 *   행이 없으면 통과가 아니라 **거절**이다(fail-closed).
 */
import * as fs from 'fs';
import * as path from 'path';

const approved = new Set<string>(); // `${slug}:${userId}`
const queries: Array<{ sql: string; params: unknown[] }> = [];
let dbError: Error | null = null;

jest.mock('../../database/connection.js', () => ({
  AppDataSource: {
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      if (dbError) throw dbError;
      const [slug, userId] = params as [string, string];
      return approved.has(`${slug}:${userId}`) ? [{ ok: 1 }] : [];
    },
  },
}));

// 참여 자격 판정은 종전 그대로 쓴다 — 이 WO 가 더한 것은 ② 뿐이라는 사실을 고정한다.
jest.mock('../../utils/community-access.resolver.js', () => ({
  resolveCommunityAccess: (user: { id?: string; ineligible?: boolean } | undefined) => {
    if (!user?.id) return { allowed: false, reason: 'AUTH_REQUIRED' };
    if (user.ineligible) return { allowed: false, reason: 'SERVICE_MEMBERSHIP_REQUIRED' };
    return { allowed: true, reason: null };
  },
}));

// WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1: 세미프랜차이즈 커뮤니티 판정은 별도 모듈 — 여기서는 키로 흉내 낸다.
const semiFranchiseCommunities = new Map<string, Set<string>>(); // communityKey → 허용 userId
jest.mock('../../modules/neture-pharmacy/services/semi-franchise-community-access.js', () => ({
  resolveSemiFranchiseCommunityAccess: async (_exec: unknown, userId: string, key: string) => {
    const allowedUsers = semiFranchiseCommunities.get(key);
    if (!allowedUsers) return { semiFranchise: false, allowed: false, semiFranchiseKey: null };
    return { semiFranchise: true, allowed: allowedUsers.has(userId), semiFranchiseKey: key };
  },
}));

import { requireCommunityAccess, hasApprovedCommunityMembership } from '../community-access.middleware.js';

const PHARMACY = 'pharmacy'; // 카탈로그 폴백 커뮤니티
const MEMBER = 'u-approved';
const OUTSIDER = 'u-not-approved';

async function run(key: string, user?: Record<string, unknown>) {
  const req = { user } as any;
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  let passed = false;
  let forwarded: unknown;
  await (requireCommunityAccess(key) as any)(req, res, (err?: unknown) => {
    if (err) forwarded = err;
    else passed = true;
  });
  const body = res.json.mock.calls[0]?.[0];
  return { passed, forwarded, status: res.status.mock.calls[0]?.[0], code: body?.code, body };
}

beforeEach(() => {
  approved.clear();
  queries.length = 0;
  dbError = null;
  approved.add(`${PHARMACY}:${MEMBER}`);
});

describe('V7 게시글 경계 = 가입 승인', () => {
  it('승인된 사용자는 통과한다', async () => {
    const { passed } = await run(PHARMACY, { id: MEMBER });
    expect(passed).toBe(true);
  });

  it('참여 자격은 있으나 **가입 승인이 없으면** 403 (폴백 커뮤니티도 예외 아님)', async () => {
    const { passed, status, code } = await run(PHARMACY, { id: OUTSIDER });
    expect({ passed, status, code }).toEqual({
      passed: false,
      status: 403,
      code: 'COMMUNITY_MEMBERSHIP_REQUIRED',
    });
  });

  it.each(['pharmacy', 'cosmetics', 'o4o-general'])(
    '폴백 커뮤니티 %s — 행이 아직 없으면 통과가 아니라 거절이다 (fail-closed)',
    async (key) => {
      approved.clear();
      const { passed, code } = await run(key, { id: MEMBER });
      expect({ passed, code }).toEqual({ passed: false, code: 'COMMUNITY_MEMBERSHIP_REQUIRED' });
    },
  );

  it('비로그인은 401 이며 DB 를 조회하지 않는다', async () => {
    const { passed, status, code } = await run(PHARMACY, undefined);
    expect({ passed, status, code }).toEqual({ passed: false, status: 401, code: 'AUTH_REQUIRED' });
    expect(queries).toHaveLength(0);
  });

  it('참여 자격 자체가 없으면 종전 코드(COMMUNITY_ACCESS_DENIED)를 유지한다', async () => {
    const { status, code, body } = await run(PHARMACY, { id: MEMBER, ineligible: true });
    expect({ status, code, reason: body.reason }).toEqual({
      status: 403,
      code: 'COMMUNITY_ACCESS_DENIED',
      reason: 'SERVICE_MEMBERSHIP_REQUIRED',
    });
    // 자격이 없으면 가입 조회까지 가지 않는다.
    expect(queries).toHaveLength(0);
  });

  it('DB 오류는 **통과로 바뀌지 않는다** — next(error) 로 넘긴다', async () => {
    dbError = new Error('connection lost');
    const { passed, forwarded } = await run(PHARMACY, { id: MEMBER });
    expect(passed).toBe(false);
    expect(forwarded).toBe(dbError);
  });
});

describe('가입 조회 SQL', () => {
  it('slug · user 를 파라미터로 바인딩하고 양쪽 active 만 인정한다', async () => {
    await hasApprovedCommunityMembership(PHARMACY, MEMBER);
    const { sql, params } = queries[0];
    expect(params).toEqual([PHARMACY, MEMBER]);
    expect(sql).toMatch(/c\.status = 'active'/);
    expect(sql).toMatch(/cm\.status = 'active'/);
    // Raw SQL Parameter Binding 필수 (CLAUDE.md §7 Guard Rule 2) — 보간 금지.
    expect(sql).not.toMatch(/\$\{/);
  });
});

describe('게시글 라우트 배선', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'routes', 'forum', 'service-forum.routes.ts'),
    'utf-8',
  );
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

  it('Community mount 에서는 **읽기도** 같은 게이트를 지난다', () => {
    expect(code).toMatch(
      /const read: RequestHandler\[\] = communityKey\s*\?\s*\[authenticate as any, \.\.\.communityGuards\]/,
    );
  });

  it.each([
    "router.get('/posts', ...read",
    "router.get('/posts/tags/popular', ...read",
    "router.get('/posts/:id', ...read",
    "router.get('/posts/:postId/comments', ...read",
  ])('%s', (route) => {
    expect(code.includes(route)).toBe(true);
  });

  it('Community 컨텍스트가 아닌 mount 는 종전대로 optionalAuth 다 (회귀 방지)', () => {
    expect(code).toMatch(/: \[optionalAuth as any\]/);
  });

  it('쓰기 경로는 게이트가 writeGuards 보다 **먼저** 온다', () => {
    expect(code).toMatch(
      /const write: RequestHandler\[\] = \[authenticate as any, \.\.\.communityGuards, \.\.\.writeGuards\]/,
    );
  });
});

/**
 * 잠금 방지 불변식.
 *
 * V7 이후 게시글 경계는 `communities` 행 + `community_memberships` 다. 그 행은 승격 CLI
 * (`scripts/community-catalog-promotion.ts`)가 **카탈로그의 active 커뮤니티**를 돌며 만든다.
 * 카탈로그에 없는 communityKey 로 포럼을 mount 하면 승격 대상이 아니므로 행이 영영 생기지
 * 않고, 그 커뮤니티 이용자 전원이 `COMMUNITY_MEMBERSHIP_REQUIRED` 로 막힌다.
 */
describe('mount 된 커뮤니티는 모두 승격 대상이다', () => {
  const MOUNTS: Array<[string, string]> = [
    ['routes/kpa/kpa.routes.ts', 'pharmacy'],
    ['routes/cosmetics/cosmetics.routes.ts', 'cosmetics'],
    ['routes/neture/neture.routes.ts', 'o4o-general'],
    ['routes/pharmacy-hub/pharmacy-hub.routes.ts', 'pharmacy'],
    ['routes/neture/controllers/neture.controller.ts', 'o4o-general'],
  ];

  const catalogKeys = (() => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '..', '..', 'config', 'community-catalog.ts'),
      'utf-8',
    );
    return [...src.matchAll(/key: '([^']+)'/g)].map((m) => m[1]);
  })();

  it.each(MOUNTS)('%s 의 communityKey %s 가 카탈로그에 있다', (file, key) => {
    const src = fs.readFileSync(path.resolve(__dirname, '..', '..', file), 'utf-8');
    // 그 파일이 실제로 이 key 로 mount 한다.
    expect(src).toContain(`communityKey: '${key}'`);
    // 그리고 그 key 는 승격 CLI 가 돌 카탈로그 안에 있다.
    expect(catalogKeys).toContain(key);
  });

  it('소스에 등장하는 communityKey 집합이 카탈로그를 벗어나지 않는다', () => {
    const used = new Set(MOUNTS.map(([, key]) => key));
    for (const key of used) expect(catalogKeys).toContain(key);
  });
});


describe('세미프랜차이즈 커뮤니티 — 가입 상태 직접 판정, 별도 커뮤니티 가입 없음 (WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1)', () => {
  beforeEach(() => {
    queries.length = 0;
    semiFranchiseCommunities.set('sf-community', new Set(['u-sf-member']));
  });

  it('세미프랜차이즈 가입 약국 운영자는 community_memberships 없이 통과한다', async () => {
    const r = await run('sf-community', { id: 'u-sf-member' });
    expect(r.passed).toBe(true);
    expect(queries.some((q) => q.sql.includes('community_memberships'))).toBe(false);
  });

  it('미가입 · 정지 · 종료는 403 SEMI_FRANCHISE_MEMBERSHIP_REQUIRED', async () => {
    const r = await run('sf-community', { id: 'u-other' });
    expect(r.passed).toBe(false);
    expect(r.status).toBe(403);
    expect(r.code).toBe('SEMI_FRANCHISE_MEMBERSHIP_REQUIRED');
  });
});
