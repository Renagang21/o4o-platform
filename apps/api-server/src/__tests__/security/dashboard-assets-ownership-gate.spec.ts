/**
 * Dashboard Assets — Ownership / Organization Access Gate Tests
 *
 * WO-O4O-AUTH-ONLY-ROUTE-GUARD-HARDENING-V1
 * IR: IR-O4O-NEW-USER-SERVICE-REJECTION-LOGIN-POLICY-V1 (D-B)
 *
 * 검증 대상:
 *   D-B  `/api/v1/dashboard/assets*` 는 클라이언트가 보낸 dashboardId 를 소유권 검증 없이
 *        그대로 `cms_media."organizationId"` 필터로 사용했다.
 *        → 로그인만 하면 타인의 dashboardId 를 지정해 조회·수정·삭제·주입이 가능했다.
 *
 * DB 미사용 — DataSource.query / getRepository 를 스텁해
 * 가드가 통과했는지(=대상 SQL 이 발행되었는지)로 판정한다.
 */

import express from 'express';
import request from 'supertest';

// entity 패키지는 런타임 토큰으로만 쓰이므로(getRepository 인자) 스텁으로 대체한다.
jest.mock('@o4o-apps/cms-core', () => ({ CmsMedia: class CmsMedia {}, CmsContent: class CmsContent {} }), { virtual: true });
jest.mock(
  '@o4o-apps/digital-signage-core/entities',
  () => ({ SignagePlaylist: class SignagePlaylist {}, SignageMedia: class SignageMedia {} }),
  { virtual: true }
);

import {
  createListAssetsHandler,
  createGetCopiedSourceIdsHandler,
  createGetKpiHandler,
} from '../../routes/dashboard/dashboard-assets.query-handlers.js';
import {
  createUpdateAssetHandler,
  createDeleteAssetHandler,
} from '../../routes/dashboard/dashboard-assets.mutation-handlers.js';
import { createCopyAssetHandler } from '../../routes/dashboard/dashboard-assets.copy-handlers.js';

// ─────────────────────────────────────────────────────
// Harness
// ─────────────────────────────────────────────────────

const SELF_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_ID = '22222222-2222-2222-2222-222222222222';
const ORG_ID = '33333333-3333-3333-3333-333333333333';
const ASSET_ID = '44444444-4444-4444-4444-444444444444';
const SOURCE_ID = '55555555-5555-5555-5555-555555555555';

// roleAssignmentService.hasAnyRole 는 DB 를 타므로 스텁한다 (기본 = 관리자 아님).
const hasAnyRole = jest.fn(async () => false);
jest.mock('../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    hasAnyRole: (...args: any[]) => hasAnyRole(...(args as [])),
  },
}));

interface QueryCall { sql: string; params: any[]; }

/**
 * memberOrgIds: 사용자가 활성 소속인 organization id 목록.
 * organization_members 조회만 실제 의미를 갖고, 나머지 query 는 빈 배열을 돌려준다.
 */
function buildApp(opts: {
  userId?: string;
  memberOrgIds?: string[];
  calls: QueryCall[];
  assetFound?: boolean;
}) {
  const { userId = SELF_ID, memberOrgIds = [], calls, assetFound = true } = opts;

  const dataSource: any = {
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      if (sql.includes('organization_members')) {
        return memberOrgIds.includes(params[1]) ? [{ '?column?': 1 }] : [];
      }
      return [];
    },
    getRepository: () => ({
      findOne: async () =>
        assetFound
          ? { id: ASSET_ID, title: 't', description: null, isActive: true, metadata: { sourceContentId: SOURCE_ID } }
          : null,
      save: async (x: any) => x,
      createQueryBuilder: () => {
        const qb: any = {
          select: () => qb,
          where: (_c: string, p: any) => { calls.push({ sql: 'QB cms_media where', params: [p?.dashboardId] }); return qb; },
          andWhere: () => qb,
          getRawMany: async () => [],
        };
        return qb;
      },
    }),
  };

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    if (userId) req.user = { id: userId };
    next();
  });

  app.get('/assets', createListAssetsHandler(dataSource));
  app.get('/assets/copied-source-ids', createGetCopiedSourceIdsHandler(dataSource));
  app.get('/assets/kpi', createGetKpiHandler(dataSource));
  app.patch('/assets/:id', createUpdateAssetHandler(dataSource));
  app.delete('/assets/:id', createDeleteAssetHandler(dataSource));
  app.post('/assets/copy', createCopyAssetHandler(dataSource));

  return app;
}

/** cms_media 를 대상으로 한 실제 데이터 접근이 일어났는가 */
function touchedAssets(calls: QueryCall[]): boolean {
  return calls.some(c => c.sql.includes('cms_media'));
}

