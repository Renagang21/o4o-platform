import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { CosmeticsForumController } from '../controllers/CosmeticsForumController.js';
import { CosmeticsForumService } from '../services/CosmeticsForumService.js';

/**
 * Create Cosmetics Forum Routes
 *
 * @param dataSource - TypeORM DataSource
 * @returns Express Router
 */
export function createCosmeticsForumRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Initialize service and controller
  const service = CosmeticsForumService.fromDataSource(dataSource);
  const controller = new CosmeticsForumController(service);

  // Health check
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', app: 'forum-cosmetics' });
  });

  // Static data endpoints (no auth required)
  router.get('/skin-types', (req, res) => controller.getSkinTypes(req, res));
  router.get('/concerns', (req, res) => controller.getConcerns(req, res));
  router.get('/categories', (req, res) => controller.getCategories(req, res));

  // List endpoints
  router.get('/posts', (req, res) => controller.listPosts(req, res));
  router.get('/featured', (req, res) => controller.getFeaturedPosts(req, res));
  router.get('/top-rated', (req, res) => controller.getTopRatedPosts(req, res));
  router.get('/statistics', (req, res) => controller.getStatistics(req, res));
  router.get('/search', (req, res) => controller.searchPosts(req, res));

  // Post-specific endpoints
  router.get('/posts/:id', (req, res) => controller.getPost(req, res));
  router.post('/posts/:id/meta', (req, res) => controller.createMeta(req, res));
  router.put('/posts/:id/meta', (req, res) => controller.updateMeta(req, res));
  router.delete('/posts/:id/meta', (req, res) => controller.deleteMeta(req, res));

  // Admin endpoints
  router.post('/posts/:id/feature', (req, res) => controller.featurePost(req, res));
  router.delete('/posts/:id/feature', (req, res) => controller.unfeaturePost(req, res));

  // ============================================
  // Phase 14-2: Product Integration Routes
  // ============================================

  // Product-specific forum endpoints (Ecommerce integration)
  router.get('/product/:productId/posts', (req, res) => controller.getProductPosts(req, res));
  router.get('/product/:productId/summary', (req, res) => controller.getProductSummary(req, res));
  router.get('/product/:productId/rating', (req, res) => controller.getProductRating(req, res));

  // Brand stats endpoint
  router.get('/brand/:brand/stats', (req, res) => controller.getBrandStats(req, res));

  return router;
}

export default createCosmeticsForumRoutes;
