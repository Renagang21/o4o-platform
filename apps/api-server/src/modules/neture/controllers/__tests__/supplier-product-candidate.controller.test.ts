/**
 * WO-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1 §6.1 라우트 테스트
 *
 * requireAuth 는 x-test-user 헤더 stub · requireActiveSupplier 는 실제 middleware(dataSource.query mock) ·
 * ProductCandidateService.createCandidate 는 mock 주입.
 */
import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { createSupplierProductCandidateController } from '../supplier-product-candidate.controller.js';

jest.mock('../../../../common/middleware/auth/authentication.middleware.js', () => {
  const stub = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const id = req.headers['x-test-user'] as string | undefined;
    if (!id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    (req as unknown as { user: unknown }).user = { id, email: `${id}@test.local` };
    next();
  };
  return { requireAuth: stub, authenticate: stub, authenticateToken: stub, authenticateCookie: stub };
});

const SUPPLIER_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const CANDIDATE_ID = '33333333-3333-4333-8333-333333333333';

function dataSourceWithSupplier(row: { id: string; status: string } | null): DataSource {
  return {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('neture_suppliers')) return row ? [row] : [];
      throw new Error(`unexpected query: ${sql}`);
    }),
  } as unknown as DataSource;
}

function makeApp(dataSource: DataSource, createCandidate: jest.Mock) {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/neture/supplier', createSupplierProductCandidateController(dataSource, { candidateService: { createCandidate } as any }));
  return app;
}

const createdCandidate = (overrides: Record<string, unknown> = {}) => ({
  id: CANDIDATE_ID,
  candidateStatus: 'pending',
  identifierType: null,
  identifierValue: null,
  normalizedIdentifierValue: null,
  ...overrides,
});

describe('POST /api/v1/neture/supplier/product-candidates', () => {
  it('미인증 → 401 · createCandidate 미호출', async () => {
    const create = jest.fn();
    const res = await request(makeApp(dataSourceWithSupplier({ id: SUPPLIER_ID, status: 'ACTIVE' }), create))
      .post('/api/v1/neture/supplier/product-candidates')
      .send({ name: 'A' });
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it('공급자 행 없음 → 403 NO_SUPPLIER', async () => {
    const create = jest.fn();
    const res = await request(makeApp(dataSourceWithSupplier(null), create))
      .post('/api/v1/neture/supplier/product-candidates')
      .set('x-test-user', USER_ID)
      .send({ name: 'A' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NO_SUPPLIER');
    expect(create).not.toHaveBeenCalled();
  });

  it('PENDING 공급자 → 403 SUPPLIER_NOT_ACTIVE', async () => {
    const create = jest.fn();
    const res = await request(makeApp(dataSourceWithSupplier({ id: SUPPLIER_ID, status: 'PENDING' }), create))
      .post('/api/v1/neture/supplier/product-candidates')
      .set('x-test-user', USER_ID)
      .send({ name: 'A' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SUPPLIER_NOT_ACTIVE');
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ['CANDIDATE_NAME_REQUIRED', {}],
    ['INVALID_REGULATORY_TYPE', { name: 'A', regulatoryType: '일반' }],
    ['DRUG_CATEGORY_REQUIRED', { name: 'A', regulatoryType: 'DRUG' }],
    ['INVALID_PRICE', { name: 'A', offerDraft: { priceGeneral: -5 } }],
    ['INVALID_URL', { name: 'A', imageUrl: 'ftp://x' }],
    ['INVALID_CATEGORY_ID', { name: 'A', categoryId: 'nope' }],
    ['FORBIDDEN_FIELD', { name: 'A', supplierId: 'other-supplier' }],
    ['FORBIDDEN_FIELD', { name: 'A', distributionType: 'PUBLIC' }],
    ['FORBIDDEN_FIELD', { name: 'A', offerDraft: { stockQty: 3 } }],
    ['FIELD_TOO_LONG', { name: 'x'.repeat(201) }],
  ])('400 %s (flat error shape · createCandidate 미호출)', async (code, body) => {
    const create = jest.fn();
    const res = await request(makeApp(dataSourceWithSupplier({ id: SUPPLIER_ID, status: 'ACTIVE' }), create))
      .post('/api/v1/neture/supplier/product-candidates')
      .set('x-test-user', USER_ID)
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: code, message: expect.any(String) });
    expect(create).not.toHaveBeenCalled();
  });

  it('201 · 응답 shape · createCandidate 정확히 1회 · CreateCandidateInput 검증(supplierId 는 middleware 값)', async () => {
    const create = jest.fn(async () =>
      createdCandidate({ identifierType: 'EAN13', identifierValue: '8801234567890', normalizedIdentifierValue: '8801234567890' }),
    );
    const res = await request(makeApp(dataSourceWithSupplier({ id: SUPPLIER_ID, status: 'ACTIVE' }), create))
      .post('/api/v1/neture/supplier/product-candidates')
      .set('x-test-user', USER_ID)
      .send({
        name: '테스트 상품',
        barcode: '8801234567890',
        manufacturerName: '제조사',
        regulatoryType: 'HEALTH_FUNCTIONAL',
        offerDraft: { priceGeneral: 9000, isFeatured: true },
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      data: {
        candidateId: CANDIDATE_ID,
        candidateStatus: 'pending',
        identifierType: 'EAN13',
        identifierValue: '8801234567890',
        normalizedIdentifierValue: '8801234567890',
      },
    });

    expect(create).toHaveBeenCalledTimes(1);
    const input = create.mock.calls[0][0];
    expect(input).toMatchObject({
      serviceKey: 'neture',
      organizationId: null,
      sourceType: 'supplier_web',
      sourceId: null,
      sourceLabel: 'neture-supplier-single',
      submittedBy: USER_ID,
      identifierType: 'EAN13',
      identifierValue: '8801234567890',
      candidateName: '테스트 상품',
      candidateManufacturer: '제조사',
      candidatePrice: 9000,
    });
    expect(input.rawPayload).toMatchObject({
      source: 'supplier_single',
      supplierId: SUPPLIER_ID,
      regulatoryType: 'HEALTH_FUNCTIONAL',
      product_type: 'health_functional',
      offerDraft: { priceGeneral: 9000, isFeatured: true },
    });
  });

  it('바코드 없음 → 201 · identifier null (제조사 없어도 통과 · 합성 없음)', async () => {
    const create = jest.fn(async () => createdCandidate());
    const res = await request(makeApp(dataSourceWithSupplier({ id: SUPPLIER_ID, status: 'ACTIVE' }), create))
      .post('/api/v1/neture/supplier/product-candidates')
      .set('x-test-user', USER_ID)
      .send({ name: '이름만' });
    expect(res.status).toBe(201);
    expect(res.body.data.identifierType).toBeNull();
    const input = create.mock.calls[0][0];
    expect(input.candidateManufacturer).toBeNull();
    expect(input.identifierType).toBeNull();
    expect(input.identifierValue).toBeNull();
  });

  it('createCandidate throw → 500 INTERNAL_ERROR', async () => {
    const create = jest.fn(async () => { throw new Error('db down'); });
    const res = await request(makeApp(dataSourceWithSupplier({ id: SUPPLIER_ID, status: 'ACTIVE' }), create))
      .post('/api/v1/neture/supplier/product-candidates')
      .set('x-test-user', USER_ID)
      .send({ name: 'A' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'INTERNAL_ERROR', message: expect.any(String) });
  });
});
