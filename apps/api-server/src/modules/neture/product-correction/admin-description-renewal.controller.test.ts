import express from 'express';
import request from 'supertest';
jest.mock('../../../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!req.headers['x-test-user']) return res.status(401).json({ code: 'AUTH_REQUIRED' });
    req.user = { id: req.headers['x-test-user'] };
    next();
  },
}));
jest.mock('../../auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    hasAnyRole: jest.fn(
      async (id: string, roles: string[]) =>
        id === 'platform' && roles.includes('platform:super_admin'),
    ),
  },
}));
jest.mock('../services/shared-product-description.service.js', () => ({
  SharedProductDescriptionService: jest.fn().mockImplementation(() => ({
    createCandidate: jest.fn().mockResolvedValue({ id: '00000000-0000-4000-8000-000000000002' }),
    setCanonical: jest
      .fn()
      .mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000003',
        masterId: '00000000-0000-4000-8000-000000000001',
        descriptionType: 'STORE',
        language: 'ko',
        status: 'canonical',
      }),
  })),
}));
import { SharedProductDescriptionService } from '../services/shared-product-description.service.js';
import { createProductMasterDescriptionController } from '../controllers/product-master-description.controller.js';
import { CorrectionError } from './contracts.js';
const id = '00000000-0000-4000-8000-000000000001';
describe('관리자 설명서 갱신 연결 HTTP 계약', () => {
  let app: express.Express, service: any, lookup: jest.Mock;
  beforeEach(() => {
    (SharedProductDescriptionService as jest.Mock).mockClear();
    lookup = jest.fn().mockResolvedValue({ id });
    app = express();
    app.use(express.json());
    app.use(
      '/masters',
      createProductMasterDescriptionController({
        getRepository: () => ({ findOne: lookup }),
      } as never),
    );
    service = (SharedProductDescriptionService as jest.Mock).mock.results[0].value;
  });
  it('opts the authenticated administrator save into renewal tracking and returns the actual canonical identity', async () => {
    const response = await request(app)
      .post(`/masters/${id}/store-descriptions`)
      .set('x-test-user', 'platform')
      .send({ content: '<p>설명</p>', descriptionType: 'STORE', language: 'ko' });
    expect(response.status).toBe(201);
    expect(service.setCanonical).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000002',
      'platform',
      { trackAdminEdit: true },
    );
    expect(response.body.data.id).toBe('00000000-0000-4000-8000-000000000003');
  });
  it('returns a conflict rather than success or an opaque internal failure when another canonical wins', async () => {
    service.setCanonical.mockRejectedValue(new CorrectionError('PRODUCT_SOURCE_CHANGED', 409));
    const response = await request(app)
      .post(`/masters/${id}/store-descriptions`)
      .set('x-test-user', 'platform')
      .send({ content: '<p>설명</p>' });
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ success: false, code: 'PRODUCT_SOURCE_CHANGED' });
  });
  it('continues to deny unauthenticated and service-admin writes before loading product data', async () => {
    expect(
      (await request(app).post(`/masters/${id}/store-descriptions`).send({ content: 'x' })).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .post(`/masters/${id}/store-descriptions`)
          .set('x-test-user', 'neture-admin')
          .send({ content: 'x' })
      ).status,
    ).toBe(403);
    expect(lookup).not.toHaveBeenCalled();
    expect(service.createCandidate).not.toHaveBeenCalled();
  });
});
