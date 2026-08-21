/**
 * WO-O4O-APPSTORE-AUTHORIZATION-BOUNDARY-AUDIT-AND-HARDENING-V1
 *
 * `/api/v1/appstore` 의 인증·인가 경계와 상태코드 계약을 고정한다.
 *
 * - 카탈로그 목록/상세 = PUBLIC_READ (비인증 200 / 없는 app 404)
 * - install·activate·deactivate·uninstall = PRIVILEGED_WRITE
 *   (비인증 401 / 인증됐지만 platform:super_admin 아님 403)
 * - GET /modules = 디버그 read 로 동일 가드 (CLAUDE.md §8)
 * - 카탈로그에 없는 app(은퇴 포함) install → 500 이 아니라 404
 */
import express from 'express';
import request from 'supertest';

const ROLES: Record<string, string[]> = {
  superadmin: ['platform:super_admin'],
  'cosmetics-operator': ['cosmetics:operator'],
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

// module registry 스캔(파일시스템 glob)을 타지 않도록 실제 로더 대신 stub 을 쓴다.
// AppStoreError 는 실제 구현을 그대로 사용해 status 매핑 계약을 검증한다.
jest.mock('../../modules/module-loader.js', () => ({
  moduleLoader: {
    getModule: jest.fn(() => undefined),
    getRegistry: jest.fn(() => new Map()),
    getActiveModules: jest.fn(() => []),
    loadAll: jest.fn(async () => undefined),
    installModule: jest.fn(async () => undefined),
  },
}));

const WRITE_ROUTES: Array<{ method: 'post' | 'delete'; path: string }> = [
  { method: 'post', path: '/api/v1/appstore/install' },
  { method: 'post', path: '/api/v1/appstore/activate' },
  { method: 'post', path: '/api/v1/appstore/deactivate' },
  { method: 'delete', path: '/api/v1/appstore/uninstall' },
];

async function buildApp() {
  const { default: appstoreRoutes } = await import('../appstore.routes.js');
  const app = express();
  app.use(express.json());
  app.use('/api/v1/appstore', appstoreRoutes);
  return app;
}

describe('WO-O4O-APPSTORE-AUTHORIZATION-BOUNDARY-AUDIT-AND-HARDENING-V1', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = await buildApp();
  });

  describe('공개 조회 (PUBLIC_READ) 는 유지된다', () => {
    it('비인증 목록 조회는 200', async () => {
      const res = await request(app).get('/api/v1/appstore');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('비인증 상세 조회는 200 (active app)', async () => {
      const res = await request(app).get('/api/v1/appstore/cosmetics-seller-extension');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('존재하지 않는 app 상세는 404', async () => {
      const res = await request(app).get('/api/v1/appstore/no-such-app-xyz');
      expect(res.status).toBe(404);
    });

    it('은퇴한 app 상세는 404', async () => {
      const res = await request(app).get('/api/v1/appstore/cosmetics-supplier-extension');
      expect(res.status).toBe(404);
    });
  });

  describe('상태 변경 (PRIVILEGED_WRITE) — 인증 경계', () => {
    it.each(WRITE_ROUTES)('비인증 $method $path 는 401', async ({ method, path }) => {
      const res = await request(app)[method](path).send({ appId: 'cosmetics-seller-extension' });
      expect(res.status).toBe(401);
    });

    it.each(WRITE_ROUTES)('권한 없는 사용자의 $method $path 는 403', async ({ method, path }) => {
      const res = await request(app)[method](path)
        .set('x-test-user', 'plain')
        .send({ appId: 'cosmetics-seller-extension' });
      expect(res.status).toBe(403);
    });

    it.each(WRITE_ROUTES)('service operator 의 $method $path 도 403', async ({ method, path }) => {
      const res = await request(app)[method](path)
        .set('x-test-user', 'cosmetics-operator')
        .send({ appId: 'cosmetics-seller-extension' });
      expect(res.status).toBe(403);
    });
  });

  describe('디버그 read — GET /modules', () => {
    it('비인증은 401', async () => {
      const res = await request(app).get('/api/v1/appstore/modules');
      expect(res.status).toBe(401);
    });

    it('권한 없는 사용자는 403', async () => {
      const res = await request(app).get('/api/v1/appstore/modules').set('x-test-user', 'plain');
      expect(res.status).toBe(403);
    });

    it('platform:super_admin 은 200', async () => {
      const res = await request(app).get('/api/v1/appstore/modules').set('x-test-user', 'superadmin');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('상태코드 계약 (관리자 인증 후)', () => {
    it.each(WRITE_ROUTES)('appId 누락 $method $path 는 400', async ({ method, path }) => {
      const res = await request(app)[method](path).set('x-test-user', 'superadmin').send({});
      expect(res.status).toBe(400);
    });

    it('카탈로그에 없는 app install 은 404 (500 아님)', async () => {
      const res = await request(app)
        .post('/api/v1/appstore/install')
        .set('x-test-user', 'superadmin')
        .send({ appId: 'no-such-app-xyz' });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('APP_NOT_IN_CATALOG');
    });

    it('은퇴한 app install 은 404 (500 아님)', async () => {
      const res = await request(app)
        .post('/api/v1/appstore/install')
        .set('x-test-user', 'superadmin')
        .send({ appId: 'cosmetics-supplier-extension' });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('APP_NOT_IN_CATALOG');
    });

    it.each([
      { path: '/api/v1/appstore/activate', method: 'post' as const },
      { path: '/api/v1/appstore/deactivate', method: 'post' as const },
      { path: '/api/v1/appstore/uninstall', method: 'delete' as const },
    ])('설치되지 않은 app 의 $path 는 404 (500 아님)', async ({ method, path }) => {
      const res = await request(app)[method](path)
        .set('x-test-user', 'superadmin')
        .send({ appId: 'cosmetics-seller-extension' });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('APP_NOT_INSTALLED');
    });
  });
});
