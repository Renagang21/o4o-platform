/**
 * GlycoPharm Forum Service Boundary Regression Test
 *
 * WO-O4O-GLYCOPHARM-FORUM-SERVICE-BOUNDARY-AND-CROSSSERVICE-READ-WRITE-ISOLATION-FIX-V1
 * 선행 census: IR-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-V1 (S1)
 *
 * 닫으려는 결함:
 *   GlycoPharm 사용자-facing 포럼이 generic `/api/v1/forum/*` 를 호출했다. generic route 에는
 *   forumContextMiddleware 가 없어 ForumControllerBase.applyContextFilter 가 `if (!ctx) return;`
 *   으로 무필터 통과하므로 타 서비스 포럼/게시글이 GlycoPharm 화면에 섞이고 작성도 경계 밖
 *   forumId 로 가능했다.
 *
 * 본 스펙은 2계층으로 검증한다.
 *   (A) 동작 검증 — applyContextFilter / applyServiceScope 가 생성하는 SQL 조건을 fake QueryBuilder
 *       로 실측한다. DB 불필요.
 *   (B) 정적 회귀 가드 — GlycoPharm 프런트가 다시 generic route 를 소비하지 못하게,
 *       그리고 서비스 mount 가 격리 계약을 잃지 않게 소스 텍스트로 고정한다.
 *
 * 새 격리 로직은 만들지 않는다. 기존 서비스 mount 계약(forumContextMiddleware →
 * resolveCanonicalServiceKey → forum_category_requests.service_code)을 그대로 검증한다.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * ForumControllerBase 는 모듈 로드 시점에 TypeORM entity 그래프와 DataSource 를 끌어온다.
 * 여기서 검증하는 것은 순수 함수(applyContextFilter / applyServiceScope / getCanonicalServiceKey)
 * 뿐이라 저장소·커넥션은 필요 없다. entity/connection 을 가볍게 대체해 테스트가 dist 선행 빌드나
 * DB 없이 돌게 한다. 대체 대상은 전부 boundary 로직이 건드리지 않는 의존성이다.
 */
jest.mock(
  '@o4o/forum-core/entities',
  () => ({
    ForumPost: class {},
    ForumPostLike: class {},
    ForumCategoryRequest: class {},
    ForumComment: class {},
  }),
  { virtual: true },
);
jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    getRepository: () => ({}),
    query: jest.fn(async () => []),
  },
}));
jest.mock('../modules/auth/entities/User.js', () => ({ User: class {} }), { virtual: true });

import { ForumControllerBase } from '../controllers/forum/ForumControllerBase.js';
import type { ForumContext } from '../middleware/forum-context.middleware.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test doubles
// ─────────────────────────────────────────────────────────────────────────────

interface CapturedWhere {
  condition: string;
  params?: Record<string, unknown>;
}

/**
 * applyContextFilter / applyServiceScope 는 QueryBuilder 에서 andWhere 만 호출한다.
 * 따라서 andWhere 를 기록하는 최소 double 로 생성 SQL 을 실측할 수 있다.
 */
function createFakeQb() {
  const captured: CapturedWhere[] = [];
  const qb = {
    captured,
    andWhere(condition: string, params?: Record<string, unknown>) {
      captured.push({ condition, params });
      return qb;
    },
  };
  return qb;
}

/** protected 멤버를 스펙에서 호출하기 위한 얇은 노출용 subclass. 로직은 상속 그대로. */
class BoundaryProbe extends ForumControllerBase {
  runContextFilter(qb: unknown, alias: string, ctx: ForumContext | undefined): void {
    // @ts-expect-error — protected 접근: 상속 클래스에서 의도적으로 노출
    this.applyContextFilter(qb, alias, ctx);
  }

  resolveCanonical(ctx: ForumContext | undefined): string | undefined {
    // @ts-expect-error — protected 접근
    return this.getCanonicalServiceKey(ctx);
  }
}

const probe = new BoundaryProbe();

