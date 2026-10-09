import express from 'express';
import request from 'supertest';

const mockSlug = jest.fn();
const mockRedirect = jest.fn();
jest.mock('@o4o/platform-core/store-identity', () => ({
  StoreSlugService: jest.fn(() => ({ findBySlug: mockSlug, findOldSlugRedirect: mockRedirect })),
  StorePolicyService: jest.fn(() => ({ getActivePolicies: jest.fn(async () => []) })),
}));
jest.mock('../services/qr-print.service.js', () => ({}));
jest.mock('../services/qr-flyer.service.js', () => ({}));
jest.mock('../utils/store-owner.utils.js', () => ({ createRequireStoreOwner: () => (_req: any, _res: any, next: any) => next() }));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { createStorePublicTabletRoutes } from '../routes/platform/store-public/store-public-tablet.handler.js';
import { createStoreQrLandingController } from '../routes/o4o-store/controllers/store-qr-landing.controller.js';
import { createStorePolicyRoutes } from '../routes/platform/store-policy.routes.js';

const ORG = '11111111-1111-4111-8111-111111111111';
let query: jest.Mock;
let save: jest.Mock;
let create: jest.Mock;
let storeRows: Array<{ slug: string; service_key: string; is_active: boolean }>;
let phEnrollmentStatus: string | null;
let approvedCurrentStore: boolean;

function makeApp() {
  const app = express();
  app.use(express.json());
  const repo = { findOne: jest.fn(async () => ({ id: ORG, isActive: true })), create, save };
  const ds: any = { query, getRepository: () => repo };
  app.use('/api/v1/stores', createStorePublicTabletRoutes({ dataSource: ds }));
  app.use('/api/v1/stores', createStorePolicyRoutes(ds));
  app.use('/api/v1/kpa', createStoreQrLandingController(ds, (_req, _res, next) => next(), 'kpa'));
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSlug.mockResolvedValue({ storeId: ORG, serviceKey: 'pharmacy-hub', isActive: true });
  mockRedirect.mockResolvedValue(null);
  storeRows = [{ slug: 'legacy-ph', service_key: 'pharmacy-hub', is_active: true }];
  phEnrollmentStatus = null;
  approvedCurrentStore = false;
  query = jest.fn(async (sql: string) => {
    if (sql.includes('AS retired_store_identity')) return [{
      retired_store_identity: phEnrollmentStatus !== null || storeRows.some(row => row.service_key === 'pharmacy-hub'),
      current_store_identity: approvedCurrentStore,
    }];
    if (sql.includes('FROM store_qr_codes')) return [{ id: 'old-qr', organizationId: ORG, slug: 'old-qr', landingType: 'link', landingTargetId: 'https://example.test', isActive: true }];
    if (sql.includes('FROM platform_store_slugs')) return storeRows;
    return [];
  });
  create = jest.fn(x => x);
  save = jest.fn(async x => ({ ...x, id: 'interest', status: 'pending' }));
});

it.each([true, false])('PH slug (active=%s) cannot create a public interest request or follow a redirect', async isActive => {
  mockSlug.mockResolvedValue({ storeId: ORG, serviceKey: 'pharmacy-hub', isActive });
  const res = await request(makeApp()).post('/api/v1/stores/legacy-ph/tablet/interest').send({ source: 'qr', productName: 'Old content' });
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe('STORE_NOT_FOUND');
  expect(create).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
  expect(mockRedirect).not.toHaveBeenCalled();
});

it('a history redirect to a PH service is not exposed', async () => {
  mockSlug.mockResolvedValue(null);
  mockRedirect.mockResolvedValue({ newSlug: 'legacy-ph', serviceKey: 'pharmacy-hub' });
  const res = await request(makeApp()).post('/api/v1/stores/old-ph/tablet/interest').send({ productName: 'Old content' });
  expect(res.status).toBe(404);
  expect(res.headers.location).toBeUndefined();
  expect(save).not.toHaveBeenCalled();
});

it.each([true, false])('a PH-only organization with active QR and slug active=%s cannot create scan events', async is_active => {
  storeRows = [{ slug: 'legacy-ph', service_key: 'pharmacy-hub', is_active }];
  const res = await request(makeApp()).get('/api/v1/kpa/qr/public/old-qr');
  expect(res.status).toBe(404);
  expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO store_qr_scan_events'))).toBe(false);
});

it('current public Store requests and QR scans remain available when PH history also exists', async () => {
  approvedCurrentStore = true;
  mockSlug.mockResolvedValue({ storeId: ORG, serviceKey: 'kpa', isActive: true });
  storeRows.push({ slug: 'current-store', service_key: 'kpa', is_active: true });
  const app = makeApp();
  const interest = await request(app).post('/api/v1/stores/current-store/tablet/interest').send({ source: 'qr', productName: 'Current content' });
  expect(interest.status).toBe(201);
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ organizationId: ORG }));
  const qr = await request(app).get('/api/v1/kpa/qr/public/old-qr');
  expect(qr.status).toBe(200);
  expect(qr.body.data.storeSlug).toBe('current-store');
  expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO store_qr_scan_events'))).toBe(true);
});

it.each(['active', 'suspended', 'withdrawn'].flatMap(status => [false, true].map(legacyKpaSlug => ({ status, legacyKpaSlug }))))(
  'PH enrollment $status, legacy KPA slug=$legacyKpaSlug cannot expose QR content or record scans without current Store approval',
  async ({ status, legacyKpaSlug }) => {
    phEnrollmentStatus = status;
    storeRows = legacyKpaSlug ? [{ slug: 'legacy-kpa', service_key: 'kpa', is_active: true }] : [];
    const res = await request(makeApp()).get('/api/v1/kpa/qr/public/old-qr');
    expect(res.status).toBe(404);
    expect(res.body.data).toBeUndefined();
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO store_qr_scan_events'))).toBe(false);
  },
);

it('current Store approval keeps its QR usable without a public Store slug, even with PH enrollment history', async () => {
  phEnrollmentStatus = 'withdrawn';
  approvedCurrentStore = true;
  storeRows = [];
  const res = await request(makeApp()).get('/api/v1/kpa/qr/public/old-qr');
  expect(res.status).toBe(200);
  expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO store_qr_scan_events'))).toBe(true);
});

it('a legacy KPA slug does not reopen public interest creation in a PH-only enrollment organization', async () => {
  mockSlug.mockResolvedValue({ storeId: ORG, serviceKey: 'kpa', isActive: true });
  phEnrollmentStatus = 'active';
  storeRows = [{ slug: 'legacy-kpa', service_key: 'kpa', is_active: true }];
  const res = await request(makeApp()).post('/api/v1/stores/legacy-kpa/tablet/interest').send({ source: 'qr', productName: 'Old content' });
  expect(res.status).toBe(404);
  expect(create).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});

it.each(['/api/v1/stores/legacy-kpa/policies', '/api/v1/stores/resolve/legacy-kpa'])(
  'public policy and slug consumers also refuse a PH-only organization behind a legacy KPA slug: %s', async path => {
    mockSlug.mockResolvedValue({ storeId: ORG, serviceKey: 'kpa', isActive: true });
    phEnrollmentStatus = 'active';
    storeRows = [{ slug: 'legacy-kpa', service_key: 'kpa', is_active: true }];
    expect((await request(makeApp()).get(path)).status).toBe(404);
  },
);
