/**
 * Forum Yaksa Search Routes
 *
 * Phase 15-A: Yaksa-specific search API endpoints
 *
 * Wraps the core ForumSearchService with yaksa type pre-filter.
 *
 * Base path: /api/v1/yaksa/forum/search
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { ForumSearchService } from '@o4o/forum-core/src/backend/services/forum.search.service.js';
import { PostType } from '@o4o/forum-core/src/backend/entities/ForumPost.js';

/**
 * Create yaksa-specific search routes
 *
 * @param dataSource - TypeORM DataSource
 * @returns Express Router
 */
export function createYaksaSearchRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Initialize search service
  const searchService = ForumSearchService.fromDataSource(dataSource);

  /**
   * GET /api/v1/yaksa/forum/search
   *
   * Search yaksa forum posts
   *
   * Query Parameters:
   * - q: Search query string (required)
   * - orgId: Organization ID (required for yaksa)
   * - postType: PostType enum value
   * - categoryId: Filter by category
   * - sort: 'relevance' | 'latest' | 'popular' | 'oldest'
   * - page: Page number
   * - limit: Items per page
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const {
        q,
        orgId,
        postType,
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

      // Search with yaksa type filter
      const results = await searchService.searchByYaksa({
        query: q as string,
        organizationId: orgId as string,
        categoryId: categoryId as string | undefined,
        postType: postType as PostType | undefined,
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
      console.error('[YaksaSearch] Search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/yaksa/forum/search/suggestions
   *
   * Get yaksa-specific autocomplete suggestions
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
        type: 'yaksa',
        limit: limitNum,
      });

      res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      console.error('[YaksaSearch] Suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get suggestions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/yaksa/forum/search/popular
   *
   * Get yaksa popular search terms
   */
  router.get('/popular', async (req: Request, res: Response) => {
    try {
      const { limit = '10' } = req.query;

      const limitNum = Math.min(30, Math.max(1, parseInt(limit as string, 10) || 10));

      const terms = await searchService.getPopularSearchTerms({
        type: 'yaksa',
        limit: limitNum,
      });

      res.json({
        success: true,
        data: terms,
      });
    } catch (error) {
      console.error('[YaksaSearch] Popular terms error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular terms',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

export default createYaksaSearchRoutes;
