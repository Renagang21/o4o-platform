/**
 * Operator Category Mapping Controller
 *
 * WO-NETURE-CATEGORY-MAPPING-RULE-SYSTEM-V1
 *
 * CRUD for category mapping rules + test endpoint.
 *
 * Routes (mounted at /operator):
 *   GET    /category-mapping-rules       — 전체 룰 목록
 *   POST   /category-mapping-rules       — 룰 추가
 *   PATCH  /category-mapping-rules/:id   — 룰 수정
 *   DELETE /category-mapping-rules/:id   — 룰 삭제
 *   POST   /category-mapping-rules/test  — 상품명 → 추천 테스트
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { CategoryMappingService } from '../services/category-mapping.service.js';
import logger from '../../../utils/logger.js';

export function createOperatorCategoryMappingController(): Router {
  const router = Router();
  const mappingService = new CategoryMappingService();

  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  /**
   * GET /operator/category-mapping-rules
   */
  router.get('/category-mapping-rules', async (_req: Request, res: Response): Promise<void> => {
    try {
      const rules = await mappingService.listRules();
      res.json({ success: true, data: rules });
    } catch (error) {
      logger.error('[CategoryMapping] Error listing rules:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * POST /operator/category-mapping-rules
   */
  router.post('/category-mapping-rules', async (req: Request, res: Response): Promise<void> => {
    try {
      const { keyword, categoryId, priority } = req.body;
      if (!keyword || !categoryId) {
        res.status(400).json({ success: false, error: 'KEYWORD_AND_CATEGORY_REQUIRED' });
        return;
      }

      const rule = await mappingService.createRule({
        keyword,
        categoryId,
        priority: typeof priority === 'number' ? priority : undefined,
      });
      res.status(201).json({ success: true, data: rule });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      const status = message === 'KEYWORD_REQUIRED' ? 400 : 500;
      logger.error('[CategoryMapping] Error creating rule:', error);
      res.status(status).json({ success: false, error: message });
    }
  });

  /**
   * PATCH /operator/category-mapping-rules/:id
   */
  router.patch('/category-mapping-rules/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { keyword, categoryId, priority, isActive } = req.body;

      const updateData: Record<string, any> = {};
      if (keyword !== undefined) updateData.keyword = keyword;
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (priority !== undefined) updateData.priority = priority;
      if (isActive !== undefined) updateData.isActive = isActive;

      const rule = await mappingService.updateRule(id, updateData);
      res.json({ success: true, data: rule });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      const status = message === 'RULE_NOT_FOUND' ? 404 : 500;
      logger.error('[CategoryMapping] Error updating rule:', error);
      res.status(status).json({ success: false, error: message });
    }
  });

  /**
   * DELETE /operator/category-mapping-rules/:id
   */
  router.delete('/category-mapping-rules/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await mappingService.deleteRule(id);
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      const status = message === 'RULE_NOT_FOUND' ? 404 : 500;
      logger.error('[CategoryMapping] Error deleting rule:', error);
      res.status(status).json({ success: false, error: message });
    }
  });

  /**
   * POST /operator/category-mapping-rules/test
   * 상품명으로 카테고리 추천 테스트
   */
  router.post('/category-mapping-rules/test', async (req: Request, res: Response): Promise<void> => {
    try {
      const { productName } = req.body;
      if (!productName) {
        res.status(400).json({ success: false, error: 'PRODUCT_NAME_REQUIRED' });
        return;
      }

      const suggestion = await mappingService.suggestCategory(productName);
      res.json({ success: true, data: suggestion });
    } catch (error) {
      logger.error('[CategoryMapping] Error testing suggestion:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
