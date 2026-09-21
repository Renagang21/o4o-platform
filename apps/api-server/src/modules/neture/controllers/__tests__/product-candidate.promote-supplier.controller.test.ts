/**
 * Route tests — POST /api/v1/operator/product-candidates/:id/promote-supplier
 * WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1 §2.3 · §6.1
 *
 * authenticate / requireRole / requireProductDbWrite / injectServiceScope 는 stub,
 * SupplierCandidatePromotionService.promote 는 mock. 오류 클래스는 실제 모듈 것을 쓴다.
 * promote-master route 는 이 WO 에서 손대지 않았음을 같은 앱에서 확인한다.
 */
import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';

const mockPromote = jest.fn();
const mockPromoteMaster = jest.fn();

jest.mock('../../../../middleware/auth.middleware.js', () => ({
  authenticate: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const role = req.headers['x-test-role'] as string | undefined;
    if (!role) { res.status(401).json({ success: false, error: 'UNAUTHORIZED' }); return; }
    (req as unknown as { user: unknown }).user = { id: 'u-super', roles: [role] };
    next();
  },
  requireRole: (roles: string[]) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const mine = ((req as unknown as { user?: { roles?: string[] } }).user?.roles) ?? [];
    if (!mine.some((r) => roles.includes(r))) { res.status(403).json({ success: false, error: 'FORBIDDEN_ROLE' }); return; }
    next();
  },
}));
jest.mock('../product-db-write-authority.js', () => ({
  // 정본 requireAdmin = platform:super_admin 단독 — 여기서는 그 계약을 그대로 stub 한다
  requireProductDbWrite: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const mine = ((req as unknown as { user?: { roles?: string[] } }).user?.roles) ?? [];
    if (!mine.includes('platform:super_admin')) { res.status(403).json({ success: false, error: 'FORBIDDEN' }); return; }
    next();
  },
}));
jest.mock('../../../../utils/serviceScope.js', () => ({
  injectServiceScope: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  resolveOperatorScope: () => null,
  logCrossServiceQuery: () => undefined,
  PLATFORM_ADMIN_SCOPE_REQUIRED_RESPONSE: { success: false, error: 'SCOPE_REQUIRED' },
}));
jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../services/product-candidate.service.js', () => ({
  ProductCandidateService: jest.fn().mockImplementation(() => ({
    promoteMasterFromCandidate: mockPromoteMaster,
  })),
}));
jest.mock('../../promotion/adapters/supplier/supplier-candidate-promotion.service.js', () => {
  const actual = jest.requireActual('../../promotion/adapters/supplier/supplier-candidate-promotion.service.js');
  return {
    SupplierPromotionNotFoundError: actual.SupplierPromotionNotFoundError,
    SupplierCandidatePromotionService: jest.fn().mockImplementation(() => ({ promote: mockPromote })),
  };
});

import { createProductCandidateController } from '../product-candidate.controller.js';
import { SupplierPromotionNotFoundError } from '../../promotion/adapters/supplier/supplier-candidate-promotion.service.js';
import { SupplierNormalizationError } from '../../promotion/adapters/supplier/supplier-candidate.normalizer.js';
import { SupplierPolicyError } from '../../promotion/adapters/supplier/supplier-promotion.policy.js';

const CID = '33333333-3333-4333-8333-333333333333';
const URL = `/api/v1/operator/product-candidates/${CID}/promote-supplier`;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/operator/product-candidates', createProductCandidateController({} as unknown as DataSource));
  return app;
}

const asSuper = (r: request.Test) => r.set('x-test-role', 'platform:super_admin');

beforeEach(() => { mockPromote.mockReset(); mockPromoteMaster.mockReset(); });

describe('POST /:id/promote-supplier — 인증 · 권한', () => {
  it('미인증 → 401 · promote 미호출', async () => {
    const res = await request(makeApp()).post(URL).send({});
    expect(res.status).toBe(401);
    expect(mockPromote).not.toHaveBeenCalled();
  });

  it.each(['neture:operator', 'neture:admin'])('%s → 403 (공통 Product DB write 는 platform:super_admin 단독)', async (role) => {
    const res = await request(makeApp()).post(URL).set('x-test-role', role).send({});
    expect(res.status).toBe(403);
    expect(mockPromote).not.toHaveBeenCalled();
  });

  it('platform:super_admin → 통과 · reviewedBy=user.id · note trim', async () => {
    mockPromote.mockResolvedValue({ outcome: { kind: 'hold', reason: 'name_missing' }, normalized: {} });
    const res = await asSuper(request(makeApp()).post(URL)).send({ note: '  메모  ' });
    expect(res.status).toBe(200);
    expect(mockPromote).toHaveBeenCalledWith(CID, { reviewedBy: 'u-super', note: '메모' });
  });
});

