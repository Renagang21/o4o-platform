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
 * - GET /api/ai/card-report - 카드 노출 리포트 (WO-AI-CARD-EXPOSURE-REPORT-V1.1)
 */

import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/permission.middleware.js';
import { aiQueryController } from '../controllers/ai/AiQueryController.js';
import { aiCardExposureService } from '../services/ai-card-exposure.service.js';
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

// ===========================================
// Card Report routes (WO-AI-CARD-EXPOSURE-REPORT-V1.1)
// ===========================================

// GET /api/ai/card-report - 카드 노출 리포트 통계
router.get('/card-report', authenticate, requireAdmin, (req, res: Response) => {
  try {
    const { period = '7d' } = req.query;

    // 기간 계산
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const stats = aiCardExposureService.getReportStats({
      startDate,
      endDate: now,
    });

    const reasonDescriptions = aiCardExposureService.getReasonDescriptions();

    return res.json({
      success: true,
      data: {
        ...stats,
        reasonDescriptions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: '리포트 조회 중 오류가 발생했습니다.',
    });
  }
});

export default router;
