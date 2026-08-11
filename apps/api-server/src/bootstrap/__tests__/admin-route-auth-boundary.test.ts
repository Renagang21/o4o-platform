/**
 * WO-O4O-ADMIN-PRODUCT-DESCRIPTION-ROUTE-AUTH-BOUNDARY-ALIGNMENT-V1
 *
 * `/api/v1/admin` 에 mount 된 admin dashboard router 의 router-level guard 가
 * 뒤에 mount 되는 `/api/v1/admin/o4o-product-db/*` 요청까지 가로채
 * 하위 라우터의 자체 권한 계약(requireRole(ADMIN_ROLES))을 무효화하던 문제를 고정한다.
 *
 * register-routes.ts 의 **실제 mount 순서**를 실제 router 로 재현한다
 * (blanket `/api/v1/admin` → 이후 `/api/v1/admin/o4o-product-db/...`).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import request from 'supertest';

/** 테스트 사용자: x-test-user 헤더로 역할을 주입한다. */
const ROLES: Record<string, string[]> = {
  superadmin: ['platform:super_admin'],
  'cosmetics-operator': ['cosmetics:operator'],
  'kpa-admin': ['kpa-society:admin'],
  'neture-operator': ['neture:operator'],
  plain: [],
};

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

// 컨트롤러 팩토리가 생성 시점에 호출하는 것만 채운 stub DataSource.
const stubDataSource = {
  getRepository: () => ({ findOne: jest.fn(), find: jest.fn(), createQueryBuilder: jest.fn() }),
  manager: {},
} as never;

async function buildApp() {
  const { default: adminDashboardRoutes } = await import('../../routes/admin/dashboard.routes.js');
  const { createProductMasterDescriptionController } = await import(
    '../../modules/neture/controllers/product-master-description.controller.js'
  );

  const app = express();
  app.use(express.json());
  // register-routes.ts 와 동일한 순서 — blanket 이 먼저다.
  app.use('/api/v1/admin', adminDashboardRoutes);
  app.use('/api/v1/admin/o4o-product-db/masters', createProductMasterDescriptionController(stubDataSource));
  return app;
}

describe('WO-O4O-ADMIN-PRODUCT-DESCRIPTION-ROUTE-AUTH-BOUNDARY-ALIGNMENT-V1', () => {
  const MASTER = '/api/v1/admin/o4o-product-db/masters/00000000-0000-0000-0000-000000000001/store-descriptions';
  let app: express.Express;

  beforeAll(async () => {
    app = await buildApp();
  });

  describe('제품설명서 API — 하위 라우터의 권한 계약이 살아 있어야 한다', () => {
    it('platform:super_admin 은 통과한다', async () => {
      const res = await request(app).get(MASTER).set('x-test-user', 'superadmin');
      expect(res.status).not.toBe(403);
    });

    it.each(['cosmetics-operator', 'kpa-admin', 'neture-operator'])(
      '%s 는 상위 blanket guard 에 막히지 않는다 (하위 ADMIN_ROLES 허용)',
      async (user) => {
        const res = await request(app).get(MASTER).set('x-test-user', user);
        expect(res.status).not.toBe(403);
      },
    );

    it('권한 없는 일반 사용자는 403', async () => {
      const res = await request(app).get(MASTER).set('x-test-user', 'plain');
      expect(res.status).toBe(403);
    });

    it('비인증 요청은 401', async () => {
      const res = await request(app).get(MASTER);
      expect(res.status).toBe(401);
    });
  });

  describe('admin dashboard API — super_admin 전용 경계가 유지돼야 한다', () => {
    const DASH = '/api/v1/admin/dashboard/sales-summary';

    it.each(['cosmetics-operator', 'kpa-admin', 'neture-operator', 'plain'])(
      '%s 는 여전히 403',
      async (user) => {
        const res = await request(app).get(DASH).set('x-test-user', user);
        expect(res.status).toBe(403);
      },
    );

    it('비인증 요청은 401', async () => {
      const res = await request(app).get(DASH);
      expect(res.status).toBe(401);
    });

    it.each(['/api/v1/admin/system/health', '/api/v1/admin/partners', '/api/v1/admin/cosmetics/partner-metrics'])(
      '%s 도 service operator 에게 403 유지',
      async (path) => {
        const res = await request(app).get(path).set('x-test-user', 'cosmetics-operator');
        expect(res.status).toBe(403);
      },
    );
  });
});

/**
 * 소스 스캔 회귀 — 가드 배선 자체를 고정한다.
 *
 * blanket 가드를 prefix 로 좁혔으므로, `/api/v1/admin/*` 아래에서
 * "상위 가드가 대신 막아주던" 부수 효과가 사라진다.
 * 따라서 blanket 뒤에 mount 되는 라우터는 **전부 자체 가드를 가져야 한다.**
 */
