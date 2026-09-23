/**
 * 공급자 상품 이미지 소유 경계 — regression guard
 *
 * 1) WO-O4O-NETURE-SUPPLIER-PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1
 *    masterId 소유(= 해당 master 에 삭제되지 않은 자기 offer 보유) 확인 후에만 통과.
 *    imageId 경로는 이미지의 실제 master 와 body.masterId 가 일치해야 한다(경로 스푸핑 방지).
 *
 * 2) WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §G · §H
 *    - 업로드는 source='supplier_upload' + created_by 를 기록한다.
 *    - 다른 출처(admin_upload · candidate_promotion · 다른 supplier_upload · source=NULL)
 *      이미지는 수정·삭제할 수 없다 → 403 IMAGE_NOT_OWNED.
 *    - 다른 출처가 현재 대표(primary)이면 해제하지 않는다
 *      → 409 SUPPLIER_CANNOT_REPLACE_CANONICAL_PRIMARY.
 *    - controller 위치는 supplier-product-image.controller.ts (route path 불변).
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

jest.mock('../modules/neture/neture.service.js', () => ({
  NetureService: jest.fn().mockImplementation(() => ({
    getSupplierByUserId: async () => ({ id: 'sup-1', status: SUPPLIER_ACTIVE }),
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
import { createSupplierProductImageController } from '../modules/neture/controllers/supplier-product-image.controller.js';

const MINE = { source: 'supplier_upload', created_by: 'user-1' };
const FOREIGN_ADMIN = { source: 'admin_upload', created_by: 'admin-9' };

type ImageFixture = {
  id: string;
  master_id: string;
  source: string | null;
  created_by: string | null;
  is_primary: boolean;
  gcs_path?: string | null;
  type?: string;
  sort_order?: number;
};

/**
 * supplier_product_offers / product_images 를 흉내내는 최소 dataSource.
 * `writes` 에 실제 실행된 INSERT/UPDATE/DELETE 를 모아 write 발생 여부를 검증한다.
 */
function buildApp({ owned, images = [] }: { owned: boolean; images?: ImageFixture[] }) {
  const writes: { sql: string; params: unknown[] }[] = [];
  const dataSource = {
    query: async (sql: string, params: unknown[] = []) => {
      const normalized = sql.replace(/\s+/g, ' ').trim();

      if (normalized.startsWith('SELECT 1 FROM supplier_product_offers')) {
        return owned ? [{ '?column?': 1 }] : [];
      }
      if (/^(INSERT|UPDATE|DELETE)/.test(normalized)) {
        writes.push({ sql: normalized, params });
        return normalized.startsWith('INSERT') ? [{ id: 'img-new', is_primary: true }] : [];
      }
      if (normalized.includes('COUNT(*)')) {
        return [{ c: images.length }];
      }
      if (normalized.includes('FROM product_images')) {
        // getImage(id) / getCurrentPrimary(masterId) / getThumbnail(masterId)
        if (normalized.includes('WHERE id = $1')) {
          return images.filter((i) => i.id === params[0]);
        }
        if (normalized.includes('is_primary = true')) {
          return images.filter((i) => i.master_id === params[0] && i.is_primary);
        }
        if (normalized.includes("type = 'thumbnail'")) {
          return images.filter((i) => i.master_id === params[0] && i.type === 'thumbnail');
        }
        return images.filter((i) => i.master_id === params[0]);
      }
      return [];
    },
  } as any;

  const app = express();
  app.use(express.json());
  app.use('/', createSupplierProductImageController(dataSource));
  return { app, writes };
}

