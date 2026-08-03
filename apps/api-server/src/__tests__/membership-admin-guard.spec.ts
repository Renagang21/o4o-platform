/**
 * WO-O4O-ADMIN-MEMBERSHIP-API-AUTHORIZATION-GUARD-V2 — 권한 guard 계약 테스트
 *
 * 검증 대상
 *   1. 관리자 전용 subtree(categories / export / stats / verifications)
 *      - 비로그인 401 / 일반 사용자 403 / platform:admin·platform:super_admin 허용
 *   2. `/members` 선택적 guard
 *      - 관리자 endpoint 는 보호, 회원 본인용(`/me`, `/me/summary`)은 그대로 통과
 *   3. 인증 실패 시 하위 handler(controller/service)가 호출되지 않는다
 *   4. register-routes.ts 가 실제 authenticate / requireRole 을 사용한다 (소스 계약)
 *
 * 운영 데이터는 건드리지 않는다 — DB 접근 없이 in-memory express app 으로만 검증한다.
 */
import * as fs from 'fs';
import * as path from 'path';
import express, { Application, RequestHandler } from 'express';
import request from 'supertest';

import {
  MEMBERSHIP_ADMIN_ROLES,
  MEMBERSHIP_ADMIN_SUBTREES,
  MEMBER_SELF_PATHS,
  isMemberSelfPath,
  registerMembershipAdminGuards,
} from '../bootstrap/membership-admin-guard';

// ─────────────────────────────────────────────────────
// 테스트용 인증/권한 대역
//   실제 authenticate 는 토큰 검증 + DB 조회를 하므로 여기서는
//   같은 계약(401 / 403 / next)을 갖는 대역을 주입한다.
//   실제 미들웨어가 연결돼 있다는 사실은 아래 "소스 계약" 블록에서 확인한다.
// ─────────────────────────────────────────────────────
const fakeAuthenticate: RequestHandler = (req, res, next) => {
  const header = req.header('x-test-roles');
  if (header === undefined) {
    return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }
  (req as any).user = { id: 'test-user', roles: header ? header.split(',') : [] };
  next();
};

const fakeRequireRole = (roles: string[]): RequestHandler => (req, res, next) => {
  const userRoles: string[] = (req as any).user?.roles ?? [];
  if (!userRoles.some((r) => roles.includes(r))) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions', code: 'FORBIDDEN' });
  }
  next();
};

/** guard 뒤에 놓이는 하위 handler 호출 여부를 기록한다 (controller/service 대역). */
let downstreamCalls: string[] = [];

function buildApp(): Application {
  const app = express();
  registerMembershipAdminGuards(app, {
    authenticate: fakeAuthenticate,
    requireRole: fakeRequireRole,
  });
  app.use('/api/v1/membership', (req, res) => {
    downstreamCalls.push(req.originalUrl);
    res.status(200).json({ success: true, data: { reached: req.path } });
  });
  return app;
}

let app: Application;
beforeEach(() => {
  downstreamCalls = [];
  app = buildApp();
});

const ADMIN = ['x-test-roles', 'platform:admin'] as const;
const SUPER_ADMIN = ['x-test-roles', 'platform:super_admin'] as const;
const PLAIN_USER = ['x-test-roles', 'customer'] as const;

// 보호 대상 경로 (읽기 + 쓰기). 실제 운영 데이터를 만들지 않는 in-memory app 이다.
const CATEGORY_PATHS: Array<[string, string]> = [
  ['get', '/api/v1/membership/categories'],
  ['get', '/api/v1/membership/categories/00000000-0000-0000-0000-000000000000'],
  ['post', '/api/v1/membership/categories'],
  ['put', '/api/v1/membership/categories/00000000-0000-0000-0000-000000000000'],
  ['patch', '/api/v1/membership/categories/00000000-0000-0000-0000-000000000000'],
  ['delete', '/api/v1/membership/categories/00000000-0000-0000-0000-000000000000'],
];

const EXPORT_PATHS = [
  '/api/v1/membership/export/categories.xlsx',
  '/api/v1/membership/export/members.xlsx',
];

const ADJACENT_ADMIN_PATHS = [
  '/api/v1/membership/members',
  '/api/v1/membership/members/00000000-0000-0000-0000-000000000000',
  '/api/v1/membership/stats',
  '/api/v1/membership/verifications',
];

