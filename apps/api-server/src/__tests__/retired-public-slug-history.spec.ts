import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import type { Request, Response } from 'express';

const mockFindBySlug = jest.fn();
const mockFindOldSlugRedirect = jest.fn();
jest.mock('@o4o/platform-core/store-identity', () => ({
  StoreSlugService: class {
    findBySlug = mockFindBySlug;
    findOldSlugRedirect = mockFindOldSlugRedirect;
  },
  normalizeSlug: (value: string) => value.trim().toLowerCase(),
}));
jest.mock('../modules/store-core/entities/organization-store.entity.js', () => ({
  OrganizationStore: class OrganizationStore {},
}));

jest.mock('@o4o/platform-core/store-policy', () => ({ StorePolicyService: class {}, PaymentConfigService: class {} }));
jest.mock('../middleware/auth.middleware.js', () => ({ authenticate: (_req: unknown, _res: unknown, next: () => void) => next() }));
jest.mock('../routes/platform/store-policy.ownership.js', () => ({ isStoreOwner: jest.fn(async () => false) }));

import { createStorePolicyRoutes } from '../routes/platform/store-policy.routes.js';
import { resolvePublicStore } from '../routes/platform/store-public/store-public-utils.js';

function fixture(historyService: string | null, targetService = 'neture') {
  mockFindBySlug.mockResolvedValue(null);
  mockFindOldSlugRedirect.mockResolvedValue({ newSlug: 'current-store', serviceKey: targetService });
  const query = jest.fn(async () => historyService === null ? [] : [{ service_key: historyService }]);
  const res = { status: jest.fn(), json: jest.fn(), redirect: jest.fn() };
  res.status.mockReturnValue(res);
  const req = { originalUrl: '/api/v1/stores/old-store/products?limit=5' } as Request;
  return { dataSource: { query } as unknown as DataSource, query, req, res };
}

it.each(['pharmacy-hub', 'pharmacy-hub-event-offer', ' pharmacy-hub:legacy '])(
  'does not redirect a stored retired old slug (%s) into an active service', async key => {
    const f = fixture(key);
    expect(await resolvePublicStore(f.dataSource, 'old-store', f.req, f.res as unknown as Response)).toBeNull();
    expect(f.res.status).toHaveBeenCalledWith(410);
    expect(f.res.redirect).not.toHaveBeenCalled();
    expect(f.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY changed_at DESC'), ['old-store']);
  },
);

it.each(['neture', 'kpa-society', null])('preserves live/neutral legacy redirects (%s)', async key => {
  const f = fixture(key);
  await resolvePublicStore(f.dataSource, 'old-store', f.req, f.res as unknown as Response);
  expect(f.res.redirect).toHaveBeenCalledWith(301, '/api/v1/stores/current-store/products?limit=5');
});

it('does not redirect into a retired current service', async () => {
  const f = fixture('neture', 'pharmacy-hub');
  await resolvePublicStore(f.dataSource, 'old-store', f.req, f.res as unknown as Response);
  expect(f.res.status).toHaveBeenCalledWith(410);
  expect(f.res.redirect).not.toHaveBeenCalled();
});

// All old-slug consumers must reject a retired history row before redirecting.
it.each(['/old-store/policies', '/resolve/old-store'])(
  'rejects retired history on policy/slug route %s', async path => {
    const f = fixture('pharmacy-hub');
    const app = express();
    app.use(createStorePolicyRoutes(f.dataSource));
    const response = await request(app).get(path);
    expect(response.status).toBe(410);
    expect(response.body.error.code).toBe('SERVICE_RETIRED');
    expect(response.headers.location).toBeUndefined();
  },
);
it.each(['/old-store/policies', '/resolve/old-store'])(
  'preserves active-service history on policy/slug route %s', async path => {
    const f = fixture('neture');
    const app = express();
    app.use(createStorePolicyRoutes(f.dataSource));
    const response = await request(app).get(path);
    expect(response.status).toBe(301);
  },
);
