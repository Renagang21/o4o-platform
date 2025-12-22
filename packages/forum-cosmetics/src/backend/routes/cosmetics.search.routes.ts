/**
 * Forum Cosmetics Search Routes
 *
 * Phase 15-A: Cosmetics-specific search API endpoints
 *
 * Wraps the core ForumSearchService with cosmetics type pre-filter.
 *
 * Base path: /api/v1/cosmetics/forum/search
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { ForumSearchService } from '@o4o/forum-core/src/backend/services/forum.search.service.js';

/**
 * Create cosmetics-specific search routes
 *
 * @param dataSource - TypeORM DataSource
 * @returns Express Router
 */
export function createCosmeticsSearchRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Initialize search service
  const searchService = ForumSearchService.fromDataSource(dataSource);

  /**
   * GET /api/v1/cosmetics/forum/search
   *
   * Search cosmetics forum posts
   *
   * Query Parameters:
   * - q: Search query string (required)
   * - brand: Filter by brand
   * - skinType: Filter by skin type (dry, oily, combination, sensitive, normal)
   * - concerns: Comma-separated concerns
   * - categoryId: Filter by category
   * - sort: 'relevance' | 'latest' | 'popular' | 'oldest'
   * - page: Page number
   * - limit: Items per page
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const {
        q,
        brand,
        skinType,
        concerns,
        categoryId,
        sort = 'relevance',
        page = '1',
        limit = '20',
      } = req.query;

      // Validate query
      if (!q || (typeof q === 'string' && q.trim().length === 0)) {
        res.status(400).json({
          success: false,
          error: 'Search query (q) is required',
        });
        return;
      }

      // Parse pagination
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

      // Parse concerns array
      const concernsArray = concerns
        ? (concerns as string).split(',').map(c => c.trim()).filter(Boolean)
        : undefined;

      // Search with cosmetics type filter
      const results = await searchService.searchByCosmetics({
        query: q as string,
        skinType: skinType as string | undefined,
        concerns: concernsArray,
        brand: brand as string | undefined,
        categoryId: categoryId as string | undefined,
        sort: sort as 'relevance' | 'latest' | 'popular',
        page: pageNum,
        limit: limitNum,
      });

      res.json({
        success: true,
        data: results.items,
        pagination: {
          total: results.total,
          page: results.page,
          limit: results.limit,
          totalPages: results.totalPages,
        },
        meta: {
          query: results.query,
          executionTime: results.executionTime,
        },
      });
    } catch (error) {
      console.error('[CosmeticsSearch] Search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/cosmetics/forum/search/suggestions
   *
   * Get cosmetics-specific autocomplete suggestions
   */
  router.get('/suggestions', async (req: Request, res: Response) => {
    try {
      const { q, limit = '10' } = req.query;

      if (!q || (typeof q === 'string' && q.trim().length < 2)) {
        res.json({
          success: true,
          data: [],
        });
        return;
      }

      const limitNum = Math.min(20, Math.max(1, parseInt(limit as string, 10) || 10));

      const suggestions = await searchService.getSuggestions({
        query: q as string,
        type: 'cosmetics',
        limit: limitNum,
      });

      res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      console.error('[CosmeticsSearch] Suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get suggestions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/cosmetics/forum/search/popular
   *
   * Get cosmetics popular search terms
   */
  router.get('/popular', async (req: Request, res: Response) => {
    try {
      const { limit = '10' } = req.query;

      const limitNum = Math.min(30, Math.max(1, parseInt(limit as string, 10) || 10));

      const terms = await searchService.getPopularSearchTerms({
        type: 'cosmetics',
        limit: limitNum,
      });

      res.json({
        success: true,
        data: terms,
      });
    } catch (error) {
      console.error('[CosmeticsSearch] Popular terms error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular terms',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/cosmetics/forum/search/by-skin-type
   *
   * Search posts filtered by skin type
   */
  router.get('/by-skin-type', async (req: Request, res: Response) => {
    try {
      const {
        skinType,
        q = '',
        sort = 'relevance',
        page = '1',
        limit = '20',
      } = req.query;

      if (!skinType) {
        res.status(400).json({
          success: false,
          error: 'skinType is required',
        });
        return;
      }

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

      const results = await searchService.searchByCosmetics({
        query: q as string,
        skinType: skinType as string,
        sort: sort as 'relevance' | 'latest' | 'popular',
        page: pageNum,
        limit: limitNum,
      });

      res.json({
        success: true,
        data: results.items,
        pagination: {
          total: results.total,
          page: results.page,
          limit: results.limit,
          totalPages: results.totalPages,
        },
      });
    } catch (error) {
      console.error('[CosmeticsSearch] By skin type error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/cosmetics/forum/search/by-concern
   *
   * Search posts filtered by skin concerns
   */
  router.get('/by-concern', async (req: Request, res: Response) => {
    try {
      const {
        concerns,
        q = '',
        sort = 'relevance',
        page = '1',
        limit = '20',
      } = req.query;

      if (!concerns) {
        res.status(400).json({
          success: false,
          error: 'concerns is required',
        });
        return;
      }

      const concernsArray = (concerns as string).split(',').map(c => c.trim()).filter(Boolean);
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

      const results = await searchService.searchByCosmetics({
        query: q as string,
        concerns: concernsArray,
        sort: sort as 'relevance' | 'latest' | 'popular',
        page: pageNum,
        limit: limitNum,
      });

      res.json({
        success: true,
        data: results.items,
        pagination: {
          total: results.total,
          page: results.page,
          limit: results.limit,
          totalPages: results.totalPages,
        },
      });
    } catch (error) {
      console.error('[CosmeticsSearch] By concern error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

export default createCosmeticsSearchRoutes;
