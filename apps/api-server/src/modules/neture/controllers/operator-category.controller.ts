/**
 * Operator Category Controller
 *
 * WO-NETURE-CATEGORY-MANAGEMENT-V1
 *
 * CRUD for product categories at operator scope.
 * Delegates to existing NetureService (NetureCatalogService).
 *
 * Routes (mounted at /operator):
 *   GET    /categories       — 카테고리 트리 조회
 *   POST   /categories       — 카테고리 생성
 *   PATCH  /categories/:id   — 카테고리 수정
 *   DELETE /categories/:id   — 카테고리 삭제
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { NetureService } from '../neture.service.js';
import logger from '../../../utils/logger.js';

export function createOperatorCategoryController(): Router {
  const router = Router();
  const netureService = new NetureService();

  // Router-level guard
  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  /**
   * GET /operator/categories
   * 카테고리 트리 (4단계 계층)
   */
  router.get('/categories', async (_req: Request, res: Response): Promise<void> => {
    try {
      const tree = await netureService.getCategoryTree();
      res.json({ success: true, data: tree });
    } catch (error) {
      logger.error('[Neture Operator] Error fetching categories:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * POST /operator/categories
   * 카테고리 생성
   */
  router.post('/categories', async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, parentId, isRegulated } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ success: false, error: 'NAME_REQUIRED' });
        return;
      }

      // slug 자동 생성 (name 기반)
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 80)
        + '-' + Date.now().toString(36);

      const category = await netureService.createCategory({
        name: name.trim(),
        slug,
        parentId: parentId || null,
        isRegulated: isRegulated === true,
      });
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      const status = ['PARENT_CATEGORY_NOT_FOUND', 'MAX_CATEGORY_DEPTH_EXCEEDED'].includes(message) ? 400 : 500;
      logger.error('[Neture Operator] Error creating category:', error);
      res.status(status).json({ success: false, error: message });
    }
  });

  /**
   * PATCH /operator/categories/:id
   * 카테고리 수정 (name, isRegulated, isActive, sortOrder)
   */
  router.patch('/categories/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, isRegulated, isActive, sortOrder } = req.body;

      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (isRegulated !== undefined) updateData.isRegulated = isRegulated;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

      const category = await netureService.updateCategory(id, updateData);
      res.json({ success: true, data: category });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      const status = message === 'CATEGORY_NOT_FOUND' ? 404 : 500;
      logger.error('[Neture Operator] Error updating category:', error);
      res.status(status).json({ success: false, error: message });
    }
  });

  /**
   * DELETE /operator/categories/:id
   * 카테고리 삭제
   */
  router.delete('/categories/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await netureService.deleteCategory(id);
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      const status = message === 'CATEGORY_NOT_FOUND' ? 404 : 500;
      logger.error('[Neture Operator] Error deleting category:', error);
      res.status(status).json({ success: false, error: message });
    }
  });

  return router;
}
