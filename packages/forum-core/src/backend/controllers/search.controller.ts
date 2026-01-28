/**
 * Forum Search Controller
 *
 * Phase 15-A: Full-text Search API Endpoints
 *
 * Endpoints:
 * - GET /api/v1/forum/search - Main search endpoint
 * - GET /api/v1/forum/search/suggestions - Autocomplete suggestions
 * - GET /api/v1/forum/search/popular - Popular search terms
 */

import { Request, Response } from 'express';
import { ForumSearchService, ForumSearchQuery } from '../services/forum.search.service.js';
import { PostType, PostStatus } from '../entities/ForumPost.js';

/**
 * Search Controller
 */
export class SearchController {
  private searchService: ForumSearchService;

  constructor(searchService: ForumSearchService) {
    this.searchService = searchService;
  }

  /**
   * GET /api/v1/forum/search
   *
   * Main search endpoint for forum posts
   *
   * Query Parameters:
   * - q: Search query string (required)
   * - extensionKey: Extension key filter (e.g., 'neture', 'yaksa')
   * - postType: PostType enum value
   * - categoryId: Filter by category
   * - organizationId: Filter by organization
   * - sort: 'relevance' | 'latest' | 'popular' | 'oldest' (default: 'relevance')
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20, max: 100)
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const {
        q,
        extensionKey,
        postType,
        categoryId,
        organizationId,
        authorId,
        sort = 'relevance',
        page = '1',
        limit = '20',
      } = req.query;

      // Validate required query parameter
      if (!q || (typeof q === 'string' && q.trim().length === 0)) {
        res.status(400).json({
          success: false,
          error: 'Search query (q) is required',
        });
        return;
      }

      // Parse and validate pagination
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

      // Build search query
      const searchQuery: ForumSearchQuery = {
        query: q as string,
        extensionKey: extensionKey as string | undefined,
        postType: postType as PostType | undefined,
        categoryId: categoryId as string | undefined,
        organizationId: organizationId as string | undefined,
        authorId: authorId as string | undefined,
        sort: sort as 'relevance' | 'latest' | 'popular' | 'oldest',
        page: pageNum,
        limit: limitNum,
      };

      const results = await this.searchService.searchPosts(searchQuery);

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
      console.error('[SearchController] Search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/forum/search/suggestions
   *
   * Get autocomplete suggestions for search
   *
   * Query Parameters:
   * - q: Partial search query (required, min 2 chars)
   * - extensionKey: Extension key filter
   * - limit: Max suggestions (default: 10, max: 20)
   */
  async suggestions(req: Request, res: Response): Promise<void> {
    try {
      const { q, extensionKey, limit = '10' } = req.query;

      if (!q || (typeof q === 'string' && q.trim().length < 2)) {
        res.json({
          success: true,
          data: [],
        });
        return;
      }

      const limitNum = Math.min(20, Math.max(1, parseInt(limit as string, 10) || 10));

      const suggestions = await this.searchService.getSuggestions({
        query: q as string,
        extensionKey: extensionKey as string | undefined,
        limit: limitNum,
      });

      res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      console.error('[SearchController] Suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get suggestions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/forum/search/popular
   *
   * Get popular search terms
   *
   * Query Parameters:
   * - extensionKey: Extension key filter
   * - limit: Max terms (default: 10, max: 30)
   */
  async popular(req: Request, res: Response): Promise<void> {
    try {
      const { extensionKey, limit = '10' } = req.query;

      const limitNum = Math.min(30, Math.max(1, parseInt(limit as string, 10) || 10));

      const terms = await this.searchService.getPopularSearchTerms({
        extensionKey: extensionKey as string | undefined,
        limit: limitNum,
      });

      res.json({
        success: true,
        data: terms,
      });
    } catch (error) {
      console.error('[SearchController] Popular terms error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular terms',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/forum/search/:postId/highlights
   *
   * Get search result highlights for a specific post
   *
   * Query Parameters:
   * - q: Search query to highlight
   */
  async highlights(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const { q } = req.query;

      if (!q || (typeof q === 'string' && q.trim().length === 0)) {
        res.status(400).json({
          success: false,
          error: 'Search query (q) is required',
        });
        return;
      }

      const highlights = await this.searchService.getHighlights(postId, q as string);

      res.json({
        success: true,
        data: highlights,
      });
    } catch (error) {
      console.error('[SearchController] Highlights error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get highlights',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default SearchController;
