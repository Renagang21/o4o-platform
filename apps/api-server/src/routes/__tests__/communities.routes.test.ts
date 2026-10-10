/**
 * 커뮤니티 개설·가입 경로 배선 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 고정하는 것
 *   두 심사 주체가 **다른 축**이며 서로 섞이지 않는다.
 *
 *     개설 심사  아직 어떤 커뮤니티에도 속하지 않은 요청 → 서비스 전체 역할 community:admin
 *     가입 심사  그 커뮤니티 안의 일                    → 개체 운영자 (resolveCommunity + operator)
 *
 *   개설 경로에 개체 가드가 붙으면 첫 커뮤니티를 아무도 만들 수 없고,
 *   가입 승인 경로에 서비스 전체 가드가 붙으면 A 커뮤니티 운영자가 B 를 승인한다.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Router } from 'express';

const calls: string[] = [];

const mark = (name: string) => {
  const handler: any = (_req: unknown, _res: unknown, next: () => void) => {
    calls.push(name);
    next();
  };
  handler.__guard = name;
  return handler;
};

jest.mock('../../middleware/community-scope.middleware.js', () => ({
  resolveCommunity: mark('resolveCommunity'),
  requireCommunityScope: (level: string) => mark(`communityScope:${level}`),
}));

jest.mock('../../middleware/community-service-scope.middleware.js', () => ({
  requireCommunityServiceScope: (role: string) => mark(`serviceScope:${role}`),
}));

jest.mock('../../database/connection.js', () => ({ AppDataSource: {} }));
jest.mock('../../services/forum/ForumRequestService.js', () => ({ forumRequestService: {} }));

// This suite checks outer community guard wiring. The delegated Forum router
// has separate boundary tests and requires its real entity graph at runtime.
jest.mock('../forum/service-forum.routes.js', () => ({
  createServiceForumRouter: () => Router(),
}));

jest.mock('../../services/auth/auth-context.helper.js', () => ({
  freshenUserContext: async () => ({ roles: [], memberships: [] }),
}));

import express from 'express';
import request from 'supertest';
import { CommunityLifecycleService } from '../../services/community/community-lifecycle.service.js';
import { NetureMainMembershipRequiredError } from '../../modules/neture/services/neture-main-membership.js';
import { createCommunitiesRoutes } from '../communities.routes.js';

const optionalAuth = mark('optionalAuth');
const authenticate = mark('authenticate');

interface Wired {
  method: string;
  path: string;
  guards: string[];
}

function wiring(): Wired[] {
  const router: any = createCommunitiesRoutes(optionalAuth, authenticate);
  return router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      method: Object.keys(layer.route.methods)[0].toUpperCase(),
      path: layer.route.path,
      guards: layer.route.stack
        .map((s: any) => s.handle?.__guard)
        .filter((g: unknown): g is string => typeof g === 'string'),
    }));
}

const find = (method: string, path: string): Wired => {
  const hit = wiring().find((w) => w.method === method && w.path === path);
  if (!hit) throw new Error(`route not wired: ${method} ${path}\n${JSON.stringify(wiring(), null, 2)}`);
  return hit;
};

describe('개설 — 서비스 전체 역할이 심사한다', () => {
  it('신청은 인증만 요구한다 (아무 커뮤니티에도 속하지 않은 사람이 신청한다)', () => {
    expect(find('POST', '/requests').guards).toEqual(['authenticate']);
  });

  it('내 신청 이력도 인증만 — slug_conflict 재신청 안내의 도달점', () => {
    expect(find('GET', '/requests/mine').guards).toEqual(['authenticate']);
  });

  it.each([
    ['GET', '/requests'],
    ['POST', '/requests/:requestId/approve'],
    ['POST', '/requests/:requestId/reject'],
  ])('%s %s 는 서비스 Operator 이상이 심사한다', (method, path) => {
    expect(find(method, path).guards).toEqual(['authenticate', 'serviceScope:community:operator']);
  });

  it('개설 심사 경로에는 **개체 가드가 붙지 않는다** (첫 커뮤니티를 만들 수 있어야 한다)', () => {
    for (const w of wiring().filter((x) => x.path.startsWith('/requests'))) {
      expect(w.guards.some((g) => g.startsWith('communityScope') || g === 'resolveCommunity')).toBe(false);
    }
  });
});

describe('가입 — 그 커뮤니티 운영자가 심사한다', () => {
  it('가입 신청은 인증 + 개체 확인까지만 (아직 회원이 아니다)', () => {
    expect(find('POST', '/:communitySlug/join').guards).toEqual(['authenticate', 'resolveCommunity']);
  });

  it.each([
    ['GET', '/:communitySlug/memberships'],
    ['POST', '/:communitySlug/memberships/:membershipId/approve'],
    ['POST', '/:communitySlug/memberships/:membershipId/reject'],
  ])('%s %s 는 개체 운영자만', (method, path) => {
    expect(find(method, path).guards).toEqual(['authenticate', 'resolveCommunity', 'communityScope:operator']);
  });

  it('가입 심사 경로에는 **서비스 전체 가드가 붙지 않는다** (A 운영자가 B 를 승인하면 안 된다)', () => {
    for (const w of wiring().filter((x) => x.path.includes('/memberships'))) {
      expect(w.guards.some((g) => g.startsWith('serviceScope'))).toBe(false);
    }
  });

  it('개체 경로는 resolveCommunity 가 scope 검사보다 **먼저** 온다 (slug 를 행으로 확인한 뒤 판정)', () => {
    const { guards } = find('POST', '/:communitySlug/memberships/:membershipId/approve');
    expect(guards.indexOf('resolveCommunity')).toBeLessThan(guards.indexOf('communityScope:operator'));
  });
});

describe('내가 운영하는 커뮤니티 — 가입 심사 화면 진입 목록', () => {
  it('GET /operating 은 인증만 (대상이 세션 사용자 자신의 운영 행뿐이다)', () => {
    expect(find('GET', '/operating').guards).toEqual(['authenticate']);
  });

  it('`/:communitySlug/...` 파라미터 경로보다 먼저 등록된다', () => {
    const order = wiring().map((w) => `${w.method} ${w.path}`);
    const operating = order.indexOf('GET /operating');
    const slug = order.findIndex((k) => k.includes('/:communitySlug'));
    expect(operating).toBeGreaterThan(-1);
    expect(operating).toBeLessThan(slug);
  });
});

describe('카탈로그 조회 경로는 종전대로 write 0 · optionalAuth', () => {
  it.each([
    ['GET', '/'],
    ['GET', '/:communityKey/access'],
  ])('%s %s', (method, path) => {
    expect(find(method, path).guards).toEqual(['optionalAuth']);
  });

  it('`/requests` 가 `/:communityKey/access` 보다 먼저 등록된다 (param 경로에 먹히지 않는다)', () => {
    const paths = wiring().map((w) => w.path);
    expect(paths.indexOf('/requests')).toBeLessThan(paths.indexOf('/:communityKey/access'));
  });
});

/**
 * rate limit 은 위 배선 검사에 잡히지 않는다 — 그 검사는 mock 으로 표시한 가드만 모으고
 * `apiLimiter` 는 실제 미들웨어다. 그래서 소스로 따로 고정한다.
 *
 * 신청 경로는 인증만 요구하므로 **로그인한 누구나** 호출할 수 있고, 1건마다 slug 조회 +
 * INSERT 가 나간다. CodeQL(js/missing-rate-limiting)이 같은 종류를 분회 신청 경로에서
 * high 로 잡았다.
 */
