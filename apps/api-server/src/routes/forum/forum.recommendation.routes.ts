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
import { forumRecommendationController } from '../../controllers/forum/ForumRecommendationController.js';

const router = Router();

// Public endpoints (auth optional for better personalization)
router.get('/', (req, res) => forumRecommendationController.getRecommendations(req, res));
router.get('/trending', (req, res) => forumRecommendationController.getTrending(req, res));
router.get('/related/:postId', (req, res) => forumRecommendationController.getRelated(req, res));

// Domain-specific endpoints
router.get('/cosmetics', (req, res) => forumRecommendationController.getCosmeticsRecommendations(req, res));
router.get('/yaksa', (req, res) => forumRecommendationController.getYaksaRecommendations(req, res));

// Admin endpoints
router.get('/config', (req, res) => forumRecommendationController.getConfig(req, res));
router.put('/config', (req, res) => forumRecommendationController.updateConfig(req, res));

export default router;
