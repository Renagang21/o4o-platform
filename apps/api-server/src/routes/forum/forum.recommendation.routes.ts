/**
 * Forum Recommendation Routes
 * Phase 17: AI-powered Personalized Recommendations
 *
 * Routes:
 * GET  /                      - Get personalized recommendations
 * GET  /trending              - Get trending posts
 * GET  /related/:postId       - Get related posts
 * GET  /cosmetics             - Get cosmetics-domain recommendations
 * GET  /yaksa                 - Get yaksa-domain recommendations
 * GET  /config                - Get recommendation config (admin)
 * PUT  /config                - Update recommendation config (admin)
 */

import { Router } from 'express';
import { ForumRecommendationController } from '../../controllers/forum/ForumRecommendationController.js';
import { optionalAuth, authenticate } from '../../middleware/auth.middleware.js';

const router: Router = Router();
const controller = new ForumRecommendationController();

// Public endpoints (auth optional for better personalization)
router.get('/', optionalAuth, controller.getRecommendations.bind(controller));
router.get('/trending', optionalAuth, controller.getTrending.bind(controller));
router.get('/related/:postId', optionalAuth, controller.getRelated.bind(controller));

// Domain-specific endpoints
router.get('/cosmetics', optionalAuth, controller.getCosmeticsRecommendations.bind(controller));
router.get('/yaksa', optionalAuth, controller.getYaksaRecommendations.bind(controller));

// Admin endpoints
router.get('/config', authenticate, controller.getConfig.bind(controller));
router.put('/config', authenticate, controller.updateConfig.bind(controller));

export default router;
