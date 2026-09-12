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
 * - GET /api/ai/operations - 운영 상태 대시보드 (WO-AI-OPERATIONS-GUARDRAILS-V1)
 * - POST /api/ai/operations/acknowledge-alert - 경고 확인 처리
 */

import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { aiQueryController } from '../controllers/ai/AiQueryController.js';
import { aiCardExposureService } from '../services/ai-card-exposure.service.js';
import { aiOperationsService } from '../services/ai-operations.service.js';
import type { AuthRequest } from '../types/auth.js';
import { AppDataSource } from '../database/connection.js';
import { GEMINI_CANONICAL_MODEL, listGeminiModels, resetGeminiModelCache } from '../services/ai-model-registry.service.js';
import { resolveEditingModel } from '../utils/ai-editing-model-resolver.js';

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

// GET /api/ai/models - 선택 가능한 Gemini 모델 목록 (WO-O4O-AI-MODEL-DYNAMIC-REGISTRY-V1)
//   Google ListModels(운영 키, 1h 캐시) ∪ 정적 whitelist. 관리자 화면 드롭다운이 이 목록을 쓴다.
//   `?refresh=1` 이면 캐시를 버리고 다시 조회한다. 키 · 원문 오류는 응답에 싣지 않는다.
router.get('/models', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    if (String(req.query.refresh ?? '') === '1') resetGeminiModelCache();
    const [listing, current] = await Promise.all([listGeminiModels(AppDataSource), resolveEditingModel()]);
    return res.json({
      success: true,
      data: {
        models: listing.models,
        source: listing.source,
        fetchedAt: listing.fetchedAt,
        canonical: GEMINI_CANONICAL_MODEL,
        /** 지금 실제로 쓰이는 모델(정책값이 허용 목록에 있으면 그것, 아니면 canonical). */
        current,
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: '모델 목록을 가져오지 못했습니다.', code: 'AI_MODELS_UNAVAILABLE' });
  }
});

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

// ===========================================
// Operations routes (WO-AI-OPERATIONS-GUARDRAILS-V1)
// ===========================================

// GET /api/ai/operations - 운영 상태 대시보드 데이터
router.get('/operations', authenticate, requireAdmin, (req, res: Response) => {
  try {
    const dashboardData = aiOperationsService.getDashboardData();

    return res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: '운영 상태 조회 중 오류가 발생했습니다.',
    });
  }
});

// GET /api/ai/operations/summary - 오늘 요약만
router.get('/operations/summary', authenticate, requireAdmin, (req, res: Response) => {
  try {
    const summary = aiOperationsService.getTodaySummary();

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: '요약 조회 중 오류가 발생했습니다.',
    });
  }
});

// POST /api/ai/operations/acknowledge-alert - 경고 확인 처리
router.post('/operations/acknowledge-alert', authenticate, requireAdmin, (req, res: Response) => {
  try {
    const { alertId } = req.body;

    if (!alertId) {
      return res.status(400).json({
        success: false,
        error: 'alertId가 필요합니다.',
      });
    }

    const acknowledged = aiOperationsService.acknowledgeAlert(alertId);

    return res.json({
      success: acknowledged,
      message: acknowledged ? '경고가 확인 처리되었습니다.' : '경고를 찾을 수 없습니다.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: '경고 확인 처리 중 오류가 발생했습니다.',
    });
  }
});

export default router;
