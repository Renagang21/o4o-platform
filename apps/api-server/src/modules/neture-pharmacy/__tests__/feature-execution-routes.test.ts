import express from 'express';
import request from 'supertest';
import { createStoreTabletRoutes } from '../../../routes/platform/store-tablet.routes.js';
import { createStorePublicTabletRoutes } from '../../../routes/platform/store-public/store-public-tablet.handler.js';
import { createMultilingualProductContentController } from '../../../routes/o4o-store/controllers/multilingual-product-content.controller.js';

jest.mock('../../../utils/store-workspace-access.js', () => ({
  createRequireStoreWorkspaceAccess: () => (req: any, _res: any, next: any) => { req.organizationId = 'store'; next(); },
}));
jest.mock('../../../routes/platform/store-public/store-public-utils.js', () => ({
  ...jest.requireActual('../../../routes/platform/store-public/store-public-utils.js'),
  resolvePublicStore: jest.fn(async () => ({ storeId: 'store', serviceKey: 'kpa', pharmacy: {} })),
}));

function setup() {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('SELECT status FROM neture_pharmacy_memberships')) return [{ status: 'active' }];
    if (sql.includes('AS "ownerUserId"')) return [{ ownerUserId: 'owner' }];
    return [];
  });
  const db: any = { query, getRepository: () => ({}) };
  const app = express();
  app.use(express.json());
  app.use('/tablet', createStoreTabletRoutes(db, { resolveOrganizationId: async () => 'store' }));
  app.use('/public', createStorePublicTabletRoutes({ dataSource: db }));
  app.use('/mlc', createMultilingualProductContentController(db, (_req, _res, next) => next(), 'kpa'));
  return { app, query };
}
it('blocks tablet management and public runtime without executing product or location actions', async () => {
  const { app, query } = setup();
  expect((await request(app).get('/tablet/tablets')).status).toBe(403);
  expect((await request(app).get('/public/slug/tablet/products')).status).toBe(403);
  expect(query.mock.calls.some(([sql]) => /INSERT|UPDATE|DELETE|FROM store_tablets/.test(sql))).toBe(false);
});
it('blocks multilingual acquisition and edits but retains existing copy reads and public lookup', async () => {
  const { app, query } = setup();
  const base = '/mlc/pharmacy/multilingual-product-contents';
  expect((await request(app).get(`${base}/hub`)).status).toBe(403);
  expect((await request(app).post(`${base}/import`).send({})).status).toBe(403);
  expect((await request(app).patch(`${base}/group`).send({ title: 'change' })).status).toBe(403);
  query.mockClear();
  expect((await request(app).get(base)).status).toBe(200);
  expect((await request(app).get('/mlc/public/multilingual-product-contents/issued-key')).status).toBe(404);
  expect(query.mock.calls.some(([sql]) => sql.includes('member_paid_service_entitlements'))).toBe(false);
  expect(query.mock.calls.some(([sql]) => /INSERT|UPDATE|DELETE/.test(sql))).toBe(false);
});
