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

jest.mock('../../services/auth/auth-context.helper.js', () => ({
  freshenUserContext: async () => ({ roles: [], memberships: [] }),
}));

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
  ])('%s %s 는 community:admin 이 심사한다', (method, path) => {
    expect(find(method, path).guards).toEqual(['authenticate', 'serviceScope:community:admin']);
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
