/**
 * WO-O4O-SIGNAGE-MEDIA-LIBRARY-ROUTE-SHADOWING-AND-GUARD-CONTRACT-V1
 *
 * 결함: `GET /media/library` 가 먼저 등록된 `GET /media/:id` 에 매칭되어
 *       library handler 대신 detail handler 가 실행되고 500 (uuid cast) 이 났다.
 *
 * 이 스펙은 두 가지를 고정한다.
 *  1) handler 선택 자체 (router stack 등록 순서 + 실제 dispatch)
 *  2) `/media/library` 의 권한 계약 (requireSignageOperatorOrStore — 형제 media route 와 동일)
 *
 * 추가로 repository 경계 필터(serviceKey / organizationId)가
 * `qb.where()` 재호출로 지워지지 않는지도 고정한다.
 *
 * DB 는 붙이지 않는다 — AppDataSource.query 를 stub 으로 대체한다.
 * requireAuth 는 계약(토큰 없으면 401 AUTH_REQUIRED)만 흉내내는 stub 으로 대체한다.
 * validateServiceKey / requireSignageOperatorOrStore 는 실제 구현을 그대로 사용한다.
 */

import express from 'express';
import request from 'supertest';

jest.mock('../database/connection.js', () => ({
  AppDataSource: { query: jest.fn() },
}));

// entity 패키지(@o4o-apps/digital-signage-core)는 build 산출물이 필요하고
// 이 스펙은 entity 자체를 검증하지 않는다. 어떤 export 든 빈 class 로 대체한다.
jest.mock(
  '@o4o-apps/digital-signage-core/entities',
  () => new Proxy({}, { get: () => class {} }),
  { virtual: true }
);

const entered: string[] = [];
const makeHandler = (name: string) => (req: any, res: any) => {
  entered.push(name);
  res.status(200).json({ handler: name, params: req.params, query: req.query });
};

jest.mock('../routes/signage/controllers/media.controller.js', () => ({
  SignageMediaController: jest.fn().mockImplementation(() => ({
    getMediaList: makeHandler('getMediaList'),
    createMedia: makeHandler('createMedia'),
    getMedia: makeHandler('getMedia'),
    updateMedia: makeHandler('updateMedia'),
    deleteMedia: makeHandler('deleteMedia'),
    getMediaLibrary: makeHandler('getMediaLibrary'),
    getMediaUsage: makeHandler('getMediaUsage'),
    hardDeleteMedia: makeHandler('hardDeleteMedia'),
  })),
}));

// 다른 도메인 controller 는 이 스펙의 관심사가 아니다.
// (workspace entity 패키지 build 산출물에 의존하지 않도록 생성자만 대체한다)
const stubController = () =>
  jest.fn().mockImplementation(() =>
    new Proxy({} as Record<string, unknown>, {
      get: (_t, prop: string) => makeHandler(String(prop)),
    })
  );

jest.mock('../routes/signage/controllers/playlist.controller.js', () => ({
  SignagePlaylistController: stubController(),
}));
jest.mock('../routes/signage/controllers/schedule.controller.js', () => ({
  SignageScheduleController: stubController(),
}));
jest.mock('../routes/signage/controllers/template.controller.js', () => ({
  SignageTemplateController: stubController(),
}));
jest.mock('../routes/signage/controllers/content.controller.js', () => ({
  SignageContentController: stubController(),
}));
jest.mock('../routes/signage/controllers/global-content.controller.js', () => ({
  SignageGlobalContentController: stubController(),
}));
jest.mock('../routes/signage/controllers/forced-content.controller.js', () => ({
  SignageForcedContentController: stubController(),
}));

jest.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (!req.headers.authorization) {
      return res
        .status(401)
        .json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    req.user = { id: 'u1', roles: ['kpa:store_owner'], isActive: true };
    next();
  },
}));

import { AppDataSource } from '../database/connection.js';
import { createSignageRoutes } from '../routes/signage/signage.routes.js';
import { SignageMediaRepository } from '../routes/signage/repositories/media.repository.js';

const q = AppDataSource.query as unknown as jest.Mock;