/** GlycoPharm 서비스 mount 가 주입하는 컨텍스트 (glycopharm.routes.ts 와 동일한 형태) */
const GLYCOPHARM_CTX: ForumContext = {
  serviceCode: 'glycopharm',
  organizationId: 'a1b2c3d4-0001-4000-a000-91c0fa800001',
};

/** 서비스 경계 조건(EXISTS forum_category_requests)만 골라낸다. */
function serviceScopeClauses(qb: ReturnType<typeof createFakeQb>): CapturedWhere[] {
  return qb.captured.filter((w) => w.condition.includes('forum_category_requests'));
}

// ─────────────────────────────────────────────────────────────────────────────
// (A-1) Read isolation — GlycoPharm 컨텍스트는 service_code 경계를 건다
// ─────────────────────────────────────────────────────────────────────────────

describe('GlycoPharm forum read boundary — applyContextFilter', () => {
  it('service scope 조건을 EXISTS(forum_category_requests.service_code) 로 건다', () => {
    const qb = createFakeQb();
    probe.runContextFilter(qb, 'post', GLYCOPHARM_CTX);

    const scoped = serviceScopeClauses(qb);
    expect(scoped).toHaveLength(1);
    expect(scoped[0].condition).toContain('SELECT 1 FROM forum_category_requests');
    expect(scoped[0].condition).toContain('_svc.id = post.forum_id');
    expect(scoped[0].condition).toContain('_svc.service_code = :ctxServiceKey');
    expect(scoped[0].params).toEqual({ ctxServiceKey: 'glycopharm' });
  });

  it('타 서비스 canonical key 는 바인딩되지 않는다 (cross-service read 차단)', () => {
    const qb = createFakeQb();
    probe.runContextFilter(qb, 'post', GLYCOPHARM_CTX);

    const bound = serviceScopeClauses(qb)[0].params?.ctxServiceKey;
    for (const other of ['kpa-society', 'neture', 'k-cosmetics', 'pharmacy-hub']) {
      expect(bound).not.toBe(other);
    }
  });

  it('각 서비스 컨텍스트는 자기 canonical key 만 바인딩한다', () => {
    const cases: Array<[string, string]> = [
      ['glycopharm', 'glycopharm'],
      ['kpa', 'kpa-society'],
      ['cosmetics', 'k-cosmetics'],
      ['neture', 'neture'],
      ['pharmacy-hub', 'pharmacy-hub'],
    ];

    for (const [rolePrefix, canonical] of cases) {
      const qb = createFakeQb();
      probe.runContextFilter(qb, 'post', { serviceCode: rolePrefix });
      expect(serviceScopeClauses(qb)[0].params).toEqual({ ctxServiceKey: canonical });
    }
  });

  it('GlycoPharm 은 조직 필터를 함께 유지한다 (기존 legacy scope 동작 무변경)', () => {
    const qb = createFakeQb();
    probe.runContextFilter(qb, 'post', GLYCOPHARM_CTX);

    const orgClause = qb.captured.find((w) => w.condition.includes('isOrganizationExclusive'));
    expect(orgClause).toBeDefined();
    expect(orgClause!.params).toEqual({ ctxOrgId: GLYCOPHARM_CTX.organizationId });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (A-2) generic route 가 왜 위험한지를 고정한다 — 이 동작이 바뀌면 본 WO 전제가 깨진다
// ─────────────────────────────────────────────────────────────────────────────

describe('generic /api/v1/forum/* 는 무필터다 (본 WO 가 전제하는 결함 조건)', () => {
  it('ForumContext 가 없으면 어떤 조건도 걸리지 않는다', () => {
    const qb = createFakeQb();
    probe.runContextFilter(qb, 'post', undefined);
    expect(qb.captured).toHaveLength(0);
  });

  it('serviceCode 가 비어 있으면 canonical key 가 없다 → 서비스 경계 미적용', () => {
    expect(probe.resolveCanonical(undefined)).toBeUndefined();
    expect(probe.resolveCanonical({})).toBeUndefined();
    expect(probe.resolveCanonical({ serviceCode: '  ' })).toBeUndefined();

    const qb = createFakeQb();
    probe.runContextFilter(qb, 'post', { organizationId: null });
    expect(serviceScopeClauses(qb)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (B-1) Backend mount — GlycoPharm 서비스 route 가 격리 계약을 유지하는가
// ─────────────────────────────────────────────────────────────────────────────

const GLYCOPHARM_ROUTES = fs.readFileSync(
  path.resolve(__dirname, '../routes/glycopharm/glycopharm.routes.ts'),
  'utf8',
);

/** forumRouter 정의 구간만 잘라 본다 (다른 라우터의 문자열에 오염되지 않게). */
const forumRouterSection = (() => {
  const start = GLYCOPHARM_ROUTES.indexOf('const forumRouter = Router();');
  const end = GLYCOPHARM_ROUTES.indexOf("router.use('/forum', forumRouter);", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return GLYCOPHARM_ROUTES.slice(start, end);
})();

describe('GlycoPharm forum service mount', () => {
  it('forumContextMiddleware 로 serviceCode=glycopharm 를 주입한다', () => {
    expect(forumRouterSection).toContain('forumContextMiddleware(');
    expect(forumRouterSection).toContain("serviceCode: 'glycopharm'");
  });

  it('프런트가 소비하는 경로가 전부 마운트돼 있다', () => {
    const required = [
      "forumRouter.get('/posts'",
      "forumRouter.get('/posts/:id'",
      "forumRouter.post('/posts'",
      "forumRouter.get('/posts/:postId/comments'",
      "forumRouter.get('/categories'",
      "forumRouter.get('/categories/popular'",
      "forumRouter.get('/categories/mine'",
      "forumRouter.patch('/categories/:id/owner'",
      "forumRouter.post('/categories/:id/delete-request'",
      "forumRouter.post('/categories/:id/join-requests'",
      "forumRouter.get('/categories/:id/join-requests'",
      "forumRouter.post('/categories/:id/join-requests/:requestId/approve'",
      "forumRouter.post('/categories/:id/join-requests/:requestId/reject'",
      "forumRouter.get('/categories/:id/members'",
      "forumRouter.delete('/categories/:id/members/:userId'",
      "forumRouter.get('/categories/:id/membership-status'",
    ];
    for (const route of required) {
      expect(forumRouterSection).toContain(route);
    }
  });

  it("'/categories/popular' 는 '/categories/:id' 보다 먼저 등록된다", () => {
    const popular = forumRouterSection.indexOf("forumRouter.get('/categories/popular'");
    const byId = forumRouterSection.indexOf("forumRouter.get('/categories/:id'");
    expect(popular).toBeGreaterThan(-1);
    expect(byId).toBeGreaterThan(-1);
    expect(popular).toBeLessThan(byId);
  });

  it('멤버십 핸들러는 공통 ForumMembershipController 를 재사용한다 (GP 전용 분기 없음)', () => {
    expect(GLYCOPHARM_ROUTES).toContain(
      "import { ForumMembershipController } from '../../controllers/forum/ForumMembershipController.js'",
    );
    expect(forumRouterSection).toContain('forumMembershipController.requestJoin');
  });

  it('쓰기 경로는 기존대로 authenticate 로 보호된다 (권한 정책 무변경)', () => {
    expect(forumRouterSection).toContain("forumRouter.post('/posts', authenticate");
    expect(forumRouterSection).toContain("forumRouter.put('/posts/:id', authenticate");
    expect(forumRouterSection).toContain("forumRouter.delete('/posts/:id', authenticate");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (B-2) Write boundary — create/update/delete 가 service scope 를 통과하는가
// ─────────────────────────────────────────────────────────────────────────────

const POST_CONTROLLER = fs.readFileSync(
  path.resolve(__dirname, '../controllers/forum/ForumPostController.ts'),
  'utf8',
);

describe('forum write boundary — isForumInServiceScope', () => {
  it('create 는 대상 forum 이 현재 서비스 소속일 때만 허용한다', () => {
    expect(POST_CONTROLLER).toContain('FORUM_SERVICE_SCOPE_DENIED');
    expect(POST_CONTROLLER).toContain('await this.isForumInServiceScope(resolvedForumId, ctx)');
  });

  it('forumSlug 해석도 service_code 로 제한된다 (타 서비스 slug 로 작성 불가)', () => {
    expect(POST_CONTROLLER).toContain(
      "SELECT id FROM forum_category_requests WHERE slug = $1 AND status = 'completed' AND service_code = $2",
    );
  });

  it('update / delete 도 대상 post 의 forum 을 서비스 경계로 검사한다', () => {
    const guards = POST_CONTROLLER.match(
      /await this\.isForumInServiceScope\(post\.forumId, this\.getForumContext\(req\)\)/g,
    );
    expect(guards).not.toBeNull();
    expect(guards!.length).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (B-3) Frontend census guard — GlycoPharm 사용자-facing 이 generic route 로 되돌아가지 못하게
// ─────────────────────────────────────────────────────────────────────────────

const GP_SRC = path.resolve(__dirname, '../../../../services/web-glycopharm/src');

/**
 * 본 WO 제외 범위 — generic route 유지가 의도된 계약.
 *   - `/forum/category-requests/*` : serviceCode 쿼리로 서비스가 명시되는 개설 신청 계약
 *     (service-forum.routes.ts 도 같은 이유로 마운트하지 않는다)
 *   - `/forum/operator/*`          : operator 계약 (WO §3 제외)
 */
const ALLOWED_GENERIC = ['/forum/category-requests', '/forum/operator'];

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * API 호출로 보이는 generic forum 경로만 뽑는다.
 * React Router 경로(`to="/forum/..."`, `navigate('/forum/...')`, href)는 대상이 아니다.
 */
function findGenericForumApiCalls(source: string): string[] {
  const hits: string[] = [];
  const callRe = /\b(?:api|apiClient|authClient\.api)\s*\.\s*(?:get|post|put|patch|delete|request)\s*(?:<[^>]*>)?\s*\(\s*([`'"])((?:\/api\/v1)?\/forum\/[^`'"]*)\1/g;
  let m: RegExpExecArray | null;
  while ((m = callRe.exec(source)) !== null) {
    const raw = m[2];
    const normalized = raw.startsWith('/api/v1') ? raw.slice('/api/v1'.length) : raw;
    if (ALLOWED_GENERIC.some((p) => normalized.startsWith(p))) continue;
    hits.push(raw);
  }
  return hits;
}

describe('GlycoPharm frontend forum API census', () => {
  const files = listFiles(GP_SRC);

  it('사용자-facing 소스에 generic /api/v1/forum/* 직접 소비가 0 이다', () => {
    const offenders: Array<{ file: string; paths: string[] }> = [];
    for (const file of files) {
      const hits = findGenericForumApiCalls(fs.readFileSync(file, 'utf8'));
      if (hits.length) offenders.push({ file: path.relative(GP_SRC, file), paths: hits });
    }
    expect(offenders).toEqual([]);
  });

  it('forumApi.ts 가 service-scoped base 를 단일 소유한다', () => {
    const forumApi = fs.readFileSync(path.join(GP_SRC, 'services/forumApi.ts'), 'utf8');
    expect(forumApi).toContain("export const FORUM_BASE = '/glycopharm/forum';");
  });

  it('페이지가 forum API 경로 문자열을 직접 조립하지 않는다', () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file.includes(`${path.sep}services${path.sep}forumApi.ts`)) continue;
      const source = fs.readFileSync(file, 'utf8');
      // 페이지/컴포넌트가 스스로 '/glycopharm/forum' 문자열을 만들면 base 가 다시 갈라진다.
      if (/['"`]\/(?:api\/v1\/)?glycopharm\/forum\//.test(source)) {
        offenders.push(path.relative(GP_SRC, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
