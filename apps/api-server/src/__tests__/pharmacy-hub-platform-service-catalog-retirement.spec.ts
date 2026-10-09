import express from 'express';
import request from 'supertest';

jest.mock('../common/middleware/auth.middleware.js', () => ({
  optionalAuth: (req: any, _res: any, next: any) => {
    if (req.headers['x-test-user']) req.user = { id: 'user-1' };
    next();
  },
}));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { error: jest.fn() } }));

import { createPlatformServicesRoutes } from '../routes/platform-services/platform-services.routes.js';
import { PlatformServiceCatalogService } from '../services/platform-service-catalog.service.js';

const ph = { code: 'pharmacy-hub', status: 'active', entryUrl: 'https://pharmacyhub.co.kr' };
const current = { code: 'neture', status: 'active', entryUrl: 'https://neture.co.kr' };
let find: jest.Mock;
let save: jest.Mock;
let query: jest.Mock;
let ds: any;

beforeEach(() => {
  find = jest.fn(async () => [ph, current]);
  save = jest.fn();
  query = jest.fn(async () => [
    { service_key: 'pharmacy-hub', status: 'active' },
    { service_key: 'neture', status: 'pending' },
  ]);
  ds = { getRepository: () => ({ find, save }), query };
});

it.each([false, true])('public catalog hides active PH DB rows (authenticated=%s)', async authenticated => {
  const app = express();
  app.use('/api/v1/platform-services', createPlatformServicesRoutes(ds));
  const req = request(app).get('/api/v1/platform-services');
  if (authenticated) req.set('X-Test-User', 'user-1');
  const res = await req;
  expect(res.status).toBe(200);
  expect(res.body.data).toEqual([expect.objectContaining({ code: 'neture' })]);
  expect(res.body.data[0].enrollmentStatus).toBe(authenticated ? 'applied' : undefined);
  expect(save).not.toHaveBeenCalled();
  expect(ph.status).toBe('active');
  expect(query).toHaveBeenCalledTimes(authenticated ? 1 : 0);
});

it('PH-only DB catalog returns an empty public list without changing the ledger', async () => {
  find.mockResolvedValue([ph]);
  const catalog = new PlatformServiceCatalogService(ds);
  expect(await catalog.listVisibleServicesForUser('user-1')).toEqual([]);
  expect(save).not.toHaveBeenCalled();
  expect(ph.entryUrl).toBe('https://pharmacyhub.co.kr');
});

it('admin ledger reads still return the historical PH catalog row', async () => {
  const qb: any = {};
  qb.orderBy = jest.fn(() => qb);
  qb.addOrderBy = jest.fn(() => qb);
  qb.getMany = jest.fn(async () => [ph, current]);
  ds.getRepository = () => ({ createQueryBuilder: () => qb, save });
  expect(await new PlatformServiceCatalogService(ds).listServices()).toEqual([ph, current]);
  expect(save).not.toHaveBeenCalled();
});
