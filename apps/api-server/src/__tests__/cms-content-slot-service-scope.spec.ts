/**
 * WO-O4O-CMS-READ-VISIBILITY-AND-SERVICE-SCOPE-CONTRACT-CLOSURE-V1
 *
 * 공개 slot 조회(`GET /api/v1/cms/slots/:slotKey`)도 `/cms/contents` 와
 * **같은 read 경계**(serviceKey)로 닫힌다 (CHECK §8 횡전개).
 *   - serviceKey 없음 → 400 SERVICE_KEY_REQUIRED (PLATFORM_ADMIN 역할 제외)
 *   - kpa / kpa-society 는 같은 alias 집합
 */
import express from 'express';
import request from 'supertest';

jest.mock('../middleware/auth.middleware.js', () => ({
  optionalAuth: (req: any, _res: any, next: any) => {
    if (req.headers['x-test-admin'] === '1')
      req.user = { id: 'admin-1', roles: ['platform:super_admin'] };
    next();
  },
  requireAuth: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { hasAnyRole: jest.fn(async () => false) },
}));

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock(
  '@o4o-apps/cms-core',
  () => ({ CmsContent: class CmsContent {}, CmsContentSlot: class CmsContentSlot {} }),
  { virtual: true },
);

import { createCmsContentSlotRoutes } from '../routes/cms-content/cms-content-slot.handler.js';
import { roleAssignmentService } from '../modules/auth/services/role-assignment.service.js';

const SLOTS = [
  {
    id: 's-1',
    slotKey: 'home-hero',
    serviceKey: 'kpa-society',
    isActive: true,
    sortOrder: 0,
    content: { id: 'c-1', title: 'KPA hero', status: 'published' },
  },
  {
    id: 's-2',
    slotKey: 'home-hero',
    serviceKey: 'pharmacy-hub',
    isActive: true,
    sortOrder: 0,
    content: { id: 'c-2', title: 'PH hero', status: 'published' },
  },
];

let lastWhere: any = null;

function matchServiceKey(row: any, where: any): boolean {
  const sk = where?.serviceKey;
  if (sk === undefined) return true;
  const values: string[] = sk?._value ?? [sk];
  return values.includes(row.serviceKey);
}

function makeApp() {
  lastWhere = null;
  const dataSource: any = {
    getRepository: () => ({
      find: jest.fn(async ({ where }: any) => {
        lastWhere = where;
        return SLOTS.filter((s) => s.slotKey === where.slotKey && matchServiceKey(s, where));
      }),
    }),
  };
  const app = express();
  app.use('/cms', createCmsContentSlotRoutes({ dataSource }));
  return app;
}

describe('공개 slot 조회의 serviceKey 경계', () => {
  it('serviceKey 없으면 400 SERVICE_KEY_REQUIRED (DB 까지 가지 않는다)', async () => {
    const res = await request(makeApp()).get('/cms/slots/home-hero');
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('SERVICE_KEY_REQUIRED');
    expect(lastWhere).toBeNull();
  });

  it('serviceKey=pharmacy-hub 는 타 서비스 slot 을 반환하지 않는다', async () => {
    const res = await request(makeApp()).get('/cms/slots/home-hero?serviceKey=pharmacy-hub');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].content.id).toBe('c-2');
    expect(res.body.meta.crossService).toBe(false);
  });

  it('serviceKey=kpa 는 kpa-society alias 를 포함한다', async () => {
    const res = await request(makeApp()).get('/cms/slots/home-hero?serviceKey=kpa');
    expect(res.status).toBe(200);
    expect(res.body.meta.serviceKeys).toEqual(['kpa-society', 'kpa']);
    expect(res.body.data[0].content.id).toBe('c-1');
  });

  it('platform:super_admin 은 serviceKey 없이 cross-service 조회 가능', async () => {
    const res = await request(makeApp())
      .get('/cms/slots/home-hero')
      .set('x-test-admin', '1');
    expect(res.status).toBe(200);
    expect(res.body.meta.crossService).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });
});

/** Platform scope changes must validate existing content, not only replacements. */
describe('slot updates preserve content/service boundaries', () => {
  function updateApp(contentService: string | null = 'kpa-society') {
    jest.mocked(roleAssignmentService.hasAnyRole).mockResolvedValue(true);
    const slot = { id: 'slot-a', slotKey: 'home', contentId: 'content-a', serviceKey: 'kpa-society', isLocked: false };
    const save = jest.fn(async (value: unknown) => value);
    const dataSource: any = { getRepository: (entity: { name: string }) => entity.name === 'CmsContentSlot'
      ? { findOne: jest.fn(async () => ({ ...slot })), save }
      : { findOne: jest.fn(async () => ({ id: 'content-a', serviceKey: contentService })) } };
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => { req.user = { id: 'admin-a', roles: ['platform:super_admin'] }; next(); });
    app.use('/cms', createCmsContentSlotRoutes({ dataSource }));
    return { app, save };
  }

  it.each([{ serviceKey: 'neture' }, { serviceKey: 'neture', contentId: 'content-a' }])(
    'rejects moving existing KPA content to a Neture slot: %j', async body => {
      const { app, save } = updateApp();
      const response = await request(app).put('/cms/slots/slot-a').send(body);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('SERVICE_SCOPE_MISMATCH');
      expect(save).not.toHaveBeenCalled();
    },
  );

  it('rejects a stored retired content reference even when the content ID is resent', async () => {
    const { app, save } = updateApp('pharmacy-hub');
    const response = await request(app).put('/cms/slots/slot-a').send({ contentId: 'content-a' });
    expect(response.status).toBe(410);
    expect(save).not.toHaveBeenCalled();
  });

  it('preserves aliases and permits moving platform content to a service slot', async () => {
    const alias = updateApp();
    expect((await request(alias.app).put('/cms/slots/slot-a').send({ serviceKey: 'kpa' })).status).toBe(200);
    const global = updateApp(null);
    expect((await request(global.app).put('/cms/slots/slot-a').send({ serviceKey: 'neture' })).status).toBe(200);
    expect(global.save).toHaveBeenCalledWith(expect.objectContaining({ serviceKey: 'neture', contentId: 'content-a' }));
  });
});
