/**
 * WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1 — Community Catalog · Access · Forum context 계약 테스트
 *
 * 검증 축 (WO §34 · §35 · §36 · §37 · §40):
 *   1. Community Catalog SSOT = 1 · Community Identity ≠ Service Identity · 초기 3 Community · policy 2종만
 *   2. Access 시나리오 A~E (resolveCommunityAccess — 순수 함수, DB 0, membership 생성 0)
 *   3. Pharmacy 동일성: KPA `/kpa/forum` 과 PH `/pharmacy-hub/forum` 컨텍스트가 같은 원장 코드 집합을 본다
 *   4. Cross-community leakage: KCos-only → pharmacy write 403 · non-member → cosmetics/pharmacy 403 · o4o-general = authenticated
 *   5. 공통 Core 재사용: Forum Core 복제 0 · communityKey 컨텍스트 · service-scoped route = KEEP_AS_CONTEXT_ALIAS
 *   6. Industry Community / Neture Community identity / PH 별도 약사 Community = 0 · 새 membership 테이블 0
 *
 * 순수 단위 테스트 — DB 접속 없음.
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

// forum-core dist 는 ESM 이라 ts-jest 가 변환하지 못한다 — 기존 forum 계약 spec 과 같은 최소 mock (entity 클래스만).
jest.mock(
  '@o4o/forum-core/entities',
  () => ({
    ForumPost: class ForumPost {},
    ForumPostLike: class ForumPostLike {},
    ForumCategoryRequest: class ForumCategoryRequest {},
    ForumComment: class ForumComment {},
    PostStatus: { DRAFT: 'draft', PUBLISHED: 'publish', PENDING: 'pending', REJECTED: 'rejected', ARCHIVED: 'archived' },
    CommentStatus: { PUBLISHED: 'published', PENDING: 'pending', DELETED: 'deleted' },
  }),
  { virtual: true },
);
jest.mock(
  '@o4o/forum-core',
  () => ({ normalizeContent: (v: unknown) => v, blocksToText: () => '', normalizeMetadata: (v: unknown) => v }),
  { virtual: true },
);
jest.mock('../modules/auth/entities/User.js', () => ({ User: class User {} }), { virtual: true });
jest.mock('../database/connection.js', () => ({ AppDataSource: { getRepository: () => ({}), query: async () => [] } }));
import {
  O4O_COMMUNITIES,
  getCommunityDefinition,
  communityKeyForServiceEntry,
  listActiveCommunities,
} from '../config/community-catalog.js';
import { O4O_SERVICES } from '../config/service-catalog.js';
import {
  resolveCommunityAccess,
  listCommunitiesForUser,
  communityForumStorageCodes,
  type CommunityAccessUser,
} from '../utils/community-access.resolver.js';
import { requireCommunityAccess } from '../routes/forum/service-forum.routes.js';
import { ForumControllerBase } from '../controllers/forum/ForumControllerBase.js';
import type { ForumContext } from '../middleware/forum-context.middleware.js';

const REPO = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(REPO, p), 'utf8');
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const member = (id: string, ...active: string[]): CommunityAccessUser => ({
  id,
  roles: ['user'],
  memberships: active.map((serviceKey) => ({ serviceKey, status: 'active' })),
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Catalog
// ─────────────────────────────────────────────────────────────────────────────

describe('Community Catalog — SSOT · Identity 분리 (WO §2 · §3 · §4 · §5)', () => {
  it('초기 Community 3개 = pharmacy · cosmetics · o4o-general (active)', () => {
    expect(listActiveCommunities().map((c) => c.key)).toEqual(['pharmacy', 'cosmetics', 'o4o-general']);
    expect(getCommunityDefinition('pharmacy')?.name).toBe('약사 커뮤니티');
    expect(getCommunityDefinition('cosmetics')?.name).toBe('화장품 커뮤니티');
    expect(getCommunityDefinition('o4o-general')?.name).toBe('O4O 공통 커뮤니티');
  });

  it('참여 정책: pharmacy = kpa-society OR pharmacy-hub · cosmetics = k-cosmetics · o4o-general = authenticated', () => {
    expect(getCommunityDefinition('pharmacy')?.participationPolicy).toEqual({ mode: 'service_membership_any', serviceKeys: ['kpa-society', 'pharmacy-hub'] });
    expect(getCommunityDefinition('cosmetics')?.participationPolicy).toEqual({ mode: 'service_membership_any', serviceKeys: ['k-cosmetics'] });
    expect(getCommunityDefinition('o4o-general')?.participationPolicy).toEqual({ mode: 'authenticated' });
  });

  it('Community key 는 Service Identity 집합과 겹치지 않는다 (별도 축) · policy 의 서비스 키는 canonical Service Identity 다', () => {
    const serviceKeys = new Set(O4O_SERVICES.map((s) => s.key));
    for (const c of O4O_COMMUNITIES) {
      expect(serviceKeys.has(c.key)).toBe(false);
      if (c.participationPolicy.mode === 'service_membership_any') {
        for (const k of c.participationPolicy.serviceKeys) expect(serviceKeys.has(k)).toBe(true);
      }
      for (const e of c.entries) expect(serviceKeys.has(e.serviceKey)).toBe(true);
    }
  });

  it('policy 는 authenticated / service_membership_any 두 가지뿐 (범용 policy engine 0)', () => {
    const src = read('apps/api-server/src/config/community-catalog.ts');
    expect(src).toMatch(/mode: 'authenticated'/);
    expect(src).toMatch(/mode: 'service_membership_any'/);
    expect(src).not.toMatch(/expression|dsl|ruleBuilder|RuleBuilder/);
    expect(getCommunityDefinition('nope')).toBeUndefined();
    expect(communityForumStorageCodes('nope')).toEqual([]);
  });

  it('Industry 모델 없음 · Neture Community identity 없음', () => {
    for (const f of [
      'apps/api-server/src/config/community-catalog.ts',
      'apps/api-server/src/utils/community-access.resolver.ts',
      'apps/api-server/src/routes/communities.routes.ts',
    ]) {
      const c = code(f);
      expect(c).not.toMatch(/Industry|industry/);
      expect(c).not.toMatch(/'neture-community'|Neture Community/);
    }
    expect(O4O_COMMUNITIES.map((c) => c.key)).not.toContain('neture');
  });

  it('service-scoped mount 는 catalog entries 로 자기 Community 를 찾는다 (KPA · PH → pharmacy, KCos → cosmetics, Neture → o4o-general)', () => {
    expect(communityKeyForServiceEntry('kpa-society')).toBe('pharmacy');
    expect(communityKeyForServiceEntry('pharmacy-hub')).toBe('pharmacy');
    expect(communityKeyForServiceEntry('k-cosmetics')).toBe('cosmetics');
    expect(communityKeyForServiceEntry('neture')).toBe('o4o-general');
    expect(communityKeyForServiceEntry('kpa-branch')).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Access scenarios A~E
// ─────────────────────────────────────────────────────────────────────────────

describe('Community access 시나리오 (WO §35) — 읽기만, membership 생성 0', () => {
  const table = (u: CommunityAccessUser | null) =>
    Object.fromEntries(listCommunitiesForUser(u).map((c) => [c.communityKey, c.canParticipate ? 'O' : 'X']));

  it('A: kpa-society active → pharmacy O · cosmetics X · o4o-general O', () => {
    expect(table(member('a', 'kpa-society'))).toEqual({ pharmacy: 'O', cosmetics: 'X', 'o4o-general': 'O' });
  });
  it('B: pharmacy-hub active (KPA 없음) → pharmacy O (via pharmacy-hub) · cosmetics X · o4o-general O', () => {
    const u = member('b', 'pharmacy-hub');
    expect(table(u)).toEqual({ pharmacy: 'O', cosmetics: 'X', 'o4o-general': 'O' });
    expect(resolveCommunityAccess(u, 'pharmacy')).toEqual({ communityKey: 'pharmacy', allowed: true, reason: null, via: 'pharmacy-hub' });
    // KPA membership 자동 생성 = 0: 입력 객체가 그대로다
    expect(u.memberships).toEqual([{ serviceKey: 'pharmacy-hub', status: 'active' }]);
  });
  it('C: k-cosmetics active → pharmacy X · cosmetics O · o4o-general O', () => {
    expect(table(member('c', 'k-cosmetics'))).toEqual({ pharmacy: 'X', cosmetics: 'O', 'o4o-general': 'O' });
  });
  it('D: authenticated · membership 없음 → pharmacy X · cosmetics X · o4o-general O', () => {
    expect(table(member('d'))).toEqual({ pharmacy: 'X', cosmetics: 'X', 'o4o-general': 'O' });
    expect(resolveCommunityAccess(member('d'), 'pharmacy').reason).toBe('SERVICE_MEMBERSHIP_REQUIRED');
  });
  it('E: kpa-society + k-cosmetics active → 전부 O', () => {
    expect(table(member('e', 'kpa-society', 'k-cosmetics'))).toEqual({ pharmacy: 'O', cosmetics: 'O', 'o4o-general': 'O' });
  });
  it('비로그인 → 전부 X (AUTH_REQUIRED) — 공개 read 정책과 별개', () => {
    expect(table(null)).toEqual({ pharmacy: 'X', cosmetics: 'X', 'o4o-general': 'X' });
    expect(resolveCommunityAccess(null, 'o4o-general').reason).toBe('AUTH_REQUIRED');
  });
  it('active 가 아닌 membership(pending/suspended) 은 자격이 아니다 · role prefix 별칭(kpa)도 canonical 로 접힌다', () => {
    const pending: CommunityAccessUser = { id: 'p', roles: [], memberships: [{ serviceKey: 'kpa-society', status: 'pending' }] };
    expect(resolveCommunityAccess(pending, 'pharmacy').allowed).toBe(false);
    const alias: CommunityAccessUser = { id: 'k', roles: [], memberships: [{ serviceKey: 'kpa', status: 'active' }] };
    expect(resolveCommunityAccess(alias, 'pharmacy').allowed).toBe(true);
  });
  it('Neture membership · role 은 o4o-general 참여 조건이 아니다 (authenticated 면 충분)', () => {
    const u: CommunityAccessUser = { id: 'x', roles: ['supplier'], memberships: [] };
    expect(resolveCommunityAccess(u, 'o4o-general').allowed).toBe(true);
    const src = code('apps/api-server/src/utils/community-access.resolver.ts');
    expect(src).not.toMatch(/'neture:|neture:member|neture:operator/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Pharmacy 동일성 · Forum context
// ─────────────────────────────────────────────────────────────────────────────

class ExposedForumBase extends ForumControllerBase {
  codes(ctx: ForumContext | undefined) {
    return this.getContextForumCodes(ctx);
  }
}

describe('Pharmacy Community 동일성 — KPA · PH 진입이 같은 원장 코드 집합 (WO §36)', () => {
  const base = new ExposedForumBase();
  it('KPA 컨텍스트와 PH 컨텍스트 모두 pharmacy → [kpa-society, pharmacy-hub]', () => {
    const kpa = base.codes({ serviceCode: 'kpa', communityKey: 'pharmacy', scope: 'community' });
    const ph = base.codes({ serviceCode: 'pharmacy-hub', communityKey: 'pharmacy', scope: 'community' });
    expect(kpa).toEqual(['kpa-society', 'pharmacy-hub']);
    expect(ph).toEqual(kpa);
  });
  it('communityKey 없는 legacy 컨텍스트는 종전 단일 서비스 경계 · 컨텍스트 없음 = 무경계 · 미등록 community = fail-closed', () => {
    expect(base.codes({ serviceCode: 'kpa-branch', scope: 'organization' })).toEqual(['kpa-branch']);
    expect(base.codes(undefined)).toBeUndefined();
    expect(base.codes({ communityKey: 'nope' })).toEqual([]);
  });
  it('cosmetics / o4o-general 원장 코드', () => {
    expect(base.codes({ communityKey: 'cosmetics' })).toEqual(['k-cosmetics']);
    expect(base.codes({ communityKey: 'o4o-general' })).toEqual(['neture']);
  });
  it('4개 mount 가 communityKey 를 명시한다 (KPA remount 포함) · PH 서비스 전용 membership guard 0', () => {
    expect(read('apps/api-server/src/routes/kpa/kpa.routes.ts')).toMatch(/communityKey: 'pharmacy'/);
    expect(read('apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts')).toMatch(/communityKey: 'pharmacy'/);
    expect(read('apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts')).not.toContain('requireActiveServiceMembership(SERVICE_KEY)');
    expect(read('apps/api-server/src/routes/cosmetics/cosmetics.routes.ts')).toMatch(/communityKey: 'cosmetics'/);
    expect(read('apps/api-server/src/routes/neture/neture.routes.ts')).toMatch(/communityKey: 'o4o-general'/);
  });
  it('홈 피드(ForumQueryService · PH home/latest)도 Community 원장 코드 집합으로 경계 짓는다', () => {
    const fq = code('apps/api-server/src/modules/forum/forum-query.service.ts');
    expect(fq).toContain('communityForumStorageCodes(this.config.communityKey)');
    expect(read('apps/api-server/src/routes/kpa/kpa.routes.ts')).toMatch(/communityKey: 'pharmacy',/);
    expect(read('apps/api-server/src/routes/neture/controllers/neture.controller.ts')).toMatch(/communityKey: 'o4o-general'/);
    expect(read('apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts')).toContain("communityForumStorageCodes('pharmacy')");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Cross-community leakage (backend guard)
// ─────────────────────────────────────────────────────────────────────────────

function runGuard(communityKey: string, user: CommunityAccessUser | null) {
  const res: any = { statusCode: 200, body: null, status(c: number) { this.statusCode = c; return this; }, json(b: any) { this.body = b; return this; } };
  let passed = false;
  requireCommunityAccess(communityKey)({ user } as any, res, () => { passed = true; });
  return { passed, status: res.statusCode, code: res.body?.code, reason: res.body?.reason };
}

describe('Cross-community leakage 차단 — backend 강제 (WO §37)', () => {
  it('KCos-only user → pharmacy write 403 COMMUNITY_ACCESS_DENIED', () => {
    expect(runGuard('pharmacy', member('c', 'k-cosmetics'))).toMatchObject({ passed: false, status: 403, code: 'COMMUNITY_ACCESS_DENIED', reason: 'SERVICE_MEMBERSHIP_REQUIRED' });
  });
  it('non-member → pharmacy / cosmetics write 403 · 비로그인 → 401', () => {
    expect(runGuard('pharmacy', member('d'))).toMatchObject({ passed: false, status: 403 });
    expect(runGuard('cosmetics', member('d'))).toMatchObject({ passed: false, status: 403 });
    expect(runGuard('cosmetics', null)).toMatchObject({ passed: false, status: 401, code: 'AUTH_REQUIRED' });
  });
  it('PH-only user → pharmacy write 통과 (KPA membership 없이) · authenticated → o4o-general 통과', () => {
    expect(runGuard('pharmacy', member('b', 'pharmacy-hub')).passed).toBe(true);
    expect(runGuard('o4o-general', member('d')).passed).toBe(true);
  });
  it('공통 라우터는 쓰기 경로에 requireCommunityAccess 를 먼저 적용한다 (프런트 gate 만으로 보호하지 않는다)', () => {
    const src = code('apps/api-server/src/routes/forum/service-forum.routes.ts');
    expect(src).toContain('const write: RequestHandler[] = [authenticate as any, ...communityGuards, ...writeGuards];');
    // 양성 매칭은 원문(read) — 주석 stripper 가 route 문자열의 `/*` 에 오작동한다
    const kpa = read('apps/api-server/src/routes/kpa/kpa.routes.ts');
    for (const p of ["'/posts'", "'/posts/:id'", "'/posts/:id/like'", "'/comments'", "'/posts/:postId/comments'"]) {
      expect(kpa).toMatch(new RegExp(`forumRouter\\.(post|put|delete)\\(${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, authenticate, pharmacyWrite,`));
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. 공통 Core 재사용 · 새 테이블 0 · 서비스별 if 0
// ─────────────────────────────────────────────────────────────────────────────

describe('Community Core 재사용 · 복제 0 · 새 membership 테이블 0 (WO §6 · §7 · §40)', () => {
  it('Forum 공통 Core 는 하나다 — createServiceForumRouter 1개 · ForumControllerBase 1개 · Community 별 사본 0', () => {
    const forumDir = resolve(REPO, 'apps/api-server/src/routes/forum');
    const files = readdirSync(forumDir);
    expect(files.filter((f) => /community|pharmacy|cosmetics/i.test(f))).toEqual([]);
    expect(existsSync(resolve(REPO, 'apps/api-server/src/controllers/forum/ForumControllerBase.ts'))).toBe(true);
    expect(existsSync(resolve(REPO, 'apps/api-server/src/routes/forum/service-forum.routes.ts'))).toBe(true);
  });
  it('Forum Core 에 community 별 if 분기가 없다 — 경계는 getContextForumCodes 한 곳', () => {
    for (const f of [
      'apps/api-server/src/controllers/forum/ForumControllerBase.ts',
      'apps/api-server/src/controllers/forum/ForumPostController.ts',
      'apps/api-server/src/controllers/forum/ForumDirectoryController.ts',
      'apps/api-server/src/modules/forum/forum-query.service.ts',
    ]) {
      const c = code(f);
      expect(c).not.toMatch(/=== 'pharmacy'|=== 'cosmetics'|=== 'o4o-general'/);
    }
    expect(code('apps/api-server/src/controllers/forum/ForumControllerBase.ts')).toContain('communityForumStorageCodes(communityKey)');
  });
  it('새 Community membership 테이블 · migration · entity 0', () => {
    const mig = readdirSync(resolve(REPO, 'apps/api-server/migrations')).filter((f) => /community/i.test(f));
    expect(mig).toEqual([]);
    const inc = readdirSync(resolve(REPO, 'apps/api-server/src/database/migrations')).filter((f) => /community[-_]?member|CommunityMembership/i.test(f));
    expect(inc).toEqual([]);
    expect(existsSync(resolve(REPO, 'apps/api-server/src/entities/CommunityMembership.ts'))).toBe(false);
  });
  it('/api/v1/communities 는 조회 전용이며 registry 에 mount 된다', () => {
    const r = code('apps/api-server/src/routes/communities.routes.ts');
    expect(r).not.toMatch(/router\.(post|put|patch|delete)\(/);
    expect(code('apps/api-server/src/bootstrap/register-routes.ts')).toContain("app.use('/api/v1/communities'");
  });
  it('대표 홈은 /communities 만 읽고 membership 으로 커뮤니티를 추론하지 않는다', () => {
    const home = code('services/web-neture/src/lib/home-entry.ts');
    expect(home).toContain("api.get('/communities')");
    expect(home).not.toMatch(/community:neture|community:kpa-society|community:pharmacy-hub/);
  });
});