describe('가드 배선 회귀 (source scan)', () => {
  const SRC = resolve(__dirname, '../..');
  const read = (p: string) => readFileSync(resolve(SRC, p), 'utf8');

  it('admin dashboard router 의 가드는 자기 prefix 로만 한정돼야 한다', () => {
    const s = read('routes/admin/dashboard.routes.ts');
    // path 없는 router.use(guard) 는 mount prefix 전체를 삼킨다 — 금지.
    expect(s).not.toMatch(/router\.use\(\s*authenticate\s*\)/);
    expect(s).not.toMatch(/router\.use\(\s*requireAdmin\s*\)/);
    expect(s).toMatch(/router\.use\(OWNED_PREFIXES,\s*authenticate\)/);
    expect(s).toMatch(/router\.use\(OWNED_PREFIXES,\s*requireAdmin\)/);
  });

  it('router 가 정의한 모든 최상위 prefix 가 OWNED_PREFIXES 에 들어 있어야 한다', () => {
    const s = read('routes/admin/dashboard.routes.ts');
    const owned = [...(s.match(/const OWNED_PREFIXES = \[([^\]]+)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(
      (m) => m[1],
    );
    const declared = [...s.matchAll(/router\.\w+\(\s*\n?\s*'(\/[^']+)'/g)].map((m) => `/${m[1].split('/')[1]}`);
    expect(owned.length).toBeGreaterThan(0);
    expect([...new Set(declared)].sort()).toEqual([...new Set(owned)].sort());
  });

  const PRODUCT_DB_CONTROLLERS = [
    'product-landing',
    'product-usage-links',
    'product-image-quality',
    'product-master-note',
    'product-master-description',
    'operator-supplier-store-description-review',
    'product-master-create',
    'product-db-maintenance',
    'product-master-audit-log',
    'product-master-status',
    'product-content-browse',
    'product-description-qr-summary',
    'product-master-image',
  ];

  it.each(PRODUCT_DB_CONTROLLERS)(
    '%s 컨트롤러는 자체 인증 + 역할 가드를 가진다',
    (name) => {
      const s = read(`modules/neture/controllers/${name}.controller.ts`);
      expect(s).toMatch(/router\.use\(\s*(?:authenticate|requireAuth)\s*\)/);
      expect(s).toMatch(/router\.use\(\s*requireRole\(ADMIN_ROLES\)\s*\)/);
      const roles = [...(s.match(/const ADMIN_ROLES = \[([^\]]+)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(
        (m) => m[1],
      );
      // 계약: platform 전역 + 4개 서비스의 admin/operator
      expect(roles).toContain('platform:super_admin');
      expect(roles.filter((r) => /:(admin|operator)$/.test(r) && !r.startsWith('platform:')).length).toBe(8);
    },
  );
});

/**
 * WO-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1 (회귀 복구)
 *
 * blanket 을 자기 prefix 로 한정한 뒤, 인증을 blanket 에 의존하던 admin router 들이
 * `requireAdmin` 만 남았다. `requireAdmin` 은 req.user 가 없으면 `requireAuth` 에 위임하고
 * 인증이 성공하면 그대로 next() 하므로 **역할 검사가 건너뛰어진다** (프로덕션 실측: 403 → 500/통과).
 * 각 router 가 자기 인증을 명시해야 한다.
 */
describe('blanket 에 인증을 의존하던 admin router 회귀', () => {
  const BLANKET_DEPENDENT_ROUTERS = [
    'ops-metrics',
    'channel-playback-logs',
    'channel-heartbeat',
    'channel-ops',
  ];

  it.each(BLANKET_DEPENDENT_ROUTERS)('%s router 는 자기 인증을 명시한다', (name) => {
    const s = readFileSync(resolve(__dirname, `../../routes/admin/${name}.routes.ts`), 'utf8');
    expect(s).toMatch(/router\.use\(\s*authenticate\s*\)/);
  });

  it('requireAdmin 단독 사용 시 인증 위임이 역할 검사를 건너뛴다는 사실을 고정한다', () => {
    const s = readFileSync(
      resolve(__dirname, '../../common/middleware/auth/authorization.middleware.ts'),
      'utf8',
    );
    // 이 구조가 유지되는 한 requireAdmin 단독 사용은 안전하지 않다.
    // (별도 WO 로 guard 자체를 고치면 이 테스트를 함께 갱신한다)
    expect(s).toMatch(/if \(!req\.user\) \{\s*return requireAuth\(req, res, next\);/);
  });
});