// ─────────────────────────────────────────────────────
// 1. categories 6개 endpoint — 비로그인 401
// ─────────────────────────────────────────────────────
describe('categories 6개 endpoint — 비로그인', () => {
  it.each(CATEGORY_PATHS)('%s %s → 401', async (method, url) => {
    const res = await (request(app) as any)[method](url);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('비로그인 쓰기 요청은 service 계층("not found")까지 도달하지 않는다', async () => {
    for (const [method, url] of CATEGORY_PATHS) {
      await (request(app) as any)[method](url);
    }
    expect(downstreamCalls).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────
// 2. 일반 로그인 사용자 — 403
// ─────────────────────────────────────────────────────
describe('categories — 일반 로그인 사용자', () => {
  it.each(CATEGORY_PATHS)('%s %s → 403', async (method, url) => {
    const res = await (request(app) as any)[method](url).set(...PLAIN_USER);
    expect(res.status).toBe(403);
    expect(downstreamCalls).toEqual([]);
  });

  it('kpa:admin 도 허용하지 않는다 (플랫폼 전역 데이터)', async () => {
    const res = await request(app).get('/api/v1/membership/categories').set('x-test-roles', 'kpa:admin');
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────
// 3-4. platform:admin / platform:super_admin — 통과
// ─────────────────────────────────────────────────────
describe('categories — 플랫폼 관리자', () => {
  it.each(CATEGORY_PATHS)('platform:admin %s %s → 통과', async (method, url) => {
    const res = await (request(app) as any)[method](url).set(...ADMIN);
    expect(res.status).toBe(200);
  });

  it.each(CATEGORY_PATHS)('platform:super_admin %s %s → 통과', async (method, url) => {
    const res = await (request(app) as any)[method](url).set(...SUPER_ADMIN);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────
// 5. export 2개 endpoint
// ─────────────────────────────────────────────────────
describe('export endpoint 보호', () => {
  it.each(EXPORT_PATHS)('%s — 비로그인 401 / 일반 403 / 관리자 통과', async (url) => {
    expect((await request(app).get(url)).status).toBe(401);
    expect((await request(app).get(url).set(...PLAIN_USER)).status).toBe(403);
    expect((await request(app).get(url).set(...ADMIN)).status).toBe(200);
    // 권한 차단 단계에서 파일 생성 경로에 도달하지 않는다
    expect(downstreamCalls).toEqual([url]);
  });
});

// ─────────────────────────────────────────────────────
// 6. 인접 관리자 API — members / stats / verifications
// ─────────────────────────────────────────────────────
describe('인접 관리자 API 보호', () => {
  it.each(ADJACENT_ADMIN_PATHS)('%s — 비로그인 401 / 일반 403 / 관리자 통과', async (url) => {
    expect((await request(app).get(url)).status).toBe(401);
    expect((await request(app).get(url).set(...PLAIN_USER)).status).toBe(403);
    expect((await request(app).get(url).set(...ADMIN)).status).toBe(200);
  });

  it('members 쓰기 경로도 비로그인에서 차단된다', async () => {
    const res = await request(app).post('/api/v1/membership/members/bulk-update').send({});
    expect(res.status).toBe(401);
    expect(downstreamCalls).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────
// 7-8. 회원 본인용 경로 — 계약 유지 (guard 미적용)
// ─────────────────────────────────────────────────────
describe('회원 본인용 경로 — 회귀 없음', () => {
  it('GET /membership/members/me 는 guard 를 통과해 그대로 handler 로 간다', async () => {
    const res = await request(app).get('/api/v1/membership/members/me');
    expect(res.status).toBe(200);
    expect(downstreamCalls).toEqual(['/api/v1/membership/members/me']);
  });

  it('GET /membership/members/me/summary 도 그대로 handler 로 간다', async () => {
    const res = await request(app).get('/api/v1/membership/members/me/summary');
    expect(res.status).toBe(200);
    expect(downstreamCalls).toEqual(['/api/v1/membership/members/me/summary']);
  });

  it('query string 이 붙어도 본인용 경로로 판정한다', async () => {
    const res = await request(app).get('/api/v1/membership/members/me/summary?year=2026');
    expect(res.status).toBe(200);
  });

  it('본인용 경로 판정은 정확히 일치할 때만 참이다', () => {
    expect(isMemberSelfPath('/me')).toBe(true);
    expect(isMemberSelfPath('/me/')).toBe(true);
    expect(isMemberSelfPath('/me/summary')).toBe(true);
    // 우회 시도 — 관리자 경로가 본인용으로 오판되면 안 된다
    expect(isMemberSelfPath('/me/detail')).toBe(false);
    expect(isMemberSelfPath('/mexico')).toBe(false);
    expect(isMemberSelfPath('/me/../abc')).toBe(false);
    expect(isMemberSelfPath('/')).toBe(false);
    expect(isMemberSelfPath('')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────
// 9. 이번 범위 밖 경로는 건드리지 않았음을 고정
// ─────────────────────────────────────────────────────
describe('범위 경계', () => {
  it('/membership/audit-logs, /affiliations, /license-verification 은 이번 WO 범위가 아니다', async () => {
    for (const url of [
      '/api/v1/membership/audit-logs',
      '/api/v1/membership/affiliations',
      '/api/v1/membership/license-verification',
    ]) {
      const res = await request(app).get(url);
      expect(res.status).toBe(200); // guard 미적용 = 이번 변경이 손대지 않음
    }
  });

  it('허용 역할은 platform 2종뿐이다', () => {
    expect(MEMBERSHIP_ADMIN_ROLES).toEqual(['platform:admin', 'platform:super_admin']);
    expect(MEMBERSHIP_ADMIN_ROLES).not.toContain('kpa:admin');
  });
});

// ─────────────────────────────────────────────────────
// 10. 소스 계약 — 실제 미들웨어 연결 / 보호 누락 정적 검사
// ─────────────────────────────────────────────────────
describe('소스 계약', () => {
  const guardSrc = fs.readFileSync(path.join(__dirname, '../bootstrap/membership-admin-guard.ts'), 'utf8');
  const registerSrc = fs.readFileSync(path.join(__dirname, '../bootstrap/register-routes.ts'), 'utf8');
  const membershipIndexSrc = fs.readFileSync(
    path.join(__dirname, '../../../../packages/membership-yaksa/src/backend/routes/index.ts'),
    'utf8',
  );

  it('guard 는 기존 authenticate / requireRole 을 사용한다 (신규 권한 체계 없음)', () => {
    expect(guardSrc).toMatch(/import \{ authenticate, requireRole \} from '\.\.\/middleware\/auth\.middleware\.js'/);
    expect(guardSrc).toContain("'platform:admin'");
    expect(guardSrc).toContain("'platform:super_admin'");
  });

  it('register-routes 는 membership mount 직전에 guard 를 등록한다', () => {
    const guardIdx = registerSrc.indexOf('registerMembershipAdminGuards(app)');
    const mountIdx = registerSrc.indexOf("app.use('/api/v1/membership', createMembershipRoutes(dataSource))");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(mountIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(mountIdx);
  });

  it('/api/v1/membership 전체에 관리자 guard 를 걸지 않는다', () => {
    expect(registerSrc).not.toMatch(/app\.use\('\/api\/v1\/membership',\s*authenticate/);
    expect(registerSrc).not.toMatch(/app\.use\('\/api\/v1\/membership',\s*requireRole/);
  });

  it('membership router 의 관리자 mount 중 보호되지 않은 것을 고정 기록한다', () => {
    const mounted = [...membershipIndexSrc.matchAll(/router\.use\('(\/[^']*)'/g)].map((m) => m[1]);
    const guardedPrefixes = MEMBERSHIP_ADMIN_SUBTREES.map((s) => s.replace('/api/v1/membership', '')).concat('/members');
    const unguarded = mounted.filter((m) => !guardedPrefixes.some((g) => m === g || m.startsWith(`${g}/`)));

    // 이번 WO 보호 대상이 아닌 나머지 — 별도 작업으로 다룬다 (CHECK 문서에 기록)
    expect(unguarded).toEqual([
      '/audit-logs',
      '/affiliations',
      '/organizations/:organizationId/members',
      '/license-verification',
    ]);
  });

  it('보호 대상 subtree 목록이 예상과 일치한다', () => {
    expect(MEMBERSHIP_ADMIN_SUBTREES).toEqual([
      '/api/v1/membership/categories',
      '/api/v1/membership/export',
      '/api/v1/membership/stats',
      '/api/v1/membership/verifications',
    ]);
    expect(MEMBER_SELF_PATHS).toEqual(['/me', '/me/summary']);
  });
});