const KPA_ORG = '11111111-1111-1111-1111-111111111111';
const VALID_MEDIA_ID = '22222222-2222-2222-2222-222222222222';

const fakeDataSource = {
  query: jest.fn(),
  getRepository: jest.fn(() => ({})),
} as any;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/signage/:serviceKey', createSignageRoutes(fakeDataSource));
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: String(err?.message ?? err) },
    });
  });
  return app;
};

/** store 소유(organization_members) + 서비스 귀속 조회를 모두 통과시킨다. */
const allowStore = () => {
  q.mockReset();
  q.mockImplementation(async () => [{ one: 1 }]);
};

/** 소유/귀속 조회가 빈 결과 → 403 */
const denyStore = () => {
  q.mockReset();
  q.mockImplementation(async () => []);
};

beforeEach(() => {
  entered.length = 0;
});

describe('router stack — static /media/library 가 dynamic /media/:id 보다 먼저 등록된다', () => {
  const routeLayers = () =>
    (createSignageRoutes(fakeDataSource) as any).stack.filter((l: any) => l.route);

  it('GET /media/library 의 등록 index 가 GET /media/:id 보다 작다', () => {
    const l = routeLayers().map((x: any) => ({
      path: x.route.path,
      methods: Object.keys(x.route.methods),
    }));
    const libIdx = l.findIndex(
      (x: any) => x.path === '/media/library' && x.methods.includes('get')
    );
    const detailIdx = l.findIndex(
      (x: any) => x.path === '/media/:id' && x.methods.includes('get')
    );
    expect(libIdx).toBeGreaterThanOrEqual(0);
    expect(detailIdx).toBeGreaterThanOrEqual(0);
    expect(libIdx).toBeLessThan(detailIdx);
  });

  it('/media/library 의 guard chain 이 /media/:id 와 동일하다 (권한 완화 금지)', () => {
    const stack = routeLayers();
    const names = (path: string) =>
      stack
        .find((x: any) => x.route.path === path && x.route.methods.get)
        .route.stack.map((s: any) => s.name)
        .slice(0, -1); // 마지막은 controller handler
    expect(names('/media/library')).toEqual(names('/media/:id'));
    expect(names('/media/library')).toContain('requireSignageOperatorOrStore');
  });
});

describe('dispatch — 실제 진입 handler', () => {
  it('GET /media/library → getMediaLibrary (getMedia 미진입)', async () => {
    allowStore();
    const res = await request(buildApp())
      .get('/api/signage/kpa-society/media/library')
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG);
    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('getMediaLibrary');
    expect(entered).toEqual(['getMediaLibrary']);
    expect(entered).not.toContain('getMedia');
  });

  it('GET /media/:id → getMedia (기존 상세 계약 유지)', async () => {
    allowStore();
    const res = await request(buildApp())
      .get(`/api/signage/kpa-society/media/${VALID_MEDIA_ID}`)
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG);
    expect(res.body.handler).toBe('getMedia');
    expect(res.body.params.id).toBe(VALID_MEDIA_ID);
  });

  it('GET /media → getMediaList · PATCH/DELETE /media/:id 회귀 없음', async () => {
    allowStore();
    const app = buildApp();
    const list = await request(app)
      .get('/api/signage/kpa-society/media')
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG);
    expect(list.body.handler).toBe('getMediaList');
    allowStore();
    const patched = await request(app)
      .patch(`/api/signage/kpa-society/media/${VALID_MEDIA_ID}`)
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG)
      .send({ name: 'x' });
    expect(patched.body.handler).toBe('updateMedia');
    allowStore();
    const deleted = await request(app)
      .delete(`/api/signage/kpa-society/media/${VALID_MEDIA_ID}`)
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG);
    expect(deleted.body.handler).toBe('deleteMedia');
  });

  it('k-cosmetics / glycopharm 및 legacy alias 에서도 library handler 로 간다', async () => {
    for (const svc of ['k-cosmetics', 'glycopharm', 'cosmetics', 'kpa']) {
      allowStore();
      entered.length = 0;
      const res = await request(buildApp())
        .get(`/api/signage/${svc}/media/library`)
        .set('authorization', 'Bearer t')
        .set('x-organization-id', KPA_ORG);
      expect(res.body.handler).toBe('getMediaLibrary');
    }
  });
});

