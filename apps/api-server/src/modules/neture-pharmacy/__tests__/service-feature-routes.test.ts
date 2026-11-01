jest.mock('../../../database/connection.js',()=>({AppDataSource:{query:jest.fn(async()=>[])}}));
import express from 'express';
import request from 'supertest';
import { createNeturePharmacyRoutes } from '../neture-pharmacy.routes.js';
import { SemiFranchiseService } from '../services/semi-franchise.service.js';

// Synthetic authentication only. The production role guard and new routes run unchanged.
jest.mock('../../../middleware/auth.middleware.js', () => ({
  ...jest.requireActual('../../../common/middleware/auth/authorization.middleware.js'),
  requireAuth: (req: any, res: any, next: any) => req.user ? next() : res.status(401).json({ code: 'UNAUTHORIZED' }),
}));
jest.mock('../../auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    hasAnyRole: jest.fn(async (id: string) => id === 'platform-admin'),
    getActiveRoles: jest.fn(async () => [{ role: 'platform:super_admin' }]),
  },
}));
jest.mock('../pharmacy-store-access.js', () => ({
  createPharmacyStoreAccess: () => (req: any, res: any, next: any) => {
    if (req.user.id !== 'invited-free-staff') return res.status(403).json({ code: 'STORE_ACCESS_REQUIRED' });
    req.organizationId = 'authorized-store';
    next();
  },
}));
jest.mock('../../../services/checkout.service.js', () => ({ checkoutService: {} }));
jest.mock('../../../routes/kpa/services/event-offer.service.js', () => ({ EventOfferService: class {} }));
jest.mock('../services/pharmacy-store-provisioner.js', () => ({ createPharmacyStoreProvisioner: () => ({}) }));
jest.mock('@o4o/asset-copy-core', () => ({ AssetCopyService: class {} }), { virtual: true });
jest.mock('../services/business-registration-document.service.js', () => ({ BusinessRegistrationDocumentService: class {} }));

const query = jest.fn();
function app() {
  const instance = express();
  instance.use(express.json());
  instance.use((req: any, _res, next) => {
    if (req.header('x-test-actor')) req.user = { id: req.header('x-test-actor'), roles: req.header('x-test-actor') === 'platform-admin' ? ['platform:super_admin'] : [] };
    next();
  });
  instance.use('/api/v1/neture', createNeturePharmacyRoutes({ query, getRepository: () => ({}) } as any));
  return instance;
}
beforeEach(() => query.mockReset());

it('requires authentication and the platform administrator role for catalog and configuration writes', async () => {
  const server = app();
  expect((await request(server).get('/api/v1/neture/admin/service-features')).status).toBe(401);
  expect((await request(server).get('/api/v1/neture/admin/service-features').set('x-test-actor', 'business-operator')).status).toBe(403);
  expect((await request(server).patch('/api/v1/neture/admin/semi-franchises/a').set('x-test-actor', 'invited-free-staff').send({ serviceFeatures: ['tablet'] })).status).toBe(403);
  const result = await request(server).get('/api/v1/neture/admin/service-features').set('x-test-actor', 'platform-admin');
  expect(result.status).toBe(200);
  expect(result.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'tablet' })]));
  expect(query).not.toHaveBeenCalled();
});

