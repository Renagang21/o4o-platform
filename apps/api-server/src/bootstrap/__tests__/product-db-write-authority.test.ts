/**
 * WO-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1 §7
 *
 * 공통 Product DB 의 **write 권한**을 O4O 전체 관리자로 닫은 계약을 고정한다.
 *   - 조회(GET)는 서비스 admin/operator 에게 그대로 열려 있어야 한다 (접근이 아니라 수정만 막는다).
 *   - write(POST/PATCH/DELETE)는 platform:super_admin · neture:admin · neture:operator 만.
 *
 * 서비스 운영자의 후보 큐레이션(archive/보류/제외)은 서비스 경계 안이라 유지하고,
 * 공통 ProductMaster 를 만드는 promote-master 만 닫혀 있어야 한다.
 */
import { readFileSync } from 'node:fs';
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
  'glycopharm-admin': ['glycopharm:admin'],
  plain: [],
};

/** write 가 허용돼야 하는 역할 (O4O 전체 관리자) */
const WRITERS = ['superadmin', 'neture-admin', 'neture-operator'];
/** 조회는 되지만 write 는 403 이어야 하는 역할 (서비스 admin/operator) */
const READERS = ['cosmetics-operator', 'cosmetics-admin', 'kpa-admin', 'kpa-operator', 'glycopharm-admin'];

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
  const base = '/api/v1/admin/o4o-product-db/masters';
  app.use(base, createProductMasterDescriptionController(stubDataSource));
  return app;
}

describe('WO-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1', () => {
  const BASE = '/api/v1/admin/o4o-product-db/masters';
  const DESC = `${BASE}/${MASTER_ID}/store-descriptions`;
  let app: express.Express;

  beforeAll(async () => {
    app = await buildApp();
  });

  describe('조회(GET)는 서비스 admin/operator 에게 열려 있다', () => {
    it.each([...WRITERS, ...READERS])('%s 는 설명서 목록을 조회할 수 있다', async (user) => {
      const res = await request(app).get(DESC).set('x-test-user', user);
      expect(res.status).not.toBe(403);
    });

    it('역할 없는 사용자는 조회도 403', async () => {
      const res = await request(app).get(DESC).set('x-test-user', 'plain');
      expect(res.status).toBe(403);
    });

    it('인증 없으면 401', async () => {
      const res = await request(app).get(DESC);
      expect(res.status).toBe(401);
    });
  });

  describe('write 는 O4O 전체 관리자만', () => {
    it.each(READERS)('%s 의 설명서 생성은 403', async (user) => {
      const res = await request(app).post(DESC).set('x-test-user', user).send({ content: 'x' });
      expect(res.status).toBe(403);
    });

    // ProductMaster 생성(POST /) · 상태 변경(PATCH /:id/status) controller 는
    // neture.service 전체를 끌어와 jest 환경에서 mount 할 수 없다.
    // 두 경로의 계약은 아래 GUARDED 소스 스캔으로 고정한다.
    it.each(WRITERS)('%s 의 설명서 생성은 권한으로 막히지 않는다', async (user) => {
      const res = await request(app).post(DESC).set('x-test-user', user).send({ content: 'x' });
      expect(res.status).not.toBe(403);
    });
  });

  describe('권한 계약 정의', () => {
    const src = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

    it('PRODUCT_DB_WRITE_ROLES 는 O4O 전체 관리자 3역할이다', async () => {
      const { PRODUCT_DB_WRITE_ROLES } = await import(
        '../../modules/neture/controllers/product-db-write-authority.js'
      );
      expect(PRODUCT_DB_WRITE_ROLES).toEqual(['platform:super_admin', 'neture:admin', 'neture:operator']);
    });

    it('프런트 판정 집합(@o4o/auth-context)이 백엔드와 동일하다', () => {
      const front = readFileSync(
        resolve(__dirname, '../../../../../packages/auth-context/src/adminRouteAccess.ts'),
        'utf8',
      );
      expect(front).toMatch(
        /PRODUCT_DB_WRITE_ROLES = \['platform:super_admin', 'neture:admin', 'neture:operator'\]/,
      );
    });

    /** 공통 Product DB 를 바꾸는 write route 는 반드시 이 guard 를 달고 있어야 한다. */
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
    ];

    it.each(GUARDED)('%s 의 %s 는 requireProductDbWrite 를 단다', (file, route) => {
      const s = src(file);
      const idx = s.indexOf(route);
      expect(idx).toBeGreaterThan(-1);
      expect(s.slice(idx, idx + route.length + 40)).toContain('requireProductDbWrite');
    });

    /** 서비스 경계 안의 작업은 계속 서비스 운영자에게 열려 있어야 한다 (§9 — 필수 업무를 막지 않는다). */
    const NOT_GUARDED: Array<[string, string]> = [
      ['routes/o4o-store/controllers/store-product-request-admin.controller.ts', "router.post('/:id/link'"],
      ['modules/neture/controllers/product-master-note.controller.ts', "router.post('/:id/notes'"],
    ];

    it.each(NOT_GUARDED)('%s 의 %s 는 서비스 운영자에게 유지된다', (file, route) => {
      const s = src(file);
      const idx = s.indexOf(route);
      expect(idx).toBeGreaterThan(-1);
      expect(s.slice(idx, idx + route.length + 40)).not.toContain('requireProductDbWrite');
    });
  });
});
