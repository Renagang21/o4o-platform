import express from 'express';
import request from 'supertest';
import { createNeturePharmacyRoutes } from '../neture-pharmacy.routes.js';
import * as supply from '../services/supply-access.js';
import { PharmacyCartService } from '../services/pharmacy-cart.service.js';
import type { SupplyKind } from '../constants.js';

// Only identity/store resolution and service data are fixtures; the real router serializes the response.
jest.mock('../../../database/connection.js', () => ({
  AppDataSource: { query: jest.fn(), getRepository: jest.fn(() => ({})) },
}));
jest.mock('../../../middleware/auth.middleware.js', () => ({
  ...jest.requireActual('../../../common/middleware/auth/authorization.middleware.js'),
  requireAuth: (req: any, res: any, next: any) =>
    req.user ? next() : res.status(401).json({ code: 'UNAUTHORIZED' }),
}));
jest.mock('../../../middleware/neture-main-membership.middleware.js', () => ({
  requireNetureMainMembership: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../pharmacy-store-access.js', () => ({
  createPharmacyStoreAccess: () => (req: any, res: any, next: any) => {
    if (req.user.id !== 'fixture-owner') return res.status(403).json({ code: 'STORE_ACCESS_REQUIRED' });
    req.organizationId = 'fixture-store';
    next();
  },
}));
jest.mock('../../../services/checkout.service.js', () => ({ checkoutService: {} }));
jest.mock('../../../routes/kpa/services/event-offer.service.js', () => ({ EventOfferService: class {} }));
jest.mock('../services/pharmacy-store-provisioner.js', () => ({ createPharmacyStoreProvisioner: () => ({}) }));
jest.mock('@o4o/asset-copy-core', () => ({ AssetCopyService: class {} }), { virtual: true });
jest.mock('../services/business-registration-document.service.js', () => ({ BusinessRegistrationDocumentService: class {} }));

const optionId = '10000000-0000-4000-8000-000000000001';
const base = '/api/v1/neture/pharmacy';
// Independent expectations: do not import the implementation's key list.
const optionKeys = [
  'kind', 'optionId', 'productName', 'supplierName', 'semiFranchiseKey', 'semiFranchiseName',
  'unitPrice', 'targetOrganizationId', 'note', 'startAt', 'endAt', 'totalQuantity',
  'perStoreLimit', 'perOrderLimit', 'termsSnapshot',
].sort();
const termKeys = ['version', 'baseShippingFee', 'freeShippingThreshold', 'minOrderAmount'].sort();
const cartKeys = ['id', 'kind', 'optionId', 'productName', 'quantity', 'available', 'unitPrice', 'option'].sort();
function option(kind: SupplyKind) {
  return {
    kind, optionId, productName: 'Fixture product', supplierName: 'Fixture supplier',
    semiFranchiseKey: null, semiFranchiseName: '', unitPrice: 0, targetOrganizationId: null,
    note: null, startAt: null, endAt: null, totalQuantity: 0, perStoreLimit: null, perOrderLimit: 1,
    termsSnapshot: { version: 1 as const, baseShippingFee: 0, freeShippingThreshold: null, minOrderAmount: 0, futureInternal: 'private terms' },
    offerId: 'private-offer', masterId: 'private-master', supplierId: 'private-supplier',
    paymentReceiverKey: 'private-receiver', trackInventory: true, availableStock: 71,
    baseShippingFee: 3000, freeShippingThreshold: 50000, minOrderAmount: 5000,
    futureInternal: 'private option',
  };
}
function server() {
  const app = express();
  app.use((req: any, _res, next) => {
    if (req.header('x-test-actor')) req.user = { id: req.header('x-test-actor') };
    next();
  });
  app.use('/api/v1/neture', createNeturePharmacyRoutes({
    query: jest.fn(async () => []), getRepository: () => ({}),
  } as any));
  return app;
}
const get = (path: string, actor = 'fixture-owner') => request(server()).get(base + path).set('x-test-actor', actor);
afterEach(() => jest.restoreAllMocks());