describe('POST /:id/promote-supplier — 200 outcome 4종', () => {
  it('create', async () => {
    mockPromote.mockResolvedValue({ outcome: { kind: 'create', masterId: 'm-1', identifiersCreated: 1 }, normalized: {} });
    const res = await asSuper(request(makeApp()).post(URL)).send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { outcome: 'create', masterId: 'm-1', identifiersCreated: 1 } });
  });

  it('link (matchType · existingMasterDiff 포함)', async () => {
    const diff = { nameDiffers: true, manufacturerDiffers: false, specificationDiffers: false, existing: { name: 'a', manufacturerName: 'b', specification: null }, plan: { name: 'A', manufacturerName: 'b', specification: null } };
    mockPromote.mockResolvedValue({ outcome: { kind: 'link', masterId: 'm-2', identifiersCreated: 0, matchType: 'barcode', existingMasterDiff: diff }, normalized: {} });
    const res = await asSuper(request(makeApp()).post(URL)).send({});
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ outcome: 'link', masterId: 'm-2', identifiersCreated: 0, matchType: 'barcode', existingMasterDiff: diff });
  });

  it('conflict', async () => {
    const masters = [{ id: 'm-a', matchType: 'barcode' }, { id: 'm-b', matchType: 'name_manufacturer' }];
    mockPromote.mockResolvedValue({ outcome: { kind: 'conflict', reason: 'multiple_masters_match', masters }, normalized: {} });
    const res = await asSuper(request(makeApp()).post(URL)).send({});
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ outcome: 'conflict', reason: 'multiple_masters_match', masters });
  });

  it('hold (rx_not_promotable)', async () => {
    mockPromote.mockResolvedValue({ outcome: { kind: 'hold', reason: 'rx_not_promotable' }, normalized: {} });
    const res = await asSuper(request(makeApp()).post(URL)).send({});
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ outcome: 'hold', reason: 'rx_not_promotable' });
  });
});

describe('POST /:id/promote-supplier — 오류 매핑', () => {
  it.each([
    ['SUPPLIER_REGULATED_CREATE_BLOCKED', { regulatoryType: 'HEALTH_FUNCTIONAL' }],
    ['SUPPLIER_REGULATORY_TYPE_MISMATCH', { regulatoryType: 'GENERAL', existingMaster: { id: 'm-1', regulatoryType: '건강기능식품', drugCategory: null } }],
    ['SUPPLIER_RX_LINK_BLOCKED', { regulatoryType: 'DRUG', existingMaster: { id: 'm-1', regulatoryType: 'DRUG', drugCategory: 'rx' } }],
  ] as const)('정책 위반 %s → 409 + data', async (code, data) => {
    mockPromote.mockRejectedValue(new SupplierPolicyError(code, data as never));
    const res = await asSuper(request(makeApp()).post(URL)).send({});
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ success: false, error: code, data });
  });

  it.each(['SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE', 'SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED', 'SUPPLIER_ID_MISSING'] as const)(
    '정규화 실패 %s → 400', async (code) => {
      mockPromote.mockRejectedValue(new SupplierNormalizationError(code));
      const res = await asSuper(request(makeApp()).post(URL)).send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe(code);
    },
  );

  it('후보 없음 → 404 CANDIDATE_NOT_FOUND', async () => {
    mockPromote.mockRejectedValue(new SupplierPromotionNotFoundError(CID));
    const res = await asSuper(request(makeApp()).post(URL)).send({});
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'CANDIDATE_NOT_FOUND' });
  });

  it('알 수 없는 오류 → handleMutationError (500 INTERNAL_ERROR)', async () => {
    mockPromote.mockRejectedValue(new Error('boom'));
    const res = await asSuper(request(makeApp()).post(URL)).send({});
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /:id/promote-master — 기존 route 불변 (이 WO 미접촉)', () => {
  it('여전히 service.promoteMasterFromCandidate 를 호출하고 supplier 승격은 타지 않는다', async () => {
    mockPromoteMaster.mockResolvedValue({ masterId: 'm-old' });
    const res = await asSuper(request(makeApp()).post(`/api/v1/operator/product-candidates/${CID}/promote-master`)).send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { masterId: 'm-old' } });
    expect(mockPromoteMaster).toHaveBeenCalledWith(CID);
    expect(mockPromote).not.toHaveBeenCalled();
  });

  it('NOT_PROMOTABLE_* → 400 (기존 매핑 유지)', async () => {
    mockPromoteMaster.mockRejectedValue(new Error('NOT_PROMOTABLE_SOURCE'));
    const res = await asSuper(request(makeApp()).post(`/api/v1/operator/product-candidates/${CID}/promote-master`)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('NOT_PROMOTABLE_SOURCE');
  });
});