describe('/media/library guard 회귀 방지', () => {
  it('미인증 → 401 AUTH_REQUIRED (handler 미진입)', async () => {
    allowStore();
    const res = await request(buildApp()).get('/api/signage/kpa-society/media/library');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
    expect(entered).toEqual([]);
  });

  it('알 수 없는 serviceKey → 400 INVALID_SERVICE_KEY (handler 미진입)', async () => {
    allowStore();
    const res = await request(buildApp())
      .get('/api/signage/bogus-key/media/library')
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SERVICE_KEY');
    expect(entered).toEqual([]);
  });

  it('organization context 없음 → 403 SIGNAGE_ACCESS_DENIED (handler 미진입)', async () => {
    allowStore();
    const res = await request(buildApp())
      .get('/api/signage/kpa-society/media/library')
      .set('authorization', 'Bearer t');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SIGNAGE_ACCESS_DENIED');
    expect(entered).toEqual([]);
  });

  it('소유하지 않은 org / 타 서비스 org → 403 (handler 미진입)', async () => {
    denyStore();
    const res = await request(buildApp())
      .get('/api/signage/kpa-society/media/library')
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG);
    expect(res.status).toBe(403);
    expect(entered).toEqual([]);
  });
});

describe('repository 경계 필터 — findMediaLibrary 는 serviceKey/organizationId 를 지우지 않는다', () => {
  /** where/andWhere 호출을 기록하는 QueryBuilder 스텁 */
  const recordingRepo = () => {
    const calls: { qb: string; kind: 'where' | 'andWhere'; sql: string }[] = [];
    let n = 0;
    return {
      calls,
      createQueryBuilder: () => {
        const name = `qb${++n}`;
        const qb: any = {
          where: (sql: string) => (calls.push({ qb: name, kind: 'where', sql }), qb),
          andWhere: (sql: string) => (calls.push({ qb: name, kind: 'andWhere', sql }), qb),
          orderBy: () => qb,
          take: () => qb,
          getMany: async () => [],
        };
        return qb;
      },
    };
  };

  it('platform / organization 쿼리 모두 serviceKey 필터가 살아남는다', async () => {
    const rec = recordingRepo();
    const repo = new SignageMediaRepository({ getRepository: () => rec } as any);
    await repo.findMediaLibrary(
      { serviceKey: 'kpa-society', organizationId: KPA_ORG },
      undefined,
      undefined,
      'x'
    );

    const byQb = new Map<string, typeof rec.calls>();
    for (const c of rec.calls) {
      if (!byQb.has(c.qb)) byQb.set(c.qb, []);
      byQb.get(c.qb)!.push(c);
    }
    expect(byQb.size).toBe(2); // platform + organization

    for (const [, cs] of byQb) {
      // where() 는 정확히 한 번, 그리고 그 한 번이 serviceKey 여야 한다.
      const wheres = cs.filter(c => c.kind === 'where');
      expect(wheres).toHaveLength(1);
      expect(wheres[0].sql).toContain('media.serviceKey');
      // 이후 조건이 경계 필터를 덮어쓰지 않는다.
      const sqls = cs.map(c => c.sql).join(' | ');
      expect(sqls).toContain('media.deletedAt IS NULL');
      expect(sqls).toContain('media.status');
    }

    const orgQbCalls = [...byQb.values()].find(cs =>
      cs.some(c => c.sql.includes('media.organizationId = :organizationId'))
    );
    expect(orgQbCalls).toBeDefined();
  });

  it('organizationId 가 없으면 organization 쿼리 자체를 만들지 않는다', async () => {
    const rec = recordingRepo();
    const repo = new SignageMediaRepository({ getRepository: () => rec } as any);
    const out = await repo.findMediaLibrary({ serviceKey: 'kpa-society' });
    expect(out.organization).toEqual([]);
    expect(rec.calls.filter(c => c.sql.includes('media.organizationId = :organizationId'))).toHaveLength(0);
    expect(rec.calls.some(c => c.sql.includes('media.organizationId IS NULL'))).toBe(true);
  });
});