it.each<SupplyKind>(['default', 'proposal', 'event', 'recruitment'])(
  'projects %s across list, detail and cart without changing internal values', async kind => {
    const internal = option(kind);
    const original = structuredClone(internal);
    const list = jest.spyOn(supply, 'listSupplyOptions').mockResolvedValue({ items: [internal, { ...internal, optionId: 'second' }], total: 9 });
    const detail = jest.spyOn(supply, 'getSupplyOption').mockResolvedValue(internal);
    const available = { id: 'cart-a', kind, optionId, productName: internal.productName, quantity: 3, available: true, unitPrice: 0, option: internal, futureInternal: 'private cart' };
    const unavailable = { id: 'cart-b', kind, optionId, productName: 'Previously available', quantity: 2, available: false, unitPrice: null, option: null };
    const cart = jest.spyOn(PharmacyCartService.prototype, 'list').mockResolvedValue([available, unavailable]);
    const listing = await get('/store/supply-options?source=' + kind + '&page=2&limit=2&organizationId=foreign');
    expect(listing.status).toBe(200);
    expect(listing.body.success).toBe(true);
    expect(Object.keys(listing.body.data).sort()).toEqual(['items', 'total']);
    expect(listing.body.data.total).toBe(9);
    expect(listing.body.data.items.map((i: any) => i.optionId)).toEqual([optionId, 'second']);
    expect(list).toHaveBeenCalledWith(expect.anything(), 'fixture-store', expect.objectContaining({ source: kind, page: 2, limit: 2 }));
    const detailed = await get('/store/supply-options/' + kind + '/' + optionId);
    expect(detailed.status).toBe(200);
    expect(detail).toHaveBeenCalledWith(expect.anything(), 'fixture-store', kind, optionId);
    const basket = await get('/cart?organizationId=foreign');
    expect(basket.status).toBe(200);
    expect(cart).toHaveBeenCalledWith('fixture-owner', 'fixture-store');
    for (const external of [listing.body.data.items[0], detailed.body.data, basket.body.data[0].option]) {
      expect(Object.keys(external).sort()).toEqual(optionKeys);
      expect(Object.keys(external.termsSnapshot).sort()).toEqual(termKeys);
      expect(external).toEqual({
        kind, optionId, productName: 'Fixture product', supplierName: 'Fixture supplier',
        semiFranchiseKey: null, semiFranchiseName: '', unitPrice: 0, targetOrganizationId: null,
        note: null, startAt: null, endAt: null, totalQuantity: 0, perStoreLimit: null, perOrderLimit: 1,
        termsSnapshot: { version: 1, baseShippingFee: 0, freeShippingThreshold: null, minOrderAmount: 0 },
      });
    }
    expect(Object.keys(basket.body.data[0]).sort()).toEqual(cartKeys);
    expect(basket.body.data[0]).toMatchObject({ quantity: 3, available: true, unitPrice: 0 });
    expect(basket.body.data[1]).toEqual(unavailable);
    expect(internal).toEqual(original);
    expect(available.futureInternal).toBe('private cart');
  },
);

it.each([null, undefined])('preserves termsSnapshot=%s rather than filling defaults', async termsSnapshot => {
  jest.spyOn(supply, 'getSupplyOption').mockResolvedValue({ ...option('default'), termsSnapshot });
  const result = await get('/store/supply-options/default/' + optionId);
  expect(result.status).toBe(200);
  expect(result.body.data.termsSnapshot).toBe(termsSnapshot);
  expect(Object.hasOwn(result.body.data, 'termsSnapshot')).toBe(termsSnapshot !== undefined);
});
it('keeps unavailable and invalid detail responses at 404', async () => {
  const detail = jest.spyOn(supply, 'getSupplyOption').mockResolvedValue(null);
  for (const kind of ['default', 'unsupported']) {
    const result = await get('/store/supply-options/' + kind + '/' + optionId);
    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ success: false, code: 'SUPPLY_OPTION_NOT_AVAILABLE' });
  }
  expect(detail).toHaveBeenCalledTimes(1);
});
it('runs authentication and store gate before supply/cart reads', async () => {
  const list = jest.spyOn(supply, 'listSupplyOptions');
  const cart = jest.spyOn(PharmacyCartService.prototype, 'list');
  for (const path of ['/store/supply-options', '/store/supply-options/default/' + optionId, '/cart']) {
    expect((await request(server()).get(base + path)).status).toBe(401);
    expect((await get(path, 'foreign-owner')).status).toBe(403);
  }
  expect(list).not.toHaveBeenCalled();
  expect(cart).not.toHaveBeenCalled();
});
it('keeps lookup failures as errors rather than successful empty lists', async () => {
  jest.spyOn(supply, 'listSupplyOptions').mockRejectedValue(new Error('private SQL detail'));
  const result = await get('/store/supply-options');
  expect(result.status).toBe(500);
  expect(result.body).toMatchObject({ success: false, code: 'INTERNAL_ERROR' });
  expect(JSON.stringify(result.body)).not.toContain('private SQL detail');
});
