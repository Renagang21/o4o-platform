import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { ProductAiSearchService } from '../services/product-ai-search.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

/**
 * Product AI Search Controller — WO-O4O-AI-TAG-SEARCH-V1
 *
 * GET /search/ai?q=혈당 — AI 태그 + 상품명 통합 검색
 */
export function createProductAiSearchRouter(dataSource: DataSource): Router {
  const router = Router();
  const searchService = new ProductAiSearchService(dataSource);

  // GET /search/ai?q=<query>
  router.get('/search/ai', authenticate, async (req, res) => {
    try {
      const q = (req.query.q as string || '').trim();

      if (!q || q.length < 1) {
        res.status(400).json({ success: false, error: 'Search query (q) is required' });
        return;
      }

      const products = await searchService.searchByTag(q);

      res.json({
        success: true,
        data: {
          products,
          query: q,
          total: products.length,
        },
      });
    } catch (error) {
      console.error('[ProductAiSearch] search error:', error);
      res.status(500).json({ success: false, error: 'Search failed' });
    }
  });

  return router;
}
