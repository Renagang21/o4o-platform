import express from 'express';
import request from 'supertest';
import { SupplyProposalService } from '../services/supply-proposal.service.js';
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
afterEach(() => jest.restoreAllMocks());
const path='/neture/supplier/supply-proposals';
const payload={offerId:'82ad1f54-2722-441c-8f8f-838958c97617',semiFranchiseKey:'fixture',unitPrice:1000,requestId:'3b150375-eb02-4855-9590-ab514e591d98'};
it.each([[false,201],[true,200]])('returns the receipt with reused=%s and HTTP %s',async(reused,status)=>{
  const create=jest.spyOn(SupplyProposalService.prototype,'supplierCreate').mockResolvedValue({id:payload.requestId,status:'pending',reused:reused as boolean});
  const response=await request(app()).post(path).set('x-test-actor','fixture-owner').send(payload);
  expect(response.status).toBe(status);
  expect(response.body).toMatchObject({success:true,data:{id:payload.requestId,status:'pending',reused}});
  expect(create).toHaveBeenCalledWith('fixture-supplier','fixture-owner',payload);
});
it('keeps authentication and supplier scope before retry handling',async()=>{
  const create=jest.spyOn(SupplyProposalService.prototype,'supplierCreate');
  expect((await request(app()).post(path).send(payload)).status).toBe(401);
  expect((await request(app()).post(path).set('x-test-actor','unlinked').send(payload)).status).toBe(403);
  expect(create).not.toHaveBeenCalled();
});
