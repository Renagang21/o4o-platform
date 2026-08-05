/**
 * WO-O4O-MEMBERSHIP-RESIDUAL-SUBTREE-GUARD-V1 — 잔여 subtree 보호 계약 테스트
 *
 * 대상 (상위 인증 경계 밖에 남아 있던 4개 subtree)
 *   /audit-logs · /affiliations · /organizations/:organizationId/members · /license-verification
 *
 * 고정하는 계약
 *   1. 대상 endpoint **전수**가 비로그인 401 (handler 미도달)
 *   2. 일반 사용자·비허용 서비스 역할은 403
 *   3. platform:super_admin 만 handler 도달
 *   4. `/organizations/:organizationId/members` 는 **임의 조직 ID** 로도 비관리자 접근 불가
 *   5. 회원 본인용 경로(`/members/me`)는 회귀 없이 그대로 통과
 *   6. 신규 보호 endpoint 가 guard 밖에 추가되면 실패 (소스 전수 대조)
 *
 * 운영 데이터·DB·SQL 을 사용하지 않는다. in-memory express + 가상 ID 만 사용한다.
 */
import * as fs from 'fs';
import * as path from 'path';
import express, { Application, RequestHandler } from 'express';
import request from 'supertest';

import {
  MEMBERSHIP_ADMIN_ROLES,
  MEMBERSHIP_ADMIN_SUBTREES,
  MEMBERSHIP_RESIDUAL_SUBTREES,
  registerMembershipAdminGuards,
} from '../bootstrap/membership-admin-guard';

// 기존 spec 과 동일한 계약의 인증/권한 대역 (실제 미들웨어 연결은 §6 소스 계약에서 확인).
const fakeAuthenticate: RequestHandler = (req, res, next) => {
  const header = req.header('x-test-roles');
  if (header === undefined) {
    return res
      .status(401)
      .json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }
  (req as any).user = { id: 'test-user', roles: header ? header.split(',') : [] };
  next();
};

const fakeRequireRole = (roles: string[]): RequestHandler => (req, res, next) => {
  const userRoles: string[] = (req as any).user?.roles ?? [];
  if (!userRoles.some((r) => roles.includes(r))) {
    return res
      .status(403)
      .json({ success: false, error: 'Insufficient permissions', code: 'FORBIDDEN' });
  }
  next();
};

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

const SUPER_ADMIN = ['x-test-roles', 'platform:super_admin'] as const;
const PLAIN_USER = ['x-test-roles', 'customer'] as const;
const SERVICE_ROLE = ['x-test-roles', 'kpa:admin'] as const;

// 가상 ID — 실제 회원·조직·면허 데이터를 사용하지 않는다.
const FAKE_ID = '00000000-0000-0000-0000-000000000000';
const OTHER_ORG = '11111111-1111-1111-1111-111111111111';

/**
 * 대상 4개 subtree 의 **전수 endpoint 목록**.
 * packages/membership-yaksa/src/backend/routes 의 라우터 정의와 1:1 로 맞춘다(§6 에서 대조).
 */
const TARGET_ENDPOINTS: Array<[method: 'get' | 'post' | 'put' | 'delete', url: string]> = [
  // ── /audit-logs (GET 4, read) ──
  ['get', '/api/v1/membership/audit-logs'],
  ['get', '/api/v1/membership/audit-logs/recent'],
  ['get', '/api/v1/membership/audit-logs/stats'],
  ['get', `/api/v1/membership/audit-logs/${FAKE_ID}`],

  // ── /affiliations (write 2) ──
  ['put', `/api/v1/membership/affiliations/${FAKE_ID}`],
  ['delete', `/api/v1/membership/affiliations/${FAKE_ID}`],

  // ── /organizations/:organizationId/members (GET 2, read) ──
  ['get', `/api/v1/membership/organizations/${FAKE_ID}/members`],
  ['get', `/api/v1/membership/organizations/${FAKE_ID}/members/history`],

  // ── /license-verification (read 3 / write 5) ──
  ['post', '/api/v1/membership/license-verification/requests'],
  ['get', '/api/v1/membership/license-verification/requests'],
  ['get', '/api/v1/membership/license-verification/stats'],
  ['post', '/api/v1/membership/license-verification/bulk-requests'],
  ['get', `/api/v1/membership/license-verification/requests/${FAKE_ID}`],
  ['post', `/api/v1/membership/license-verification/requests/${FAKE_ID}/verify`],
  ['post', `/api/v1/membership/license-verification/requests/${FAKE_ID}/manual-verify`],
  ['post', `/api/v1/membership/license-verification/requests/${FAKE_ID}/fail`],
];

