import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
jest.mock('../services/email.service.js', () => ({ emailService: { sendEmail: jest.fn() } }));
jest.mock('../database/connection.js', () => ({ AppDataSource: { getRepository: () => ({}), query: jest.fn(async () => []) } }));
jest.mock('../middleware/auth.middleware.js', () => {
  const strict = (req: any, res: any, next: any) => {
    if (!req.headers['x-test-role']) return res.sendStatus(401);
    req.user = { id: 'fixture-user', roles: [req.headers['x-test-role']] }; next();
  };
  const optional = (req: any, _res: any, next: any) => { if (req.headers['x-test-role']) req.user = { id: 'fixture-user', roles: [req.headers['x-test-role']] }; next(); };
  return new Proxy({ __esModule: true, requireAuth: strict, authenticate: strict, optionalAuth: optional }, { get: (target: any, key) => key in target ? target[key] : () => strict });
});
jest.mock('../common/middleware/membership-guard.middleware.js', () => ({
  createMembershipScopeGuard: () => (role: string) => (req: any, res: any, next: any) => req.user?.roles.includes(role) ? next() : res.sendStatus(403),
}));
// Unrelated route factories are isolated; the actual inline news handlers and shared reader run below.
jest.mock('../routes/kpa/controllers/organization.controller.js', () => ({createOrganizationController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/kpa/controllers/event-offer-operator.controller.js', () => ({createEventOfferOperatorController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/kpa/controllers/supplier-offers.controller.js', () => ({createSupplierOffersController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/kpa/controllers/join-inquiry.controller.js', () => ({createJoinInquiryAdminRoutes: () => jest.requireActual('express').Router(), createJoinInquiryPublicRoutes: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/store-hub.controller.js', () => ({createStoreHubController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/pharmacy-info.controller.js', () => ({createPharmacyInfoController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/pharmacy-products.controller.js', () => ({createPharmacyProductsController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/kpa/controllers/operator-product-applications.controller.js', () => ({createOperatorProductApplicationsController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/asset-snapshot.controller.js', () => ({createAssetSnapshotController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/store-asset-control.controller.js', () => ({createStoreAssetControlController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/kpa/controllers/admin-force-asset.controller.js', () => ({createAdminForceAssetController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/published-assets.controller.js', () => ({createPublishedAssetsController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/store-content.controller.js', () => ({createStoreContentController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/store-library-feed.controller.js', () => ({createStoreLibraryFeedController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/store-execution-assets.controller.js', () => ({createStoreExecutionAssetsController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/store-qr-landing.controller.js', () => ({createStoreQrLandingController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/store-pop-v2.controller.js', () => ({createStorePopV2Controller: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/store-analytics.controller.js', () => ({createStoreAnalyticsController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/product-marketing.controller.js', () => ({createProductMarketingController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/multilingual-product-content.controller.js', () => ({createMultilingualProductContentController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/store-playlist.controller.js', () => ({createStorePlaylistController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/store-channel-products.controller.js', () => ({createStoreChannelProductsController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/store-external-sales.controller.js', () => ({createStoreExternalSalesController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/kpa/controllers/kpa-checkout.controller.js', () => ({createKpaCheckoutController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/kpa/controllers/kpa-payment.controller.js', () => ({createKpaPaymentController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/blog.controller.js', () => ({createBlogController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/operator-blog.controller.js', () => ({createOperatorBlogController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/operator-pop.controller.js', () => ({createOperatorPopController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/operator-multilingual-content.controller.js', () => ({createOperatorMultilingualContentController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/pop.controller.js', () => ({createStorePopStaffController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/operator-video.controller.js', () => ({createOperatorVideoController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/video.controller.js', () => ({createStoreVideoStaffController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/operator-qr.controller.js', () => ({createOperatorQrController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/operator-screen-set.controller.js', () => ({createOperatorScreenSetController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/supplier-screen-set.controller.js', () => ({createSupplierScreenSetController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/o4o-store/controllers/qr.controller.js', () => ({createStoreQrStaffController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/kpa/controllers/supplier-signage-media.controller.js', () => ({createSupplierSignageMediaController: () => jest.requireActual('express').Router()}));
jest.mock('../routes/kpa/controllers/event-offer.controller.js', () => ({createEventOfferController: () => jest.requireActual('express').Router()}));

jest.mock('../controllers/forum/ForumController.js', () => ({ForumController: class { constructor() { return new Proxy({}, { get: () => () => {} }); } }}));
jest.mock('../modules/credit/controllers/CreditController.js', () => ({CreditController: class { constructor() { return new Proxy({}, { get: () => () => {} }); } }}));
jest.mock('../services/payment/b2b/b2b-payment-controller.factory.js', () => ({ createB2bPaymentController: () => jest.requireActual('express').Router() }));
jest.mock('@o4o/ai-core', () => ({ execute: jest.fn() }), { virtual: true });
jest.mock('@o4o-apps/cms-core', () => ({ CmsContent: class CmsContent {} }), { virtual: true });
import { createNewsController } from '../routes/o4o-store/controllers/news.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { createMembershipScopeGuard } from '../common/middleware/membership-guard.middleware.js';
import { KPA_SCOPE_CONFIG } from '@o4o/security-core';
import { createKpaRoutes } from '../routes/kpa/kpa.routes.js';
const ID = '11111111-1111-4111-8111-111111111111';
let row: any, writes: any[], app: express.Express;
beforeEach(() => {
  row = { id: ID, serviceKey: 'kpa-society', type: 'hero', title: 'Reserved', status: 'draft', metadata: { section: 'home-presentation', presentation: { draft: { privateCopy: 'synthetic unpublished draft' }, published: null } } };
  writes = [];
  const qb: any = {};
  for (const name of ['where','andWhere','orderBy','addOrderBy','skip','take','leftJoinAndSelect','select','addSelect','groupBy']) qb[name] = () => qb;
  qb.getOne = async () => ({ ...row });
  qb.getManyAndCount = async () => [[{ ...row }], 1];
  qb.getMany = async () => [{ ...row }];
  const contentRepo = { createQueryBuilder: () => qb, findOne: async () => ({ ...row }), find: async () => [{ ...row }], create: (v: any) => v, save: async (v: any) => { writes.push(v); return v; }, delete: async (v: any) => { writes.push(v); return { affected: 1 }; } };
  const otherRepo = { create: (v: any) => v, save: async (v: any) => v, createQueryBuilder: () => qb };
  const ds: any = { getRepository: (entity: any) => (typeof entity === 'string' ? entity : entity.name) === 'CmsContent' ? contentRepo : otherRepo, query: async () => [], getMetadata: () => ({ columns: [] }) };
  app = express(); app.use(express.json()); app.use('/kpa', createKpaRoutes(ds)); app.use('/shared/news', createNewsController(ds, authenticate, optionalAuth, createMembershipScopeGuard(KPA_SCOPE_CONFIG), 'kpa-society', 'kpa:operator'));
});
describe.each(['/kpa/news', '/shared/news'])('%s reserved state boundary', (root) => {
it('does not expose a saved presentation through the actual KPA news detail route', async () => {
  const response = await request(app).get(root + '/' + ID);
  expect(response.status).toBe(404); expect(JSON.stringify(response.body)).not.toContain('synthetic unpublished draft'); expect(writes).toHaveLength(0);
});
it.each(['put','soft-delete','hard-delete'])('does not mutate reserved rows through %s', async (action) => {
  row.status = action === 'hard-delete' ? 'archived' : 'draft';
  const call = action === 'put' ? request(app).put(root + '/' + ID).send({ title: 'Changed', status: 'published' }) : request(app).delete(root + '/' + ID + (action === 'hard-delete' ? '/hard' : ''));
  const response = await call.set('x-test-role','kpa:operator');
  expect(response.status).toBe(404); expect(writes).toHaveLength(0);
});
it.each(['batch-publish','batch-archive','batch-hard-delete'])('does not mutate a reserved row through %s', async (action) => {
  row.status = action === 'batch-hard-delete' ? 'archived' : 'draft';
  const response = await request(app).post(root + '/' + action).set('x-test-role','kpa:operator').send({ ids: [ID] });
  expect(response.status).toBe(200); expect(response.body.data.results[0].status).toBe('failed'); expect(writes).toHaveLength(0);
});
it('preserves an ordinary news edit through the same operator route', async () => {
  row.metadata = {}; row.type = 'news';
  const response = await request(app).put(root + '/' + ID).set('x-test-role','kpa:operator').send({ title: 'Changed' });
  expect(response.status).toBe(200); expect(writes[0].title).toBe('Changed');
});

it('keeps ordinary published detail visible', async () => {
  row.metadata = {}; row.type = 'news'; row.status = 'published';
  const response = await request(app).get(root+'/'+ID);
  expect(response.status).toBe(200); expect(response.body.data.id).toBe(ID);
});
it('keeps the existing operator authorization before any mutation', async () => {
  row.metadata = {}; row.type = 'news';
  const response = await request(app).put(root+'/'+ID).set('x-test-role','kpa:member').send({title:'Changed'});
  expect(response.status).toBe(403); expect(writes).toHaveLength(0);
});
});
