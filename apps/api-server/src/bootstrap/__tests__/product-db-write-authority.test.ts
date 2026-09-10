/**
 * WO-O4O-ADMIN-PARTNEROPS-REGISTRY-PRODUCTDB-AUTH-AND-LINT-GATE-FINAL-CLOSURE-V1 §6 · §8
 * 선행: WO-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1 §7 (write 만 좁혔던 계약)
 *
 * 공통 Product DB 정본의 권한 계약을 고정한다.
 *   - `/api/v1/admin/o4o-product-db/*` 는 **조회·수정 모두 `platform:super_admin` 단독**.
 *     공통 Product DB 는 서비스별로 분리되지 않은 단일 정본이므로, 특정 서비스의 admin/operator 가
 *     다른 서비스 제품의 정본을 조회하거나 변경할 수 있어서는 안 된다.
 *   - 역할 목록을 컨트롤러마다 다시 선언하지 않는다 — 정본은 `requireAdmin` 하나다.
 *   - 서비스 운영자의 제안·등록 요청·후보 큐레이션은 서비스 API 에서 계속 동작해야 한다.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import request from 'supertest';

const ROLES: Record<string, string[]> = {
  superadmin: ['platform:super_admin'],
  'neture-admin': ['neture:admin'],
  'neture-operator': ['neture:operator'],
  'cosmetics-operator': ['cosmetics:operator'],
  'cosmetics-admin': ['cosmetics:admin'],
  'kpa-admin': ['kpa-society:admin'],
  'kpa-operator': ['kpa-society:operator'],
  'legacy-admin': ['admin'],
  'legacy-super-admin': ['super_admin'],
  'legacy-operator': ['operator'],
  plain: [],
};

/** 공통 Product DB 정본에 접근할 수 있는 유일한 역할 */
const ALLOWED = ['superadmin'];
/** 서비스 역할·legacy 역할 — 조회도 수정도 403 이어야 한다 (§6.4 의 8역할) */
const DENIED = [
  'neture-admin',
  'neture-operator',
  'cosmetics-admin',
  'cosmetics-operator',
  'kpa-admin',
  'legacy-admin',
  'legacy-super-admin',
  'legacy-operator',
];

jest.mock('../../common/middleware/auth/authentication.middleware.js', () => {
  const stub = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const id = req.headers['x-test-user'] as string | undefined;
    if (!id) {
      res.status(401).json({ success: false, code: 'AUTH_REQUIRED' });
      return;
    }
    (req as unknown as { user: unknown }).user = { id, email: `${id}@test.local` };
    next();
  };
  return { requireAuth: stub, authenticate: stub, authenticateToken: stub, authenticateCookie: stub };
});

jest.mock('../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    hasAnyRole: jest.fn(async (userId: string, roles: string[]) =>
      (ROLES[userId] ?? []).some((r) => roles.includes(r)),
    ),
    getActiveRoles: jest.fn(async (userId: string) => (ROLES[userId] ?? []).map((role) => ({ role }))),
  },
}));

const stubDataSource = {
  getRepository: () => ({ findOne: jest.fn(), find: jest.fn(), createQueryBuilder: jest.fn() }),
  manager: {},
  query: jest.fn(async () => []),
} as never;

const MASTER_ID = '00000000-0000-0000-0000-000000000001';

async function buildApp() {
  const { createProductMasterDescriptionController } = await import(
    '../../modules/neture/controllers/product-master-description.controller.js'
  );

  const app = express();
  app.use(express.json());
  app.use('/api/v1/admin/o4o-product-db/masters', createProductMasterDescriptionController(stubDataSource));
  return app;
}

