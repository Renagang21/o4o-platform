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
import { Router, Request, Response } from 'express';
import type { RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { uploadSingleMiddleware } from '../../../middleware/upload.middleware.js';
import { NetureService } from '../neture.service.js';
import { ImageStorageService } from '../services/image-storage.service.js';
import {
  SupplierProductImageService,
  isSupplierOwnedImage,
  type ProductImageRow,
} from '../services/supplier-product-image.service.js';
import { SupplierStatus } from '../entities/index.js';
import sharp from 'sharp';
import logger from '../../../utils/logger.js';

type AuthenticatedRequest = Request & { user?: { id: string; role: string } };
type SupplierRequest = Request & { supplierId: string };

const NOT_OWNED = {
  success: false,
  error: 'MASTER_NOT_OWNED',
  message: '이 상품에 대한 권한이 없습니다.',
};

const IMAGE_NOT_OWNED = {
  success: false,
  error: 'IMAGE_NOT_OWNED',
  message: '내가 등록한 이미지만 수정·삭제할 수 있습니다.',
};

const CANNOT_REPLACE_PRIMARY = {
  success: false,
  error: 'SUPPLIER_CANNOT_REPLACE_CANONICAL_PRIMARY',
  message: '다른 출처의 대표 이미지는 공급자가 교체할 수 없습니다.',
};

export function createSupplierProductImageController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const imageStorageService = new ImageStorageService();
  const imageService = new SupplierProductImageService(dataSource);

  // Inline requireActiveSupplier middleware (matches original neture.routes.ts)
  async function requireActiveSupplier(req: Request, res: Response, next: () => void): Promise<void> {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    const supplier = await netureService.getSupplierByUserId(authReq.user.id);
    if (!supplier) {
      res.status(403).json({ success: false, error: { code: 'NO_SUPPLIER', message: 'No linked supplier account found' } });
      return;
    }
    if (supplier.status !== SupplierStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        error: { code: 'SUPPLIER_NOT_ACTIVE', message: `Supplier account is ${supplier.status}. Only ACTIVE suppliers can perform this action.` },
        currentStatus: supplier.status,
      });
      return;
    }
    (req as SupplierRequest).supplierId = supplier.id;
    next();
  }

  /**
   * 공급자 소유 master 인지 확인한다 — WO-O4O-NETURE-SUPPLIER-PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1
   *
   * 이미지 write 경로는 masterId 를 클라이언트에서 받는다. ACTIVE 공급자라는 것만 확인하면
   * 남의 master 까지 건드릴 수 있어 소유 확인이 필요하다.
   * 소유 기준 = 해당 master 에 대한 자기 offer 보유(삭제되지 않은 offer).
   */
  async function ownsMaster(supplierId: string, masterId: string): Promise<boolean> {
    if (!masterId) return false;
    const rows = await dataSource.query(
      `SELECT 1 FROM supplier_product_offers
        WHERE supplier_id = $1 AND master_id = $2 AND deleted_at IS NULL
        LIMIT 1`,
      [supplierId, masterId],
    );
    return rows.length > 0;
  }

  /**
   * imageId 경로 공통 판정 — master 소유 → 경로 스푸핑 → 이미지 출처 소유 순서.
   * 통과하면 대상 행을 돌려주고, 아니면 응답을 이미 내보낸 뒤 null 을 돌려준다.
   */
  async function resolveOwnedImage(
    req: AuthenticatedRequest,
    res: Response,
    imageId: string,
    masterId: string,
  ): Promise<ProductImageRow | null> {
    if (!masterId) {
      res.status(400).json({ success: false, error: 'MISSING_MASTER_ID' });
      return null;
    }
    if (!(await ownsMaster((req as unknown as SupplierRequest).supplierId, masterId))) {
      res.status(403).json(NOT_OWNED);
      return null;
    }
    const image = await imageService.getImage(imageId);
    // 요청 body 의 masterId 와 실제 이미지의 master 가 다르면 거부(경로 스푸핑 방지)
    if (!image || image.master_id !== masterId) {
      res.status(403).json(NOT_OWNED);
      return null;
    }
    if (!isSupplierOwnedImage(image, req.user!.id)) {
      // 다른 출처(운영자 · 승격 · 다른 공급자 · source=NULL)는 공급자가 관리하지 않는다.
      res.status(403).json(IMAGE_NOT_OWNED);
      return null;
    }
    return image;
  }

  /**
   * GET /products/:masterId/images
   * 상품 이미지 목록 조회
   */
  router.get('/products/:masterId/images', requireAuth, async (req: Request, res: Response) => {
    try {
      const images = await netureService.getProductImages(req.params.masterId);
      res.json({ success: true, data: images });
    } catch (error) {
      logger.error('[Neture API] Error fetching product images:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * POST /products/:masterId/images
   * 상품 이미지 업로드 (공급자용)
   * - multer memoryStorage → sharp 리사이즈 → GCS 업로드 → DB 저장(source · created_by 기록)
   */
  router.post('/products/:masterId/images', requireAuth, requireActiveSupplier as unknown as RequestHandler, uploadSingleMiddleware('image'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { masterId } = req.params;
      if (!(await ownsMaster((req as unknown as SupplierRequest).supplierId, masterId))) {
        return res.status(403).json(NOT_OWNED);
      }
      const file = req.file as Express.Multer.File;
      const imageType = (['thumbnail', 'detail', 'content'].includes(req.body?.type) ? req.body.type : 'detail') as 'thumbnail' | 'detail' | 'content';

      if (!file) {
        return res.status(400).json({ success: false, error: 'NO_FILE' });
      }

      // 썸네일은 master 당 1개다. 기존 썸네일이 내 것이 아니면 교체(삭제)하지 않는다(§G).
      const existingThumbnail = imageType === 'thumbnail' ? await imageService.getThumbnail(masterId) : null;
      if (existingThumbnail && !isSupplierOwnedImage(existingThumbnail, req.user!.id)) {
        return res.status(403).json(IMAGE_NOT_OWNED);
      }

      // WO-NETURE-IMAGE-ASSET-STRUCTURE-V1: type별 리사이즈 정책
      const processed = imageType === 'thumbnail'
        ? await sharp(file.buffer).resize(1000, 1000, { fit: 'cover' }).webp({ quality: 85 }).toBuffer()
        : await sharp(file.buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();

      // GCS 업로드
      const { url, gcsPath } = await imageStorageService.uploadImage(masterId, processed, 'image/webp', file.originalname, imageType);

      // DB 레코드 생성 — source='supplier_upload' · created_by 기록
      const image = await imageService.insertImage({ masterId, imageUrl: url, gcsPath, type: imageType, userId: req.user!.id });

      // 내 기존 썸네일만 교체 삭제 (다른 출처는 위에서 이미 거부)
      if (existingThumbnail) {
        await imageService.deleteImage(existingThumbnail.id, masterId, req.user!.id).catch(() => undefined);
        if (existingThumbnail.gcs_path) {
          imageStorageService.deleteImage(existingThumbnail.gcs_path).catch(() => {});
        }
      }

      // Fire-and-forget: OCR 추출 (WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1)
      if (imageType !== 'thumbnail') {
        import('../../store-ai/services/product-ocr.service.js')
          .then(({ ProductOcrService }) => {
            const ocrService = new ProductOcrService(dataSource);
            return ocrService.extractAndSave(masterId, image.id, url);
          })
          .catch(() => {});
      }

      res.status(201).json({
        success: true,
        data: { id: image.id, imageUrl: url, gcsPath, type: imageType, isPrimary: image.isPrimary, source: 'supplier_upload' },
      });
    } catch (error) {
      logger.error('[Neture API] Error uploading product image:', error);
      res.status(500).json({ success: false, error: 'UPLOAD_FAILED' });
    }
  });

  /**
   * POST /products/:masterId/images/from-url
   * 공용 미디어 라이브러리 URL로 상품 이미지 등록 (WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1)
   */
  router.post('/products/:masterId/images/from-url', requireAuth, requireActiveSupplier as unknown as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { masterId } = req.params;
      const { imageUrl, type = 'detail' } = req.body ?? {};

      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ success: false, error: 'MISSING_IMAGE_URL' });
      }
      if (!(await ownsMaster((req as unknown as SupplierRequest).supplierId, masterId))) {
        return res.status(403).json(NOT_OWNED);
      }

      const imageType = (['thumbnail', 'detail', 'content'].includes(type) ? type : 'detail') as 'thumbnail' | 'detail' | 'content';

      const existingThumbnail = imageType === 'thumbnail' ? await imageService.getThumbnail(masterId) : null;
      if (existingThumbnail && !isSupplierOwnedImage(existingThumbnail, req.user!.id)) {
        return res.status(403).json(IMAGE_NOT_OWNED);
      }

      // gcsPath를 빈 문자열로 설정 — 외부 참조이므로 GCS 삭제 대상 아님
      const image = await imageService.insertImage({ masterId, imageUrl, gcsPath: '', type: imageType, userId: req.user!.id });

      if (existingThumbnail) {
        await imageService.deleteImage(existingThumbnail.id, masterId, req.user!.id).catch(() => undefined);
        if (existingThumbnail.gcs_path) {
          imageStorageService.deleteImage(existingThumbnail.gcs_path).catch(() => {});
        }
      }

      res.status(201).json({
        success: true,
        data: { id: image.id, imageUrl, gcsPath: '', type: imageType, isPrimary: image.isPrimary, source: 'supplier_upload' },
      });
    } catch (error) {
      logger.error('[Neture API] Error registering image from URL:', error);
      res.status(500).json({ success: false, error: 'REGISTER_FAILED' });
    }
  });

  /**
   * PATCH /products/images/:imageId/primary
   * 대표 이미지 변경 — 현재 primary 가 다른 출처면 409 (해제하지 않는다 · §G-2)
   */
  router.patch('/products/images/:imageId/primary', requireAuth, requireActiveSupplier as unknown as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { imageId } = req.params;
      const { masterId } = req.body ?? {};

      const image = await resolveOwnedImage(req, res, imageId, masterId);
      if (!image) return;

      const currentPrimary = await imageService.getCurrentPrimary(masterId);
      if (currentPrimary && currentPrimary.id !== image.id && !isSupplierOwnedImage(currentPrimary, req.user!.id)) {
        return res.status(409).json(CANNOT_REPLACE_PRIMARY);
      }

      await imageService.setPrimary(imageId, masterId, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      logger.error('[Neture API] Error setting primary image:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * DELETE /products/images/:imageId
   * 이미지 삭제 (DB + GCS) — 내가 올린 이미지만
   */
  router.delete('/products/images/:imageId', requireAuth, requireActiveSupplier as unknown as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { imageId } = req.params;
      const { masterId } = req.body ?? {};

      const image = await resolveOwnedImage(req, res, imageId, masterId);
      if (!image) return;

      const { gcsPath } = await imageService.deleteImage(imageId, masterId, req.user!.id);
      if (gcsPath) {
        await imageStorageService.deleteImage(gcsPath);
      }

      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      const status = message === 'IMAGE_NOT_FOUND' ? 404 : 500;
      logger.error('[Neture API] Error deleting product image:', error);
      res.status(status).json({ success: false, error: message });
    }
  });

  return router;
}
