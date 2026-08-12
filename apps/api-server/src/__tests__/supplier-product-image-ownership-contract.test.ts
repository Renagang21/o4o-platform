/**
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1 — regression guard
 *
 * 배경: 공급자 이미지 write 4경로(업로드 / URL 등록 / 대표 지정 / 삭제)는
 *   `requireActiveSupplier` 만 통과하면 masterId·imageId 를 클라이언트가 지정할 수 있었다.
 *   즉 ACTIVE 공급자면 남의 상품 이미지를 추가·교체·삭제할 수 있었다.
 *
 * 새 계약: masterId 소유(= 해당 master 에 삭제되지 않은 자기 offer 보유) 확인 후에만 통과.
 *   imageId 경로는 이미지의 실제 master 와 body.masterId 가 일치해야 한다(경로 스푸핑 방지).
 *
 * DB 없이 라우터를 직접 마운트해 가드 분기만 검증한다.
 */
import 'reflect-metadata';
import express from 'express';
import request from 'supertest';

jest.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.user = { id: 'user-1', role: 'supplier' }; next(); },
}));
jest.mock('../middleware/neture-scope.middleware.js', () => ({
  requireNetureScope: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../middleware/upload.middleware.js', () => ({
  uploadSingleMiddleware: () => (_req: any, _res: any, next: any) => next(),
}));

const addProductImage = jest.fn(async () => ({ id: 'img-1' }));
const setPrimaryImage = jest.fn(async () => undefined);
const deleteProductImageSvc = jest.fn(async () => ({ gcsPath: null }));
jest.mock('../modules/neture/neture.service.js', () => ({
  NetureService: jest.fn().mockImplementation(() => ({
    getSupplierByUserId: async () => ({ id: 'sup-1', status: SUPPLIER_ACTIVE }),
    addProductImage,
    setPrimaryImage,
    deleteProductImage: deleteProductImageSvc,
    getProductImages: async () => [],
  })),
}));
jest.mock('../modules/neture/services/image-storage.service.js', () => ({
  ImageStorageService: jest.fn().mockImplementation(() => ({
    uploadImage: async () => ({ url: 'u', gcsPath: 'p' }),
    deleteImage: async () => undefined,
  })),
}));

import { SupplierStatus } from '../modules/neture/entities/index.js';

const SUPPLIER_ACTIVE = SupplierStatus.ACTIVE;
import { createProductImageController } from '../modules/neture/controllers/admin.controller.js';

/** supplier-offer 소유 행 / product_images 행을 흉내낸다. */
function buildApp({ owned, imageMasterId }: { owned: boolean; imageMasterId?: string | null }) {
  const dataSource = {
    query: async (sql: string) => {
      if (sql.includes('product_images')) {
        return imageMasterId === undefined || imageMasterId === null ? [] : [{ master_id: imageMasterId }];
      }
      if (sql.includes('supplier_product_offers')) return owned ? [{ '?column?': 1 }] : [];
      return [];
    },
  } as any;
  const app = express();
  app.use(express.json());
  app.use('/', createProductImageController(dataSource));
  return app;
}

beforeEach(() => { addProductImage.mockClear(); setPrimaryImage.mockClear(); deleteProductImageSvc.mockClear(); });

describe('공급자 이미지 write 는 master 소유를 확인한다', () => {
  it('URL 등록 — 소유하지 않은 master 는 403 MASTER_NOT_OWNED', async () => {
    const res = await request(buildApp({ owned: false }))
      .post('/products/master-x/images/from-url')
      .send({ imageUrl: 'https://example.com/a.png' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('MASTER_NOT_OWNED');
    expect(addProductImage).not.toHaveBeenCalled();
  });

  it('URL 등록 — 소유한 master 는 통과한다', async () => {
    const res = await request(buildApp({ owned: true }))
      .post('/products/master-1/images/from-url')
      .send({ imageUrl: 'https://example.com/a.png' });

    expect(res.status).toBe(201);
    expect(addProductImage).toHaveBeenCalled();
  });

  it('대표 지정 — 소유하지 않은 master 는 403', async () => {
    const res = await request(buildApp({ owned: false, imageMasterId: 'master-x' }))
      .patch('/products/images/img-1/primary')
      .send({ masterId: 'master-x' });

    expect(res.status).toBe(403);
    expect(setPrimaryImage).not.toHaveBeenCalled();
  });

  it('대표 지정 — body.masterId 가 이미지의 실제 master 와 다르면 403 (경로 스푸핑 방지)', async () => {
    const res = await request(buildApp({ owned: true, imageMasterId: 'master-other' }))
      .patch('/products/images/img-1/primary')
      .send({ masterId: 'master-1' });

    expect(res.status).toBe(403);
    expect(setPrimaryImage).not.toHaveBeenCalled();
  });

  it('삭제 — 소유하지 않은 이미지는 403, 소유하면 통과', async () => {
    const denied = await request(buildApp({ owned: false, imageMasterId: 'master-1' }))
      .delete('/products/images/img-1')
      .send({ masterId: 'master-1' });
    expect(denied.status).toBe(403);
    expect(deleteProductImageSvc).not.toHaveBeenCalled();

    const allowed = await request(buildApp({ owned: true, imageMasterId: 'master-1' }))
      .delete('/products/images/img-1')
      .send({ masterId: 'master-1' });
    expect(allowed.status).toBe(200);
    expect(deleteProductImageSvc).toHaveBeenCalled();
  });
});
