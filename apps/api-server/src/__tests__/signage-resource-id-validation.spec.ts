/**
 * WO-O4O-SIGNAGE-RESOURCE-ID-VALIDATION-AND-INVALID-UUID-NORMALIZATION-V1
 *
 * 결함: Signage 의 `:id` route 에 UUID 가 아닌 값이 들어오면 그대로 DB 로 내려가
 *       Postgres `invalid input syntax for type uuid` → **500 INTERNAL_ERROR** 가 났다.
 *
 * 계약 고정:
 *  1) 형식 오류 → **400 `INVALID_ID`** (DB 도달 전 차단 · handler 미진입)
 *  2) 형식 정상 + 없음 → 기존 404 (handler 진입 후 판정 — 여기서는 handler 진입으로 고정)
 *  3) 형식 정상 + 존재 → 기존 정상 동작
 *  4) 인증 / serviceKey / 권한 우선순위는 id validation 보다 앞선다
 *  5) static route(`/media/library`, `/schedules/calendar`) 는 validator 에 잡히지 않는다
 *  6) `:source` 는 UUID 가 아니다 — validator 를 적용하지 않는다
 *
 * DB 는 붙이지 않는다. controller 는 stub 으로 대체해 "handler 진입 여부"로 판정한다.
 */

import express from 'express';
import request from 'supertest';

jest.mock('../database/connection.js', () => ({
  AppDataSource: { query: jest.fn() },
}));

jest.mock(
  '@o4o-apps/digital-signage-core/entities',
  () => new Proxy({}, { get: () => class {} }),
  { virtual: true }
);

const entered: string[] = [];
const makeHandler = (name: string) => (req: any, res: any) => {
  entered.push(name);
  res.status(200).json({ handler: name, params: req.params });
};

const stubController = () =>
  jest.fn().mockImplementation(
    () =>
      new Proxy({} as Record<string, unknown>, {
        get: (_t, prop: string) => makeHandler(String(prop)),
      })
  );

jest.mock('../routes/signage/controllers/media.controller.js', () => ({
  SignageMediaController: stubController(),
}));
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
    // operator + store_owner → operator / store / community guard 를 모두 통과한다.
    req.user = { id: 'u1', roles: ['kpa:operator', 'kpa:store_owner'], isActive: true };
    next();
  },
}));

import { AppDataSource } from '../database/connection.js';
import { createSignageRoutes } from '../routes/signage/signage.routes.js';
import { createSignagePublicRoutes } from '../routes/signage/signage-public.routes.js';

const q = AppDataSource.query as unknown as jest.Mock;

const KPA_ORG = '11111111-1111-1111-1111-111111111111';
const VALID_UUID = '22222222-2222-2222-2222-222222222222';
const INVALID_IDS = ['not-a-uuid', '123', 'null', 'undefined', '00000000-0000-0000-0000-00000000000'];

const fakeDataSource = { query: jest.fn(), getRepository: jest.fn(() => ({})) } as any;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/signage/:serviceKey/public', createSignagePublicRoutes(fakeDataSource));
  app.use('/api/signage/:serviceKey', createSignageRoutes(fakeDataSource));
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: String(err?.message ?? err) },
    });
  });
  return app;
};

/** 소유(organization_members) + 서비스 귀속 조회를 통과시킨다. */
const allowStore = () => {
  q.mockReset();
  q.mockImplementation(async () => [{ one: 1 }]);
};
const denyStore = () => {
  q.mockReset();
  q.mockImplementation(async () => []);
};

const authed = (r: request.Test) =>
  r.set('authorization', 'Bearer t').set('x-organization-id', KPA_ORG);

/** router stack 에서 (method, path) 목록을 뽑는다. */
const routeList = (router: any): { method: string; path: string }[] =>
  router.stack
    .filter((l: any) => l.route)
    .flatMap((l: any) =>
      Object.keys(l.route.methods).map((m: string) => ({ method: m, path: l.route.path }))
    );

/** UUID parameter 를 갖는 route 만 (`:source` 는 UUID 가 아니다) */
const NON_UUID_PARAMS = new Set(['source', 'serviceKey']);
const paramNames = (path: string): string[] =>
  (path.match(/:(\w+)/g) ?? []).map(s => s.slice(1));
const uuidParamRoutes = (router: any) =>
  routeList(router).filter(r => paramNames(r.path).some(n => !NON_UUID_PARAMS.has(n)));

