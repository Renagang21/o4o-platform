import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { ProductAiRecommendationService } from '../services/product-ai-recommendation.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';

/**
 * Product AI Recommendation Controller — WO-O4O-AI-PRODUCT-RECOMMENDATION-V1
 *
 * GET /recommend?tags=혈당관리,면역&limit=10 — 태그 기반 상품 추천
 * GET /recommend/store                      — 매장 컨텍스트 기반 추천
 */
export function createProductAiRecommendationRouter(dataSource: DataSource): Router {
  const router = Router();
  const recommendService = new ProductAiRecommendationService(dataSource);
  const requireStoreOwner = createRequireStoreOwner(dataSource);

  // GET /recommend?tags=혈당관리,면역&limit=10
  router.get('/recommend', authenticate, async (req, res) => {
    try {
      const tagsParam = (req.query.tags as string || '').trim();
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 20);

      if (!tagsParam) {
        res.status(400).json({ success: false, error: 'tags query parameter is required' });
        return;
      }

      const tags = tagsParam.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length === 0) {
        res.status(400).json({ success: false, error: 'At least one tag is required' });
        return;
      }

      const products = await recommendService.recommendByTags(tags, limit);

      res.json({
        success: true,
        data: { products, total: products.length, context: 'tags' },
      });
    } catch (error) {
      console.error('[ProductAiRecommend] tag recommendation error:', error);
      res.status(500).json({ success: false, error: 'Recommendation failed' });
    }
  });

  // GET /recommend/store — 매장 기존 상품 기반 추천
  router.get('/recommend/store', authenticate, requireStoreOwner, async (req, res) => {
    try {
      const organizationId = (req as any).organizationId as string;
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 20);

      const products = await recommendService.recommendForStore(organizationId, limit);

      res.json({
        success: true,
        data: { products, total: products.length, context: 'store' },
      });
    } catch (error) {
      console.error('[ProductAiRecommend] store recommendation error:', error);
      res.status(500).json({ success: false, error: 'Store recommendation failed' });
    }
  });

  return router;
}
