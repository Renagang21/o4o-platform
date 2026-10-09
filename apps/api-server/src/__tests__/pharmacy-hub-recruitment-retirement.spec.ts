import express from 'express';
import request from 'supertest';

jest.mock('../database/connection.js', () => ({ AppDataSource: { query: jest.fn(), transaction: jest.fn() } }));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../modules/neture/entities/index.js', () => ({
  SellerRecruitment: class {}, SellerRecruitmentApplication: class {},
  RecruitmentStatus: { RECRUITING: 'recruiting', CLOSED: 'closed' },
  ExposureStatus: { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' },
  ApplicationStatus: { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected', CANCELLED: 'cancelled' },
  SELLER_RECRUITMENT_TABLE: 'seller_recruitments', SELLER_RECRUITMENT_APPLICATION_TABLE: 'seller_recruitment_applications',
}));
jest.mock('../modules/neture/services/service-audience.service.js', () => ({}));
jest.mock('../services/NotificationService.js', () => ({ notificationService: { createNotification: jest.fn().mockResolvedValue({}) } }));
jest.mock('../modules/neture/middleware/supplier-context.resolver.js', () => ({ listOwnedSupplierIds: jest.fn().mockResolvedValue(['owned-supplier']) }));
jest.mock('../middleware/auth.middleware.js', () => ({ requireAuth: (req: any, _res: any, next: any) => {
  req.user = { id: 'supplier', name: 'Test user' }; req.organizationId = 'org'; next();
} }));
jest.mock('../middleware/neture-main-membership.middleware.js', () => ({ requireNetureMainMembership: () => (_req: any, _res: any, next: any) => next() }));
jest.mock('../utils/store-owner.utils.js', () => ({ createRequireStoreOwner: () => (_req: any, _res: any, next: any) => next() }));
jest.mock('../middleware/neture-scope.middleware.js', () => ({ requireNetureScope: () => (_req: any, _res: any, next: any) => next() }));
jest.mock('../modules/neture/neture.service.js', () => ({ NetureService: jest.fn(() => mockService) }));

import { AppDataSource } from '../database/connection.js';
import { SellerRecruitmentService, resolveRecruitmentApplicationTargetUrl } from '../modules/neture/services/seller-recruitment.service.js';
import { createSellerRecruitmentController } from '../modules/neture/controllers/seller-recruitment.controller.js';
import { createOperatorRecruitmentExposureController } from '../modules/neture/controllers/operator-recruitment-exposure.controller.js';
import { createServiceRecruitmentExposureProxyController } from '../modules/neture/controllers/service-recruitment-exposure-proxy.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { notificationService } from '../services/NotificationService.js';

let mockService: SellerRecruitmentService;
let recruitmentRepo: any;
let applicationRepo: any;
const query = AppDataSource.query as jest.Mock;
const transaction = AppDataSource.transaction as jest.Mock;
const current = { id: 'current', serviceId: 'kpa-society', sellerId: 'supplier', status: 'recruiting', exposureStatus: 'approved', productName: 'Test product', consumerPrice: 100, commissionRate: 0 };
const retired = { ...current, id: 'retired', serviceId: 'pharmacy-hub' };
const pendingApplication = { id: 'application', recruitmentId: 'retired', applicantId: 'applicant', applicantOrganizationId: 'org', status: 'pending' };
const pass = (_req: any, _res: any, next: any) => next();

beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue([]);
  recruitmentRepo = { find: jest.fn().mockResolvedValue([retired, current]), findOne: jest.fn().mockResolvedValue({ ...retired }), save: jest.fn(async x => x) };
  applicationRepo = { findOne: jest.fn().mockResolvedValue({ ...pendingApplication }), create: jest.fn(x => x), save: jest.fn(async x => ({ ...x, id: 'application' })) };
  mockService = new SellerRecruitmentService();
  (mockService as any)._recruitmentRepo = recruitmentRepo;
  (mockService as any)._applicationRepo = applicationRepo;
});

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/seller', createSellerRecruitmentController({ sellerRecruitmentService: mockService, requireActiveSupplier: pass }));
  app.use('/operator', createOperatorRecruitmentExposureController(AppDataSource));
  app.use('/proxy', createServiceRecruitmentExposureProxyController(requireAuth, pass, 'pharmacy-hub'));
  return app;
}

