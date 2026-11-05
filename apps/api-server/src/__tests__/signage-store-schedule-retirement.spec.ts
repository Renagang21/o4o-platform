jest.mock('../utils/store-member-access.js', () => ({ resolveApprovedStoreMemberOrganization: jest.fn(async () => null) }));
jest.mock('../utils/service-membership.js', () => ({ hasActiveServiceMembership: jest.fn(async () => true) }));
jest.mock('../utils/store-owner.utils.js', () => ({ isStoreOwner: jest.fn(async (ds, userId, _service, org) => {
  const rows = await ds.query('SELECT 1 FROM neture_pharmacy_memberships', [userId, org]);
  return { isOwner: !!rows.length, organizationId: rows.length ? org : null, pendingAgreement: null };
}) }));
/** Store schedule retirement: no handlers/writes; authentication stays in place. */

import express from 'express';
import request from 'supertest';

jest.mock('../database/connection.js', () => ({
  AppDataSource: { isInitialized: true, query: jest.fn() },
}));

const entered: string[] = [];
const makeHandler = (name: string) => (req: any, res: any) => {
  entered.push(name);
  res.status(200).json({ handler: name, params: req.params, query: req.query });
};

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

beforeEach(() => {
  entered.length = 0;
});

describe('store schedules are retired', () => {
  it.each([
    ['get', '/schedules'], ['post', '/schedules'], ['get', '/schedules/calendar'],
    ['get', `/schedules/${VALID_SCHEDULE_ID}`], ['patch', `/schedules/${VALID_SCHEDULE_ID}`],
    ['delete', `/schedules/${VALID_SCHEDULE_ID}`], ['get', '/active-content'],
  ])('%s %s has no handler or writes', async (method, path) => {
    allowStore();
    const result = await (request(buildApp()) as any)[method]('/api/signage/kpa-society' + path)
      .set('Authorization', 'Bearer fixture').set('X-Organization-Id', KPA_ORG);
    expect(result.status).toBe(404);
    expect(entered).toEqual([]);
    expect(q).not.toHaveBeenCalled();
  });
  it('preserves authentication for the retired URLs', async () => {
    const result = await request(buildApp()).get('/api/signage/kpa-society/schedules');
    expect(result.status).toBe(401);
  });
});
