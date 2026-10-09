import express from 'express';
import request from 'supertest';

jest.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../modules/policy-acceptance/policy-acceptance.service.js', () => ({
  policyAcceptanceService: { getPendingStoreOwnerAgreementsForUser: jest.fn(async () => []) },
}));
jest.mock('../modules/neture/neture.service.js', () => ({ NetureService: class {} }));
jest.mock('../modules/neture/services/image-storage.service.js', () => ({ ImageStorageService: class {} }));
jest.mock('../modules/neture/guards/drug-access.guard.js', () => ({
  assertDrugActionAllowed: jest.fn(async () => ({ allowed: true })),
}));

import { createStoreLibraryController } from '../routes/o4o-store/controllers/store-library.controller.js';
import { createStoreProductLibraryController } from '../routes/o4o-store/controllers/store-product-library.controller.js';
import {
  findStoreMemberOrganizationCandidates,
  resolveStoreOrganization,
} from '../utils/store-organization.resolver.js';
import { resolveBuyerOrganization } from '../utils/buyer-organization.resolver.js';

const PH = '11111111-1111-4111-8111-111111111111';
const CURRENT = '22222222-2222-4222-8222-222222222222';
const PH_ROW = {
  organization_id: PH, role: 'owner', is_primary: true, joined_at: '2025-01-01',
  retired_store_identity: true, current_store_identity: false,
};
const CURRENT_ROW = {
  organization_id: CURRENT, role: 'owner', is_primary: false, joined_at: '2026-01-01',
  retired_store_identity: false, current_store_identity: true,
};

function setup(organizations: Record<string, unknown>[]) {
  const assets = {
    create: jest.fn((data: unknown) => data),
    save: jest.fn(async (data: unknown) => data),
  };
  const query = jest.fn(async (sql: string, params: unknown[] = []) => {
    if (sql.includes('AS retired_store_identity')) return organizations;
    if (sql.includes('FROM service_memberships') || sql.includes('FROM role_assignments')) return [{ ok: 1 }];
    if (sql.includes('SELECT id FROM product_masters')) return [{ id: 'master-1' }];
    if (sql.includes('INSERT INTO organization_product_listings')) return [{ organization_id: params[0] }];
    throw new Error(`unexpected query: ${sql}`);
  });
  const ds = { query, getRepository: jest.fn(() => assets) } as any;
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = {
      id: 'current-owner', roles: ['kpa:store_owner'],
      memberships: [{ serviceKey: 'kpa-society', status: 'active' }],
    };
    next();
  });
  app.use('/api/v1/store', createStoreLibraryController(ds, (_req, _res, next) => next()));
  app.use('/api/v1/store/products', createStoreProductLibraryController(ds));
  return { app, ds, assets, query };
}

const writeRequests = [
  { path: '/api/v1/store/pharmacy/library', body: { title: 'Store material', assetType: 'content', htmlContent: '<p>current</p>' } },
  { path: '/api/v1/store/products/list', body: { masterId: 'master-1', price: 1000 } },
];

it.each(writeRequests)('current owner credentials cannot write into a PH-only organization: $path', async ({ path, body }) => {
  const { app, assets, query } = setup([PH_ROW]);
  const res = await request(app).post(path).set('X-Store-Organization-Id', PH).send(body);
  expect(res.status).toBe(403);
  expect(res.body.code).toBe('STORE_OWNER_REQUIRED');
  expect(assets.save).not.toHaveBeenCalled();
  expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO'))).toBe(false);
});

it.each(writeRequests)('a PH selection hint cannot redirect a current Store write: $path', async ({ path, body }) => {
  const { app, assets, query } = setup([PH_ROW, CURRENT_ROW]);
  const res = await request(app).post(path).set('X-Store-Organization-Id', PH).send(body);
  expect(res.status).toBe(201);
  if (path.endsWith('/library')) {
    expect(assets.save).toHaveBeenCalledWith(expect.objectContaining({ organizationId: CURRENT }));
  } else {
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO organization_product_listings'));
    expect(insert?.[1]?.[0]).toBe(CURRENT);
  }
});

it('current Store ledger approval preserves a mixed organization without requiring franchise enrollment or a slug', async () => {
  const { ds } = setup([{ ...PH_ROW, current_store_identity: true }]);
  expect(await resolveStoreOrganization(ds, 'owner', undefined, PH)).toMatchObject({ status: 'resolved', organizationId: PH });
  const [sql, params] = ds.query.mock.calls[0];
  expect(sql).toContain("npm.status = 'active'");
  expect(params[2]).toEqual(['pharmacy-hub']);
  expect(params[4]).not.toContain('pharmacy-hub');
  expect(params[4]).not.toContain('kpa-society');
  expect(params[4]).not.toContain('kpa');
  expect(params[5]).not.toContain('kpa');
  expect(params[4]).toContain('k-cosmetics');
  // Retired identity includes inactive history; current identity requires active evidence.
  const historical = sql.split('AS retired_store_identity')[0];
  expect(historical).not.toContain("e.status = 'active'");
  expect(historical).not.toContain('s.is_active = true');
});

it('buyer organization validation refuses the PH destination and preserves the current destination', async () => {
  const { ds } = setup([PH_ROW, CURRENT_ROW]);
  expect(await resolveBuyerOrganization(ds, 'owner', 'neture', PH)).toMatchObject({ status: 'forbidden' });
  expect(await resolveBuyerOrganization(ds, 'owner', 'neture', CURRENT)).toMatchObject({ status: 'resolved', organizationId: CURRENT });
});

it('staff candidates exclude PH-only organizations and retain current and mixed organizations', async () => {
  const { ds } = setup([
    { ...PH_ROW, role: 'staff' },
    { ...CURRENT_ROW, role: 'staff', retired_store_identity: true },
  ]);
  expect(await findStoreMemberOrganizationCandidates(ds, 'staff')).toEqual([{ organizationId: CURRENT, memberRole: 'staff' }]);
});
