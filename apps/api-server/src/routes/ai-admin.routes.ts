/**
 * AI Admin Routes
 * WO-AI-ADMIN-CONTROL-PLANE-V1
 *
 * 관리자 AI 제어 API
 * - GET /api/ai/admin/dashboard - 대시보드 데이터
 * - GET /api/ai/admin/engines - 엔진 목록
 * - PUT /api/ai/admin/engines/:id/activate - 엔진 활성화
 * - GET /api/ai/admin/policy - 정책 조회
 * - PUT /api/ai/admin/policy - 정책 수정
 * - GET /api/ai/admin/usage - 사용량 통계
 */

import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/permission.middleware.js';
import { aiAdminService } from '../services/ai-admin.service.js';
import type { AuthRequest } from '../types/auth.js';

const router: Router = Router();

// ============================================================
// Dashboard
// ============================================================

/**
 * GET /api/ai/admin/dashboard
 * 관리자 AI 대시보드 데이터
 */
router.get('/dashboard', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const dashboard = await aiAdminService.getDashboardData();
    return res.json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: '대시보드 데이터 조회 중 오류가 발생했습니다.',
    });
  }
});

// ============================================================
// Engine Management
// ============================================================

/**
 * GET /api/ai/admin/engines
 * 사용 가능한 AI 엔진 목록
 */
router.get('/engines', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const engines = await aiAdminService.getEngines();
    return res.json({
      success: true,
      data: engines,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: '엔진 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

/**
 * PUT /api/ai/admin/engines/:id/activate
 * 엔진 활성화 (다른 엔진은 비활성화)
 */
router.put('/engines/:id/activate', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const engineId = parseInt(req.params.id, 10);
    if (isNaN(engineId)) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 엔진 ID입니다.',
      });
    }

    const engine = await aiAdminService.activateEngine(engineId);
    return res.json({
      success: true,
      data: engine,
      message: `${engine?.name} 엔진이 활성화되었습니다.`,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: error.message || '엔진 활성화 중 오류가 발생했습니다.',
    });
  }
});

// ============================================================
// Policy Management
// ============================================================

/**
 * GET /api/ai/admin/policy
 * 현재 AI 정책 조회
 */
router.get('/policy', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const policy = await aiAdminService.getPolicySettings();
    return res.json({
      success: true,
      data: policy,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: '정책 조회 중 오류가 발생했습니다.',
    });
  }
});

/**
 * PUT /api/ai/admin/policy
 * AI 정책 수정
 */
router.put('/policy', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const { freeDailyLimit, paidDailyLimit, globalDailyLimit, warningThreshold, aiEnabled } = req.body;

    const policy = await aiAdminService.updatePolicySettings({
      freeDailyLimit,
      paidDailyLimit,
      globalDailyLimit,
      warningThreshold,
      aiEnabled,
    });

    return res.json({
      success: true,
      data: policy,
      message: '정책이 업데이트되었습니다.',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: error.message || '정책 수정 중 오류가 발생했습니다.',
    });
  }
});

// ============================================================
// Usage Statistics
// ============================================================

/**
 * GET /api/ai/admin/usage
 * 사용량 통계
 */
router.get('/usage', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 7;
    const usage = await aiAdminService.getUsageStats(days);
    return res.json({
      success: true,
      data: usage,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: '사용량 통계 조회 중 오류가 발생했습니다.',
    });
  }
});

export default router;
