/**
 * WO-O4O-SERVICE-ADMIN-API-GUARD-EMERGENCY-V1 — 인증·권한 경계 계약 테스트
 *
 * 배경
 * ----
 * `/api/v1/service-admin` 은 mount 지점에도 라우터 안에도 인증 미들웨어가 없어
 * 8개 endpoint 전부가 비로그인에 공개돼 있었다(P0-1).
 * `/api/v1` 에 전역 인증이 없으므로 라우터 guard 누락이 곧 보안 경계 누락이다.
 *
 * 검증 대상
 *   1. 비로그인 → 401 (GET / PUT / POST 전부)
 *   2. 일반 사용자·비허용 서비스 역할 → 403
 *   3. platform:super_admin → handler 도달
 *   4. 인증 실패 시 handler·service 계층이 실행되지 않는다
 *   5. 모든 endpoint 가 guard 아래에 있다 (소스 계약 — 신규 endpoint 를 guard 위에
 *      추가하면 실패한다)
 *
 * 운영 데이터는 건드리지 않는다 — DB 접근 0, in-memory express app 으로만 검증한다.
 */
import * as fs from 'fs';
import * as path from 'path';
import express, { Application, NextFunction, Request, Response } from 'express';
import request from 'supertest';

// ─────────────────────────────────────────────────────
// 인증/권한 대역
//   실제 authenticate 는 토큰 검증 + DB 조회, requireAdmin 은 role_assignments 조회를
//   한다. 여기서는 같은 계약(401 / 403 / next)의 대역을 주입하고,
//   실제 미들웨어가 연결돼 있다는 사실은 아래 "소스 계약" 블록에서 확인한다.
// ─────────────────────────────────────────────────────
const PLATFORM_ADMIN_ROLES = ['platform:super_admin'];

