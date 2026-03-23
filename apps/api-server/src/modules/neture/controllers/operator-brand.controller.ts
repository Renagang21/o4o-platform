/**
 * Operator Brand Controller
 *
 * WO-NETURE-BRAND-MANAGEMENT-V1
 *
 * 브랜드 조회/수정/병합 — 운영자 데이터 정리용
 *
 * Routes (mounted at /operator):
 *   GET    /brands           — 브랜드 목록 (검색 + 상품 수)
 *   PATCH  /brands/:id       — 브랜드 이름 수정
 *   POST   /brands/merge     — 브랜드 병합 (source → target)
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { NetureService } from '../neture.service.js';
import logger from '../../../utils/logger.js';

export function createOperatorBrandController(): Router {
  const router = Router();
  const netureService = new NetureService();

  // Router-level guard
  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  /**
   * GET /operator/brands?search=...
   * 브랜드 목록 (검색 + 상품 수 포함)
   */
  router.get('/brands', async (req: Request, res: Response): Promise<void> => {
    try {
      const search = req.query.search as string | undefined;
      const brands = await netureService.searchBrands(search);
      res.json({ success: true, data: brands });
    } catch (error) {
      logger.error('[Neture Operator] Error fetching brands:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  /**
   * PATCH /operator/brands/:id
   * 브랜드 이름 수정
   */
  router.patch('/brands/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ success: false, error: 'NAME_REQUIRED' });
        return;
      }
      const brand = await netureService.updateBrand(id, { name: name.trim() });
      res.json({ success: true, data: brand });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      const status = message === 'BRAND_NOT_FOUND' ? 404 : 500;
      logger.error('[Neture Operator] Error updating brand:', error);
      res.status(status).json({ success: false, error: message });
    }
  });

  /**
   * POST /operator/brands/merge
   * 브랜드 병합 (source → target)
   */
  router.post('/brands/merge', async (req: Request, res: Response): Promise<void> => {
    try {
      const { sourceBrandId, targetBrandId } = req.body;
      if (!sourceBrandId || !targetBrandId) {
        res.status(400).json({ success: false, error: 'BOTH_BRAND_IDS_REQUIRED' });
        return;
      }
      const result = await netureService.mergeBrands(sourceBrandId, targetBrandId);
      res.json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      const status = ['SAME_BRAND', 'SOURCE_BRAND_NOT_FOUND', 'TARGET_BRAND_NOT_FOUND'].includes(message) ? 400 : 500;
      logger.error('[Neture Operator] Error merging brands:', error);
      res.status(status).json({ success: false, error: message });
    }
  });

  return router;
}
