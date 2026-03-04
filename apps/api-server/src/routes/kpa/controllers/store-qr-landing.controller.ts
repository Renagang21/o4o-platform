/**
 * Store QR Landing Controller
 *
 * WO-O4O-QR-LANDING-PAGE-V1
 *
 * QR 코드 CRUD + 공개 랜딩 데이터 조회.
 *
 * PUBLIC (no auth):
 *   GET  /qr/public/:slug  — QR 랜딩 데이터 조회
 *
 * AUTHENTICATED (requireAuth + requirePharmacyOwner):
 *   GET    /pharmacy/qr      — 내 QR 코드 목록 (페이지네이션)
 *   POST   /pharmacy/qr      — QR 코드 생성
 *   PUT    /pharmacy/qr/:id  — QR 코드 수정
 *   DELETE /pharmacy/qr/:id  — soft-delete
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { StoreQrCode } from '../../platform/entities/store-qr-code.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = RequestHandler;

export function createStoreQrLandingController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const qrRepo = dataSource.getRepository(StoreQrCode);
  const requirePharmacyOwner = createRequireStoreOwner(dataSource);

  // ─── PUBLIC: GET /qr/public/:slug ──────────────────────────────
  router.get(
    '/qr/public/:slug',
    asyncHandler(async (req: Request, res: Response) => {
      const { slug } = req.params;

      const rows = await dataSource.query(
        `SELECT
           qr.id,
           qr.type,
           qr.title,
           qr.description,
           qr.landing_type AS "landingType",
           qr.landing_target_id AS "landingTargetId",
           qr.slug,
           qr.organization_id AS "organizationId",
           li.file_url AS "imageUrl",
           li.title AS "libraryItemTitle"
         FROM store_qr_codes qr
         LEFT JOIN store_library_items li
           ON li.id = qr.library_item_id AND li.is_active = true
         WHERE qr.slug = $1 AND qr.is_active = true
         LIMIT 1`,
        [slug],
      );

      if (rows.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'QR_NOT_FOUND', message: 'QR code not found' },
        });
        return;
      }

      const storeRows = await dataSource.query(
        `SELECT slug FROM platform_store_slugs
         WHERE store_id = $1 AND is_active = true
         ORDER BY created_at DESC LIMIT 1`,
        [rows[0].organizationId],
      );

      res.json({
        success: true,
        data: {
          ...rows[0],
          storeSlug: storeRows[0]?.slug || null,
        },
      });
    }),
  );

  // ─── GET /pharmacy/qr — QR 코드 목록 (페이지네이션) ──────────
  router.get(
    '/pharmacy/qr',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

      const qb = qrRepo.createQueryBuilder('qr')
        .where('qr.organizationId = :organizationId', { organizationId })
        .andWhere('qr.isActive = :isActive', { isActive: true })
        .orderBy('qr.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [items, total] = await qb.getManyAndCount();

      res.json({
        success: true,
        data: { items, page, limit, total },
      });
    }),
  );

  // ─── POST /pharmacy/qr — QR 코드 생성 ─────────────────────────
  router.post(
    '/pharmacy/qr',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { title, description, type, libraryItemId, landingType, landingTargetId, slug } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'title is required' },
        });
        return;
      }
      if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'slug is required' },
        });
        return;
      }
      if (!landingType || !['product', 'promotion', 'page', 'link'].includes(landingType)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid landingType' },
        });
        return;
      }

      const existing = await qrRepo.findOne({ where: { slug: slug.trim() } });
      if (existing) {
        res.status(409).json({
          success: false,
          error: { code: 'SLUG_CONFLICT', message: 'Slug already in use' },
        });
        return;
      }

      const item = qrRepo.create({
        organizationId,
        type: type || landingType,
        title: title.trim(),
        description: description || null,
        libraryItemId: libraryItemId || null,
        landingType,
        landingTargetId: landingTargetId || null,
        slug: slug.trim(),
        isActive: true,
      });

      const saved = await qrRepo.save(item);
      res.status(201).json({ success: true, data: saved });
    }),
  );

  // ─── PUT /pharmacy/qr/:id — QR 코드 수정 ──────────────────────
  router.put(
    '/pharmacy/qr/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const item = await qrRepo.findOne({ where: { id, organizationId } });

      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'QR_NOT_FOUND', message: 'QR code not found' },
        });
        return;
      }

      const { title, description, type, libraryItemId, landingType, landingTargetId, slug } = req.body;

      if (title !== undefined) item.title = String(title).trim();
      if (description !== undefined) item.description = description;
      if (type !== undefined) item.type = type;
      if (libraryItemId !== undefined) item.libraryItemId = libraryItemId;
      if (landingType !== undefined) item.landingType = landingType;
      if (landingTargetId !== undefined) item.landingTargetId = landingTargetId;
      if (slug !== undefined && slug !== item.slug) {
        const conflict = await qrRepo.findOne({ where: { slug: slug.trim() } });
        if (conflict) {
          res.status(409).json({
            success: false,
            error: { code: 'SLUG_CONFLICT', message: 'Slug already in use' },
          });
          return;
        }
        item.slug = slug.trim();
      }

      const saved = await qrRepo.save(item);
      res.json({ success: true, data: saved });
    }),
  );

  // ─── DELETE /pharmacy/qr/:id — soft-delete ────────────────────
  router.delete(
    '/pharmacy/qr/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const item = await qrRepo.findOne({ where: { id, organizationId } });

      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'QR_NOT_FOUND', message: 'QR code not found' },
        });
        return;
      }

      item.isActive = false;
      await qrRepo.save(item);
      res.json({ success: true, message: 'QR code deactivated' });
    }),
  );

  return router;
}
