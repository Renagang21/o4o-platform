/**
 * Store Library Controller
 *
 * WO-O4O-STORE-LIBRARY-API-INTEGRATION-V1
 *
 * 매장 자료실 CRUD (Display Domain).
 *
 * GET    /pharmacy/library            — 자료 목록 (org 필터)
 * POST   /pharmacy/library            — 자료 생성
 * PUT    /pharmacy/library/:id        — 자료 수정
 * DELETE /pharmacy/library/:id        — soft-delete (is_active=false)
 *
 * 인증: requireAuth + store owner 체크
 * 조직: organization_members 기반 자동 결정
 * Neture FK 금지 — 프리필은 클라이언트 측에서만 처리
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { StoreLibraryItem } from '../../platform/entities/store-library-item.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = RequestHandler;

export function createStoreLibraryController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const libraryRepo = dataSource.getRepository(StoreLibraryItem);

  const requirePharmacyOwner = createRequireStoreOwner(dataSource);

  // ─── GET /pharmacy/library — 자료 목록 ─────────────────────────
  router.get(
    '/pharmacy/library',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;

      const items = await libraryRepo.find({
        where: { organizationId, isActive: true },
        order: { createdAt: 'DESC' },
      });

      res.json({ success: true, data: items });
    }),
  );

  // ─── POST /pharmacy/library — 자료 생성 ────────────────────────
  router.post(
    '/pharmacy/library',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { title, description, fileUrl, fileName, fileSize, mimeType, category } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'title is required' },
        });
        return;
      }

      const item = libraryRepo.create({
        organizationId,
        title: title.trim(),
        description: description || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: typeof fileSize === 'number' ? fileSize : null,
        mimeType: mimeType || null,
        category: category || null,
        isActive: true,
      });

      const saved = await libraryRepo.save(item);
      res.status(201).json({ success: true, data: saved });
    }),
  );

  // ─── PUT /pharmacy/library/:id — 자료 수정 ────────────────────
  router.put(
    '/pharmacy/library/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const item = await libraryRepo.findOne({
        where: { id, organizationId },
      });

      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'LIBRARY_ITEM_NOT_FOUND', message: 'Library item not found' },
        });
        return;
      }

      const { title, description, fileUrl, fileName, fileSize, mimeType, category, isActive } = req.body;

      if (title !== undefined) item.title = String(title).trim();
      if (description !== undefined) item.description = description;
      if (fileUrl !== undefined) item.fileUrl = fileUrl;
      if (fileName !== undefined) item.fileName = fileName;
      if (fileSize !== undefined) item.fileSize = typeof fileSize === 'number' ? fileSize : null;
      if (mimeType !== undefined) item.mimeType = mimeType;
      if (category !== undefined) item.category = category;
      if (typeof isActive === 'boolean') item.isActive = isActive;

      const saved = await libraryRepo.save(item);
      res.json({ success: true, data: saved });
    }),
  );

  // ─── DELETE /pharmacy/library/:id — soft-delete ──────────────────
  router.delete(
    '/pharmacy/library/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const item = await libraryRepo.findOne({
        where: { id, organizationId },
      });

      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'LIBRARY_ITEM_NOT_FOUND', message: 'Library item not found' },
        });
        return;
      }

      item.isActive = false;
      await libraryRepo.save(item);

      res.json({ success: true, message: 'Library item deactivated' });
    }),
  );

  return router;
}
