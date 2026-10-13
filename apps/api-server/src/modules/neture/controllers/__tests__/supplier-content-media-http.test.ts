import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';
const mockSupplier = jest.fn(),
  mockQuery = jest.fn(),
  mockCopy = jest.fn(),
  mockProxy = jest.fn();
const mockLibrary = Object.fromEntries(
  ['listPublic', 'listBySupplier', 'getByIdForSupplier', 'create', 'update', 'delete'].map((n) => [
    n,
    jest.fn(),
  ]),
);
const mockDescriptions = Object.fromEntries(
  ['listSupplierStoreDrafts', 'upsertSupplierStoreDraft', 'withdrawSupplierStoreDraft'].map((n) => [
    n,
    jest.fn(),
  ]),
);
const mockHandoff = jest.fn();
jest.mock('../../../../database/connection.js', () => ({
  AppDataSource: { query: (...args: unknown[]) => mockQuery(...args) },
}));
jest.mock('../../../../middleware/auth.middleware.js', () => ({
  requireAuth: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.headers['x-test-user']) return res.status(401).json({ error: 'UNAUTHORIZED' });
    (req as any).user = { id: 'fixture-user' };
    next();
  },
}));
jest.mock('../../middleware/neture-identity.middleware.js', () => ({
  createRequireLinkedSupplier:
    () => (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      (req as any).supplierId = 'fixture-supplier';
      next();
    },
  createRequireActiveSupplier:
    () => (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.headers['x-test-state'] === 'pending')
        return res.status(403).json({ error: 'SUPPLIER_NOT_ACTIVE' });
      (req as any).supplierId = 'fixture-supplier';
      next();
    },
}));
jest.mock('../../entities/index.js', () => ({ SupplierStatus: { ACTIVE: 'ACTIVE' } }));
jest.mock('../../neture.service.js', () => ({
  NetureService: jest.fn().mockImplementation(() => ({ getSupplierByUserId: mockSupplier })),
}));
jest.mock('../../services/neture-library.service.js', () => ({
  NetureLibraryService: jest.fn().mockImplementation(() => mockLibrary),
}));
jest.mock('../../services/supplier-library-handoff.service.js', () => ({
  SupplierLibraryHandoffService: jest.fn().mockImplementation(() => ({ handoff: mockHandoff })),
}));
jest.mock('../../constants/supplier-content-handoff-targets.js', () => ({
  listSupplierContentHandoffTargets: () => [
    { key: 'fixture-service', name: 'Fixture', nameKo: '검증 서비스' },
  ],
}));
jest.mock('../../services/shared-product-description.service.js', () => ({
  SharedProductDescriptionService: jest.fn().mockImplementation(() => mockDescriptions),
}));
jest.mock('../../services/product-detail-fetch.service.js', () => ({
  copyImages: (...a: unknown[]) => mockCopy(...a),
  proxyImage: (...a: unknown[]) => mockProxy(...a),
  DetailFetchError: class extends Error {
    constructor(
      public code: string,
      message: string,
      public status = 400,
    ) {
      super(message);
    }
  },
}));
jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));
import libraryRouter from '../../neture-library.routes.js';
import { createSupplierImportController } from '../supplier-import.controller.js';
import { createSupplierStoreDescriptionController } from '../supplier-store-description.controller.js';
import { DetailFetchError } from '../../services/product-detail-fetch.service.js';
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/neture', libraryRouter);
const ds = { query: (...a: unknown[]) => mockQuery(...a) } as unknown as DataSource;
app.use('/supplier', createSupplierImportController(ds));
app.use('/supplier', createSupplierStoreDescriptionController(ds));
const call = (method: string, url: string) =>
  (request(app) as any)[method](url).set('x-test-user', 'fixture-user');