const READ_ENDPOINTS = TARGET_ENDPOINTS.filter(([m]) => m === 'get');
const WRITE_ENDPOINTS = TARGET_ENDPOINTS.filter(([m]) => m !== 'get');

// ─────────────────────────────────────────────────────
// 1. 비로그인 401 — handler 미도달
// ─────────────────────────────────────────────────────
describe('비로그인 접근', () => {
  it.each(TARGET_ENDPOINTS)('%s %s → 401', async (method, url) => {
    const res = await (request(app) as any)[method](url);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('비로그인 요청은 하위 handler 에 도달하지 않는다', async () => {
    for (const [method, url] of TARGET_ENDPOINTS) {
      await (request(app) as any)[method](url);
    }
    expect(downstreamCalls).toEqual([]);
  });

  it('수정 전 500 이던 audit-logs·license-verification 도 401 이 된다', async () => {
    // 이전에는 guard 가 없어 인증 없이 handler 까지 도달했고(DB 오류 시 500),
    // 500 이라도 handler 도달 자체가 보호 실패였다.
    for (const url of [
      '/api/v1/membership/audit-logs',
      '/api/v1/membership/license-verification/requests',
    ]) {
      expect((await request(app).get(url)).status).toBe(401);
    }
    expect(downstreamCalls).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────
// 2. 인증됐지만 권한 없음 → 403
// ─────────────────────────────────────────────────────
describe('비허용 역할', () => {
  it.each(TARGET_ENDPOINTS)('일반 사용자: %s %s → 403', async (method, url) => {
    const res = await (request(app) as any)[method](url).set(...PLAIN_USER);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it.each(TARGET_ENDPOINTS)('서비스 역할(kpa:admin): %s %s → 403', async (method, url) => {
    const res = await (request(app) as any)[method](url).set(...SERVICE_ROLE);
    expect(res.status).toBe(403);
  });

  it('비허용 역할도 handler 에 도달하지 않는다', async () => {
    for (const [method, url] of TARGET_ENDPOINTS) {
      await (request(app) as any)[method](url).set(...PLAIN_USER);
      await (request(app) as any)[method](url).set(...SERVICE_ROLE);
    }
    expect(downstreamCalls).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────
// 3. 정상 역할은 handler 도달 (read / write 모두)
// ─────────────────────────────────────────────────────
describe('정상 허용 역할', () => {
  // WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1:
  //   legacy 'platform:admin' 허용 케이스 제거 (역할 자체가 삭제됨).
  it.each(TARGET_ENDPOINTS)('platform:super_admin: %s %s → handler 도달', async (method, url) => {
    const res = await (request(app) as any)[method](url).set(...SUPER_ADMIN);
    expect(res.status).toBe(200);
  });

  it('read 와 write 모두 동일하게 보호된다', () => {
    expect(READ_ENDPOINTS.length).toBeGreaterThan(0);
    expect(WRITE_ENDPOINTS.length).toBeGreaterThan(0);
    expect(READ_ENDPOINTS.length + WRITE_ENDPOINTS.length).toBe(TARGET_ENDPOINTS.length);
  });
});

// ─────────────────────────────────────────────────────
// 4. organization scope — 임의 organizationId 차단
// ─────────────────────────────────────────────────────
describe('organizations/:organizationId/members scope', () => {
  const orgUrl = (org: string) => `/api/v1/membership/organizations/${org}/members`;

  it('비로그인은 어떤 조직 ID 로도 401', async () => {
    for (const org of [FAKE_ID, OTHER_ORG, 'not-a-uuid']) {
      expect((await request(app).get(orgUrl(org))).status).toBe(401);
    }
    expect(downstreamCalls).toEqual([]);
  });

  it('일반 사용자·서비스 역할은 어떤 조직 ID 로도 403 — 임의 조직 조회 불가', async () => {
    for (const org of [FAKE_ID, OTHER_ORG, 'not-a-uuid']) {
      expect((await request(app).get(orgUrl(org)).set(...PLAIN_USER)).status).toBe(403);
      expect((await request(app).get(orgUrl(org)).set(...SERVICE_ROLE)).status).toBe(403);
    }
    expect(downstreamCalls).toEqual([]);
  });

  it('통과 가능한 주체는 플랫폼 전역 관리자뿐이다 (cross-org 가 정상 권한)', async () => {
    // 조직 소유권 필터를 추가로 걸지 않는 이유: 여기까지 오는 유일한 주체가
    // 이미 전 조직 권한을 가진 platform 관리자라 축소만 발생한다.
    expect((await request(app).get(orgUrl(OTHER_ORG)).set(...SUPER_ADMIN)).status).toBe(200);
    expect(MEMBERSHIP_ADMIN_ROLES).toEqual(['platform:super_admin']);
  });
});

// ─────────────────────────────────────────────────────
// 5. 회원 본인용 경로 회귀 없음
// ─────────────────────────────────────────────────────
describe('회원 본인용 경로 회귀', () => {
  it('/members/me 는 그대로 통과한다', async () => {
    expect((await request(app).get('/api/v1/membership/members/me')).status).toBe(200);
    expect((await request(app).get('/api/v1/membership/members/me/summary')).status).toBe(200);
  });

  it('회원 본인용 하위 경로는 기존대로 /members guard 가 담당한다', async () => {
    // `/members/:memberId/{affiliations,logs,license-verification}` 은
    // 이번에 새로 건드리지 않았고 기존 membersSelective guard 로 보호된다.
    for (const url of [
      `/api/v1/membership/members/${FAKE_ID}/affiliations`,
      `/api/v1/membership/members/${FAKE_ID}/logs`,
      `/api/v1/membership/members/${FAKE_ID}/license-verification`,
    ]) {
      expect((await request(app).get(url)).status).toBe(401);
      expect((await request(app).get(url).set(...SUPER_ADMIN)).status).toBe(200);
    }
  });
});

// ─────────────────────────────────────────────────────
// 6. 소스 계약 — 전수성 / guard 밖 신규 endpoint 탐지
// ─────────────────────────────────────────────────────
describe('소스 계약 — 전수성', () => {
  const routesDir = path.join(
    __dirname,
    '../../../../packages/membership-yaksa/src/backend/routes',
  );
  const readRoutes = (file: string) => fs.readFileSync(path.join(routesDir, file), 'utf8');

  /** 라우터 파일에서 특정 factory 함수 본문의 endpoint 수를 센다. */
  const countEndpoints = (src: string, factory: string): number => {
    const start = src.indexOf(`export function ${factory}`);
    if (start < 0) return -1;
    const rest = src.slice(start);
    const nextFactory = rest.indexOf('\nexport function ', 1);
    const body = nextFactory > 0 ? rest.slice(0, nextFactory) : rest;
    return (body.match(/router\.(get|post|put|patch|delete)\(/g) || []).length;
  };

  it('4개 subtree 가 모두 guard 목록에 있다', () => {
    for (const subtree of MEMBERSHIP_RESIDUAL_SUBTREES) {
      expect(MEMBERSHIP_ADMIN_SUBTREES).toContain(subtree);
    }
    expect(MEMBERSHIP_RESIDUAL_SUBTREES).toHaveLength(4);
  });

  it('테스트 목록이 실제 라우터 endpoint 수와 일치한다 (신규 추가 시 실패)', () => {
    const counts = {
      auditLogs: countEndpoints(readRoutes('auditLogRoutes.ts'), 'createAuditLogRoutes'),
      affiliations: countEndpoints(readRoutes('affiliationRoutes.ts'), 'createAffiliationRoutes'),
      orgMembers: countEndpoints(readRoutes('affiliationRoutes.ts'), 'createOrganizationMemberRoutes'),
      license: countEndpoints(
        readRoutes('licenseVerificationRoutes.ts'),
        'createLicenseVerificationRoutes',
      ),
    };
    expect(counts).toEqual({ auditLogs: 4, affiliations: 2, orgMembers: 2, license: 8 });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(TARGET_ENDPOINTS).toHaveLength(total);
  });

  it('대상 subtree 가 register-routes 의 guard 등록 앞에 노출되지 않는다', () => {
    const registerSrc = fs.readFileSync(
      path.join(__dirname, '../bootstrap/register-routes.ts'),
      'utf8',
    );
    const guardIdx = registerSrc.indexOf('registerMembershipAdminGuards(app)');
    const mountIdx = registerSrc.indexOf("app.use('/api/v1/membership', createMembershipRoutes");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(mountIdx).toBeGreaterThan(-1);
    // guard 등록이 mount 보다 반드시 먼저여야 Express 매칭 순서상 보호된다.
    expect(guardIdx).toBeLessThan(mountIdx);
  });

  it('membership index 에 guard 목록 밖의 최상위 subtree 가 없다', () => {
    const indexSrc = fs.readFileSync(path.join(routesDir, 'index.ts'), 'utf8');
    const mounts = [...indexSrc.matchAll(/router\.use\('\/([a-z-]+)/g)].map((m) => m[1]);
    const guarded = new Set(
      MEMBERSHIP_ADMIN_SUBTREES.map((s) => s.replace('/api/v1/membership/', '')),
    );
    // `members` 는 선택적 guard(본인용 경로 예외)로 별도 처리된다.
    guarded.add('members');
    for (const mount of new Set(mounts)) {
      expect(guarded.has(mount)).toBe(true);
    }
  });
});
