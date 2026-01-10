/**
 * AI Query Routes
 * Phase 1 - AI 질의 API 라우트
 *
 * Public routes (authenticated):
 * - POST /api/ai/query - AI 질의
 * - GET /api/ai/usage - 일 사용량 조회
 * - GET /api/ai/history - 질문 히스토리
 *
 * Admin routes:
 * - GET /api/ai/policy - 정책 조회
 * - PUT /api/ai/policy - 정책 수정
 */

import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/permission.middleware.js';
import { aiQueryController } from '../controllers/ai/AiQueryController.js';
import type { AuthRequest } from '../types/auth.js';

const router: Router = Router();

// ===========================================
// Public routes (authenticated users)
// ===========================================

// POST /api/ai/query - AI 질의 처리
router.post('/query', authenticate, (req, res: Response) =>
  aiQueryController.query(req as AuthRequest, res)
);

// GET /api/ai/usage - 일 사용량 조회
router.get('/usage', authenticate, (req, res: Response) =>
  aiQueryController.getUsage(req as AuthRequest, res)
);

// GET /api/ai/history - 질문 히스토리 조회
router.get('/history', authenticate, (req, res: Response) =>
  aiQueryController.getHistory(req as AuthRequest, res)
);

// ===========================================
// Admin routes
// ===========================================

// GET /api/ai/policy - 정책 조회
router.get('/policy', authenticate, requireAdmin, (req, res: Response) =>
  aiQueryController.getPolicy(req as AuthRequest, res)
);

// PUT /api/ai/policy - 정책 수정
router.put('/policy', authenticate, requireAdmin, (req, res: Response) =>
  aiQueryController.updatePolicy(req as AuthRequest, res)
);

export default router;
