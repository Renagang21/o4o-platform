import express from 'express';
import request from 'supertest';
import { Readable } from 'node:stream';
import type { DataSource } from 'typeorm';

const mockBusiness = Object.fromEntries(
  [
    'registerSupplier',
    'getSupplierDashboardSummary',
    'getSupplierProfile',
    'updateSupplierProfile',
    'createSupplierOfferFromExistingMaster',
    'getSupplierProductsPaginated',
    'getSupplierProducts',
    'getSupplierProductApprovalCounts',
    'submitForApproval',
    'bulkDeleteOffers',
    'batchUpdateSupplierOffers',
    'updateBusinessContent',
    'updateSupplierOffer',
    'updateDistribution',
    'getServicePrices',
    'setServicePrices',
  ].map((n) => [n, jest.fn()]),
);
const mockOnboarding = Object.fromEntries(
  [
    'getOnboarding',
    'updateOnboarding',
    'uploadDocument',
    'getDocumentForSupplier',
    'createReadStream',
  ].map((n) => [n, jest.fn()]),
);
const mockCategories = Object.fromEntries(
  [
    'listForSupplier',
    'selectCategory',
    'removeCategory',
    'uploadEvidence',
    'getEvidenceDocument',
    'createReadStream',
  ].map((n) => [n, jest.fn()]),
);
const mockCandidate = jest.fn();
const mockMembership = jest.fn();
const mockUpload = jest.fn();
jest.mock('../../../../middleware/auth.middleware.js', () => ({
  requireAuth: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.headers['x-test-user'])
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    (req as any).user = { id: 'fixture-user' };
    next();
  },
}));
jest.mock('../../middleware/supplier-context.resolver.js', () => ({
  readOrganizationContext: jest.requireActual('../../middleware/supplier-context.resolver.js')
    .readOrganizationContext,
  resolveSupplierForUser: async (_ds: unknown, _uid: string, context?: string) => {
    if (context === 'none') return { kind: 'none' };
    if (context === 'foreign') return { kind: 'forbidden_context' };
    if (context === 'multiple')
      return { kind: 'context_required', candidates: [{ organizationId: 'fixture-org' }] };
    return {
      kind: 'resolved',
      supplierId: 'fixture-supplier',
      organizationId: 'fixture-org',
      status: context === 'pending' ? 'PENDING' : 'ACTIVE',
    };
  },
}));
jest.mock('../../../../middleware/neture-main-membership.middleware.js', () => ({
  requireNetureMainMembership:
    () => (req: express.Request, res: express.Response, next: express.NextFunction) => {
      mockMembership();
      if (req.headers['x-test-membership'] === 'denied')
        return res
          .status(403)
          .json({ success: false, error: { code: 'NETURE_MEMBERSHIP_REQUIRED' } });
      next();
    },
}));
jest.mock('../../neture.service.js', () => ({
  NetureService: jest.fn().mockImplementation(() => mockBusiness),
}));
jest.mock('../../services/supplier-onboarding.service.js', () => ({
  SupplierOnboardingService: jest.fn().mockImplementation(() => mockOnboarding),
}));
jest.mock('../../services/supplier-regulated-category.service.js', () => ({
  SupplierRegulatedCategoryService: jest.fn().mockImplementation(() => mockCategories),
}));
jest.mock('../../services/product-candidate.service.js', () => ({
  ProductCandidateService: jest.fn().mockImplementation(() => ({ createCandidate: mockCandidate })),
}));
jest.mock('../../services/supplier.service.js', () => ({
  SupplierProfileNameInvalidError: class extends Error {},
  SupplierProfileEmailInvalidError: class extends Error {},
  SupplierProfileEntityTypeInvalidError: class extends Error {},
  SupplierProfileFieldUnsupportedError: class extends Error {
    constructor(public fields: string[]) {
      super('unsupported');
    }
  },
}));
jest.mock('../../../policy-acceptance/policy-acceptance.service.js', () => ({
  PolicyAcceptanceError: class extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly httpStatus = 409,
    ) {
      super(message);
    }
  },
}));
jest.mock('../../../../middleware/upload.middleware.js', () => ({
  uploadSingleMiddleware:
    () => (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      mockUpload();
      if (req.headers['x-test-file'])
        req.file = {
          originalname: 'fixture.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('fixture'),
        } as Express.Multer.File;
      next();
    },
}));
jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { createSupplierManagementController } from '../supplier-management.controller.js';
import { createSupplierProductController } from '../supplier-product.controller.js';
import { SupplierProfileFieldUnsupportedError } from '../../services/supplier.service.js';
import { SupplierProfileNameInvalidError, SupplierProfileEntityTypeInvalidError, SupplierProfileEmailInvalidError } from '../../services/supplier.service.js';
import { PolicyAcceptanceError } from '../../../policy-acceptance/policy-acceptance.service.js';

