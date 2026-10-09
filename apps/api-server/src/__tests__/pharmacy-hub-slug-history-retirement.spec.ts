import express from 'express';
import request from 'supertest';

// Use the real helper and repositories so history provenance cannot be replaced by a mocked destination key.
jest.mock('@o4o/platform-core/store-identity', () => jest.requireActual('../../../../packages/platform-core/src/store-identity/index.ts'));
jest.mock('@o4o/platform-core/store-policy', () => ({
  StorePolicyService: jest.fn(() => ({ getActivePolicies: jest.fn(async () => []) })),
  PaymentConfigService: jest.fn(),
}));
jest.mock('../middleware/auth.middleware.js', () => ({ authenticate: (_req: any, _res: any, next: any) => next() }));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { error: jest.fn(), warn: jest.fn() } }));

import { StoreSlugService } from '@o4o/platform-core/store-identity';
import { createStorePublicTabletRoutes } from '../routes/platform/store-public/store-public-tablet.handler.js';
import { createStorePolicyRoutes } from '../routes/platform/store-policy.routes.js';

let sourceServiceKey: string;
let targetServiceKey: string;
let activeRetiredSlug: boolean;
let slugRepo: any;
let save: jest.Mock;
let query: jest.Mock;

function makeDataSource(): any {
  slugRepo = { findOne: jest.fn(async ({ where }: any) => {
    if (where.storeId) return { slug: 'current-store', serviceKey: targetServiceKey, isActive: true };
    return activeRetiredSlug ? { storeId: 'org', serviceKey: 'pharmacy-hub', isActive: true } : null;
  }) };
  const historyRepo = { findOne: jest.fn(async () => ({ storeId: 'org', serviceKey: sourceServiceKey, oldSlug: 'old-store' })) };
  save = jest.fn(async (row: any) => row);
  query = jest.fn(async () => []);
  return { query, getRepository: (entity: any) => {
    if (entity.name === 'PlatformStoreSlug') return slugRepo;
    if (entity.name === 'PlatformStoreSlugHistory') return historyRepo;
    return { findOne: jest.fn(async () => ({ id: 'org', isActive: true })), create: (row: any) => row, save };
  } };
}

function makeApp() {
  const app = express();
  app.use(express.json());
  const dataSource = makeDataSource();
  app.use('/api/v1/stores', createStorePublicTabletRoutes({ dataSource }));
  app.use('/api/v1/stores', createStorePolicyRoutes(dataSource));
  return app;
}

beforeEach(() => {
  sourceServiceKey = 'pharmacy-hub';
  targetServiceKey = 'kpa';
  activeRetiredSlug = false;
});

it('the real helper keeps PH history provenance even when the current store address belongs to KPA', async () => {
  const service = new StoreSlugService(makeDataSource());
  expect(await service.findOldSlugRedirect('old-store')).toEqual({
    newSlug: 'current-store', serviceKey: 'kpa', sourceServiceKey: 'pharmacy-hub',
  });
});

it.each(['/old-store/tablet/interest', '/old-store/policies', '/resolve/old-store'])('old PH history never exposes a current-service redirect through %s', async path => {
  const app = makeApp();
  const res = path.endsWith('/interest')
    ? await request(app).post(`/api/v1/stores${path}`).send({ productName: 'Old content' })
    : await request(app).get(`/api/v1/stores${path}`);
  expect(res.status).toBe(404);
  expect(res.headers.location).toBeUndefined();
  expect(save).not.toHaveBeenCalled();
});

it.each(['/old-store/policies', '/resolve/old-store'])('an active PH address is unavailable through %s', async path => {
  activeRetiredSlug = true;
  const res = await request(makeApp()).get(`/api/v1/stores${path}`);
  expect(res.status).toBe(404);
  expect(save).not.toHaveBeenCalled();
});

it('current-service history redirects still work in the tablet, policy and slug resolvers', async () => {
  sourceServiceKey = 'kpa';
  const app = makeApp();
  const tablet = await request(app).post('/api/v1/stores/old-store/tablet/interest').send({ productName: 'Current content' });
  expect(tablet.status).toBe(301);
  expect(tablet.headers.location).toBe('/api/v1/stores/current-store/tablet/interest');
  const policies = await request(app).get('/api/v1/stores/old-store/policies');
  expect(policies.status).toBe(301);
  expect(policies.headers.location).toBe('/api/v1/stores/current-store/policies');
  const resolve = await request(app).get('/api/v1/stores/resolve/old-store');
  expect(resolve.status).toBe(301);
  expect(resolve.body.data).toMatchObject({ newSlug: 'current-store', serviceKey: 'kpa' });
  expect(save).not.toHaveBeenCalled();
});

it('current history cannot redirect to a retired destination', async () => {
  sourceServiceKey = 'kpa';
  targetServiceKey = 'pharmacy-hub';
  const res = await request(makeApp()).get('/api/v1/stores/resolve/old-store');
  expect(res.status).toBe(404);
});
