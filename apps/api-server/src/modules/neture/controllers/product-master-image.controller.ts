/**
 * ProductMasterImage Controller — O4O 상품 DB 이미지 action (admin write, Phase 1)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-ACTION-V1
 *
 * mount: /api/v1/admin/o4o-product-db/masters
 *   POST /:id/images                       — 이미지 추가 (multipart 'image'). 첫 active 이미지면 자동 대표.
 *   POST /:id/images/:imageId/set-primary  — 대표 이미지 지정 (트랜잭션, master당 active primary 1개).
 *
 * 범위: product_images 에만 write. ProductMaster 본문/설명/후보 무변경.
 * 숨김/복원/교체/삭제/GCS delete 없음(후속 WO). audit_logs 에 image_added / image_primary_changed 기록.
 * 권한: ADMIN_ROLES (operator write 금지 — operator scope 는 이 컨트롤러에 없음).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { DataSource, IsNull } from 'typeorm';
import sharp from 'sharp';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { uploadSingleMiddleware } from '../../../middleware/upload.middleware.js';
import { ImageStorageService } from '../services/image-storage.service.js';
import { ProductImage } from '../entities/ProductImage.entity.js';
import { AuditLog } from '../../../entities/AuditLog.js';
import logger from '../../../utils/logger.js';

const ADMIN_ROLES = [
  'platform:admin',
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
  'glycopharm:admin',
  'glycopharm:operator',
  'cosmetics:admin',
  'cosmetics:operator',
  'kpa-society:admin',
  'kpa-society:operator',
];

function actorId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

export function createProductMasterImageController(dataSource: DataSource): Router {
  const router = Router();
  const imageRepo = dataSource.getRepository(ProductImage);
  const auditRepo = dataSource.getRepository(AuditLog);
  const imageStorageService = new ImageStorageService();

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  // audit 기록 (fire-and-forget — 실패해도 main action 롤백하지 않음)
  async function writeAudit(
    masterId: string,
    action: 'image_added' | 'image_primary_changed',
    userId: string | null,
    changes: Record<string, unknown>,
  ): Promise<void> {
    try {
      await auditRepo.save(
        auditRepo.create({
          entityType: 'ProductMaster',
          entityId: masterId,
          action,
          userId: userId ?? undefined,
          changes: changes as any,
        }),
      );
    } catch (e) {
      logger.error('[ProductMasterImage] audit write failed:', e);
    }
  }

  async function masterExists(masterId: string): Promise<boolean> {
    const rows: Array<{ exists: boolean }> = await dataSource.query(
      `SELECT EXISTS(SELECT 1 FROM product_masters WHERE id = $1) AS exists`,
      [masterId],
    );
    return !!rows[0]?.exists;
  }

  // POST /:id/images — 이미지 추가
  router.post('/:id/images', uploadSingleMiddleware('image'), async (req: Request, res: Response) => {
    try {
      const masterId = req.params.id;
      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        res.status(400).json({ success: false, error: 'NO_FILE', code: 'NO_FILE' });
        return;
      }
      if (!(await masterExists(masterId))) {
        res.status(404).json({ success: false, error: 'ProductMaster not found', code: 'MASTER_NOT_FOUND' });
        return;
      }

      // detail 이미지 리사이즈 (기존 admin 업로드 패턴과 동일: webp, inside 1200)
      const processed = await sharp(file.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const { url, gcsPath } = await imageStorageService.uploadImage(
        masterId,
        processed,
        'image/webp',
        file.originalname,
        'detail',
      );

      // 첫 active 이미지면 자동 대표
      const activeCount = await imageRepo.count({ where: { masterId, deletedAt: IsNull() } });
      const isPrimary = activeCount === 0;
      const actor = actorId(req);

      const saved = await imageRepo.save(
        imageRepo.create({
          masterId,
          imageUrl: url,
          gcsPath,
          type: 'detail',
          isPrimary,
          sortOrder: activeCount,
          source: 'admin_upload',
          createdBy: actor,
        }),
      );

      await writeAudit(masterId, 'image_added', actor, {
        imageId: saved.id,
        imageUrl: url,
        isPrimary,
      });

      res.status(201).json({
        success: true,
        data: {
          id: saved.id,
          masterId,
          imageUrl: saved.imageUrl,
          gcsPath: saved.gcsPath,
          isPrimary: saved.isPrimary,
          source: saved.source,
          createdAt: saved.createdAt,
        },
      });
    } catch (error) {
      logger.error('[ProductMasterImage] add image error:', error);
      res.status(500).json({ success: false, error: 'Failed to add image' });
    }
  });

  // POST /:id/images/:imageId/set-primary — 대표 이미지 지정
  router.post('/:id/images/:imageId/set-primary', async (req: Request, res: Response) => {
    try {
      const masterId = req.params.id;
      const imageId = req.params.imageId;

      const target = await imageRepo.findOne({ where: { id: imageId, masterId, deletedAt: IsNull() } });
      if (!target) {
        res.status(404).json({ success: false, error: 'Image not found for this master', code: 'IMAGE_NOT_FOUND' });
        return;
      }

      const actor = actorId(req);
      let previousPrimaryImageId: string | null = null;

      await dataSource.transaction(async (manager) => {
        const current = await manager.findOne(ProductImage, {
          where: { masterId, isPrimary: true, deletedAt: IsNull() },
        });
        previousPrimaryImageId = current?.id ?? null;

        if (previousPrimaryImageId === imageId) return; // 이미 대표 — no-op

        // clear 후 set (active-primary UNIQUE 제약과 호환)
        await manager.update(
          ProductImage,
          { masterId, isPrimary: true, deletedAt: IsNull() },
          { isPrimary: false, updatedBy: actor },
        );
        await manager.update(ProductImage, { id: imageId, masterId }, { isPrimary: true, updatedBy: actor });
      });

      if (previousPrimaryImageId !== imageId) {
        await writeAudit(masterId, 'image_primary_changed', actor, {
          imageId,
          previousPrimaryImageId,
          newPrimaryImageId: imageId,
        });
      }

      res.json({
        success: true,
        data: { id: imageId, masterId, isPrimary: true, previousPrimaryImageId },
      });
    } catch (error) {
      logger.error('[ProductMasterImage] set-primary error:', error);
      res.status(500).json({ success: false, error: 'Failed to set primary image' });
    }
  });

  return router;
}