const app = express();
app.use(express.json());
app.use('/supplier', createSupplierManagementController({} as DataSource));
app.use('/supplier', createSupplierProductController({} as DataSource));
const send = (method: string, path: string) =>
  (request(app) as any)[method]('/supplier' + path).set('x-test-user', 'fixture-user');
const write = () => send('post', '/products/bulk-candidates');
beforeEach(() => {
  jest.clearAllMocks();
  for (const group of [mockBusiness, mockOnboarding, mockCategories])
    for (const fn of Object.values(group)) fn.mockReset();
  mockCandidate.mockReset().mockImplementation(async () => ({
    id: `fixture-candidate-${mockCandidate.mock.calls.length}`,
  }));
  mockBusiness.getSupplierProfile.mockResolvedValue({ id: 'fixture-supplier' });
  mockBusiness.getSupplierDashboardSummary.mockResolvedValue({ count: 0 });
  mockBusiness.registerSupplier.mockResolvedValue({
    success: true,
    data: { id: 'fixture-supplier' },
  });
  mockBusiness.updateSupplierProfile.mockResolvedValue({ id: 'fixture-supplier' });
  mockOnboarding.getOnboarding.mockResolvedValue({ supplierId: 'fixture-supplier' });
  mockOnboarding.updateOnboarding.mockResolvedValue({
    success: true,
    data: { taxInvoiceEmail: 'fixture@example.invalid' },
  });
  mockCategories.listForSupplier.mockResolvedValue([]);
  mockCategories.selectCategory.mockResolvedValue({ success: true, data: { category: 'general' } });
  mockCategories.removeCategory.mockResolvedValue({ success: true });
  mockOnboarding.uploadDocument.mockResolvedValue({
    success: true,
    data: { fileName: 'fixture.pdf' },
  });
  mockCategories.uploadEvidence.mockResolvedValue({
    success: true,
    data: { fileName: 'fixture.pdf' },
  });
  mockBusiness.getSupplierProducts.mockResolvedValue([]);
  mockBusiness.getSupplierProductsPaginated.mockResolvedValue({
    data: [],
    pagination: { total: 0 },
  });
  mockBusiness.getSupplierProductApprovalCounts.mockResolvedValue({ total: 0 });
});