it.each([
  { serviceKey: 'pharmacy-hub' },
  { serviceKeys: [' pharmacy-hub '] },
  { serviceKeys: ['kpa-society', 'pharmacy-hub'] },
])('a PH recruitment target rejects the whole HTTP creation request before any query or transaction: %j', async input => {
  const res = await request(makeApp()).post('/seller/recruitments').send({ masterId: 'product', ...input });
  expect(res.status).toBe(410);
  expect(res.body.error).toBe('SERVICE_RETIRED');
  expect(query).not.toHaveBeenCalled();
  expect(transaction).not.toHaveBeenCalled();
  expect(recruitmentRepo.save).not.toHaveBeenCalled();
});

it.each(['closed', 'recruiting'])('PH cannot reopen even through an idempotent request (%s)', async status => {
  recruitmentRepo.findOne.mockResolvedValue({ ...retired, status });
  const res = await request(makeApp()).patch('/seller/recruitments/retired/reopen');
  expect(res.status).toBe(410);
  expect(res.body.error).toBe('SERVICE_RETIRED');
  expect(recruitmentRepo.save).not.toHaveBeenCalled();
});

it.each(['/operator/recruitment-exposure/retired/approve', '/proxy/operator/recruitment-exposure/retired/approve'])('PH exposure approval is rejected before save through %s', async url => {
  const res = await request(makeApp()).patch(url).send({ note: 'test' });
  expect(res.status).toBe(410);
  expect(res.body.error).toBe('SERVICE_RETIRED');
  expect(recruitmentRepo.save).not.toHaveBeenCalled();
});

it('PH is excluded from public and Store browse while historical review reads remain', async () => {
  const publicResult = await request(makeApp()).get('/seller/recruitments');
  expect(publicResult.body.data.map((r: any) => r.id)).toEqual(['current']);
  query.mockResolvedValue([{ semi_franchise_id: 'sf', key: 'pharmacy' }]);
  expect((await mockService.getRecruitments({ storeOrganizationId: 'org' })).map(r => r.id)).toEqual(['current']);
  expect((await mockService.getRecruitmentsForExposureReview({ serviceKey: 'pharmacy-hub' })).map(r => r.id)).toContain('retired');
});

it.each(['/seller/applications', '/seller/applications/application/approve'])('PH cannot create or approve a new participation through %s', async url => {
  const res = await request(makeApp()).post(url).send({ recruitmentId: 'retired' });
  expect(res.status).toBe(410);
  expect(res.body.error).toBe('SERVICE_RETIRED');
  expect(applicationRepo.save).not.toHaveBeenCalled();
  expect(query).not.toHaveBeenCalled();
  expect(notificationService.createNotification).not.toHaveBeenCalled();
});

it('PH history can still be closed, hidden and rejected without reactivating participation', async () => {
  expect((await request(makeApp()).patch('/seller/recruitments/retired/close')).status).toBe(200);
  expect(recruitmentRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'closed' }));
  expect((await request(makeApp()).patch('/operator/recruitment-exposure/retired/reject')).status).toBe(200);
  expect(recruitmentRepo.save).toHaveBeenCalledWith(expect.objectContaining({ exposureStatus: 'rejected' }));
  expect((await request(makeApp()).post('/seller/applications/application/reject')).status).toBe(200);
  expect(applicationRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }));
  expect(resolveRecruitmentApplicationTargetUrl('pharmacy-hub')).toBe('/store/commerce/recruitment-applications');
});

it('current service creation, reopen, exposure and approval remain available', async () => {
  recruitmentRepo.find.mockResolvedValue([]);
  query.mockResolvedValue([{ offer_id: 'offer', distribution_type: 'PRIVATE', product_name: 'Product', is_regulated: false }]);
  transaction.mockImplementation(async fn => fn({ getRepository: () => ({ create: (x: any) => x, save: async (x: any) => ({ ...x, id: 'new' }) }) }));
  const app = makeApp();
  const created = await request(app).post('/seller/recruitments').send({ masterId: 'product', serviceKeys: ['kpa-society', 'k-cosmetics'] });
  expect(created.status).toBe(201);
  expect(created.body.data.recruitments.map((r: any) => r.serviceId)).toEqual(['kpa-society', 'k-cosmetics']);
  recruitmentRepo.findOne.mockResolvedValue({ ...current, status: 'closed', exposureStatus: 'pending' });
  expect((await request(app).patch('/seller/recruitments/current/reopen')).status).toBe(200);
  expect((await request(app).patch('/operator/recruitment-exposure/current/approve')).status).toBe(200);
  expect((await request(app).post('/seller/applications/application/approve')).status).toBe(200);
  expect(applicationRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
});