it('uses only the guard-resolved store and never accepts paid status or a different store from the caller', async () => {
  query.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM semi_franchises sf')) return [{ key: 'a', name: 'A', features: ['tablet'] }];
    if (sql.includes('AS "ownerUserId"')) return [{ ownerUserId: 'verified-owner' }];
    if (sql.includes("metadata->'pharmacyServiceFeatures'")) return [{ role: 'staff', configured: false }];
    if (sql.includes('FROM settings WHERE key') || sql.includes('FROM member_paid_service_entitlements')) return [];
    throw new Error('Unexpected feature fixture query');
  });
  const result = await request(app()).get('/api/v1/neture/pharmacy/service-features?organizationId=foreign&isPaid=true')
    .set('x-test-actor', 'invited-free-staff');
  expect(result.status).toBe(200);
  expect(result.body.data).toMatchObject({ organizationId: 'authorized-store', memberEntitlement: 'connected' });
  expect(result.body.data.features.filter((feature: { allowed: boolean }) => feature.allowed).map((feature: { key: string }) => feature.key)).toEqual(['tablet']);
  expect(query.mock.calls[0][1]).toEqual(['authorized-store']);
  query.mockClear();
  expect((await request(app()).get('/api/v1/neture/pharmacy/service-features').set('x-test-actor', 'uninvited')).status).toBe(403);
  expect(query).not.toHaveBeenCalled();
});

it('returns a retryable error instead of an empty entitlement list on lookup failure', async () => {
  query.mockRejectedValue(new Error('private details'));
  const result = await request(app()).get('/api/v1/neture/pharmacy/service-features').set('x-test-actor', 'invited-free-staff');
  expect(result.status).toBe(503);
  expect(result.body).toMatchObject({ success: false, code: 'FEATURE_ACCESS_UNAVAILABLE' });
  expect(JSON.stringify(result.body)).not.toContain('private details');
});

it('restricts member paid eligibility management to platform administrators and validates writes', async () => {
  const server = app();
  const base = '/api/v1/neture/admin/member-paid-entitlements';
  expect((await request(server).get(`${base}?email=fixture@example.test`)).status).toBe(401);
  expect((await request(server).get(`${base}?email=fixture@example.test`).set('x-test-actor', 'invited-free-staff')).status).toBe(403);
  expect(query).not.toHaveBeenCalled();
  query.mockResolvedValueOnce([{ id: '10000000-0000-4000-8000-000000000001', email: 'fixture@example.test', active: false }]);
  expect((await request(server).get(`${base}?email=fixture@example.test`).set('x-test-actor', 'platform-admin')).status).toBe(200);
  expect((await request(server).put(`${base}/10000000-0000-4000-8000-000000000001`).set('x-test-actor', 'invited-free-staff').send({ active: true })).status).toBe(403);
  expect((await request(server).put(`${base}/10000000-0000-4000-8000-000000000001`).set('x-test-actor', 'platform-admin').send({ active: 'true' })).status).toBe(400);
  query.mockResolvedValueOnce([{ active: true }]);
  expect((await request(server).put(`${base}/10000000-0000-4000-8000-000000000001`).set('x-test-actor', 'platform-admin').send({ active: true, endsAt: null })).status).toBe(200);
  expect(query.mock.calls[1][1]).toEqual(['10000000-0000-4000-8000-000000000001', true, null, 'platform-admin']);
});

it('requires the configured staff-support feature and preserves owner-only location writes', async () => {
  let enabled = false;
  query.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM semi_franchises sf')) return enabled ? [{key:'drugstore',name:'드럭스토어형 약국',features:['store-staff-support']}] : [];
    if (sql.includes('AS "ownerUserId"')) return [{ownerUserId:'store-owner'}];
    if (sql.includes("metadata->'pharmacyServiceFeatures'")) return [{ role: 'staff', configured: false }];
    if (sql.includes('WITH products')) return [{id:'product',kind:'local',name:'합성 상품',location:'A-3'}];
    return [];
  });
  const server=app();
  const base='/api/v1/neture/pharmacy/staff-support';
  expect((await request(server).get(`${base}/products?q=상품`).set('x-test-actor','invited-free-staff')).status).toBe(403);
  enabled=true;
  expect((await request(server).get(`${base}/products?q=상품`).set('x-test-actor','invited-free-staff')).body.data[0].location).toBe('A-3');
  expect((await request(server).put(`${base}/location`).set('x-test-actor','invited-free-staff').send({})).status).toBe(403);
  expect((await request(server).post(`${base}/demands`).set('x-test-actor','invited-free-staff').send({reason:'free-text',customer:'ignored'})).status).toBe(400);
  expect((await request(server).post(`${base}/demands`).set('x-test-actor','invited-free-staff').send({reason:'not-found',customer:'ignored'})).status).toBe(200);
  const writes=query.mock.calls.filter(([sql])=>sql.startsWith('UPDATE organizations'));
  expect(writes).toHaveLength(1);
  expect(writes[0][1]).toEqual(['authorized-store','not-found']);
  expect((await request(server).get('/api/v1/neture/admin/staff-support/demands?month=2030-01').set('x-test-actor','business-operator')).status).toBe(403);
});