beforeEach(() => {
  hasAnyRole.mockReset();
  hasAnyRole.mockResolvedValue(false as any);
});

// ─────────────────────────────────────────────────────
// 11.1 읽기 경로 — 목록 / copied-source-ids / KPI
// ─────────────────────────────────────────────────────

describe('dashboard assets — read paths', () => {
  const readPaths = [
    { name: 'list', url: (d: string) => `/assets?dashboardId=${d}` },
    { name: 'copied-source-ids', url: (d: string) => `/assets/copied-source-ids?dashboardId=${d}` },
    { name: 'kpi', url: (d: string) => `/assets/kpi?dashboardId=${d}` },
  ];

  for (const p of readPaths) {
    it(`${p.name}: 본인 대시보드는 200`, async () => {
      const calls: QueryCall[] = [];
      const res = await request(buildApp({ calls })).get(p.url(SELF_ID));
      expect(res.status).toBe(200);
      expect(touchedAssets(calls)).toBe(true);
    });

    it(`${p.name}: 타인 대시보드는 403 이고 자산 조회 자체가 일어나지 않는다`, async () => {
      const calls: QueryCall[] = [];
      const res = await request(buildApp({ calls })).get(p.url(OTHER_ID));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(touchedAssets(calls)).toBe(false);
    });

    it(`${p.name}: 소속 조직 대시보드는 200`, async () => {
      const calls: QueryCall[] = [];
      const res = await request(buildApp({ calls, memberOrgIds: [ORG_ID] })).get(p.url(ORG_ID));
      expect(res.status).toBe(200);
      expect(touchedAssets(calls)).toBe(true);
    });

    it(`${p.name}: dashboardId 누락은 400`, async () => {
      const calls: QueryCall[] = [];
      const res = await request(buildApp({ calls })).get(p.url('').replace('dashboardId=', 'dashboardId='));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_REQUEST');
    });

    it(`${p.name}: dashboardId 형식 오류는 400`, async () => {
      const calls: QueryCall[] = [];
      const res = await request(buildApp({ calls })).get(p.url('not-a-uuid'));
      expect(res.status).toBe(400);
      expect(touchedAssets(calls)).toBe(false);
    });

    it(`${p.name}: 미인증은 401`, async () => {
      const calls: QueryCall[] = [];
      const res = await request(buildApp({ calls, userId: '' })).get(p.url(SELF_ID));
      expect(res.status).toBe(401);
    });
  }

  it('platform admin 은 타 대시보드도 조회할 수 있다', async () => {
    hasAnyRole.mockResolvedValue(true as any);
    const calls: QueryCall[] = [];
    const res = await request(buildApp({ calls })).get(`/assets?dashboardId=${OTHER_ID}`);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────
// 11.1 쓰기 경로 — update / delete / copy
// ─────────────────────────────────────────────────────

describe('dashboard assets — write paths', () => {
  it('update: 타인 대시보드 자산 수정은 403 이며 저장 시도가 없다', async () => {
    const calls: QueryCall[] = [];
    const res = await request(buildApp({ calls }))
      .patch(`/assets/${ASSET_ID}`)
      .send({ dashboardId: OTHER_ID, title: 'hijacked' });
    expect(res.status).toBe(403);
  });

  it('update: 본인 대시보드 자산 수정은 200', async () => {
    const calls: QueryCall[] = [];
    const res = await request(buildApp({ calls }))
      .patch(`/assets/${ASSET_ID}`)
      .send({ dashboardId: SELF_ID, title: 'ok' });
    expect(res.status).toBe(200);
  });

  it('delete: 타인 대시보드 자산 삭제는 403', async () => {
    const calls: QueryCall[] = [];
    const res = await request(buildApp({ calls })).delete(`/assets/${ASSET_ID}?dashboardId=${OTHER_ID}`);
    expect(res.status).toBe(403);
  });

  it('delete: 본인 대시보드 자산 삭제는 200', async () => {
    const calls: QueryCall[] = [];
    const res = await request(buildApp({ calls })).delete(`/assets/${ASSET_ID}?dashboardId=${SELF_ID}`);
    expect(res.status).toBe(200);
  });

  it('copy: 타인 대시보드로의 자산 주입은 403', async () => {
    const calls: QueryCall[] = [];
    const res = await request(buildApp({ calls }))
      .post('/assets/copy')
      .send({ sourceType: 'content', sourceId: SOURCE_ID, targetDashboardId: OTHER_ID });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('copy: targetDashboardId 누락은 400 (기존 계약 유지)', async () => {
    const calls: QueryCall[] = [];
    const res = await request(buildApp({ calls }))
      .post('/assets/copy')
      .send({ sourceType: 'content', sourceId: SOURCE_ID });
    expect(res.status).toBe(400);
  });
});
