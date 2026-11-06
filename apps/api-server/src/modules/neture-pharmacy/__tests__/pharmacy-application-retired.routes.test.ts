import express from 'express';
import request from 'supertest';
import { createNeturePharmacyRoutes } from '../neture-pharmacy.routes.js';

jest.mock('../../../middleware/auth.middleware.js', () => ({
  ...jest.requireActual('../../../common/middleware/auth/authorization.middleware.js'),
  requireAuth: (req: any, res: any, next: any) => req.user ? next() : res.status(401).json({ code: 'UNAUTHORIZED' }),
}));
jest.mock('../../../middleware/neture-main-membership.middleware.js', () => ({
  requireNetureMainMembership: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../../neture/middleware/neture-identity.middleware.js', () => ({
  createRequireActiveSupplier: () => (req: any, res: any, next: any) => {
    if (req.user.id !== 'fixture-owner') return res.status(403).json({ code: 'NO_SUPPLIER' });
    req.supplierId = 'fixture-supplier';
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
  instance.use('/neture', createNeturePharmacyRoutes({ query, getRepository: () => ({}) } as any));
  return instance;
}
beforeEach(() => query.mockReset());
const path = '/neture/pharmacy/membership';
it('requires authentication on the retired application URL', async () => {
  expect((await request(app()).post(path).send({})).status).toBe(401);
  expect(query).not.toHaveBeenCalled();
});
it.each([{}, { pharmacyName: 'Synthetic', businessNumber: '0000000000', pharmacistLicenseNumber: 'DEMO' }])('rejects a second application without creating a store or changing approval: %p', async payload => {
  const result = await request(app()).post(path).set('x-test-actor','fixture-owner').send(payload);
  expect(result.status).toBe(410);
  expect(result.body).toMatchObject({ success: false, error: { code: 'PHARMACY_APPLICATION_RETIRED' } });
  expect(query).not.toHaveBeenCalled();
});
it('retains read access to existing membership records', async () => {
  query.mockResolvedValue([{ id: 'existing-fixture', status: 'active' }]);
  const result = await request(app()).get(path).set('x-test-actor','fixture-owner');
  expect(result.status).toBe(200);
  expect(result.body.data).toMatchObject({ id: 'existing-fixture', status: 'active' });
  expect(query.mock.calls.every(([sql]) => sql.trim().startsWith('SELECT'))).toBe(true);
});
