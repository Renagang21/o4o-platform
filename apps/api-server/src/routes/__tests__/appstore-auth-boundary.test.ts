/**
 * WO-O4O-APPSTORE-DUAL-CONTRACT-CENSUS-AND-CANONICALIZATION-V1
 * (선행: WO-O4O-APPSTORE-AUTHORIZATION-BOUNDARY-AUDIT-AND-HARDENING-V1)
 *
 * `/api/v1/appstore` 의 남은 계약을 고정한다.
 *
 * - 카탈로그 목록/상세 = PUBLIC_READ (비인증 200 / 없는 app 404 / 상태 필드 미노출)
 * - install·activate·deactivate·uninstall·GET /modules = 제거됨
 *   → 라우트 미등록이므로 인증 여부와 무관하게 404 (401/403 을 강제하지 않는다)
 *
 * 상태 변경 정본은 `/api/v1/admin/apps` (authenticate + requireAdmin, app_registry) 이며,
 * 인증 사용자용 활성 여부 read 는 `GET /api/v1/apps/availability` 다.
 */
import express from 'express';
import request from 'supertest';

const RETIRED_ROUTES: Array<{ method: 'post' | 'delete'; path: string }> = [
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

describe('WO-O4O-APPSTORE-DUAL-CONTRACT-CENSUS-AND-CANONICALIZATION-V1', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = await buildApp();
  });

  describe('공개 카탈로그 조회 (PUBLIC_READ) 는 유지된다', () => {
    it('비인증 목록 조회는 200', async () => {
      const res = await request(app).get('/api/v1/appstore');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBe(res.body.data.length);
      expect(Array.isArray(res.body.categories)).toBe(true);
    });

    it('비인증 상세 조회는 200', async () => {
      const res = await request(app).get('/api/v1/appstore/cosmetics-seller-extension');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appId).toBe('cosmetics-seller-extension');
    });

    it('카탈로그에 없는 app 상세는 404', async () => {
      const res = await request(app).get('/api/v1/appstore/no-such-app-xyz');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('은퇴한 app(cosmetics-supplier-extension) 상세도 404', async () => {
      const res = await request(app).get('/api/v1/appstore/cosmetics-supplier-extension');
      expect(res.status).toBe(404);
    });

    it('search 필터가 동작한다', async () => {
      const res = await request(app).get('/api/v1/appstore?search=forum');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('category 필터가 동작한다', async () => {
      const res = await request(app).get('/api/v1/appstore?category=core');
      expect(res.status).toBe(200);
      expect(res.body.data.every((a: { category: string }) => a.category === 'core')).toBe(true);
    });

    it('응답에 ModuleLoader 파생 설치 상태 필드를 포함하지 않는다', async () => {
      // 카탈로그 고유의 `status`(AppStatus: active/experimental 등 카탈로그 등재 상태)는
      // 유지된다. 제거 대상은 ModuleLoader registry 에서 파생되던 **설치 상태** 필드다.
      const res = await request(app).get('/api/v1/appstore');
      expect(res.status).toBe(200);
      for (const item of res.body.data) {
        expect(item).not.toHaveProperty('installed');
        expect(item).not.toHaveProperty('loadedAt');
        expect(item).not.toHaveProperty('activatedAt');
        expect(item.status).not.toBe('not_installed');
      }
    });

    it('상세 응답에도 상태 필드가 없다', async () => {
      const res = await request(app).get('/api/v1/appstore/partnerops');
      expect(res.status).toBe(200);
      expect(res.body.data).not.toHaveProperty('installed');
      expect(res.body.data).not.toHaveProperty('moduleDetails');
      expect(res.body.data.status).not.toBe('not_installed');
    });
  });

  describe('제거된 write 계약은 라우트가 존재하지 않는다', () => {
    it.each(RETIRED_ROUTES)('$method $path → 404', async ({ method, path }) => {
      const res = await request(app)[method](path).send({ appId: 'partnerops' });
      expect(res.status).toBe(404);
    });

    it.each(RETIRED_ROUTES)('$method $path 는 401/403 을 반환하지 않는다', async ({ method, path }) => {
      const res = await request(app)[method](path).send({ appId: 'partnerops' });
      expect([401, 403]).not.toContain(res.status);
    });
  });

  describe('제거된 디버그 read (GET /modules)', () => {
    it('GET /api/v1/appstore/modules 는 module registry 를 노출하지 않는다', async () => {
      const res = await request(app).get('/api/v1/appstore/modules');
      // `/:appId` 로 매칭되지만 카탈로그에 'modules' 가 없으므로 404 다.
      expect(res.status).toBe(404);
      expect(res.body).not.toHaveProperty('activeCount');
    });
  });
});