describe('business HTTP ownership and actual supplier identity gates (resolver/service I/O fixtures)', () => {
  it.each([
    ['get', '/profile'],
    ['get', '/dashboard/summary'],
    ['get', '/onboarding'],
    ['get', '/regulated-categories'],
    ['post', '/register'],
    ['post', '/products/bulk-candidates'],
  ])('%s %s authenticates before services', async (method, path) => {
    const res = await (request(app) as any)[method]('/supplier' + path).send({});
    expect(res.status).toBe(401);
    expect(mockBusiness.getSupplierProfile).not.toHaveBeenCalled();
    expect(mockCandidate).not.toHaveBeenCalled();
  });
  it.each([
    ['none', 403, 'NO_SUPPLIER'],
    ['foreign', 403, 'SUPPLIER_CONTEXT_FORBIDDEN'],
    ['multiple', 409, 'SUPPLIER_CONTEXT_REQUIRED'],
  ])('%s supplier context remains explicit', async (context, status, code) => {
    const res = await send('patch', '/profile')
      .set('x-organization-id', context)
      .send({ representativeName: 'fixture' });
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
    expect(mockBusiness.updateSupplierProfile).not.toHaveBeenCalled();
  });
  it('allows pending profile/onboarding maintenance without active membership gate', async () => {
    expect(
      (
        await send('patch', '/profile').set('x-organization-id', 'pending').send({
          name: 'Updated fixture',
          representativeName: 'fixture',
          supplierId: 'foreign',
          taxInvoiceEmail: 'foreign@example.invalid',
        })
      ).status,
    ).toBe(200);
    expect(mockBusiness.updateSupplierProfile).toHaveBeenCalledWith(
      'fixture-supplier',
      expect.objectContaining({ name: 'Updated fixture', representativeName: 'fixture' }),
    );
    expect(mockBusiness.updateSupplierProfile.mock.lastCall![1]).not.toHaveProperty(
      'taxInvoiceEmail',
    );
    expect(mockBusiness.updateSupplierProfile.mock.lastCall![1]).not.toHaveProperty('supplierId');
    expect(
      (
        await send('patch', '/onboarding')
          .set('x-organization-id', 'pending')
          .send({ taxInvoiceEmail: 'fixture@example.invalid' })
      ).status,
    ).toBe(200);
    expect(mockOnboarding.updateOnboarding).toHaveBeenCalledWith('fixture-supplier', {
      taxInvoiceEmail: 'fixture@example.invalid',
    });
    expect(mockMembership).not.toHaveBeenCalled();
  });
  it('forwards the private manager email independently from public contact', async () => {
    mockBusiness.updateSupplierProfile.mockResolvedValueOnce({ id: 'fixture-supplier' });
    const result = await send('patch', '/profile').send({ managerEmail: 'person@example.invalid', contactEmail: 'public@example.invalid' });
    expect(result.status).toBe(200);
    expect(mockBusiness.updateSupplierProfile).toHaveBeenCalledWith('fixture-supplier', expect.objectContaining({ managerEmail: 'person@example.invalid', contactEmail: 'public@example.invalid' }));
  });
  it('returns an actionable 400 for an invalid private manager email', async () => {
    mockBusiness.updateSupplierProfile.mockRejectedValueOnce(new SupplierProfileEmailInvalidError());
    const result = await send('patch', '/profile').send({ managerEmail: 'invalid' });
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ success: false, error: 'INVALID_MANAGER_EMAIL' });
  });
  it('returns an actionable 400 for a legacy or invalid business classification', async () => {
    mockBusiness.updateSupplierProfile.mockRejectedValueOnce(new SupplierProfileEntityTypeInvalidError());
    const result = await send('patch', '/profile').send({ businessEntityType: 'simple_taxpayer' });
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ success: false, error: 'SUPPLIER_PROFILE_ENTITY_TYPE_INVALID' });
  });
  it('returns an actionable 400 when a business name is invalid', async () => {
    mockBusiness.updateSupplierProfile.mockRejectedValueOnce(new SupplierProfileNameInvalidError());
    const result = await send('patch', '/profile').send({ name: '   ' });
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ success: false, error: 'SUPPLIER_PROFILE_NAME_INVALID' });
  });
  it('profile absence, unsupported fields and genuine failures keep their error shapes', async () => {
    mockBusiness.getSupplierProfile.mockResolvedValue(null);
    expect((await send('get', '/profile')).body).toEqual({
      success: false,
      error: 'SUPPLIER_NOT_FOUND',
    });
    mockBusiness.updateSupplierProfile.mockRejectedValueOnce(
      new SupplierProfileFieldUnsupportedError(['businessEntityType']),
    );
    const unsupported = await send('patch', '/profile').send({ businessEntityType: 'corporation' });
    expect(unsupported.status).toBe(400);
    expect(unsupported.body).toMatchObject({
      error: 'SUPPLIER_PROFILE_FIELD_UNSUPPORTED',
      fields: ['businessEntityType'],
    });
    mockBusiness.getSupplierProfile.mockRejectedValue(new Error('fixture'));
    expect((await send('get', '/profile')).status).toBe(500);
  });
  it.each([
    ['NETURE_MEMBERSHIP_REQUIRED', 403],
    ['MISSING_NAME', 400],
    ['SLUG_ALREADY_EXISTS', 409],
    ['USER_ALREADY_HAS_SUPPLIER', 409],
  ])('registration %s → %s', async (error, status) => {
    mockBusiness.registerSupplier.mockResolvedValue({ success: false, error });
    const res = await send('post', '/register').send({
      name: 'fixture',
      slug: 'fixture',
      supplierId: 'foreign',
    });
    expect(res.status).toBe(status);
    expect(res.body.error).toEqual({ code: error, message: error });
    expect(mockBusiness.registerSupplier).toHaveBeenCalledWith(
      'fixture-user',
      expect.not.objectContaining({ supplierId: 'foreign' }),
    );
  });
  it('registration returns 201 and preserves policy acceptance 428', async () => {
    expect(
      (await send('post', '/register').send({ name: 'fixture', policyReferences: [] })).status,
    ).toBe(201);
    mockBusiness.registerSupplier.mockRejectedValue(
      new PolicyAcceptanceError('POLICY_ACCEPTANCE_REQUIRED', 'fixture policy required', 428),
    );
    const res = await send('post', '/register').send({});
    expect(res.status).toBe(428);
    expect(res.body.error.code).toBe('POLICY_ACCEPTANCE_REQUIRED');
  });
  it('onboarding distinguishes not found and validation failures', async () => {
    mockOnboarding.getOnboarding.mockResolvedValue(null);
    const get = await send('get', '/onboarding');
    expect(get.status).toBe(404);
    expect(get.body.error.code).toBe('SUPPLIER_NOT_FOUND');
    mockOnboarding.updateOnboarding.mockResolvedValue({ success: false, error: 'INVALID_ACCOUNT' });
    expect((await send('patch', '/onboarding').send({})).body.error.code).toBe('INVALID_ACCOUNT');
  });
  it('category selection/removal delegates resolved supplier and preserves locks', async () => {
    expect((await send('get', '/regulated-categories')).body.data).toEqual([]);
    expect(
      (
        await send('post', '/regulated-categories').send({
          category: 'general',
          supplierId: 'foreign',
        })
      ).status,
    ).toBe(201);
    expect(mockCategories.selectCategory).toHaveBeenCalledWith('fixture-supplier', 'general');
    mockCategories.removeCategory.mockResolvedValue({ success: false, error: 'CATEGORY_LOCKED' });
    const res = await send('delete', '/regulated-categories/pharmaceutical');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CATEGORY_LOCKED');
  });
  it.each([
    ['/documents/bank_statement', mockOnboarding.uploadDocument],
    ['/regulated-categories/pharmaceutical/document', mockCategories.uploadEvidence],
  ])('upload %s preserves missing-file and middleware ordering', async (path, fn) => {
    expect((await send('post', path).set('x-organization-id', 'foreign')).status).toBe(403);
    expect(mockUpload).not.toHaveBeenCalled();
    expect((await send('post', path)).body.error.code).toBe('FILE_REQUIRED');
    const res = await send('post', path).set('x-test-file', 'pdf');
    expect(res.status).toBe(201);
    expect(fn.mock.lastCall![0]).toBe('fixture-supplier');
    expect(fn.mock.lastCall![2].mimetype).toBe('application/pdf');
  });
  it.each([
    [
      '/documents/bank_statement/download',
      mockOnboarding.getDocumentForSupplier,
      mockOnboarding.createReadStream,
    ],
    [
      '/regulated-categories/pharmaceutical/document/download',
      mockCategories.getEvidenceDocument,
      mockCategories.createReadStream,
    ],
  ])('download %s preserves streamed bytes, headers and errors', async (path, read, stream) => {
    read.mockResolvedValue({ fileName: 'fixture name.pdf' });
    stream.mockImplementation(() => Readable.from(['fixture PDF']));
    let res = await send('get', path);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe('inline; filename="fixture%20name.pdf"');
    expect(res.body.toString()).toBe('fixture PDF');
    read.mockResolvedValue(null);
    res = await send('get', path);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    read.mockRejectedValue(new Error('fixture'));
    expect((await send('get', path)).body.error.code).toBe('DOWNLOAD_FAILED');
  });
});

