import express from 'express';
import request from 'supertest';

jest.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.user = { id: 'admin', roles: ['platform:super_admin'] }; next(); },
  optionalAuth: (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: { hasAnyRole: jest.fn(async () => true) } }));
jest.mock('@o4o-apps/cms-core', () => ({ CmsContent: class CmsContent {}, CmsContentSlot: class CmsContentSlot {} }), { virtual: true });
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn() } }));

import { createCmsContentSlotRoutes } from '../routes/cms-content/cms-content-slot.handler.js';

let content: any;
let contentRows: any[];
let slotRepo: any;

function makeApp() {
  const app = express();
  app.use(express.json());
  slotRepo = {
    create: jest.fn(row => row), save: jest.fn(async row => Array.isArray(row) ? row.map(item => ({ ...item, id: 'slot' })) : ({ ...row, id: 'slot' })),
    find: jest.fn(async () => [{ id: 'slot', contentId: content.id, serviceKey: 'kpa-society' }]),
    delete: jest.fn(), findOne: jest.fn(async () => ({ id: 'slot', serviceKey: 'kpa-society', contentId: 'current-content', isLocked: false })),
  };
  const contentRepo = { findOne: jest.fn(async () => content), find: jest.fn(async () => contentRows) };
  app.use('/cms', createCmsContentSlotRoutes({ dataSource: { getRepository: (entity: any) => entity.name === 'CmsContent' ? contentRepo : slotRepo } as any }));
  return app;
}

beforeEach(() => {
  content = { id: 'old-ph', serviceKey: 'pharmacy-hub' };
  contentRows = [content];
});

it.each(['kpa-society', undefined])('admin cannot expose PH content in a current or global slot (%s)', async serviceKey => {
  const res = await request(makeApp()).post('/cms/slots').send({ slotKey: 'hero', contentId: content.id, serviceKey });
  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe('SERVICE_RETIRED');
  expect(slotRepo.create).not.toHaveBeenCalled();
  expect(slotRepo.save).not.toHaveBeenCalled();
});

it.each(['kpa-society', undefined])('mixed bulk assignment containing PH fails before clearing or saving slots (%s)', async serviceKey => {
  contentRows.push({ id: 'current-content', serviceKey: 'kpa-society' });
  const res = await request(makeApp()).put('/cms/slots/hero/contents').send({
    serviceKey, contents: contentRows.map(row => ({ contentId: row.id })),
  });
  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe('SERVICE_RETIRED');
  expect(slotRepo.delete).not.toHaveBeenCalled();
  expect(slotRepo.save).not.toHaveBeenCalled();
});

it('a current slot cannot replace its content with a PH original', async () => {
  const res = await request(makeApp()).put('/cms/slots/slot').send({ contentId: content.id });
  expect(res.status).toBe(403);
  expect(slotRepo.save).not.toHaveBeenCalled();
});

it('existing current slots cannot reactivate a PH original without changing contentId', async () => {
  const res = await request(makeApp()).put('/cms/slots/slot').send({ isActive: true });
  expect(res.status).toBe(403);
  expect(slotRepo.save).not.toHaveBeenCalled();
});

it('already copied current-service content retains its PH provenance and remains usable', async () => {
  content = { id: 'copied-content', serviceKey: 'kpa-society', metadata: { sourceServiceKey: 'pharmacy-hub' } };
  contentRows = [content];
  const app = makeApp();
  expect((await request(app).post('/cms/slots').send({ slotKey: 'hero', contentId: content.id, serviceKey: 'kpa' })).status).toBe(201);
  expect((await request(app).put('/cms/slots/hero/contents').send({ serviceKey: 'kpa-society', contents: [{ contentId: content.id }] })).status).toBe(200);
  expect(slotRepo.save).toHaveBeenCalled();
});

it('scoped current content cannot be assigned to another service, and global current content remains usable', async () => {
  content = { id: 'current', serviceKey: 'neture' };
  const app = makeApp();
  expect((await request(app).post('/cms/slots').send({ slotKey: 'hero', contentId: content.id, serviceKey: 'kpa' })).status).toBe(403);
  expect(slotRepo.save).not.toHaveBeenCalled();
  content.serviceKey = null;
  expect((await request(app).post('/cms/slots').send({ slotKey: 'hero', contentId: content.id, serviceKey: 'kpa' })).status).toBe(201);
});