describe('rate limit (소스 고정)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'communities.routes.ts'), 'utf-8');
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

  it('CodeQL 이 인식하는 limiter 를 쓴다', () => {
    expect(code).toMatch(/import \{ apiLimiter \} from '\.\.\/middleware\/rateLimiter\.js'/);
  });

  it.each([
    ['개설 신청', /router\.post\(\s*'\/requests',\s*apiLimiter,/],
    ['가입 신청', /router\.post\(\s*'\/:communitySlug\/join',\s*apiLimiter,/],
    ['운영 커뮤니티 목록', /router\.get\(\s*'\/operating',\s*apiLimiter,/],
    ['개체 운영자 경계', /const operatorOnly: RequestHandler\[\] = \[apiLimiter,/],
    ['서비스 심사 경계', /const serviceAdminOnly: RequestHandler\[\] = \[apiLimiter,/],
  ])('%s 에 limiter 가 붙어 있다', (_label, re) => {
    expect(code).toMatch(re);
  });
});

describe('개별 커뮤니티 운영자 지정·해제 — 커뮤니티 서비스 운영자(community:admin)', () => {
  // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (권한 경계 정리)
  //   Admin 은 서비스 운영자만 지정한다. 개별 커뮤니티 운영자는 서비스 운영자가 여기서 지정·해제한다.
  it.each([
    ['GET', '/admin/communities'],
    ['GET', '/admin/communities/:communityId/members'],
    ['POST', '/admin/communities/:communityId/members/:membershipId/role'],
  ])('%s %s 는 서비스 전체 가드만 쓴다 (개체 가드 없음)', (method, p) => {
    expect(find(method, p).guards).toEqual(['authenticate', 'serviceScope:community:admin']);
  });

  it('파라미터 라우트(/:communitySlug/...)보다 먼저 등록된다', () => {
    const order = wiring().map((w) => `${w.method} ${w.path}`);
    const first = order.indexOf('GET /admin/communities/:communityId/members');
    const slug = order.findIndex((k) => k.includes('/:communitySlug'));
    expect(first).toBeGreaterThan(-1);
    expect(first).toBeLessThan(slug);
  });
});


describe('메인 자격 오류 HTTP 응답', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['requestCreation', '/requests', 403],
    ['requestJoin', '/example/join', 403],
    ['approveCreation', '/requests/request-id/approve', 409],
    ['approveJoin', '/example/memberships/member-id/approve', 409],
  ] as const)('%s는 자격 오류를 %s에서 %s로 전달한다', async (method, url, status) => {
    jest.spyOn(CommunityLifecycleService.prototype, method).mockRejectedValue(
      new NetureMainMembershipRequiredError('suspended', '신청자의 이용 자격을 확인해 주세요.', status),
    );
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      Object.assign(req, { user: { id: 'reviewer-id' }, community: { id: 'community-id' } });
      next();
    });
    app.use(createCommunitiesRoutes(optionalAuth, authenticate));
    const response = await request(app).post(url).send({ desiredSlug: 'example', name: 'Example' });
    expect(response.status).toBe(status);
    expect(response.body).toEqual({ success: false, error: '신청자의 이용 자격을 확인해 주세요.', code: 'NETURE_MEMBERSHIP_REQUIRED' });
  });
});


it.each(['suspend','restore','withdraw'])('%s는 admin guard와 인증을 요구한다', action => {
  expect(find('POST', `/:communitySlug/memberships/:membershipId/${action}`).guards)
    .toEqual(['authenticate','resolveCommunity','communityScope:admin']);
});
it('회원 이력도 admin guard로 한정한다', () => {
  expect(find('GET','/:communitySlug/memberships/:membershipId/history').guards)
    .toEqual(['authenticate','resolveCommunity','communityScope:admin']);
});
