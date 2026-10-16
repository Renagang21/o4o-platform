import express from 'express';
import request from 'supertest';
import { createNeturePharmacyRoutes } from '../neture-pharmacy.routes.js';

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
    if (req.header('x-test-actor')) req.user = { id: req.header('x-test-actor') };
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
  query.mockResolvedValue([{ key: 'a', name: 'A', features: ['tablet'] }]);
  const result = await request(app()).get('/api/v1/neture/pharmacy/service-features?organizationId=foreign&isPaid=true')
    .set('x-test-actor', 'invited-free-staff');
  expect(result.status).toBe(200);
  expect(result.body.data).toMatchObject({ organizationId: 'authorized-store', memberEntitlement: 'not-connected', features: [{ allowed: true }, { allowed: null }] });
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
