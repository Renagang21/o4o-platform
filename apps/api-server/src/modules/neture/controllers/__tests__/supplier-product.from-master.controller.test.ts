/**
 * Route tests — POST /api/v1/neture/supplier/products/from-master
 * WO-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1 §2.1 · §6.1
 *
 * requireAuth / requireActiveSupplier 는 stub(헤더로 인증·공급자 상태 주입), NetureService 는 mock.
 *
 * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1 §2.4:
 *   레거시 POST /products(createSupplierOffer) 는 제거되었다 — "기존 POST /products 불변" 기대는 은퇴 계약으로 뒤집었다.
 *   공급자 Offer 생성 = from-master 하나뿐. NetureService mock 에도 createSupplierOffer 는 두지 않는다.
 */
import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';

const mockFromMaster = jest.fn();

jest.mock('../../../../middleware/auth.middleware.js', () => ({
  requireAuth: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const uid = req.headers['x-test-user'] as string | undefined;
    if (!uid) { res.status(401).json({ success: false, error: 'UNAUTHORIZED' }); return; }
    (req as unknown as { user: unknown }).user = { id: uid, roles: [] };
    next();
  },
}));
jest.mock('../../middleware/neture-identity.middleware.js', () => ({
  createRequireActiveSupplier: () => (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // 실제 middleware 계약: neture_suppliers.user_id 로 조회 → 없으면 403 SUPPLIER_NOT_FOUND, ACTIVE 아니면 403 SUPPLIER_NOT_ACTIVE
    const status = req.headers['x-test-supplier-status'] as string | undefined;
    if (!status) { res.status(403).json({ success: false, error: 'SUPPLIER_NOT_FOUND' }); return; }
    if (status !== 'ACTIVE') { res.status(403).json({ success: false, error: 'SUPPLIER_NOT_ACTIVE' }); return; }
    (req as unknown as { supplierId: string }).supplierId = 'sup-from-middleware';
    next();
  },
  createRequireLinkedSupplier: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  createGetSupplierIdFromUser: () => async () => null,
}));
jest.mock('../../neture.service.js', () => ({
  NetureService: jest.fn().mockImplementation(() => ({
    createSupplierOfferFromExistingMaster: mockFromMaster,
  })),
}));
jest.mock('../../services/product-candidate.service.js', () => ({ ProductCandidateService: jest.fn().mockImplementation(() => ({})) }));
jest.mock('../../../../middleware/upload.middleware.js', () => ({
  uploadSingleMiddleware: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));
jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { createSupplierProductController } from '../supplier-product.controller.js';

const MASTER_ID = '11111111-1111-4111-8111-111111111111';
const URL = '/api/v1/neture/supplier/products/from-master';
const LEGACY_URL = '/api/v1/neture/supplier/products';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/neture/supplier', createSupplierProductController({} as unknown as DataSource));
  return app;
}

const asActiveSupplier = (r: request.Test) => r.set('x-test-user', 'u1').set('x-test-supplier-status', 'ACTIVE');

beforeEach(() => { mockFromMaster.mockReset(); });

describe('guard 체인 — requireAuth → requireActiveSupplier', () => {
  it('미인증 → 401 · 서비스 미호출', async () => {
    const res = await request(makeApp()).post(URL).send({ masterId: MASTER_ID });
    expect(res.status).toBe(401);
    expect(mockFromMaster).not.toHaveBeenCalled();
  });

  it('인증됐지만 공급자 아님 → 403 SUPPLIER_NOT_FOUND', async () => {
    const res = await request(makeApp()).post(URL).set('x-test-user', 'u1').send({ masterId: MASTER_ID });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('SUPPLIER_NOT_FOUND');
    expect(mockFromMaster).not.toHaveBeenCalled();
  });

  it('공급자 PENDING → 403 SUPPLIER_NOT_ACTIVE (middleware 단계)', async () => {
    const res = await request(makeApp()).post(URL).set('x-test-user', 'u1').set('x-test-supplier-status', 'PENDING').send({ masterId: MASTER_ID });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('SUPPLIER_NOT_ACTIVE');
    expect(mockFromMaster).not.toHaveBeenCalled();
  });
});

