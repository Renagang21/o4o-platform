/**
 * WO-O4O-SIGNAGE-SCHEDULES-CALENDAR-ROUTE-SHADOWING-FIX-V1
 *
 * 결함: `GET /schedules/calendar` 가 먼저 등록된 `GET /schedules/:id` 에 매칭되어
 *       calendar handler 대신 detail handler 가 실행되고 500 (uuid cast) 이 났다.
 *
 * 이 스펙은 **handler 선택 자체**를 고정한다.
 * - router stack 등록 순서 (static > dynamic)
 * - 실제 dispatch 시 진입 handler
 * - calendar route 의 guard chain (401 / 400 / 403) 회귀 방지
 *
 * DB 는 붙이지 않는다 — AppDataSource.query 를 stub 으로 대체한다.
 * requireAuth 는 계약(토큰 없으면 401 AUTH_REQUIRED)만 흉내내는 stub 으로 대체한다.
 * validateServiceKey / requireSignageStore 는 실제 구현을 그대로 사용한다.
 */

import express from 'express';
import request from 'supertest';

jest.mock('../database/connection.js', () => ({
  AppDataSource: { query: jest.fn() },
}));

const entered: string[] = [];
const makeHandler = (name: string) => (req: any, res: any) => {
  entered.push(name);
  res.status(200).json({ handler: name, params: req.params, query: req.query });
};

jest.mock('../routes/signage/controllers/schedule.controller.js', () => ({
  SignageScheduleController: jest.fn().mockImplementation(() => ({
    getSchedules: makeHandler('getSchedules'),
    createSchedule: makeHandler('createSchedule'),
    getSchedule: makeHandler('getSchedule'),
    updateSchedule: makeHandler('updateSchedule'),
    deleteSchedule: makeHandler('deleteSchedule'),
    resolveActiveContent: makeHandler('resolveActiveContent'),
    getScheduleCalendar: makeHandler('getScheduleCalendar'),
    getPresignedUploadUrl: makeHandler('getPresignedUploadUrl'),
  })),
}));

// 다른 도메인 controller 는 이 스펙의 관심사가 아니다.
// (workspace entity 패키지 build 산출물에 의존하지 않도록 생성자만 대체한다)
const stubController = (methods: string[]) =>
  jest.fn().mockImplementation(() => {
    const obj: Record<string, unknown> = {};
    for (const m of methods) obj[m] = makeHandler(m);
    return new Proxy(obj, {
      get: (target, prop: string) => target[prop] ?? makeHandler(String(prop)),
    });
  });

