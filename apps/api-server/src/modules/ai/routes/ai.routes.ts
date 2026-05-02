import { Router } from 'express';
import { AIController } from '../controllers/AIController.js';
import { requireAuth } from '../../../common/middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

/**
 * AI routes — WO-O4O-LMS-AI-MINIMAL-V1
 *
 * Mounted at /api/v1/ai. Phase 1: single LMS-oriented endpoint.
 */
const router: Router = Router();

// POST /api/v1/ai/analyze — quiz / live / assignment on-demand analysis
router.post('/analyze', requireAuth, asyncHandler(AIController.analyze));

export default router;
