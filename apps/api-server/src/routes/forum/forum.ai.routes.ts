/**
 * Forum AI Routes
 * Phase 16: AI Summary & Auto-Tagging
 *
 * Routes: /api/v1/forum/ai/*
 */

import { Router } from 'express';
import { ForumAIController } from '../../controllers/forum/ForumAIController.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';

const router: Router = Router();
const controller = new ForumAIController();

/**
 * Forum AI Routes - /api/v1/forum/ai/*
 *
 * Endpoints:
 * - GET /ai/status - Get AI service status (public)
 * - GET /posts/:id/ai - Get AI metadata for a post (public)
 * - POST /posts/:id/ai/process - Process post with AI (requires auth)
 * - POST /posts/:id/ai/regenerate - Regenerate AI content (requires auth)
 * - POST /posts/:id/ai/apply-tags - Apply suggested tags (requires auth)
 */

// Public endpoint - AI service status
router.get('/status', controller.getStatus.bind(controller));

// Post-specific AI endpoints
// GET - AI metadata (optional auth for private posts)
router.get('/posts/:id/ai', optionalAuth, controller.getAIMetadata.bind(controller));

// POST - Process post (requires auth)
router.post('/posts/:id/ai/process', authenticate, controller.processPost.bind(controller));

// POST - Regenerate AI content (requires auth)
router.post('/posts/:id/ai/regenerate', authenticate, controller.regenerate.bind(controller));

// POST - Apply suggested tags (requires auth)
router.post('/posts/:id/ai/apply-tags', authenticate, controller.applyTags.bind(controller));

export default router;
