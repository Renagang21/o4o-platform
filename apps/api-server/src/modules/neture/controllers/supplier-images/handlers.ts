import { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { NetureService } from '../../neture.service.js';
import { ImageStorageService } from '../../services/image-storage.service.js';
import {
  SupplierProductImageService,
  isSupplierOwnedImage,
} from '../../services/supplier-product-image.service.js';
import sharp from 'sharp';
import logger from '../../../../utils/logger.js';
import {
  NOT_OWNED,
  IMAGE_NOT_OWNED,
  CANNOT_REPLACE_PRIMARY,
  type AuthenticatedRequest,
  type SupplierRequest,
  type createSupplierImageAccess,
} from './access.js';
export function createSupplierImageHandlers(
  dataSource: DataSource,
  netureService: Pick<NetureService, 'getProductImages'>,
  imageStorageService: ImageStorageService,
  imageService: SupplierProductImageService,
  access: ReturnType<typeof createSupplierImageAccess>,
) {
  const { ownsMaster, resolveOwnedImage } = access;
  return {
    list: async (req: Request, res: Response) => {
      try {
        const images = await netureService.getProductImages(req.params.masterId);
        res.json({ success: true, data: images });
      } catch (error) {
        logger.error('[Neture API] Error fetching product images:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    },
    upload: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { masterId } = req.params;
        if (!(await ownsMaster((req as unknown as SupplierRequest).supplierId, masterId))) {
          return res.status(403).json(NOT_OWNED);
        }
        const file = req.file as Express.Multer.File;
        const imageType = (
          ['thumbnail', 'detail', 'content'].includes(req.body?.type) ? req.body.type : 'detail'
        ) as 'thumbnail' | 'detail' | 'content';

        if (!file) {
          return res.status(400).json({ success: false, error: 'NO_FILE' });
        }

        // 썸네일은 master 당 1개다. 기존 썸네일이 내 것이 아니면 교체(삭제)하지 않는다(§G).
        const existingThumbnail =
          imageType === 'thumbnail' ? await imageService.getThumbnail(masterId) : null;
        if (existingThumbnail && !isSupplierOwnedImage(existingThumbnail, req.user!.id)) {
          return res.status(403).json(IMAGE_NOT_OWNED);
        }

        // WO-NETURE-IMAGE-ASSET-STRUCTURE-V1: type별 리사이즈 정책
        const processed =
          imageType === 'thumbnail'
            ? await sharp(file.buffer)
                .resize(1000, 1000, { fit: 'cover' })
                .webp({ quality: 85 })
                .toBuffer()
            : await sharp(file.buffer)
                .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer();

        // GCS 업로드
        const { url, gcsPath } = await imageStorageService.uploadImage(
          masterId,
          processed,
          'image/webp',
          file.originalname,
          imageType,
        );

        // DB 레코드 생성 — source='supplier_upload' · created_by 기록
        const image = await imageService.insertImage({
          masterId,
          imageUrl: url,
          gcsPath,
          type: imageType,
          userId: req.user!.id,
        });

        // 내 기존 썸네일만 교체 삭제 (다른 출처는 위에서 이미 거부)
        if (existingThumbnail) {
          await imageService
            .deleteImage(existingThumbnail.id, masterId, req.user!.id)
            .catch(() => undefined);
          if (existingThumbnail.gcs_path) {
            imageStorageService.deleteImage(existingThumbnail.gcs_path).catch(() => {});
          }
        }

        // Fire-and-forget: OCR 추출 (WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1)
        if (imageType !== 'thumbnail') {
          import('../../../store-ai/services/product-ocr.service.js')
            .then(({ ProductOcrService }) => {
              const ocrService = new ProductOcrService(dataSource);
              return ocrService.extractAndSave(masterId, image.id, url);
            })
            .catch(() => {});
        }

        res.status(201).json({
          success: true,
          data: {
            id: image.id,
            imageUrl: url,
            gcsPath,
            type: imageType,
            isPrimary: image.isPrimary,
            source: 'supplier_upload',
          },
        });
      } catch (error) {
        logger.error('[Neture API] Error uploading product image:', error);
        res.status(500).json({ success: false, error: 'UPLOAD_FAILED' });
      }
    },
    fromUrl: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { masterId } = req.params;
        const { imageUrl, type = 'detail' } = req.body ?? {};

        if (!imageUrl || typeof imageUrl !== 'string') {
          return res.status(400).json({ success: false, error: 'MISSING_IMAGE_URL' });
        }
        if (!(await ownsMaster((req as unknown as SupplierRequest).supplierId, masterId))) {
          return res.status(403).json(NOT_OWNED);
        }

        const imageType = (['thumbnail', 'detail', 'content'].includes(type) ? type : 'detail') as
          | 'thumbnail'
          | 'detail'
          | 'content';

        const existingThumbnail =
          imageType === 'thumbnail' ? await imageService.getThumbnail(masterId) : null;
        if (existingThumbnail && !isSupplierOwnedImage(existingThumbnail, req.user!.id)) {
          return res.status(403).json(IMAGE_NOT_OWNED);
        }

        // gcsPath를 빈 문자열로 설정 — 외부 참조이므로 GCS 삭제 대상 아님
        const image = await imageService.insertImage({
          masterId,
          imageUrl,
          gcsPath: '',
          type: imageType,
          userId: req.user!.id,
        });

        if (existingThumbnail) {
          await imageService
            .deleteImage(existingThumbnail.id, masterId, req.user!.id)
            .catch(() => undefined);
          if (existingThumbnail.gcs_path) {
            imageStorageService.deleteImage(existingThumbnail.gcs_path).catch(() => {});
          }
        }

        res.status(201).json({
          success: true,
          data: {
            id: image.id,
            imageUrl,
            gcsPath: '',
            type: imageType,
            isPrimary: image.isPrimary,
            source: 'supplier_upload',
          },
        });
      } catch (error) {
        logger.error('[Neture API] Error registering image from URL:', error);
        res.status(500).json({ success: false, error: 'REGISTER_FAILED' });
      }
    },
    setPrimary: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { imageId } = req.params;
        const { masterId } = req.body ?? {};

        const image = await resolveOwnedImage(req, res, imageId, masterId);
        if (!image) return;

        const currentPrimary = await imageService.getCurrentPrimary(masterId);
        if (
          currentPrimary &&
          currentPrimary.id !== image.id &&
          !isSupplierOwnedImage(currentPrimary, req.user!.id)
        ) {
          return res.status(409).json(CANNOT_REPLACE_PRIMARY);
        }

        await imageService.setPrimary(imageId, masterId, req.user!.id);
        res.json({ success: true });
      } catch (error) {
        logger.error('[Neture API] Error setting primary image:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
      }
    },
    remove: async (req: AuthenticatedRequest, res: Response) => {
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
    },
  };
}