describe('supplierId 는 middleware 확정값 · body 전달', () => {
  it('서비스에 middleware supplierId 와 raw body 를 그대로 넘긴다 (body.supplierId 로 대체되지 않음)', async () => {
    mockFromMaster.mockResolvedValue({ success: true, data: { id: 'o1', masterId: MASTER_ID } });
    const body = { masterId: MASTER_ID, priceGeneral: 1000, supplierId: 'attacker' };
    const res = await asActiveSupplier(request(makeApp()).post(URL)).send(body);
    expect(res.status).toBe(201);
    expect(mockFromMaster).toHaveBeenCalledWith('sup-from-middleware', body);
    expect(mockFromMaster.mock.calls[0][0]).not.toBe('attacker');
  });

  it('성공 → 201 · data.masterId 는 요청 masterId', async () => {
    mockFromMaster.mockResolvedValue({ success: true, data: { id: 'o1', masterId: MASTER_ID, approvalStatus: 'PENDING' } });
    const res = await asActiveSupplier(request(makeApp()).post(URL)).send({ masterId: MASTER_ID });
    expect(res.status).toBe(201);
    expect(res.body.data.masterId).toBe(MASTER_ID);
  });
});

describe('오류 코드 → HTTP status 매핑 (WO §2.2)', () => {
  it.each([
    ['INVALID_MASTER_ID', 400],
    ['MASTER_NOT_FOUND', 404],
    ['MASTER_NOT_ACTIVE', 409],
    ['MASTER_REGULATORY_TYPE_UNSUPPORTED', 409],
    ['OFFER_ALREADY_EXISTS', 409],
    ['OFFER_IN_RECYCLE_BIN', 409],
    ['SUPPLIER_NOT_ACTIVE', 403],
    ['SUPPLIER_ID_NOT_ALLOWED', 400],
    ['MASTER_FIELD_NOT_ALLOWED', 400],
    ['UNSUPPORTED_FIELD', 400],
    ['PUBLIC_REQUIRES_DESCRIPTION', 400],
    ['DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN', 400],
    ['DRUG_SERVICE_CONTEXT_REQUIRED', 400],
    ['DRUG_NON_PHARMACY_SERVICE', 400],
    ['PERMIT_REQUIRED_FOR_UNVERIFIED_REGULATED', 400],
  ])('%s → %d', async (code, status) => {
    mockFromMaster.mockResolvedValue({ success: false, error: code, message: 'm' });
    const res = await asActiveSupplier(request(makeApp()).post(URL)).send({ masterId: MASTER_ID });
    expect(res.status).toBe(status);
    expect(res.body).toMatchObject({ success: false, error: code });
  });

  it('서비스 예외 → 500 INTERNAL_ERROR', async () => {
    mockFromMaster.mockRejectedValue(new Error('boom'));
    const res = await asActiveSupplier(request(makeApp()).post(URL)).send({ masterId: MASTER_ID });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_ERROR');
  });
});

describe('(은퇴) 레거시 POST /products — 라우트 없음 · 어떤 서비스도 호출되지 않음', () => {
  it('활성 공급자가 레거시 body 로 POST /products 해도 404 (express 기본) · from-master 서비스 미호출', async () => {
    const res = await asActiveSupplier(request(makeApp()).post(LEGACY_URL)).send({ barcode: '880', name: 'x', manufacturerName: 'm', priceGeneral: 1000 });
    expect(res.status).toBe(404);
    expect(mockFromMaster).not.toHaveBeenCalled();
  });

  it('미인증 POST /products 도 404 (guard 체인 이전에 라우트 자체가 없다)', async () => {
    const res = await request(makeApp()).post(LEGACY_URL).send({ barcode: '880', name: 'x' });
    expect(res.status).toBe(404);
  });
});