jest.mock('../middleware/auth.middleware.js', () => ({
  authenticate: (req: Request, res: Response, next: NextFunction) => {
    const header = req.header('x-test-roles');
    if (header === undefined) {
      return res
        .status(401)
        .json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    (req as any).user = { id: 'test-user', roles: header ? header.split(',') : [] };
    return next();
  },
  requireAdmin: (req: Request, res: Response, next: NextFunction) => {
    const roles: string[] = (req as any).user?.roles ?? [];
    if (!roles.some((r) => PLATFORM_ADMIN_ROLES.includes(r))) {
      return res
        .status(403)
        .json({ success: false, error: 'Admin privileges required', code: 'FORBIDDEN' });
    }
    return next();
  },
}));

// ─────────────────────────────────────────────────────
// 라우터가 끌어오는 레지스트리 싱글턴 대역
//   실물은 `import.meta.url` 을 쓰거나 파일시스템을 읽으므로 CJS jest 에서 로드되지
//   않는다. 이 테스트의 관심사는 guard 경계이지 레지스트리 내용이 아니므로 최소
//   surface 만 대역으로 채운다. DB 접근 0.
// ─────────────────────────────────────────────────────
jest.mock('../service-templates/template-registry.js', () => ({
  templateRegistry: { getAllTemplates: () => [], getStats: () => ({ total: 0 }) },
}));
jest.mock('../service-templates/init-pack-registry.js', () => ({
  initPackRegistry: {
    getAllInitPacks: () => [],
    getInitPackForTemplate: () => null,
    getStats: () => ({ total: 0 }),
  },
}));
jest.mock('../service-templates/service-initializer.js', () => ({
  serviceInitializer: {
    getInitializationPreview: () => ({
      initPack: { id: 'stub' },
      menusCount: 0,
      categoriesCount: 0,
      pagesCount: 0,
      hasTheme: false,
      hasSettings: false,
      rolesCount: 0,
    }),
  },
}));
jest.mock('../services/theme-preset.service.js', () => {
  const theme = { id: 'stub-theme', name: 'Stub Theme' };
  return {
    themePresetService: {
      getEffectiveTheme: async () => theme,
      getTenantTheme: async () => theme,
      setTenantTheme: async () => theme,
      updateTenantThemeColors: async () => theme,
      resetTenantTheme: async () => theme,
      getDefaultPreset: () => theme,
      getAllDefaultPresets: () => ({}),
      generateCSSVariables: () => ({}),
      generateCSS: () => '',
    },
  };
});
jest.mock('../modules/module-loader.js', () => ({
  moduleLoader: { getAllModules: () => [], getActiveModules: () => [], getModule: () => null },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAdminRoutes = require('../routes/service-admin.routes').default;

function buildApp(): Application {
  const app = express();
  app.use(express.json());
  // register-routes.ts 와 동일하게 mount 지점에는 미들웨어를 두지 않는다.
  // 경계는 라우터 내부 guard 뿐이며, 그것이 이 테스트의 검증 대상이다.
  app.use('/api/v1/service-admin', serviceAdminRoutes);
  return app;
}

let app: Application;
beforeEach(() => {
  app = buildApp();
});

const SUPER_ADMIN = ['x-test-roles', 'platform:super_admin'] as const;
const PLAIN_USER = ['x-test-roles', 'customer'] as const;

/** 라우터가 노출하는 endpoint 전수. 새 endpoint 를 추가하면 여기도 함께 늘려야 한다. */
const ENDPOINTS: Array<['get' | 'put' | 'post', string]> = [
  ['get', '/api/v1/service-admin/summary'],
  ['get', '/api/v1/service-admin/apps'],
  ['get', '/api/v1/service-admin/theme'],
  ['put', '/api/v1/service-admin/theme'],
  ['post', '/api/v1/service-admin/theme/reset'],
  ['get', '/api/v1/service-admin/init-preview/kpa-society'],
  ['get', '/api/v1/service-admin/templates'],
  ['get', '/api/v1/service-admin/stats'],
];

const WRITE_ENDPOINTS = ENDPOINTS.filter(([m]) => m !== 'get');

// ─────────────────────────────────────────────────────
// 1. 비로그인 → 401
// ─────────────────────────────────────────────────────
describe('비로그인', () => {
  it.each(ENDPOINTS)('%s %s → 401', async (method, url) => {
    const res = await (request(app) as any)[method](url);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('쓰기 endpoint 2건도 비로그인에서 차단된다', async () => {
    expect(WRITE_ENDPOINTS).toHaveLength(2);
    for (const [method, url] of WRITE_ENDPOINTS) {
      const res = await (request(app) as any)[method](url).send({ tenantId: 'x' });
      expect(res.status).toBe(401);
    }
  });

  it('비로그인 요청은 tenantId 검증(400)에도 도달하지 않는다', async () => {
    // guard 가 없던 시절에는 tenantId 누락 시 400 이 나왔다.
    // 이제는 인증 단계에서 먼저 끊겨야 한다.
    const res = await request(app).get('/api/v1/service-admin/summary');
    expect(res.status).toBe(401);
    expect(res.status).not.toBe(400);
  });
});

// ─────────────────────────────────────────────────────
// 2. 로그인했으나 비허용 역할 → 403
// ─────────────────────────────────────────────────────
describe('비허용 역할', () => {
  it.each(ENDPOINTS)('일반 사용자 %s %s → 403', async (method, url) => {
    const res = await (request(app) as any)[method](url).set(...PLAIN_USER);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it.each([['kpa:admin'], ['neture:admin'], ['kpa:operator'], ['operator'], ['admin'], ['super_admin']])(
    '%s 도 허용하지 않는다 (플랫폼 전역 레지스트리)',
    async (role) => {
      const res = await request(app).get('/api/v1/service-admin/stats').set('x-test-roles', role);
      expect(res.status).toBe(403);
    },
  );

  it('비허용 역할의 쓰기 요청도 handler 에 도달하지 않는다', async () => {
    for (const [method, url] of WRITE_ENDPOINTS) {
      const res = await (request(app) as any)[method](url)
        .set(...PLAIN_USER)
        .send({ tenantId: 'x', colors: { primary: '#000' } });
      expect(res.status).toBe(403);
    }
  });
});

// ─────────────────────────────────────────────────────
// 3. 허용 역할 → handler 도달
// ─────────────────────────────────────────────────────
describe('플랫폼 관리자', () => {
  // WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1:
  //   legacy 'platform:admin' 통과 케이스 제거 (역할 자체가 삭제됨).
  it.each(ENDPOINTS)('platform:super_admin %s %s → guard 통과', async (method, url) => {
    const res = await (request(app) as any)[method](url)
      .set(...SUPER_ADMIN)
      .send({ tenantId: 'test-tenant' });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────
// 4. 소스 계약 — 모든 endpoint 가 guard 아래에 있다
// ─────────────────────────────────────────────────────
describe('소스 계약', () => {
  const routerPath = path.join(__dirname, '../routes/service-admin.routes.ts');
  const SRC = fs.readFileSync(routerPath, 'utf8');
  const registerSrc = fs.readFileSync(
    path.join(__dirname, '../bootstrap/register-routes.ts'),
    'utf8',
  );

  it('기존 canonical guard 를 재사용한다 (신규 권한 체계 없음)', () => {
    expect(SRC).toMatch(
      /import \{ authenticate, requireAdmin \} from '\.\.\/middleware\/auth\.middleware\.js'/,
    );
    expect(SRC).toContain('router.use(authenticate);');
    expect(SRC).toContain('router.use(requireAdmin);');
    // 이 라우터 안에서 새 역할·permission 상수를 정의하지 않는다.
    expect(SRC).not.toMatch(/const\s+\w*ROLES\w*\s*=/);
  });

  it('guard 가 첫 endpoint 정의보다 앞에 등록된다', () => {
    const guardIdx = SRC.indexOf('router.use(authenticate);');
    const adminIdx = SRC.indexOf('router.use(requireAdmin);');
    const firstHandler = SRC.search(/router\.(get|post|put|patch|delete)\(/);

    expect(guardIdx).toBeGreaterThan(-1);
    expect(adminIdx).toBeGreaterThan(guardIdx);
    expect(firstHandler).toBeGreaterThan(adminIdx);
  });

  /**
   * 회귀 방지의 핵심.
   * 새 endpoint 를 guard 위(= router.use 앞)에 추가하면 이 테스트가 실패한다.
   */
  it('guard 보다 앞에 선언된 endpoint 가 0건이다', () => {
    const guardEnd = SRC.indexOf('router.use(requireAdmin);');
    const before = SRC.slice(0, guardEnd);
    const leaked = [...before.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)].map(
      (m) => `${m[1].toUpperCase()} ${m[2]}`,
    );
    expect(leaked).toEqual([]);
  });

  it('테스트가 라우터의 endpoint 를 전수 포함한다', () => {
    const declared = [...SRC.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)].map(
      (m) => `${m[1]} ${m[2]}`,
    );
    expect(declared).toHaveLength(ENDPOINTS.length);

    // ENDPOINTS 의 URL 을 라우터 상대경로로 되돌려 대조한다(:param 은 값이 채워져 있음).
    const covered = ENDPOINTS.map(([m, url]) => {
      const rel = url.replace('/api/v1/service-admin', '');
      return `${m} ${rel}`;
    });
    for (const d of declared) {
      const [method, p] = d.split(' ');
      const pattern = new RegExp(`^${method} ${p.replace(/:[^/]+/g, '[^/]+')}$`);
      expect(covered.some((c) => pattern.test(c))).toBe(true);
    }
  });

  it('mount 지점은 변경하지 않았다 (guard 는 라우터 내부에만 있다)', () => {
    expect(registerSrc).toContain("app.use('/api/v1/service-admin', serviceAdminRoutes);");
  });

  it('요청 본문·인증정보를 로그에 추가하지 않았다', () => {
    // 기존 logger.error(…, error) 형태만 존재해야 한다.
    expect(SRC).not.toMatch(/logger\.(info|warn|debug)\([^)]*req\.(body|headers)/);
    expect(SRC).not.toMatch(/logger\.\w+\([^)]*token/i);
  });
});
