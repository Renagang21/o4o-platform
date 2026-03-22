/**
 * AI Admin Routes
 * WO-AI-ADMIN-CONTROL-PLANE-V1 + WO-O4O-AI-OBSERVABILITY-MINIMUM-V1
 *
 * 관리자 AI 제어 API
 * - GET /api/ai/admin/dashboard - 대시보드 데이터
 * - GET /api/ai/admin/engines - 엔진 목록
 * - PUT /api/ai/admin/engines/:id/activate - 엔진 활성화
 * - GET /api/ai/admin/policy - 정책 조회
 * - PUT /api/ai/admin/policy - 정책 수정
 * - GET /api/ai/admin/usage - 사용량 통계
 * - GET /api/ai/admin/ops/summary - AI 운영 요약 (WO-O4O-AI-OBSERVABILITY-MINIMUM-V1)
 * - GET /api/ai/admin/ops/errors - 최근 AI 오류 (WO-O4O-AI-OBSERVABILITY-MINIMUM-V1)
 * - GET /api/ai/admin/ops/care-status - Care AI 상태 (WO-O4O-AI-OBSERVABILITY-MINIMUM-V1)
 */

import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { aiAdminService } from '../services/ai-admin.service.js';
import { AppDataSource } from '../database/connection.js';
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

// ============================================================
// AI Operations Observability (WO-O4O-AI-OBSERVABILITY-MINIMUM-V1)
// ============================================================

/**
 * GET /api/ai/admin/ops/summary
 * AI 운영 상태 요약: provider별 호출/에러, Care 생성 건수, 토큰 사용량
 */
router.get('/ops/summary', authenticate, requireAdmin, async (_req, res: Response) => {
  try {
    const ds = AppDataSource;

    // provider별 호출/에러 건수
    let providers: Record<string, { calls: number; errors: number }> = {
      gemini: { calls: 0, errors: 0 },
      openai: { calls: 0, errors: 0 },
      claude: { calls: 0, errors: 0 },
    };
    try {
      const rows = await ds.query(`
        SELECT provider,
               COUNT(*)::int AS calls,
               COUNT(*) FILTER (WHERE status = 'error')::int AS errors
        FROM ai_usage_logs
        GROUP BY provider
      `);
      for (const r of rows) {
        if (providers[r.provider]) {
          providers[r.provider] = { calls: r.calls, errors: r.errors };
        }
      }
    } catch { /* table may not exist */ }

    // Care AI 생성 건수
    let totalInsights = 0;
    let totalDrafts = 0;
    let lastInsightAt: string | null = null;
    try {
      const rows = await ds.query(
        `SELECT COUNT(*)::int AS cnt, MAX(created_at) AS last_at FROM care_llm_insights`,
      );
      totalInsights = rows[0]?.cnt || 0;
      lastInsightAt = rows[0]?.last_at ? new Date(rows[0].last_at).toISOString() : null;
    } catch { /* table may not exist */ }
    try {
      const rows = await ds.query(
        `SELECT COUNT(*)::int AS cnt FROM care_coaching_drafts`,
      );
      totalDrafts = rows[0]?.cnt || 0;
    } catch { /* table may not exist */ }

    // 토큰 사용량 합계
    let promptTokens = 0;
    let completionTokens = 0;
    try {
      const rows = await ds.query(`
        SELECT COALESCE(SUM("promptTokens"), 0)::int AS prompt,
               COALESCE(SUM("completionTokens"), 0)::int AS completion
        FROM ai_usage_logs
      `);
      promptTokens = rows[0]?.prompt || 0;
      completionTokens = rows[0]?.completion || 0;
    } catch { /* table may not exist */ }

    return res.json({
      success: true,
      data: {
        providers,
        care: { totalInsights, totalDrafts, lastInsightAt },
        tokens: { prompt: promptTokens, completion: completionTokens },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'AI ops summary failed' });
  }
});

/**
 * GET /api/ai/admin/ops/errors?limit=20
 * 최근 AI 오류 목록
 */
router.get('/ops/errors', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
    const ds = AppDataSource;

    let errors: Array<Record<string, unknown>> = [];
    try {
      errors = await ds.query(`
        SELECT provider, model, "errorType" AS error_type,
               "errorMessage" AS error_message,
               "createdAt" AS created_at
        FROM ai_usage_logs
        WHERE status = 'error'
        ORDER BY "createdAt" DESC
        LIMIT $1
      `, [limit]);
    } catch { /* table may not exist */ }

    return res.json({
      success: true,
      data: errors.map((r: any) => ({
        provider: r.provider,
        model: r.model,
        errorType: r.error_type,
        errorMessage: r.error_message,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'AI error list failed' });
  }
});

/**
 * GET /api/ai/admin/ops/care-status
 * Care AI 생성 상태: insights/drafts 건수, 최근 생성 시각, 모델 설정
 */
router.get('/ops/care-status', authenticate, requireAdmin, async (_req, res: Response) => {
  try {
    const ds = AppDataSource;

    // Insights
    let insightsGenerated = 0;
    let lastInsightAt: string | null = null;
    try {
      const rows = await ds.query(
        `SELECT COUNT(*)::int AS cnt, MAX(created_at) AS last_at FROM care_llm_insights`,
      );
      insightsGenerated = rows[0]?.cnt || 0;
      lastInsightAt = rows[0]?.last_at ? new Date(rows[0].last_at).toISOString() : null;
    } catch { /* table may not exist */ }

    // Drafts (by status)
    let draftsGenerated = 0;
    let draftsApproved = 0;
    let draftsDiscarded = 0;
    let lastDraftAt: string | null = null;
    try {
      const rows = await ds.query(`
        SELECT status, COUNT(*)::int AS cnt, MAX(created_at) AS last_at
        FROM care_coaching_drafts
        GROUP BY status
      `);
      for (const r of rows) {
        if (r.status === 'draft') draftsGenerated += r.cnt;
        if (r.status === 'approved') draftsApproved += r.cnt;
        if (r.status === 'discarded') draftsDiscarded += r.cnt;
        const ts = r.last_at ? new Date(r.last_at).toISOString() : null;
        if (ts && (!lastDraftAt || ts > lastDraftAt)) lastDraftAt = ts;
      }
    } catch { /* table may not exist */ }

    // Model settings
    let model = 'gemini-3.0-flash';
    let temperature = 0.3;
    let maxTokens = 2048;
    try {
      const rows = await ds.query(
        `SELECT model, temperature, max_tokens FROM ai_model_settings WHERE service = 'care' LIMIT 1`,
      );
      if (rows[0]?.model) model = rows[0].model;
      if (rows[0]?.temperature != null) temperature = Number(rows[0].temperature);
      if (rows[0]?.max_tokens != null) maxTokens = Number(rows[0].max_tokens);
    } catch { /* table may not exist */ }

    // Gemini key status
    const envKeySet = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);

    return res.json({
      success: true,
      data: {
        insightsGenerated,
        lastInsightAt,
        drafts: {
          total: draftsGenerated + draftsApproved + draftsDiscarded,
          pending: draftsGenerated,
          approved: draftsApproved,
          discarded: draftsDiscarded,
        },
        lastDraftAt,
        modelConfig: { model, temperature, maxTokens },
        geminiKeyConfigured: envKeySet,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Care AI status failed' });
  }
});

export default router;
