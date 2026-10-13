/**
 * SupplierProductImageController
 * (WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §G · §H)
 *
 * admin.controller.ts 안에 있던 **공급자용** 상품 이미지 route 를 Supplier 도메인 위치로 옮긴 것이다.
 * route path 는 그대로다 (파일 위치 이동 · 권한 확대 0):
 *
 *   GET    /products/:masterId/images
 *   POST   /products/:masterId/images            업로드
 *   POST   /products/:masterId/images/from-url   미디어 라이브러리 URL 등록
 *   PATCH  /products/images/:imageId/primary     대표 지정
 *   DELETE /products/images/:imageId
 *
 * 소유 경계(§G):
 *   master 소유(자기 offer 보유) + 대상 이미지가 내 supplier_upload 일 때만 수정·삭제한다.
 *   다른 출처(admin_upload · candidate_promotion · 다른 supplier_upload · source=NULL)는 불가.
 *   대표 지정은 현재 primary 가 없거나 현재 primary 도 내 이미지일 때만 허용한다.
 *   다른 출처의 canonical primary 는 해제하지 않고
 *   409 SUPPLIER_CANNOT_REPLACE_CANONICAL_PRIMARY 로 거부한다(§G-2).
 */
import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { uploadSingleMiddleware } from '../../../middleware/upload.middleware.js';
import { NetureService } from '../neture.service.js';
import { ImageStorageService } from '../services/image-storage.service.js';
import { SupplierProductImageService } from '../services/supplier-product-image.service.js';

import { createSupplierImageAccess } from './supplier-images/access.js';
import { createSupplierImageHandlers } from './supplier-images/handlers.js';
export function createSupplierProductImageController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const imageStorageService = new ImageStorageService();
  const imageService = new SupplierProductImageService(dataSource);
  const access = createSupplierImageAccess(dataSource, netureService, imageService);
  const { requireActiveSupplier } = access;
  const handlers = createSupplierImageHandlers(
    dataSource,
    netureService,
    imageStorageService,
    imageService,
    access,
  );

  // Inline requireActiveSupplier middleware (matches original neture.routes.ts)

  /**
   * 공급자 소유 master 인지 확인한다 — WO-O4O-NETURE-SUPPLIER-PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1
   *
   * 이미지 write 경로는 masterId 를 클라이언트에서 받는다. ACTIVE 공급자라는 것만 확인하면
   * 남의 master 까지 건드릴 수 있어 소유 확인이 필요하다.
   * 소유 기준 = 해당 master 에 대한 자기 offer 보유(삭제되지 않은 offer).
   */

  /**
   * imageId 경로 공통 판정 — master 소유 → 경로 스푸핑 → 이미지 출처 소유 순서.
   * 통과하면 대상 행을 돌려주고, 아니면 응답을 이미 내보낸 뒤 null 을 돌려준다.
   */

  /**
   * GET /products/:masterId/images
   * 상품 이미지 목록 조회
   */
  router.get('/products/:masterId/images', requireAuth, handlers.list);

  /**
   * POST /products/:masterId/images
   * 상품 이미지 업로드 (공급자용)
   * - multer memoryStorage → sharp 리사이즈 → GCS 업로드 → DB 저장(source · created_by 기록)
   */
  router.post(
    '/products/:masterId/images',
    requireAuth,
    requireActiveSupplier as unknown as RequestHandler,
    uploadSingleMiddleware('image'),
    handlers.upload,
  );

  /**
   * POST /products/:masterId/images/from-url
   * 공용 미디어 라이브러리 URL로 상품 이미지 등록 (WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1)
   */
  router.post(
    '/products/:masterId/images/from-url',
    requireAuth,
    requireActiveSupplier as unknown as RequestHandler,
    handlers.fromUrl,
  );

  /**
   * PATCH /products/images/:imageId/primary
   * 대표 이미지 변경 — 현재 primary 가 다른 출처면 409 (해제하지 않는다 · §G-2)
   */
  router.patch(
    '/products/images/:imageId/primary',
    requireAuth,
    requireActiveSupplier as unknown as RequestHandler,
    handlers.setPrimary,
  );

  /**
   * DELETE /products/images/:imageId
   * 이미지 삭제 (DB + GCS) — 내가 올린 이미지만
   */
  router.delete(
    '/products/images/:imageId',
    requireAuth,
    requireActiveSupplier as unknown as RequestHandler,
    handlers.remove,
  );

  return router;
}