describe('공급자 이미지 write 는 master 소유를 확인한다', () => {
  it('URL 등록 — 소유하지 않은 master 는 403 MASTER_NOT_OWNED', async () => {
    const { app, writes } = buildApp({ owned: false });
    const res = await request(app)
      .post('/products/master-x/images/from-url')
      .send({ imageUrl: 'https://example.com/a.png' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('MASTER_NOT_OWNED');
    expect(writes).toHaveLength(0);
  });

  it('URL 등록 — 소유한 master 는 통과하고 source·created_by 를 기록한다', async () => {
    const { app, writes } = buildApp({ owned: true });
    const res = await request(app)
      .post('/products/master-1/images/from-url')
      .send({ imageUrl: 'https://example.com/a.png' });

    expect(res.status).toBe(201);
    const insert = writes.find((w) => w.sql.startsWith('INSERT INTO product_images'));
    expect(insert).toBeDefined();
    expect(insert!.params).toContain('supplier_upload');
    expect(insert!.params).toContain('user-1');
    expect(res.body.data.source).toBe('supplier_upload');
  });

  it('대표 지정 — 소유하지 않은 master 는 403', async () => {
    const { app, writes } = buildApp({
      owned: false,
      images: [{ id: 'img-1', master_id: 'master-x', is_primary: false, ...MINE }],
    });
    const res = await request(app).patch('/products/images/img-1/primary').send({ masterId: 'master-x' });

    expect(res.status).toBe(403);
    expect(writes).toHaveLength(0);
  });

  it('대표 지정 — body.masterId 가 이미지의 실제 master 와 다르면 403 (경로 스푸핑 방지)', async () => {
    const { app, writes } = buildApp({
      owned: true,
      images: [{ id: 'img-1', master_id: 'master-other', is_primary: false, ...MINE }],
    });
    const res = await request(app).patch('/products/images/img-1/primary').send({ masterId: 'master-1' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('MASTER_NOT_OWNED');
    expect(writes).toHaveLength(0);
  });

  it('삭제 — 소유하지 않은 master 는 403, 소유하면 통과', async () => {
    const images = [{ id: 'img-1', master_id: 'master-1', is_primary: false, gcs_path: 'p', ...MINE }];

    const denied = buildApp({ owned: false, images });
    const deniedRes = await request(denied.app).delete('/products/images/img-1').send({ masterId: 'master-1' });
    expect(deniedRes.status).toBe(403);
    expect(denied.writes).toHaveLength(0);

    const allowed = buildApp({ owned: true, images });
    const allowedRes = await request(allowed.app).delete('/products/images/img-1').send({ masterId: 'master-1' });
    expect(allowedRes.status).toBe(200);
    expect(allowed.writes.some((w) => w.sql.startsWith('DELETE FROM product_images'))).toBe(true);
  });
});

describe('공급자는 자기 출처(supplier_upload · created_by=나) 이미지만 관리한다 (§G)', () => {
  it('다른 출처(admin_upload) 이미지 삭제는 403 IMAGE_NOT_OWNED', async () => {
    const { app, writes } = buildApp({
      owned: true,
      images: [{ id: 'img-a', master_id: 'master-1', is_primary: false, ...FOREIGN_ADMIN }],
    });
    const res = await request(app).delete('/products/images/img-a').send({ masterId: 'master-1' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('IMAGE_NOT_OWNED');
    expect(writes).toHaveLength(0);
  });

  it('출처 불명(source=NULL) 이미지 삭제는 403 IMAGE_NOT_OWNED', async () => {
    const { app, writes } = buildApp({
      owned: true,
      images: [{ id: 'img-n', master_id: 'master-1', is_primary: false, source: null, created_by: 'user-1' }],
    });
    const res = await request(app).delete('/products/images/img-n').send({ masterId: 'master-1' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('IMAGE_NOT_OWNED');
    expect(writes).toHaveLength(0);
  });

  it('다른 공급자가 올린 supplier_upload 이미지 삭제는 403 IMAGE_NOT_OWNED', async () => {
    const { app, writes } = buildApp({
      owned: true,
      images: [{ id: 'img-o', master_id: 'master-1', is_primary: false, source: 'supplier_upload', created_by: 'user-2' }],
    });
    const res = await request(app).delete('/products/images/img-o').send({ masterId: 'master-1' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('IMAGE_NOT_OWNED');
    expect(writes).toHaveLength(0);
  });

  it('다른 출처 이미지 대표 지정은 403 IMAGE_NOT_OWNED', async () => {
    const { app, writes } = buildApp({
      owned: true,
      images: [{ id: 'img-c', master_id: 'master-1', is_primary: false, source: 'candidate_promotion', created_by: 'user-1' }],
    });
    const res = await request(app).patch('/products/images/img-c/primary').send({ masterId: 'master-1' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('IMAGE_NOT_OWNED');
    expect(writes).toHaveLength(0);
  });
});

describe('canonical 대표 이미지는 공급자가 해제하지 않는다 (§G-2)', () => {
  it('현재 primary 가 다른 출처면 409 이고 write 는 0건', async () => {
    const { app, writes } = buildApp({
      owned: true,
      images: [
        { id: 'img-mine', master_id: 'master-1', is_primary: false, ...MINE },
        { id: 'img-canon', master_id: 'master-1', is_primary: true, ...FOREIGN_ADMIN },
      ],
    });
    const res = await request(app).patch('/products/images/img-mine/primary').send({ masterId: 'master-1' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('SUPPLIER_CANNOT_REPLACE_CANONICAL_PRIMARY');
    expect(writes).toHaveLength(0);
  });

  it('현재 primary 가 없으면 대표 지정 허용', async () => {
    const { app, writes } = buildApp({
      owned: true,
      images: [{ id: 'img-mine', master_id: 'master-1', is_primary: false, ...MINE }],
    });
    const res = await request(app).patch('/products/images/img-mine/primary').send({ masterId: 'master-1' });

    expect(res.status).toBe(200);
    expect(writes.some((w) => w.sql.startsWith('UPDATE product_images SET is_primary = true'))).toBe(true);
  });

  it('현재 primary 가 내 supplier_upload 면 대표 지정 허용 · 해제 대상은 내 이미지로 한정', async () => {
    const { app, writes } = buildApp({
      owned: true,
      images: [
        { id: 'img-mine-2', master_id: 'master-1', is_primary: false, ...MINE },
        { id: 'img-mine-1', master_id: 'master-1', is_primary: true, ...MINE },
      ],
    });
    const res = await request(app).patch('/products/images/img-mine-2/primary').send({ masterId: 'master-1' });

    expect(res.status).toBe(200);
    const unset = writes.find((w) => w.sql.includes('SET is_primary = false'));
    expect(unset).toBeDefined();
    // 해제 UPDATE 는 반드시 source + created_by 로 좁혀져 있어야 한다.
    expect(unset!.sql).toContain('source = $2');
    expect(unset!.sql).toContain('created_by = $3');
    expect(unset!.params).toContain('supplier_upload');
    expect(unset!.params).toContain('user-1');
  });

  it('업로드로 들어온 새 이미지는 기존 primary 가 있으면 대표를 빼앗지 않는다', async () => {
    const { app, writes } = buildApp({
      owned: true,
      images: [{ id: 'img-canon', master_id: 'master-1', is_primary: true, ...FOREIGN_ADMIN }],
    });
    const res = await request(app)
      .post('/products/master-1/images/from-url')
      .send({ imageUrl: 'https://example.com/b.png' });

    expect(res.status).toBe(201);
    const insert = writes.find((w) => w.sql.startsWith('INSERT INTO product_images'));
    // is_primary 파라미터(6번째)는 false 여야 한다.
    expect(insert!.params[5]).toBe(false);
    expect(writes.some((w) => w.sql.includes('SET is_primary = false'))).toBe(false);
  });

  it('다른 출처 썸네일은 교체(삭제)하지 않는다 — 403', async () => {
    const { app, writes } = buildApp({
      owned: true,
      images: [{ id: 'img-thumb', master_id: 'master-1', is_primary: true, type: 'thumbnail', ...FOREIGN_ADMIN }],
    });
    const res = await request(app)
      .post('/products/master-1/images/from-url')
      .send({ imageUrl: 'https://example.com/t.png', type: 'thumbnail' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('IMAGE_NOT_OWNED');
    expect(writes).toHaveLength(0);
  });
});