jest.mock('../routes/signage/controllers/playlist.controller.js', () => ({
  SignagePlaylistController: stubController([]),
}));
jest.mock('../routes/signage/controllers/media.controller.js', () => ({
  SignageMediaController: stubController([]),
}));
jest.mock('../routes/signage/controllers/template.controller.js', () => ({
  SignageTemplateController: stubController([]),
}));
jest.mock('../routes/signage/controllers/content.controller.js', () => ({
  SignageContentController: stubController([]),
}));
jest.mock('../routes/signage/controllers/global-content.controller.js', () => ({
  SignageGlobalContentController: stubController([]),
}));
jest.mock('../routes/signage/controllers/forced-content.controller.js', () => ({
  SignageForcedContentController: stubController([]),
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

const q = AppDataSource.query as unknown as jest.Mock;

const KPA_ORG = '11111111-1111-1111-1111-111111111111';
const VALID_SCHEDULE_ID = '22222222-2222-2222-2222-222222222222';

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

/** requireSignageStore 통과: 소유(organization_members) + 서비스 귀속 조회를 모두 통과시킨다. */
const allowStore = () => {
  q.mockReset();
  q.mockImplementation(async () => [{ one: 1 }]);
};

/** requireSignageStore 차단: 소유/귀속 조회가 빈 결과 → 403 */
const denyStore = () => {
  q.mockReset();
  q.mockImplementation(async () => []);
};

beforeEach(() => {
  entered.length = 0;
});

describe('router stack — static /schedules/calendar 가 dynamic /schedules/:id 보다 먼저 등록된다', () => {
  const layers = () =>
    (createSignageRoutes(fakeDataSource) as any).stack
      .filter((l: any) => l.route)
      .map((l: any) => ({ path: l.route.path, methods: Object.keys(l.route.methods) }));

  it('GET /schedules/calendar 의 등록 index 가 GET /schedules/:id 보다 작다', () => {
    const l = layers();
    const calendarIdx = l.findIndex(
      (x: any) => x.path === '/schedules/calendar' && x.methods.includes('get')
    );
    const detailIdx = l.findIndex(
      (x: any) => x.path === '/schedules/:id' && x.methods.includes('get')
    );
    expect(calendarIdx).toBeGreaterThanOrEqual(0);
    expect(detailIdx).toBeGreaterThanOrEqual(0);
    expect(calendarIdx).toBeLessThan(detailIdx);
  });

  it('calendar route 와 detail route 의 guard chain 이 동일하다 (route 이동 시 middleware 누락 금지)', () => {
    const stack = (createSignageRoutes(fakeDataSource) as any).stack.filter((x: any) => x.route);
    const names = (path: string) =>
      stack
        .find((x: any) => x.route.path === path && x.route.methods.get)
        .route.stack.map((s: any) => s.name)
        .slice(0, -1); // 마지막은 controller handler
    expect(names('/schedules/calendar')).toEqual(names('/schedules/:id'));
    expect(names('/schedules/calendar')).toContain('requireSignageStore');
  });
});

describe('dispatch — 실제 진입 handler', () => {
  it('GET /schedules/calendar → getScheduleCalendar (getSchedule 미진입)', async () => {
    allowStore();
    const res = await request(buildApp())
      .get('/api/signage/kpa-society/schedules/calendar?startDate=2026-08-01&endDate=2026-08-31')
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG);
    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('getScheduleCalendar');
    expect(entered).toEqual(['getScheduleCalendar']);
    expect(entered).not.toContain('getSchedule');
  });

  it('query param 없이도 calendar handler 로 간다 (handler 선택은 query 와 무관)', async () => {
    allowStore();
    const res = await request(buildApp())
      .get('/api/signage/kpa-society/schedules/calendar')
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG);
    expect(res.body.handler).toBe('getScheduleCalendar');
  });

  it('GET /schedules/:id → getSchedule (기존 상세 계약 유지)', async () => {
    allowStore();
    const res = await request(buildApp())
      .get(`/api/signage/kpa-society/schedules/${VALID_SCHEDULE_ID}`)
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG);
    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('getSchedule');
    expect(res.body.params.id).toBe(VALID_SCHEDULE_ID);
  });

  it('GET /schedules → getSchedules (목록 회귀 없음)', async () => {
    allowStore();
    const res = await request(buildApp())
      .get('/api/signage/kpa-society/schedules')
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG);
    expect(res.body.handler).toBe('getSchedules');
  });

  it('PATCH/DELETE /schedules/:id 는 calendar 등록의 영향을 받지 않는다', async () => {
    allowStore();
    const app = buildApp();
    const patched = await request(app)
      .patch(`/api/signage/kpa-society/schedules/${VALID_SCHEDULE_ID}`)
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG)
      .send({ name: 'x' });
    expect(patched.body.handler).toBe('updateSchedule');
    allowStore();
    const deleted = await request(app)
      .delete(`/api/signage/kpa-society/schedules/${VALID_SCHEDULE_ID}`)
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG);
    expect(deleted.body.handler).toBe('deleteSchedule');
  });

  it('k-cosmetics / glycopharm 에서도 calendar handler 로 간다', async () => {
    for (const svc of ['k-cosmetics', 'glycopharm']) {
      allowStore();
      entered.length = 0;
      const res = await request(buildApp())
        .get(`/api/signage/${svc}/schedules/calendar`)
        .set('authorization', 'Bearer t')
        .set('x-organization-id', KPA_ORG);
      expect(res.body.handler).toBe('getScheduleCalendar');
    }
  });
});

describe('calendar route guard 회귀 방지', () => {
  it('미인증 → 401 AUTH_REQUIRED (handler 미진입)', async () => {
    allowStore();
    const res = await request(buildApp()).get('/api/signage/kpa-society/schedules/calendar');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
    expect(entered).toEqual([]);
  });

  it('알 수 없는 serviceKey → 400 INVALID_SERVICE_KEY (handler 미진입)', async () => {
    allowStore();
    const res = await request(buildApp())
      .get('/api/signage/bogus-key/schedules/calendar')
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SERVICE_KEY');
    expect(entered).toEqual([]);
  });

  it('organization 헤더 없음 → 400 (handler 미진입)', async () => {
    allowStore();
    const res = await request(buildApp())
      .get('/api/signage/kpa-society/schedules/calendar')
      .set('authorization', 'Bearer t');
    expect(res.status).toBe(400);
    expect(entered).toEqual([]);
  });

  it('타 서비스 org → 403 (handler 미진입)', async () => {
    denyStore();
    const res = await request(buildApp())
      .get('/api/signage/kpa-society/schedules/calendar')
      .set('authorization', 'Bearer t')
      .set('x-organization-id', KPA_ORG);
    expect(res.status).toBe(403);
    expect(entered).toEqual([]);
  });
});
