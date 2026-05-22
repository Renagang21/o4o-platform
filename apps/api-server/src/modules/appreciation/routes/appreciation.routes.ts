/**
 * Appreciation Routes — /api/v1/appreciation
 * WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1
 */

import { Router } from 'express';
import { requireAuth, optionalAuth } from '../../../common/middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { AppreciationController } from '../controllers/AppreciationController.js';

const router: Router = Router();

// POST /api/v1/appreciation/send — 감사 포인트 전송 (로그인 필수)
router.post('/send', requireAuth, asyncHandler(AppreciationController.send));

// GET /api/v1/appreciation/my-sent — 내가 보낸 감사 목록
router.get('/my-sent', requireAuth, asyncHandler(AppreciationController.getMySent));

// GET /api/v1/appreciation/my-received — 내가 받은 감사 목록
router.get('/my-received', requireAuth, asyncHandler(AppreciationController.getMyReceived));

// GET /api/v1/appreciation/:targetType/:targetId/summary — 대상 감사 집계 (공개)
router.get('/:targetType/:targetId/summary', optionalAuth, asyncHandler(AppreciationController.getSummary));

export default router;