describe('products and bulk Candidate contracts', () => {
  it('pending and membership-denied writers never reach Candidate creation', async () => {
    const pending = await write()
      .set('x-organization-id', 'pending')
      .send({ productType: 'non_drug', rows: [{ fields: { 제품명: 'fixture' } }] });
    expect(pending.status).toBe(403);
    expect(pending.body.error.code).toBe('SUPPLIER_NOT_ACTIVE');
    expect((await write().set('x-test-membership', 'denied').send({})).status).toBe(403);
    expect(mockCandidate).not.toHaveBeenCalled();
  });
  it('product list compatibility and query filtering retain linked gates', async () => {
    expect((await send('get', '/products').set('x-organization-id', 'pending')).body.data).toEqual(
      [],
    );
    expect(mockBusiness.getSupplierProducts).toHaveBeenCalledWith('fixture-supplier');
    await send('get', '/products?page=2&hasImage=false&serviceApprovalStatus=pending');
    expect(mockBusiness.getSupplierProductsPaginated).toHaveBeenCalledWith(
      'fixture-supplier',
      expect.objectContaining({ page: 2, hasImage: 'false', serviceApprovalStatus: 'pending' }),
    );
    await send('get', '/products/approval-counts?keyword=fixture');
    expect(mockBusiness.getSupplierProductApprovalCounts).toHaveBeenCalledWith(
      'fixture-supplier',
      expect.objectContaining({ keyword: 'fixture' }),
    );
  });
  it.each([
    ['post', '/products/submit-approval', { offerIds: [] }, 'INVALID_OFFER_IDS'],
    ['delete', '/products/bulk', { offerIds: [] }, 'INVALID_OFFER_IDS'],
    ['patch', '/products/batch', { updates: [] }, 'INVALID_UPDATES'],
    ['patch', '/products/fixture/distribution', { serviceKeys: 'bad' }, 'INVALID_SERVICE_KEYS'],
    ['put', '/products/fixture/service-prices', { prices: 'bad' }, 'INVALID_PRICES'],
  ])('%s %s validates input before writes', async (method, path, body, error) => {
    const res = await send(method as string, path as string).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(error);
  });
  it('distribution and service price ownership failures remain 403', async () => {
    mockBusiness.updateDistribution.mockResolvedValue({ success: false, error: 'NOT_OWNED' });
    expect(
      (
        await send('patch', '/products/fixture/distribution').send({
          isPublic: false,
          serviceKeys: [],
        })
      ).status,
    ).toBe(403);
    expect(mockBusiness.updateDistribution).toHaveBeenCalledWith(
      'fixture',
      'fixture-supplier',
      'fixture-user',
      { isPublic: false, serviceKeys: [] },
    );
    mockBusiness.getServicePrices.mockResolvedValue({ success: false, error: 'NOT_OWNED' });
    expect((await send('get', '/products/fixture/service-prices')).status).toBe(403);
  });
  it('returns only publication state, including approval status/reason, after a successful write', async () => {
    const approvals = [
      { serviceKey: 'fixture-pending', status: 'pending', reason: null, futureInternal: 'private approval' },
      { serviceKey: 'fixture-rejected', status: 'rejected', reason: 'Fixture correction requested' },
      { serviceKey: 'fixture-cancelled', status: 'cancelled', reason: '' },
    ];
    const internal = {
      success: true, futureInternal: 'private envelope',
      data: {
        isPublic: false, serviceKeys: ['fixture-pending', 'fixture-rejected'], defaultSupplyEnabled: false,
        priceGeneral: 0, distributionType: 'SERVICE', serviceApprovals: approvals,
        added: ['fixture-pending'], removed: ['fixture-cancelled'],
        addedResult: { insertedServiceKeys: ['fixture-pending'] },
        removedResult: { deactivatedListings: 3 },
        sync: { previousStatus: 'PRIVATE', derivedStatus: 'SERVICE', changed: true, autoListedCount: 7 },
        futureInternal: 'private result',
      },
    };
    const original = structuredClone(internal);
    mockBusiness.updateDistribution.mockResolvedValue(internal);
    const res = await send('patch', '/products/fixture/distribution').send({ isPublic: false });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: {
      isPublic: false, serviceKeys: ['fixture-pending', 'fixture-rejected'], defaultSupplyEnabled: false,
      priceGeneral: 0, distributionType: 'SERVICE',
      serviceApprovals: approvals.map(a => ({ serviceKey: a.serviceKey, status: a.status, reason: a.reason })),
    } });
    expect(Object.keys(res.body.data).sort()).toEqual([
      'isPublic', 'serviceKeys', 'defaultSupplyEnabled', 'priceGeneral', 'distributionType', 'serviceApprovals',
    ].sort());
    expect(Object.keys(res.body.data.serviceApprovals[0]).sort()).toEqual(['reason', 'serviceKey', 'status']);
    expect(internal).toEqual(original);
  });
  it('does not turn a malformed publication success into a successful empty state', async () => {
    mockBusiness.updateDistribution.mockResolvedValue({ success: true });
    const res = await send('patch', '/products/fixture/distribution').send({ isPublic: false });
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ success: false, error: 'INTERNAL_ERROR' });
    expect(res.body.data).toBeUndefined();
  });
  it.each([
    [{ productType: 'invalid', rows: [] }, 'INVALID_PRODUCT_TYPE'],
    [{ productType: 'non_drug', rows: [] }, 'ROWS_REQUIRED'],
    [{ productType: 'non_drug', rows: Array.from({ length: 201 }, () => ({})) }, 'TOO_MANY_ROWS'],
    [{ productType: 'rx_drug', rows: [{ raw: { ' LOT ': 'fixture' } }] }, 'FORBIDDEN_COLUMN'],
  ])('bulk rejects %s before any Candidate creation', async (body, error) => {
    const res = await write().send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(error);
    expect(mockCandidate).not.toHaveBeenCalled();
  });
  it('bulk preserves mixed partial rows, duplicate creation and provenance', async () => {
    const rows = [
      {
        rowNumber: 7,
        fields: { 제품명: 'fixture first', 기본공급가: '1,200원', 공급자상품코드: 'sku' },
      },
      { fields: { 제품명: 'fixture second', 공급자상품코드: 'sku' } },
      { fields: {} },
      { fields: { 제품명: 'fixture price', 기본공급가: 'bad' } },
      { fields: { 제품명: 'fixture mixed' }, raw: { drug_category: 'rx' } },
    ];
    const res = await write().send({ productType: 'non_drug', supplierId: 'foreign', rows });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ total: 5, created: 1, duplicate: 1, failed: 3 });
    expect(res.body.data.results.map((r: any) => r.status)).toEqual([
      'created',
      'duplicate',
      'failed',
      'failed',
      'failed',
    ]);
    expect(mockCandidate).toHaveBeenCalledTimes(2);
    expect(mockCandidate.mock.calls[0][0]).toMatchObject({
      serviceKey: 'neture',
      organizationId: null,
      submittedBy: 'fixture-user',
      candidatePrice: 1200,
      rawPayload: {
        supplierId: 'fixture-supplier',
        rowNumber: 7,
        source: 'supplier_bulk_upload',
        regulatoryType: 'GENERAL',
        product_type: 'non_drug',
      },
    });
    expect(mockCandidate.mock.calls[1][0].rawPayload.duplicateInBatch).toBe(true);
  });
  it.each([
    ['rx_drug', 'DRUG', 'rx'],
    ['otc', 'DRUG', 'otc'],
    ['quasi_drug', 'QUASI_DRUG', 'quasi_drug'],
    ['unknown', null, null],
  ])('retains existing type/alias %s', async (productType, regulatoryType, drugCategory) => {
    const res = await write().send({ productType, rows: [{ fields: { 제품명: 'fixture' } }] });
    expect(res.status).toBe(201);
    expect(mockCandidate.mock.calls[0][0].rawPayload).toMatchObject({
      regulatoryType,
      drugCategory,
    });
  });
  it('Candidate storage exceptions remain 500 and stop later rows', async () => {
    mockCandidate.mockRejectedValueOnce(new Error('fixture storage'));
    const res = await write().send({
      productType: 'non_drug',
      rows: [{ fields: { 제품명: 'one' } }, { fields: { 제품명: 'two' } }],
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_ERROR');
    expect(mockCandidate).toHaveBeenCalledTimes(1);
  });
  it.each([
    ['post', '/products/submit-approval', 'offerIds'],
    ['delete', '/products/bulk', 'offerIds'],
    ['patch', '/products/batch', 'updates'],
  ])('%s %s retains the 100-row command limit', async (method, path, key) => {
    const response = await send(method, path).send({
      [key]: Array.from({ length: 101 }, () => ({})),
    });
    expect(response.status).toBe(400);
    expect(mockBusiness.submitForApproval).not.toHaveBeenCalled();
    expect(mockBusiness.bulkDeleteOffers).not.toHaveBeenCalled();
    expect(mockBusiness.batchUpdateSupplierOffers).not.toHaveBeenCalled();
  });
  it('approval submission uses saved distribution policy rather than caller serviceKeys', async () => {
    mockBusiness.submitForApproval.mockResolvedValue({ requested: 1 });
    const response = await send('post', '/products/submit-approval').send({
      offerIds: ['fixture-offer'],
      serviceKeys: ['foreign'],
    });
    expect(response.body).toEqual({ success: true, data: { requested: 1 } });
    expect(mockBusiness.submitForApproval).toHaveBeenCalledWith('fixture-supplier', [
      'fixture-offer',
    ]);
  });
  it('bulk deletion preserves actor provenance and partial failure response', async () => {
    const result = { deleted: ['fixture-a'], failed: [{ id: 'fixture-b' }] };
    mockBusiness.bulkDeleteOffers.mockResolvedValue(result);
    const response = await send('delete', '/products/bulk').send({
      offerIds: ['fixture-a', 'fixture-b'],
      userId: 'foreign',
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: false, data: result });
    expect(mockBusiness.bulkDeleteOffers).toHaveBeenCalledWith(
      'fixture-supplier',
      ['fixture-a', 'fixture-b'],
      'fixture-user',
    );
  });
  it('batch updates preserve the service result and resolved context', async () => {
    mockBusiness.batchUpdateSupplierOffers.mockResolvedValue({ updated: 1 });
    const updates = [{ id: 'fixture-offer', isActive: false }];
    const response = await send('patch', '/products/batch').send({
      updates,
      supplierId: 'foreign',
    });
    expect(response.body).toEqual({ success: true, data: { updated: 1 } });
    expect(mockBusiness.batchUpdateSupplierOffers).toHaveBeenCalledWith(
      'fixture-supplier',
      updates,
    );
  });
  it('offer and business content writes preserve field whitelists and not-found mappings', async () => {
    mockBusiness.updateSupplierOffer.mockResolvedValue({ success: true });
    await send('patch', '/products/fixture-offer').send({
      priceGeneral: 1200,
      isFeatured: true,
      supplierId: 'foreign',
      unsupported: 'foreign',
    });
    const [id, supplier, payload] = mockBusiness.updateSupplierOffer.mock.lastCall!;
    expect([id, supplier]).toEqual(['fixture-offer', 'fixture-supplier']);
    expect(payload).toMatchObject({ priceGeneral: 1200, isFeatured: true });
    expect(payload).not.toHaveProperty('supplierId');
    expect(payload).not.toHaveProperty('unsupported');
    mockBusiness.updateBusinessContent.mockResolvedValue({
      success: false,
      error: 'PRODUCT_NOT_FOUND',
    });
    const response = await send('patch', '/products/fixture-offer/business-content').send({
      businessShortDescription: 'fixture description',
      priceGeneral: 999,
    });
    expect(response.status).toBe(404);
    expect(mockBusiness.updateBusinessContent).toHaveBeenCalledWith(
      'fixture-offer',
      'fixture-supplier',
      { businessShortDescription: 'fixture description', businessDetailDescription: undefined },
    );
  });
  it('service pricing replacement forwards only the prices list and preserves empty replacement', async () => {
    mockBusiness.setServicePrices.mockResolvedValue({ success: true, data: [] });
    const response = await send('put', '/products/fixture-offer/service-prices').send({
      prices: [],
      supplierId: 'foreign',
    });
    expect(response.body).toEqual({ success: true, data: [] });
    expect(mockBusiness.setServicePrices).toHaveBeenCalledWith(
      'fixture-offer',
      'fixture-supplier',
      [],
    );
  });
  it.each(['constructor', 'toString', '__proto__'])(
    'rejects inherited object keys as bulk product types: %s',
    async (productType) => {
      const res = await write().send({ productType, rows: [{ fields: { 제품명: 'fixture' } }] });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_PRODUCT_TYPE');
      expect(mockCandidate).not.toHaveBeenCalled();
    },
  );
});