beforeEach(() => {
  jest.clearAllMocks();
  mockSupplier.mockReset().mockResolvedValue({ id: 'fixture-supplier', status: 'ACTIVE' });
  mockQuery.mockReset().mockResolvedValue([{ master_id: 'fixture-master' }]);
  mockCopy.mockReset().mockResolvedValue([
    { ok: true, url: 'https://fixture.invalid/copied.png' },
    { ok: false, reason: 'bad_mime' },
  ]);
  mockProxy
    .mockReset()
    .mockResolvedValue({ buffer: Buffer.from('fixture-image'), mime: 'image/png' });
  for (const group of [mockLibrary, mockDescriptions])
    for (const fn of Object.values(group)) fn.mockReset();
  mockLibrary.listPublic.mockResolvedValue({
    success: true,
    data: { items: [{ id: 'fixture-item', supplierId: 'fixture-supplier' }] },
  });
  mockLibrary.listBySupplier.mockResolvedValue({
    success: true,
    data: { items: [{ id: 'fixture-item', supplierId: 'fixture-supplier', isPublic: false }] },
  });
  mockLibrary.getByIdForSupplier.mockResolvedValue({
    id: 'fixture-item',
    supplierId: 'fixture-supplier',
    visibility: 'service',
  });
  mockLibrary.create.mockResolvedValue({ success: true, data: { id: 'fixture-item' } });
  mockLibrary.update.mockResolvedValue({ success: true });
  mockLibrary.delete.mockResolvedValue({ success: true });
  mockHandoff.mockReset().mockResolvedValue({ data: { reused: false, id: 'fixture-delivery' } });
  mockDescriptions.listSupplierStoreDrafts.mockResolvedValue([]);
  mockDescriptions.upsertSupplierStoreDraft.mockResolvedValue({
    id: 'fixture-draft',
    masterId: 'fixture-master',
    descriptionType: 'STORE',
    status: 'draft',
    language: 'ko',
    submittedAt: null,
  });
  mockDescriptions.withdrawSupplierStoreDraft.mockResolvedValue({
    ok: true,
    id: 'fixture-draft',
    masterId: 'fixture-master',
    language: 'ko',
  });
});
describe('library existing HTTP boundary', () => {
  it('public list stays public and preserves published metadata fallback', async () => {
    const res = await request(app).get('/neture/library/public');
    expect(res.status).toBe(200);
    expect(res.body.data.items[0]).toMatchObject({
      producer: 'supplier',
      producerRef: 'fixture-supplier',
      serviceKey: 'neture',
      contentType: 'media',
      metaStatus: 'published',
    });
    expect(mockSupplier).not.toHaveBeenCalled();
  });
  it.each([
    ['get', '/neture/library'],
    ['post', '/neture/library'],
    ['post', '/neture/library/fixture/handoff'],
    ['patch', '/neture/library/fixture'],
    ['delete', '/neture/library/fixture'],
  ])('%s %s still authenticates first', async (method, url) => {
    expect((await (request(app) as any)[method](url).send({})).status).toBe(401);
  });
  it('linked pending supplier reads own draft metadata but cannot write', async () => {
    mockSupplier.mockResolvedValue({ id: 'fixture-supplier', status: 'PENDING' });
    const list = await call('get', '/neture/library?category=fixture&page=2');
    expect(list.body.data.items[0].metaStatus).toBe('draft');
    expect(mockLibrary.listBySupplier).toHaveBeenCalledWith(
      'fixture-supplier',
      expect.objectContaining({ category: 'fixture', page: 2 }),
    );
    expect((await call('post', '/neture/library').send({ title: 'fixture' })).body.error.code).toBe(
      'SUPPLIER_NOT_ACTIVE',
    );
    expect(mockLibrary.create).not.toHaveBeenCalled();
  });
  it('missing supplier keeps 403 and target catalog precedes dynamic item lookup', async () => {
    mockSupplier.mockResolvedValueOnce(null);
    expect((await call('get', '/neture/library')).body.error.code).toBe('NO_SUPPLIER');
    const res = await call('get', '/neture/library/handoff-targets');
    expect(res.body.data).toEqual([
      { key: 'fixture-service', name: 'Fixture', nameKo: '검증 서비스' },
    ]);
    expect(mockLibrary.getByIdForSupplier).not.toHaveBeenCalled();
  });
  it('item read uses resolved ownership and 404 existence masking', async () => {
    let res = await call('get', '/neture/library/fixture-item');
    expect(res.body.data.metaStatus).toBe('published');
    expect(mockLibrary.getByIdForSupplier).toHaveBeenCalledWith('fixture-item', 'fixture-supplier');
    mockLibrary.getByIdForSupplier.mockResolvedValue(null);
    res = await call('get', '/neture/library/foreign-item');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ITEM_NOT_FOUND');
  });
  it.each([
    [{ title: 'fixture', contentType: 'document', blocks: [] }, 'MISSING_BLOCKS'],
    [{ title: 'fixture' }, 'MISSING_FILE_URL'],
    [
      {
        title: 'fixture',
        fileUrl: 'url',
        fileName: 'name',
        fileSize: 'bad',
        mimeType: 'image/png',
      },
      'MISSING_FILE_SIZE',
    ],
  ])('creation validates media/document shape: %s', async (body, error) => {
    const res = await call('post', '/neture/library').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(error);
    expect(mockLibrary.create).not.toHaveBeenCalled();
  });
  it('document creation preserves canonical writer and file defaults', async () => {
    const blocks = [{ type: 'paragraph', data: { text: 'fixture' } }];
    const res = await call('post', '/neture/library').send({
      supplierId: 'foreign',
      title: 'fixture',
      contentType: 'document',
      blocks,
      isPublic: true,
      fileUrl: 'ignored',
    });
    expect(res.status).toBe(201);
    expect(mockLibrary.create).toHaveBeenCalledWith(
      'fixture-supplier',
      expect.objectContaining({
        fileUrl: '',
        fileSize: 0,
        mimeType: 'text/html',
        blocks,
        isPublic: true,
      }),
    );
  });
  it('update whitelist and empty/no-owner cases remain distinct', async () => {
    expect(
      (await call('patch', '/neture/library/fixture').send({ supplierId: 'foreign' })).body.error
        .code,
    ).toBe('NO_FIELDS');
    mockLibrary.update.mockResolvedValue({ success: false, error: 'ITEM_NOT_FOUND' });
    const res = await call('patch', '/neture/library/fixture').send({
      title: 'fixture',
      blocks: 'bad',
      isPublic: 'true',
    });
    expect(res.status).toBe(404);
    expect(mockLibrary.update).toHaveBeenCalledWith('fixture', 'fixture-supplier', {
      title: 'fixture',
      blocks: null,
      isPublic: false,
    });
  });
  it('handoff preserves actor/target, error and replay 200 rather than 201', async () => {
    const res = await call('post', '/neture/library/fixture/handoff').send({
      serviceKey: 'fixture-service',
      supplierId: 'foreign',
    });
    expect(res.status).toBe(201);
    expect(mockHandoff).toHaveBeenCalledWith(
      'fixture-supplier',
      expect.objectContaining({ id: 'fixture-user' }),
      'fixture',
      'fixture-service',
    );
    mockHandoff.mockResolvedValue({ data: { reused: true } });
    expect(
      (
        await call('post', '/neture/library/fixture/handoff').send({
          serviceKey: 'fixture-service',
        })
      ).status,
    ).toBe(200);
    mockHandoff.mockResolvedValue({
      error: { status: 403, code: 'TARGET_FORBIDDEN', message: 'fixture' },
    });
    expect((await call('post', '/neture/library/fixture/handoff').send({})).body.error.code).toBe(
      'TARGET_FORBIDDEN',
    );
  });
  it('delete hides not-owned items and real failure stays 500', async () => {
    mockLibrary.delete.mockResolvedValue({ success: false, error: 'ITEM_NOT_FOUND' });
    expect((await call('delete', '/neture/library/foreign')).status).toBe(404);
    mockLibrary.listBySupplier.mockRejectedValue(new Error('fixture'));
    expect((await call('get', '/neture/library')).status).toBe(500);
  });
});
describe('import existing HTTP contracts', () => {
  it.each([
    [{}, 'URLS_REQUIRED'],
    [{ urls: Array(61).fill('url') }, 'TOO_MANY'],
    [{ urls: [null] }, 'INVALID_URLS'],
    [{ urls: ['url'], shopOrigin: 'invalid' }, 'INVALID_SHOP_ORIGIN'],
  ])('copy validates before storage: %s', async (body, code) => {
    const res = await call('post', '/supplier/import/copy-images').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(code);
    expect(mockCopy).not.toHaveBeenCalled();
  });
  it.each([
    ['thumbnail', 'thumbnail-1000'],
    ['preserve', 'preserve-original'],
    ['standard', undefined],
  ])('copy mode %s and partial result remain visible', async (mode, imageMode) => {
    const urls = ['https://fixture.invalid/image.png'];
    const res = await call('post', '/supplier/import/copy-images').send({
      urls,
      shopOrigin: 'https://fixture.invalid/path',
      mode,
      userId: 'foreign',
    });
    expect(res.body.data).toMatchObject({ copied: 1, total: 2 });
    expect(mockCopy).toHaveBeenCalledWith(urls, {
      dataSource: ds,
      userId: 'fixture-user',
      shopOrigin: 'https://fixture.invalid',
      imageMode,
    });
  });
  it('proxy keeps byte/cache headers and tolerant invalid origin fallback', async () => {
    const res = await call('post', '/supplier/import/image-proxy').send({
      url: ' https://fixture.invalid/image.png ',
      shopOrigin: 'invalid',
    });
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('fixture-image');
    expect(res.headers['cache-control']).toBe('private, max-age=300');
    expect(mockProxy).toHaveBeenCalledWith('https://fixture.invalid/image.png', undefined);
  });
  it('proxy distinguishes security errors and genuine failures', async () => {
    mockProxy
      .mockRejectedValueOnce(new DetailFetchError('BLOCKED_HOST', 'fixture blocked', 400))
      .mockRejectedValueOnce(new Error('fixture'));
    let res = await call('post', '/supplier/import/image-proxy').send({
      url: 'http://localhost/image',
    });
    expect(res.body.error.code).toBe('BLOCKED_HOST');
    res = await call('post', '/supplier/import/image-proxy').send({
      url: 'https://fixture.invalid/image',
    });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
describe('STORE description authoring boundary', () => {
  it('read remains linked while writes require active status', async () => {
    expect(
      (await call('get', '/supplier/store-descriptions?masterId=fixture-master')).body.data.items,
    ).toEqual([]);
    expect(mockDescriptions.listSupplierStoreDrafts).toHaveBeenCalledWith(
      'fixture-supplier',
      'fixture-master',
    );
    expect(
      (await call('post', '/supplier/store-descriptions').set('x-test-state', 'pending').send({}))
        .status,
    ).toBe(403);
    expect(mockDescriptions.upsertSupplierStoreDraft).not.toHaveBeenCalled();
  });
  it.each([
    [{}, 'OFFER_REQUIRED'],
    [{ offerId: 'fixture' }, 'CONTENT_EMPTY'],
    [{ offerId: 'fixture', content: 'x'.repeat(200001) }, 'CONTENT_TOO_LONG'],
    [{ offerId: 'fixture', content: 'fixture', language: 'invalid' }, 'LANG_UNSUPPORTED'],
  ])('save validates before offer lookup: %s', async (body, code) => {
    const res = await call('post', '/supplier/store-descriptions').send(body);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(code);
    expect(mockQuery).not.toHaveBeenCalled();
  });
  it('offer ownership and missing master are distinct', async () => {
    mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([{ master_id: null }]);
    let res = await call('post', '/supplier/store-descriptions').send({
      offerId: 'fixture',
      content: 'fixture',
    });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('OFFER_NOT_FOUND');
    res = await call('post', '/supplier/store-descriptions').send({
      offerId: 'fixture',
      content: 'fixture',
    });
    expect(res.body.code).toBe('MASTER_NOT_LINKED');
    expect(mockDescriptions.upsertSupplierStoreDraft).not.toHaveBeenCalled();
  });
  it('draft/review semantics, trimmed input and actor/master ownership are preserved', async () => {
    const res = await call('post', '/supplier/store-descriptions').send({
      offerId: ' fixture-offer ',
      content: ' <p>fixture</p> ',
      language: 'EN',
      submit: 'true',
      supplierId: 'foreign',
      masterId: 'foreign',
    });
    expect(res.status).toBe(201);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('supplier_id = $2'), [
      'fixture-offer',
      'fixture-supplier',
    ]);
    expect(mockDescriptions.upsertSupplierStoreDraft).toHaveBeenCalledWith({
      masterId: 'fixture-master',
      supplierId: 'fixture-supplier',
      createdBy: 'fixture-user',
      offerId: 'fixture-offer',
      content: '<p>fixture</p>',
      summary: null,
      language: 'en',
      submit: true,
    });
  });
  it('sanitizer rejection is 400 and forbidden withdrawal is 409', async () => {
    mockDescriptions.upsertSupplierStoreDraft.mockRejectedValue(
      new Error('empty after sanitization'),
    );
    expect(
      (
        await call('post', '/supplier/store-descriptions').send({
          offerId: 'fixture',
          content: 'fixture',
        })
      ).body.code,
    ).toBe('CONTENT_EMPTY_AFTER_SANITIZE');
    mockDescriptions.withdrawSupplierStoreDraft.mockResolvedValue({
      ok: false,
      reason: 'forbidden_status',
    });
    expect((await call('delete', '/supplier/store-descriptions/fixture')).status).toBe(409);
    mockDescriptions.withdrawSupplierStoreDraft.mockResolvedValue({
      ok: false,
      reason: 'not_found',
    });
    expect((await call('delete', '/supplier/store-descriptions/foreign')).status).toBe(404);
  });
});
