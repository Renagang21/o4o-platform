/**
 * WO-O4O-SERVICE-API-AUTHORIZATION-BOUNDARY-AUDIT-AND-HARDENING-V1
 *   — `/api/v1/service/*` (Service Provisioning) 인증·권한 경계 계약 테스트
 *
 * 배경
 * ----
 * `/api/v1/service` 는 mount 지점(`register-routes.ts`)에도 라우터 안에도 인증
 * 미들웨어가 없어 7개 endpoint 전부(write 2건 포함)가 비로그인에 열려 있었다.
 * `/api/v1` 에 전역 인증이 없으므로 라우터 guard 누락이 곧 보안 경계 누락이다.
 *
 * production 에서 실제 상태 변경이 일어나지 않은 이유는 배포 이미지에
 * `service-templates/templates/*.json` 이 없어 registry 가 비어 있었기 때문이며
 * (= ERROR_MAPPING_ONLY), 가드 부재 자체는 구조적 결함이었다.
 *
 * 검증 대상
 *   1. 비로그인 → 401 (read/write 전부)
 *   2. 로그인했으나 비허용 역할 → 403
 *   3. platform:super_admin → handler 도달
 *   4. 인증 실패 시 handler·installer 계층이 실행되지 않는다 (write 도달 0)
 *   5. 상태코드 계약 — 없는 template install → 404 (기존 500)
 *   6. 소스 계약 — 모든 endpoint 가 guard 아래에 있다
 *
 * 운영 데이터는 건드리지 않는다 — DB 접근 0, in-memory express app 으로만 검증한다.
 */
import * as fs from 'fs';
import * as path from 'path';
import express, { Application, NextFunction, Request, Response } from 'express';
import request from 'supertest';

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
// registry / installer 대역
//   실물은 `import.meta.url` + 파일시스템을 쓰므로 CJS jest 에서 로드되지 않는다.
//   이 테스트의 관심사는 guard 경계이므로 최소 surface 만 대역으로 채우고,
//   write 계층 호출 여부를 spy 로 관측한다. DB 접근 0.
// ─────────────────────────────────────────────────────
const KNOWN_TEMPLATE = {
  id: 'stub-template',
  label: 'Stub Template',
  serviceGroup: 'global',
  coreApps: [],
  autoInstall: false,
  isActive: true,
};

jest.mock('../service-templates/template-registry.js', () => ({
  templateRegistry: {
    getAllTemplates: () => [KNOWN_TEMPLATE],
    getTemplate: (id: string) => (id === KNOWN_TEMPLATE.id ? KNOWN_TEMPLATE : undefined),
    getAllApps: () => ({ coreApps: [], extensionApps: [] }),
    getRecommendedTemplates: () => [],
    getStats: () => ({ total: 1, active: 1, byServiceGroup: {}, byCategory: {} }),
  },
}));

const installSpy = jest.fn(async (templateId: string) => ({
  success: true,
  installed: [],
  skipped: [],
  failed: [],
  template: templateId === KNOWN_TEMPLATE.id ? KNOWN_TEMPLATE : undefined,
}));
const provisionSpy = jest.fn(async () => ({
  success: true,
  organizationId: 'org',
  tenantId: 'tenant',
  serviceGroup: 'global',
  installedApps: [],
  skippedApps: [],
  failedApps: [],
  installationTimeMs: 1,
}));

