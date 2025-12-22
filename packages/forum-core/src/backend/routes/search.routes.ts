/**
 * Forum Search Routes
 *
 * Phase 15-A: Full-text Search API Routes
 *
 * Base path: /api/v1/forum/search
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { SearchController } from '../controllers/search.controller.js';
import { ForumSearchService } from '../services/forum.search.service.js';

/**
 * Create search routes
 *
 * @param dataSource - TypeORM DataSource
 * @returns Express Router
 */
export function createSearchRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Initialize service and controller
  const searchService = ForumSearchService.fromDataSource(dataSource);
  const controller = new SearchController(searchService);

  // Main search endpoint
  // GET /api/v1/forum/search?q=keyword&type=all&sort=relevance
  router.get('/', (req, res) => controller.search(req, res));

  // Autocomplete suggestions
  // GET /api/v1/forum/search/suggestions?q=key&type=all
  router.get('/suggestions', (req, res) => controller.suggestions(req, res));

  // Popular search terms
  // GET /api/v1/forum/search/popular?type=all
  router.get('/popular', (req, res) => controller.popular(req, res));

  // Get highlights for a specific post
  // GET /api/v1/forum/search/:postId/highlights?q=keyword
  router.get('/:postId/highlights', (req, res) => controller.highlights(req, res));

  return router;
}

export default createSearchRoutes;
