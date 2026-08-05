/**
 * ProductMasterImage Controller — O4O 상품 DB 이미지 action (admin write)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-ACTION-V1 (Phase 1: 추가 / 대표 지정)
 * WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-SOFT-DELETE-RESTORE-V1 (Phase 2: 숨김 / 복원 / 목록)
 *
 * mount: /api/v1/admin/o4o-product-db/masters
 *   GET  /:id/images                       — 이미지 목록 (숨김 포함, admin 전용). active 먼저, 숨김 뒤.
 *   POST /:id/images                       — 이미지 추가 (multipart 'image'). 첫 active 이미지면 자동 대표.
 *   POST /:id/images/:imageId/set-primary  — 대표 이미지 지정 (트랜잭션, master당 active primary 1개).
 *   DELETE /:id/images/:imageId            — 이미지 숨김 (soft delete). 대표였으면 남은 active 다음(sortOrder)이 자동 승계.
 *   POST /:id/images/:imageId/restore      — 숨김 이미지 복원. active 대표가 없으면 복원 이미지를 대표로 자동 지정.
 *
 * 정책(Phase 2): "삭제가 아니라 숨김". GCS 원본 삭제 없음(gcs_path 보존).
 *   대표 승계(WO §7): 숨김으로 대표가 비면 남은 active 중 sortOrder 다음을 대표 승계(없으면 0),
 *   복원 시 active 대표가 없으면 복원 이미지를 대표로. active primary 는 항상 1개 이하 유지.
 *   작업 이력: image_hidden / image_restored + 승계 발생 시 image_primary_changed(auto) 기록.
 *
 * 범위: product_images 에만 write. ProductMaster 본문/설명/후보 무변경.
 * audit_logs 에 image_added / image_primary_changed / image_hidden / image_restored 기록.
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
    action: 'image_added' | 'image_primary_changed' | 'image_hidden' | 'image_restored',
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

  // GET /:id/images — 이미지 목록 (admin 전용, 숨김 포함). active(대표 먼저) → 숨김 순.
  // 공유 상세 API(/neture/products/library/:id)는 active 만 반환하므로, 숨김 복원 UI 를 위해 별도 제공.
  router.get('/:id/images', async (req: Request, res: Response) => {
    try {
      const masterId = req.params.id;
      if (!(await masterExists(masterId))) {
        res.status(404).json({ success: false, error: 'ProductMaster not found', code: 'MASTER_NOT_FOUND' });
        return;
      }
      const all = await imageRepo.find({ where: { masterId } });
      // active(대표 먼저, sortOrder 순) → 숨김(최근 숨김 먼저)
      const rows = all.sort((a, b) => {
        const aHidden = a.deletedAt ? 1 : 0;
        const bHidden = b.deletedAt ? 1 : 0;
        if (aHidden !== bHidden) return aHidden - bHidden;
        if (aHidden === 0) {
          if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
          return a.sortOrder - b.sortOrder;
        }
        return (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0);
      });
      res.json({
        success: true,
        data: rows.map((r) => ({
          id: r.id,
          imageUrl: r.imageUrl,
          isPrimary: r.isPrimary,
          sortOrder: r.sortOrder,
          type: r.type,
          source: r.source,
          createdAt: r.createdAt,
          deletedAt: r.deletedAt,
          deletedBy: r.deletedBy,
        })),
      });
    } catch (error) {
      logger.error('[ProductMasterImage] list images error:', error);
      res.status(500).json({ success: false, error: 'Failed to list images' });
    }
  });

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

  // DELETE /:id/images/:imageId — 이미지 숨김 (soft delete, GCS 원본 보존)
  //   대표였으면 남은 active 중 sortOrder 다음을 대표로 자동 승계(WO §7). 없으면 대표 0.
  router.delete('/:id/images/:imageId', async (req: Request, res: Response) => {
    try {
      const masterId = req.params.id;
      const imageId = req.params.imageId;

      // 이미 숨김이면 404(멱등 아님 — 상태 혼동 방지)
      const target = await imageRepo.findOne({ where: { id: imageId, masterId, deletedAt: IsNull() } });
      if (!target) {
        res.status(404).json({ success: false, error: 'Active image not found for this master', code: 'IMAGE_NOT_FOUND' });
        return;
      }

      const actor = actorId(req);
      const wasPrimary = target.isPrimary;
      let newPrimaryImageId: string | null = null;

      await dataSource.transaction(async (manager) => {
        await manager.update(
          ProductImage,
          { id: imageId, masterId, deletedAt: IsNull() },
          { deletedAt: new Date(), deletedBy: actor, isPrimary: false, updatedBy: actor },
        );
        // 대표를 숨겼으면 남은 active 중 다음(sortOrder ASC, createdAt ASC)을 대표 승계
        if (wasPrimary) {
          const next = await manager.findOne(ProductImage, {
            where: { masterId, deletedAt: IsNull() },
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
          });
          if (next) {
            await manager.update(ProductImage, { id: next.id, masterId }, { isPrimary: true, updatedBy: actor });
            newPrimaryImageId = next.id;
          }
        }
      });

      await writeAudit(masterId, 'image_hidden', actor, { imageId, wasPrimary, newPrimaryImageId });
      if (newPrimaryImageId) {
        await writeAudit(masterId, 'image_primary_changed', actor, {
          imageId: newPrimaryImageId,
          previousPrimaryImageId: imageId,
          newPrimaryImageId,
          auto: true,
        });
      }

      res.json({
        success: true,
        data: { id: imageId, masterId, hidden: true, wasPrimary, newPrimaryImageId },
      });
    } catch (error) {
      logger.error('[ProductMasterImage] hide image error:', error);
      res.status(500).json({ success: false, error: 'Failed to hide image' });
    }
  });

  // POST /:id/images/:imageId/restore — 숨김 이미지 복원
  //   active 대표가 없으면 복원 이미지를 대표로 자동 지정(WO §7). 있으면 비대표로 복원.
  router.post('/:id/images/:imageId/restore', async (req: Request, res: Response) => {
    try {
      const masterId = req.params.id;
      const imageId = req.params.imageId;

      const target = await imageRepo.findOne({ where: { id: imageId, masterId } });
      if (!target) {
        res.status(404).json({ success: false, error: 'Image not found for this master', code: 'IMAGE_NOT_FOUND' });
        return;
      }
      if (!target.deletedAt) {
        res.status(409).json({ success: false, error: 'Image is not hidden', code: 'IMAGE_NOT_HIDDEN' });
        return;
      }

      const actor = actorId(req);
      let becamePrimary = false;

      await dataSource.transaction(async (manager) => {
        await manager.update(
          ProductImage,
          { id: imageId, masterId },
          { deletedAt: null, deletedBy: null, updatedBy: actor },
        );
        // active 대표가 없으면 복원 이미지를 대표로 자동 지정
        const activePrimary = await manager.findOne(ProductImage, {
          where: { masterId, isPrimary: true, deletedAt: IsNull() },
        });
        if (!activePrimary) {
          await manager.update(ProductImage, { id: imageId, masterId }, { isPrimary: true, updatedBy: actor });
          becamePrimary = true;
        }
      });

      await writeAudit(masterId, 'image_restored', actor, { imageId, becamePrimary });
      if (becamePrimary) {
        await writeAudit(masterId, 'image_primary_changed', actor, {
          imageId,
          previousPrimaryImageId: null,
          newPrimaryImageId: imageId,
          auto: true,
        });
      }

      res.json({
        success: true,
        data: { id: imageId, masterId, restored: true, isPrimary: becamePrimary },
      });
    } catch (error) {
      logger.error('[ProductMasterImage] restore image error:', error);
      res.status(500).json({ success: false, error: 'Failed to restore image' });
    }
  });

  return router;
}