const fill = (path: string, value: string) => path.replace(/:(\w+)/g, value);

beforeEach(() => {
  entered.length = 0;
});

describe('census — UUID parameter route 전수 (미조사 0)', () => {
  it('authenticated router: UUID parameter route 39개가 모두 validator 를 가진다', () => {
    const router: any = createSignageRoutes(fakeDataSource);
    const targets = uuidParamRoutes(router);
    expect(targets.length).toBe(39);

    const layers = router.stack.filter((l: any) => l.route);
    for (const t of targets) {
      const layer = layers.find(
        (l: any) => l.route.path === t.path && l.route.methods[t.method]
      );
      const names = layer.route.stack.map((s: any) => s.name);
      expect(names).toContain('validateUuidParams');
    }
  });

  it('public router: /media/:id · /playlists/:id 가 validator 를 가진다', () => {
    const router: any = createSignagePublicRoutes(fakeDataSource);
    const targets = uuidParamRoutes(router);
    expect(targets.map(t => `${t.method.toUpperCase()} ${t.path}`).sort()).toEqual([
      'GET /media/:id',
      'GET /playlists/:id',
    ]);
    for (const l of router.stack.filter((x: any) => x.route && x.route.path.includes(':id'))) {
      expect(l.route.stack.map((s: any) => s.name)).toContain('validateUuidParams');
    }
  });

  it('validator 는 guard 뒤 · handler 앞에 위치한다 (권한 우선순위 유지)', () => {
    const router: any = createSignageRoutes(fakeDataSource);
    for (const l of router.stack.filter((x: any) => x.route)) {
      const names = l.route.stack.map((s: any) => s.name);
      const vi = names.indexOf('validateUuidParams');
      if (vi < 0) continue;
      expect(vi).toBeGreaterThan(0); // guard 가 앞에 있다
      expect(vi).toBeLessThan(names.length - 1); // handler 가 뒤에 있다
    }
  });
});