it('exposes federation roles only to authenticated platform administrators without querying individual cooperatives', async () => {
  const server = app();
  const path = '/api/v1/neture/admin/cooperative-federation';
  expect((await request(server).get(path)).status).toBe(401);
  for (const actor of ['business-operator', 'neture-admin', 'cooperative-operator', 'invited-free-staff']) {
    expect((await request(server).get(path).set('x-test-actor', actor)).status).toBe(403);
  }
  expect(query).not.toHaveBeenCalled();
  query.mockResolvedValueOnce([
    { userId: 'synthetic-operator', role: 'neture:pharmcoop_admin', name: null, email: null, account_status: 'suspended', account_active: true, email_verified: true, membership_status: 'active' },
  ]);
  const result = await request(server).get(path).set('x-test-actor', 'platform-admin');
  expect(result.status).toBe(200);
  expect(result.headers['cache-control']).toBe('private, no-store');
  expect(result.body.data).toEqual({ roleOperators: [
    { userId: 'synthetic-operator', role: 'neture:pharmcoop_admin', name: null, email: null, membershipStatus: 'suspended' },
  ] });
  expect(query).toHaveBeenCalledTimes(1);
  expect(query.mock.calls[0][0].trimStart()).toMatch(/^SELECT/);
  expect(query.mock.calls[0][0]).not.toMatch(/cooperatives|cooperative_memberships|semi_franchises/);
});

it('limits member access summaries to platform administrators and returns controlled failures', async () => {
  const server = app();
  const path = '/api/v1/neture/admin/member-paid-entitlements/10000000-0000-4000-8000-000000000001/access';
  expect((await request(server).get(path)).status).toBe(401);
  expect((await request(server).get(path).set('x-test-actor', 'business-operator')).status).toBe(403);
  expect(query).not.toHaveBeenCalled();
  query.mockResolvedValueOnce([]);
  expect((await request(server).get(path).set('x-test-actor', 'platform-admin')).status).toBe(404);
  query.mockRejectedValue(new Error('private database details'));
  const result = await request(server).get(path).set('x-test-actor', 'platform-admin');
  expect(result.status).toBe(503);
  expect(result.headers['cache-control']).toBe('private, no-store');
  expect(JSON.stringify(result.body)).not.toContain('private database details');
  expect((await request(server).get(path.replace('10000000-0000-4000-8000-000000000001', 'invalid')).set('x-test-actor', 'platform-admin')).status).toBe(404);
});


it('accepts a selected operator in the existing route parameter and rejects the body-only path', async () => {
  const candidate = '10000000-0000-4000-8000-000000000001';
  const assign = jest.spyOn(SemiFranchiseService.prototype, 'assignOperator').mockResolvedValue({ assigned: true });
  try {
    const server = app();
    const path = '/api/v1/neture/admin/semi-franchises/custom-business/operators';
    expect((await request(server).post(path).set('x-test-actor', 'platform-admin').send({ userId: candidate })).status).toBe(404);
    expect(assign).not.toHaveBeenCalled();
    const result = await request(server).post(`${path}/${candidate}`).set('x-test-actor', 'platform-admin');
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ success: true, data: { assigned: true } });
    expect(assign).toHaveBeenCalledWith('custom-business', candidate, 'platform-admin');
  } finally {
    assign.mockRestore();
  }
});