describe('공통 Product DB 정본 = platform:super_admin 단독', () => {
  const BASE = '/api/v1/admin/o4o-product-db/masters';
  const DESC = `${BASE}/${MASTER_ID}/store-descriptions`;
  let app: express.Express;

  beforeAll(async () => {
    app = await buildApp();
  });

  describe('요청 수준 — 대표 read(GET)', () => {
    it.each(ALLOWED)('%s 는 조회할 수 있다', async (user) => {
      const res = await request(app).get(DESC).set('x-test-user', user);
      expect(res.status).not.toBe(403);
    });

    it.each(DENIED)('%s 의 조회는 403', async (user) => {
      const res = await request(app).get(DESC).set('x-test-user', user);
      expect(res.status).toBe(403);
    });

    it('역할 없는 사용자는 403', async () => {
      const res = await request(app).get(DESC).set('x-test-user', 'plain');
      expect(res.status).toBe(403);
    });

    it('인증 없으면 401', async () => {
      const res = await request(app).get(DESC);
      expect(res.status).toBe(401);
    });
  });

  describe('요청 수준 — 대표 write(POST)', () => {
    it.each(ALLOWED)('%s 의 설명서 생성은 권한으로 막히지 않는다', async (user) => {
      const res = await request(app).post(DESC).set('x-test-user', user).send({ content: 'x' });
      expect(res.status).not.toBe(403);
    });

    it.each(DENIED)('%s 의 설명서 생성은 403', async (user) => {
      const res = await request(app).post(DESC).set('x-test-user', user).send({ content: 'x' });
      expect(res.status).toBe(403);
    });
  });

  describe('권한 선언 계약', () => {
    const srcRoot = resolve(__dirname, '../../');
    const src = (p: string) => readFileSync(resolve(srcRoot, p), 'utf8');
    const controllerDir = resolve(srcRoot, 'modules/neture/controllers');

    /** `/api/v1/admin/o4o-product-db/*` 아래 mount 되는 컨트롤러 (register-routes.ts 기준) */
    const PRODUCT_DB_CONTROLLERS = [
      'operator-supplier-store-description-review.controller.ts',
      'product-content-browse.controller.ts',
      'product-db-maintenance.controller.ts',
      'product-description-qr-summary.controller.ts',
      'product-image-quality.controller.ts',
      'product-landing.controller.ts',
      'product-master-audit-log.controller.ts',
      'product-master-create.controller.ts',
      'product-master-description.controller.ts',
      'product-master-image.controller.ts',
      'product-master-note.controller.ts',
      'product-master-status.controller.ts',
      'product-usage-links.controller.ts',
    ];

    it('mount 목록이 register-routes.ts 와 일치한다', () => {
      const routes = src('bootstrap/register-routes.ts');
      const mounted = new Set(
        [...routes.matchAll(/app\.use\('\/api\/v1\/admin\/o4o-product-db\/[^']*',\s*create(\w+)\(/g)].map(
          (m) => m[1],
        ),
      );
      expect(mounted.size).toBe(PRODUCT_DB_CONTROLLERS.length);
    });

    it.each(PRODUCT_DB_CONTROLLERS)('%s 는 router floor 로 requireAdmin 을 쓴다', (file) => {
      const s = src(`modules/neture/controllers/${file}`);
      expect(s).toContain('router.use(requireAdmin);');
    });

    it.each(PRODUCT_DB_CONTROLLERS)('%s 는 자체 역할 배열을 선언하지 않는다', (file) => {
      const s = src(`modules/neture/controllers/${file}`);
      // 서비스 역할을 나열한 로컬 허용 목록이 남아 있으면 안 된다.
      expect(s).not.toMatch(/const\s+\w*ADMIN_ROLES\s*=\s*\[/);
      expect(s).not.toContain("'cosmetics:admin'");
      expect(s).not.toContain("'kpa-society:admin'");
    });

    it('컨트롤러 디렉터리 전체에 product-db 용 역할 배열 잔재가 없다', () => {
      const offenders = readdirSync(controllerDir)
        .filter((f) => PRODUCT_DB_CONTROLLERS.includes(f))
        .filter((f) => /'(?:cosmetics|kpa-society|neture):(?:admin|operator)'/.test(
          readFileSync(resolve(controllerDir, f), 'utf8'),
        ));
      expect(offenders).toEqual([]);
    });

    it('requireProductDbWrite 는 정본 requireAdmin 이다', () => {
      const s = src('modules/neture/controllers/product-db-write-authority.ts');
      expect(s).toContain('export const requireProductDbWrite = requireAdmin;');
      expect(s).not.toMatch(/PRODUCT_DB_WRITE_ROLES\s*=\s*\[/);
    });

    it('프런트 판정 집합(@o4o/auth-context)이 백엔드와 동일하다', () => {
      const front = readFileSync(
        resolve(__dirname, '../../../../../packages/auth-context/src/adminRouteAccess.ts'),
        'utf8',
      );
      expect(front).toMatch(/PRODUCT_DB_WRITE_ROLES = \['platform:super_admin'\]/);
    });

    /** 공통 정본을 바꾸는 write route 는 명시 guard 를 유지한다 (다층 방어). */
    const GUARDED: Array<[string, string]> = [
      ['modules/neture/controllers/product-master-create.controller.ts', "router.post('/'"],
      ['modules/neture/controllers/product-master-status.controller.ts', "router.patch('/:id/status'"],
      ['modules/neture/controllers/product-master-description.controller.ts', "router.post('/:id/store-descriptions'"],
      ['modules/neture/controllers/product-master-image.controller.ts', "router.post('/:id/images'"],
      ['modules/neture/controllers/product-master-image.controller.ts', "router.delete('/:id/images/:imageId'"],
      ['modules/neture/controllers/product-candidate.controller.ts', "router.post('/:id/promote-master'"],
      ['modules/neture/controllers/product-landing.controller.ts', "router.post('/'"],
      ['routes/o4o-store/controllers/store-product-request-admin.controller.ts', "router.post('/:id/approve-new'"],
      ['modules/neture/controllers/operator-supplier-store-description-review.controller.ts', "router.post('/:id/approve'"],
      ['modules/neture/controllers/operator-supplier-store-description-review.controller.ts', "router.post('/:id/reject'"],
      [
        'modules/neture/controllers/product-db-maintenance.controller.ts',
        "router.post('/jobs/orphan-registered-candidates/apply'",
      ],
      ['modules/neture/controllers/product-master-note.controller.ts', "router.post('/:id/notes'"],
      ['modules/neture/controllers/product-master-note.controller.ts', "router.delete('/:id/notes/:noteId'"],
    ];

    it.each(GUARDED)('%s 의 %s 는 requireProductDbWrite 를 단다', (file, route) => {
      const s = src(file);
      const idx = s.indexOf(route);
      expect(idx).toBeGreaterThan(-1);
      expect(s.slice(idx, idx + route.length + 40)).toContain('requireProductDbWrite');
    });

    /** 서비스 경계 안의 작업은 계속 서비스 운영자에게 열려 있어야 한다 (§6.3 — 필수 업무를 막지 않는다). */
    const NOT_GUARDED: Array<[string, string]> = [
      ['routes/o4o-store/controllers/store-product-request-admin.controller.ts', "router.post('/:id/link'"],
    ];

    it.each(NOT_GUARDED)('%s 의 %s 는 서비스 운영자에게 유지된다', (file, route) => {
      const s = src(file);
      const idx = s.indexOf(route);
      expect(idx).toBeGreaterThan(-1);
      expect(s.slice(idx, idx + route.length + 40)).not.toContain('requireProductDbWrite');
    });

    /** 서비스 운영자 제출·큐레이션 경로는 /admin/o4o-product-db 밖에 mount 되어 있어야 한다. */
    it('서비스 운영자 경로는 admin mount 밖이다', () => {
      const routes = src('bootstrap/register-routes.ts');
      expect(routes).toContain("app.use('/api/v1/operator/product-candidates'");
      expect(routes).toContain("app.use('/api/v1/operator/store-product-requests'");
    });

    it('서비스 후보 큐레이션은 OPERATOR_ROLES floor 를 유지한다', () => {
      const s = src('modules/neture/controllers/product-candidate.controller.ts');
      expect(s).toContain('router.use(requireRole(OPERATOR_ROLES));');
    });
  });
});