describe('invalid UUID → 400 INVALID_ID (handler 미진입)', () => {
  const targets = uuidParamRoutes(createSignageRoutes(fakeDataSource));

  it.each(targets.map(t => [`${t.method.toUpperCase()} ${t.path}`, t] as const))(
    '%s',
    async (_label, t: any) => {
      allowStore();
      const url = `/api/signage/kpa-society${fill(t.path, 'not-a-uuid')}`;
      const res = await authed((request(buildApp()) as any)[t.method](url)).send({});
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
      expect(res.body.success).toBe(false);
      expect(entered).toEqual([]);
    }
  );

  it.each(INVALID_IDS)('여러 형태의 잘못된 id (%s) 도 400 이다', async bad => {
    allowStore();
    const res = await authed(
      request(buildApp()).get(`/api/signage/kpa-society/media/${encodeURIComponent(bad)}`)
    );
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_ID');
    expect(entered).toEqual([]);
  });

  it('write endpoint (PATCH/DELETE) 도 동일하게 400 이다 (§12)', async () => {
    const cases: [string, string][] = [
      ['patch', '/media/not-a-uuid'],
      ['delete', '/media/not-a-uuid'],
      ['patch', '/schedules/not-a-uuid'],
      ['delete', '/schedules/not-a-uuid'],
      ['patch', '/playlists/not-a-uuid'],
      ['delete', '/playlists/not-a-uuid'],
      ['delete', '/hq/media/not-a-uuid'],
      ['delete', '/community/media/not-a-uuid'],
    ];
    for (const [method, path] of cases) {
      allowStore();
      entered.length = 0;
      const res = await authed(
        (request(buildApp()) as any)[method](`/api/signage/kpa-society${path}`)
      ).send({ name: 'x' });
      expect([method, path, res.status]).toEqual([method, path, 400]);
      expect(res.body.code).toBe('INVALID_ID');
      expect(entered).toEqual([]);
    }
  });

  it('복합 parameter route 는 두 번째 parameter 만 잘못돼도 400 이다', async () => {
    allowStore();
    const res = await authed(
      request(buildApp()).patch(
        `/api/signage/kpa-society/playlists/${VALID_UUID}/items/not-a-uuid`
      )
    ).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid itemId');
    expect(entered).toEqual([]);
  });

  it('public route 도 400 이며 DB 를 호출하지 않는다', async () => {
    fakeDataSource.query.mockClear();
    for (const path of ['/media/not-a-uuid', '/playlists/not-a-uuid']) {
      const res = await request(buildApp()).get(`/api/signage/kpa-society/public${path}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
    }
    expect(fakeDataSource.query).not.toHaveBeenCalled();
    expect(entered).toEqual([]);
  });
});

describe('valid UUID → 기존 동작 유지 (handler 진입)', () => {
  const targets = uuidParamRoutes(createSignageRoutes(fakeDataSource));

  it.each(targets.map(t => [`${t.method.toUpperCase()} ${t.path}`, t] as const))(
    '%s — handler 로 그대로 전달',
    async (_label, t: any) => {
      allowStore();
      const url = `/api/signage/kpa-society${fill(t.path, VALID_UUID)}`;
      const res = await authed((request(buildApp()) as any)[t.method](url)).send({});
      expect(res.status).toBe(200);
      expect(entered).toHaveLength(1);
      for (const name of paramNames(t.path)) {
        if (NON_UUID_PARAMS.has(name)) continue;
        expect(res.body.params[name]).toBe(VALID_UUID);
      }
    }
  );

  it('대문자 UUID 도 통과한다', async () => {
    allowStore();
    const res = await authed(
      request(buildApp()).get(`/api/signage/kpa-society/media/${VALID_UUID.toUpperCase()}`)
    );
    expect(res.status).toBe(200);
    expect(entered).toHaveLength(1);
  });
});

describe('static route 회귀 방지 (§9)', () => {
  it('/media/library 는 validator 에 잡히지 않는다', async () => {
    allowStore();
    const res = await authed(
      request(buildApp()).get('/api/signage/kpa-society/media/library')
    );
    expect(res.status).toBe(200);
    expect(entered).toEqual(['getMediaLibrary']);
  });

  it('/schedules/calendar 는 validator 에 잡히지 않는다', async () => {
    allowStore();
    const res = await authed(
      request(buildApp()).get('/api/signage/kpa-society/schedules/calendar')
    );
    expect(res.status).toBe(200);
    expect(entered).toEqual(['getScheduleCalendar']);
  });

  it('/templates/preview 같은 static POST 도 정상', async () => {
    allowStore();
    const preview = await authed(
      request(buildApp()).post('/api/signage/kpa-society/templates/preview')
    ).send({});
    expect(preview.status).toBe(200);
    expect(entered).toEqual(['previewTemplate']);
  });
});

describe(':source 는 UUID 가 아니다 (§5) — validator 미적용', () => {
  it('/global/media/hq → handler 진입', async () => {
    allowStore();
    const res = await authed(
      request(buildApp()).get('/api/signage/kpa-society/global/media/hq')
    );
    expect(res.status).toBe(200);
    expect(entered).toEqual(['getGlobalMediaBySource']);
  });

  it('/global/playlists/bogus → 400 INVALID_ID 가 아니라 handler 가 판정한다', async () => {
    allowStore();
    const res = await authed(
      request(buildApp()).get('/api/signage/kpa-society/global/playlists/bogus')
    );
    expect(res.body.code).not.toBe('INVALID_ID');
    expect(entered).toEqual(['getGlobalPlaylistsBySource']);
  });
});

describe('우선순위 — 인증 · serviceKey · 권한이 id validation 보다 앞선다 (§10)', () => {
  it('미인증 + invalid id → 401 AUTH_REQUIRED', async () => {
    allowStore();
    const res = await request(buildApp()).get('/api/signage/kpa-society/media/not-a-uuid');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
    expect(entered).toEqual([]);
  });

  it('invalid serviceKey + invalid id → 400 INVALID_SERVICE_KEY', async () => {
    allowStore();
    const res = await authed(
      request(buildApp()).get('/api/signage/bogus-key/media/not-a-uuid')
    );
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SERVICE_KEY');
    expect(entered).toEqual([]);
  });

  it('타 서비스 org / 미소유 org + invalid id → 403 (INVALID_ID 아님)', async () => {
    denyStore();
    const res = await authed(
      request(buildApp()).patch('/api/signage/kpa-society/media/not-a-uuid')
    ).send({ name: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.code).not.toBe('INVALID_ID');
    expect(entered).toEqual([]);
  });

  it('public route 는 serviceKey 검증이 먼저다', async () => {
    const res = await request(buildApp()).get(
      '/api/signage/bogus-key/public/media/not-a-uuid'
    );
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SERVICE_KEY');
  });
});