jest.mock('../service-templates/service-installer.js', () => ({
  serviceInstaller: {
    installServiceTemplate: (...args: unknown[]) => (installSpy as any)(...args),
    provisionService: (...args: unknown[]) => (provisionSpy as any)(...args),
    getRecommendedTemplates: () => [],
    getInstallationPreview: (id: string) => ({
      template: id === KNOWN_TEMPLATE.id ? KNOWN_TEMPLATE : undefined,
      appsToInstall: [],
      dependencyOrder: [],
      alreadyInstalled: [],
      issues: [],
    }),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceProvisioningRoutes = require('../routes/service-provisioning.routes').default;

function buildApp(): Application {
  const app = express();
  app.use(express.json());
  // register-routes.ts 와 동일하게 mount 지점에는 미들웨어를 두지 않는다.
  app.use('/api/v1/service', serviceProvisioningRoutes);
  return app;
}

let app: Application;
beforeEach(() => {
  installSpy.mockClear();
  provisionSpy.mockClear();
  app = buildApp();
});

const SUPER_ADMIN = ['x-test-roles', 'platform:super_admin'] as const;
const PLAIN_USER = ['x-test-roles', 'customer'] as const;

/** 라우터가 노출하는 endpoint 전수. 새 endpoint 를 추가하면 여기도 함께 늘려야 한다. */
const ENDPOINTS: Array<['get' | 'post', string]> = [
  ['get', '/api/v1/service/templates'],
  ['get', '/api/v1/service/templates/stub-template'],
  ['get', '/api/v1/service/templates/stub-template/preview'],
  ['post', '/api/v1/service/create'],
  ['post', '/api/v1/service/templates/stub-template/install'],
  ['get', '/api/v1/service/templates/recommend/global'],
  ['get', '/api/v1/service/stats'],
];

const WRITE_ENDPOINTS = ENDPOINTS.filter(([m]) => m !== 'get');

const VALID_CREATE_BODY = {
  organizationId: 'org-1',
  tenantId: 'tenant-1',
  serviceTemplateId: KNOWN_TEMPLATE.id,
};

// ─────────────────────────────────────────────────────
// 1. 비로그인 → 401
// ─────────────────────────────────────────────────────
describe('비로그인', () => {
  it.each(ENDPOINTS)('%s %s → 401', async (method, url) => {
    const res = await (request(app) as any)[method](url);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('write endpoint 2건이 비로그인에서 차단된다', async () => {
    expect(WRITE_ENDPOINTS).toHaveLength(2);
    for (const [method, url] of WRITE_ENDPOINTS) {
      const res = await (request(app) as any)[method](url).send(VALID_CREATE_BODY);
      expect(res.status).toBe(401);
    }
  });

  it('비로그인 write 는 installer 계층에 도달하지 않는다 (무권한 write 가능성 0)', async () => {
    await request(app).post('/api/v1/service/create').send(VALID_CREATE_BODY);
    await request(app).post('/api/v1/service/templates/stub-template/install').send({});
    expect(provisionSpy).not.toHaveBeenCalled();
    expect(installSpy).not.toHaveBeenCalled();
  });

  it('비로그인 요청은 body 검증(400)에도 도달하지 않는다', async () => {
    // guard 가 없던 시절에는 필수 필드 누락 시 400 이 나왔다.
    const res = await request(app).post('/api/v1/service/create').send({});
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
    '%s 도 허용하지 않는다 (플랫폼 전역 프로비저닝)',
    async (role) => {
      const res = await request(app).get('/api/v1/service/stats').set('x-test-roles', role);
      expect(res.status).toBe(403);
    },
  );

  it('비허용 역할의 write 도 installer 계층에 도달하지 않는다', async () => {
    for (const [method, url] of WRITE_ENDPOINTS) {
      const res = await (request(app) as any)[method](url)
        .set(...PLAIN_USER)
        .send(VALID_CREATE_BODY);
      expect(res.status).toBe(403);
    }
    expect(provisionSpy).not.toHaveBeenCalled();
    expect(installSpy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────
// 3. 허용 역할 → handler 도달
// ─────────────────────────────────────────────────────
describe('플랫폼 관리자', () => {
  it.each(ENDPOINTS)('platform:super_admin %s %s → guard 통과', async (method, url) => {
    const res = await (request(app) as any)[method](url)
      .set(...SUPER_ADMIN)
      .send(VALID_CREATE_BODY);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('read 회귀 없음 — 템플릿 목록·통계는 200', async () => {
    const list = await request(app).get('/api/v1/service/templates').set(...SUPER_ADMIN);
    expect(list.status).toBe(200);
    expect(list.body.success).toBe(true);

    const stats = await request(app).get('/api/v1/service/stats').set(...SUPER_ADMIN);
    expect(stats.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────
// 4. 상태코드 계약 (§13)
// ─────────────────────────────────────────────────────
describe('상태코드 계약', () => {
  it('필수 필드 누락 → 400', async () => {
    const res = await request(app).post('/api/v1/service/create').set(...SUPER_ADMIN).send({});
    expect(res.status).toBe(400);
  });

  it('없는 template 으로 create → 404', async () => {
    const res = await request(app)
      .post('/api/v1/service/create')
      .set(...SUPER_ADMIN)
      .send({ ...VALID_CREATE_BODY, serviceTemplateId: 'no-such-template' });
    expect(res.status).toBe(404);
  });

  it('없는 template 으로 install → 404 (기존 500)', async () => {
    const res = await request(app)
      .post('/api/v1/service/templates/no-such-template/install')
      .set(...SUPER_ADMIN)
      .send({});
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(500);
  });

  it('없는 template read → 404', async () => {
    const detail = await request(app)
      .get('/api/v1/service/templates/no-such-template')
      .set(...SUPER_ADMIN);
    expect(detail.status).toBe(404);

    const preview = await request(app)
      .get('/api/v1/service/templates/no-such-template/preview')
      .set(...SUPER_ADMIN);
    expect(preview.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────
// 5. 소스 계약 — 모든 endpoint 가 guard 아래에 있다
// ─────────────────────────────────────────────────────
describe('소스 계약', () => {
  const routerPath = path.join(__dirname, '../routes/service-provisioning.routes.ts');
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

  /** 새 endpoint 를 guard 위에 추가하면 실패한다. */
  it('guard 보다 앞에 선언된 endpoint 가 0건이다', () => {
    const guardEnd = SRC.indexOf('router.use(requireAdmin);');
    const before = SRC.slice(0, guardEnd);
    const leaked = [...before.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)].map(
      (m) => `${m[1].toUpperCase()} ${m[2]}`,
    );
    expect(leaked).toEqual([]);
  });

  it('테스트가 라우터의 endpoint 를 전수 포함한다', () => {
    const declared = [...SRC.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)];
    expect(declared).toHaveLength(ENDPOINTS.length);
  });

  it('mount 지점은 변경하지 않았다 (guard 는 라우터 내부에만 있다)', () => {
    expect(registerSrc).toContain("app.use('/api/v1/service', serviceProvisioningRoutes);");
  });

  it('요청 본문·인증정보를 로그에 추가하지 않았다', () => {
    expect(SRC).not.toMatch(/logger\.(info|warn|debug)\([^)]*req\.(body|headers)/);
    expect(SRC).not.toMatch(/logger\.\w+\([^)]*token/i);
  });
});
