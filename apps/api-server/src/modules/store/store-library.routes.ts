/**
 * Store Library Routes
 *
 * WO-O4O-STORE-LIBRARY-FOUNDATION-V1
 *
 * 매장 내부 전용 자료실 CRUD API.
 * Neture 연동 없음. HUB 자동 노출 없음.
 *
 * GET    /library           — 자료 목록
 * POST   /library           — 자료 생성
 * PATCH  /library/:id       — 자료 수정
 * DELETE /library/:id       — 자료 삭제 (hard delete)
 *
 * 권한: store owner / store manager (KPA branch_admin/operator)
 * 조직: createRequireStoreOwner → req.organizationId
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../middleware/error-handler.js';
import { createRequireStoreOwner } from '../../utils/store-owner.utils.js';
import { StoreLibraryService } from './store-library.service.js';

type AuthMiddleware = RequestHandler;

export function createStoreLibraryRoutes(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const service = new StoreLibraryService(dataSource);
  const requireStoreOwner = createRequireStoreOwner(dataSource);

  // ─── GET /library — 자료 목록 ────────────────────────────────
  router.get(
    '/library',
    requireAuth,
    requireStoreOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const storeId = (req as any).organizationId;
      const items = await service.getStoreLibraryItems(storeId);
      res.json({ success: true, data: items });
    }),
  );

  // ─── POST /library — 자료 생성 ───────────────────────────────
  router.post(
    '/library',
    requireAuth,
    requireStoreOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const storeId = (req as any).organizationId;
      const userId = (req as any).user?.id;

      const { title, description, fileUrl, fileName, fileSize, mimeType, category } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'title is required',
        });
        return;
      }
      if (!fileUrl || !fileName || !fileSize || !mimeType) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'fileUrl, fileName, fileSize, mimeType are required',
        });
        return;
      }

      const item = await service.createStoreLibraryItem(storeId, {
        title: title.trim(),
        description: description ?? null,
        fileUrl,
        fileName,
        fileSize: fileSize != null ? Number(fileSize) : null,
        mimeType,
        category: category ?? null,
      });

      res.status(201).json({ success: true, data: item });
    }),
  );

  // ─── PATCH /library/:id — 자료 수정 ─────────────────────────
  router.patch(
    '/library/:id',
    requireAuth,
    requireStoreOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const storeId = (req as any).organizationId;
      const { id } = req.params;

      const result = await service.updateStoreLibraryItem(id, storeId, req.body);
      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error,
          message: 'Library item not found',
        });
        return;
      }

      res.json({ success: true, data: result.data });
    }),
  );

  // ─── DELETE /library/:id — 자료 삭제 ─────────────────────────
  router.delete(
    '/library/:id',
    requireAuth,
    requireStoreOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const storeId = (req as any).organizationId;
      const { id } = req.params;

      const result = await service.deleteStoreLibraryItem(id, storeId);
      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error,
          message: 'Library item not found',
        });
        return;
      }

      res.json({ success: true, message: 'Library item deleted' });
    }),
  );

  return router;
}
