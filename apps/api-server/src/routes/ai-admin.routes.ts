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

// ============================================================
// Analytics (WO-O4O-AI-USAGE-DASHBOARD-V1)
// ============================================================

router.get('/analytics/summary', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const days = Math.min(parseInt(req.query.days as string, 10) || 7, 365);
    const ds = AppDataSource;
    let data = { totalRequests: 0, totalTokens: 0, totalCost: 0, avgDurationMs: 0, errorRate: 0, successCount: 0, errorCount: 0 };
    try {
      const rows = await ds.query(`
        SELECT COUNT(*)::int AS total, COALESCE(SUM("totalTokens"),0)::int AS tokens,
               COALESCE(SUM("costEstimated")::numeric,0) AS cost, COALESCE(AVG("durationMs")::int,0) AS avg_dur,
               COUNT(*) FILTER (WHERE status='success')::int AS ok, COUNT(*) FILTER (WHERE status='error')::int AS err
        FROM ai_usage_logs WHERE "createdAt" >= NOW() - MAKE_INTERVAL(days => $1)`, [days]);
      if (rows[0]) {
        const r = rows[0];
        data = { totalRequests: r.total, totalTokens: r.tokens, totalCost: Number(r.cost), avgDurationMs: r.avg_dur,
                 errorRate: r.total > 0 ? Number(((r.err / r.total) * 100).toFixed(1)) : 0, successCount: r.ok, errorCount: r.err };
      }
    } catch { /* table may not exist */ }
    return res.json({ success: true, data: { ...data, days } });
  } catch { return res.status(500).json({ success: false, error: 'Analytics summary failed' }); }
});

router.get('/analytics/by-scope', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const days = Math.min(parseInt(req.query.days as string, 10) || 7, 365);
    let data: any[] = [];
    try {
      data = await AppDataSource.query(`
        SELECT COALESCE(scope,'unknown') AS scope, COUNT(*)::int AS requests,
               COALESCE(SUM("totalTokens"),0)::int AS tokens, COALESCE(SUM("costEstimated")::numeric,0) AS cost,
               COALESCE(AVG("durationMs")::int,0) AS latency, COUNT(*) FILTER (WHERE status='error')::int AS errors
        FROM ai_usage_logs WHERE "createdAt" >= NOW() - MAKE_INTERVAL(days => $1) GROUP BY scope ORDER BY requests DESC`, [days]);
    } catch { /* table may not exist */ }
    return res.json({ success: true, data: data.map((r: any) => ({ scope: r.scope, requests: r.requests, tokens: r.tokens, cost: Number(r.cost), latency: r.latency, errors: r.errors })) });
  } catch { return res.status(500).json({ success: false, error: 'Analytics by-scope failed' }); }
});

router.get('/analytics/by-model', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const days = Math.min(parseInt(req.query.days as string, 10) || 7, 365);
    let data: any[] = [];
    try {
      data = await AppDataSource.query(`
        SELECT provider, model, COUNT(*)::int AS requests, COALESCE(SUM("totalTokens"),0)::int AS tokens,
               COALESCE(SUM("costEstimated")::numeric,0) AS cost, COUNT(*) FILTER (WHERE status='error')::int AS errors
        FROM ai_usage_logs WHERE "createdAt" >= NOW() - MAKE_INTERVAL(days => $1) GROUP BY provider,model ORDER BY requests DESC`, [days]);
    } catch { /* table may not exist */ }
    return res.json({ success: true, data: data.map((r: any) => ({ provider: r.provider, model: r.model, requests: r.requests, tokens: r.tokens, cost: Number(r.cost), errors: r.errors })) });
  } catch { return res.status(500).json({ success: false, error: 'Analytics by-model failed' }); }
});

router.get('/analytics/recent', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);
    const scope = req.query.scope as string | undefined;
    const status = req.query.status as string | undefined;
    let data: any[] = [];
    try {
      const conds: string[] = []; const params: unknown[] = []; let idx = 1;
      if (scope) { conds.push(`scope = $${idx++}`); params.push(scope); }
      if (status && (status === 'success' || status === 'error')) { conds.push(`status = $${idx++}`); params.push(status); }
      const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
      data = await AppDataSource.query(`
        SELECT id, scope, provider, model, "requestId", "promptTokens", "completionTokens", "totalTokens",
               "costEstimated", "durationMs", status, "errorMessage", "errorType", "createdAt"
        FROM ai_usage_logs ${where} ORDER BY "createdAt" DESC LIMIT $${idx}`, [...params, limit]);
    } catch { /* table may not exist */ }
    return res.json({ success: true, data: data.map((r: any) => ({
      id: r.id, scope: r.scope, provider: r.provider, model: r.model, requestId: r.requestId,
      promptTokens: r.promptTokens, completionTokens: r.completionTokens, totalTokens: r.totalTokens,
      costEstimated: r.costEstimated ? Number(r.costEstimated) : null, durationMs: r.durationMs,
      status: r.status, errorMessage: r.errorMessage, errorType: r.errorType,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    })) });
  } catch { return res.status(500).json({ success: false, error: 'Analytics recent failed' }); }
});

// ============================================================
// Quota Management (WO-O4O-AI-COST-LIMIT-QUOTA-V1)
// ============================================================

router.get('/quotas', authenticate, requireAdmin, async (_req, res: Response) => {
  try {
    const data = await AppDataSource.query(`
      SELECT id, layer, layer_key AS "layerKey", limit_type AS "limitType", period,
             limit_value AS "limitValue", warning_threshold AS "warningThreshold",
             is_enabled AS "isEnabled", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM ai_usage_quota ORDER BY layer, layer_key, limit_type, period`);
    return res.json({ success: true, data });
  } catch { return res.status(500).json({ success: false, error: 'Quota list failed' }); }
});

router.get('/quotas/status', authenticate, requireAdmin, async (_req, res: Response) => {
  try {
    const now = new Date();
    const dailyKey = now.toISOString().slice(0, 10);
    const monthlyKey = now.toISOString().slice(0, 7);
    const data = await AppDataSource.query(`
      SELECT q.id, q.layer, q.layer_key AS "layerKey", q.limit_type AS "limitType",
             q.period, q.limit_value AS "limitValue", q.warning_threshold AS "warningThreshold",
             q.is_enabled AS "isEnabled", COALESCE(a.current_value, 0) AS "currentValue"
      FROM ai_usage_quota q
      LEFT JOIN ai_usage_aggregate a ON a.layer = q.layer AND a.layer_key = q.layer_key
        AND a.limit_type = q.limit_type AND a.period_key = CASE WHEN q.period = 'daily' THEN $1 ELSE $2 END
      WHERE q.is_enabled = true ORDER BY q.layer, q.layer_key`, [dailyKey, monthlyKey]);
    return res.json({ success: true, data: data.map((r: any) => {
      const limitValue = Number(r.limitValue); const currentValue = Number(r.currentValue);
      const usagePercent = limitValue > 0 ? Math.round((currentValue / limitValue) * 1000) / 10 : 0;
      const status = currentValue >= limitValue ? 'exceeded' : usagePercent >= Number(r.warningThreshold) ? 'warning' : 'ok';
      return { ...r, limitValue, currentValue, usagePercent, status };
    }) });
  } catch { return res.status(500).json({ success: false, error: 'Quota status failed' }); }
});

router.post('/quotas', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { layer, layerKey, limitType, period, limitValue, warningThreshold = 80, isEnabled = true } = req.body;
    if (!layer || !layerKey || !limitType || !period || limitValue == null)
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    const rows = await AppDataSource.query(`
      INSERT INTO ai_usage_quota (layer, layer_key, limit_type, period, limit_value, warning_threshold, is_enabled)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id, layer, layer_key AS "layerKey", limit_type AS "limitType", period,
                limit_value AS "limitValue", warning_threshold AS "warningThreshold", is_enabled AS "isEnabled"`,
      [layer, layerKey, limitType, period, limitValue, warningThreshold, isEnabled]);
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (error: any) {
    if (error.code === '23505') return res.status(409).json({ success: false, error: 'Quota already exists' });
    return res.status(500).json({ success: false, error: 'Quota creation failed' });
  }
});

router.put('/quotas/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID' });
    const { limitValue, warningThreshold, isEnabled } = req.body;
    const sets: string[] = []; const params: unknown[] = []; let idx = 1;
    if (limitValue != null) { sets.push(`limit_value = $${idx++}`); params.push(limitValue); }
    if (warningThreshold != null) { sets.push(`warning_threshold = $${idx++}`); params.push(warningThreshold); }
    if (isEnabled != null) { sets.push(`is_enabled = $${idx++}`); params.push(isEnabled); }
    if (sets.length === 0) return res.status(400).json({ success: false, error: 'No fields' });
    sets.push('updated_at = NOW()'); params.push(id);
    const rows = await AppDataSource.query(`
      UPDATE ai_usage_quota SET ${sets.join(', ')} WHERE id = $${idx}
      RETURNING id, layer, layer_key AS "layerKey", limit_type AS "limitType", period,
                limit_value AS "limitValue", warning_threshold AS "warningThreshold", is_enabled AS "isEnabled"`, params);
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, data: rows[0] });
  } catch { return res.status(500).json({ success: false, error: 'Quota update failed' }); }
});

router.delete('/quotas/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID' });
    const result = await AppDataSource.query(`DELETE FROM ai_usage_quota WHERE id = $1`, [id]);
    if (result[1] === 0) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, message: 'Quota deleted' });
  } catch { return res.status(500).json({ success: false, error: 'Quota deletion failed' }); }
});

// ============================================================
// Billing (WO-O4O-AI-BILLING-DATA-SYSTEM-V1)
// ============================================================

import { AiBillingService } from '../modules/ai-policy/ai-billing.service.js';

router.get('/billing', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const svc = new AiBillingService(AppDataSource);
    const data = await svc.list({
      status: req.query.status as string | undefined,
      period: req.query.period as string | undefined,
    });
    return res.json({ success: true, data });
  } catch { return res.status(500).json({ success: false, error: 'Billing list failed' }); }
});

router.get('/billing/:id', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID' });
    const svc = new AiBillingService(AppDataSource);
    const data = await svc.getDetail(id);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(error.message === 'Billing not found' ? 404 : 500)
      .json({ success: false, error: error.message || 'Billing detail failed' });
  }
});

router.post('/billing/generate', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const month = (req.query.month || req.body.month) as string;
    if (!month) return res.status(400).json({ success: false, error: 'month parameter required (YYYY-MM)' });
    const svc = new AiBillingService(AppDataSource);
    const data = await svc.generate(month);
    return res.status(201).json({ success: true, data });
  } catch (error: any) {
    const status = error.message?.includes('already exists') ? 409 : 400;
    return res.status(status).json({ success: false, error: error.message || 'Billing generation failed' });
  }
});

router.put('/billing/:id/adjustment', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID' });
    const { amount, note } = req.body;
    if (amount == null) return res.status(400).json({ success: false, error: 'amount required' });
    const svc = new AiBillingService(AppDataSource);
    const data = await svc.updateAdjustment(id, Number(amount), note);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message || 'Adjustment failed' });
  }
});

router.put('/billing/:id/confirm', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID' });
    const svc = new AiBillingService(AppDataSource);
    const data = await svc.confirm(id);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message || 'Confirm failed' });
  }
});

router.put('/billing/:id/paid', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID' });
    const svc = new AiBillingService(AppDataSource);
    const data = await svc.markPaid(id);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message || 'Mark paid failed' });
  }
});

router.get('/billing/:id/export.csv', authenticate, requireAdmin, async (req, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID' });
    const svc = new AiBillingService(AppDataSource);
    const { csv, filename } = await svc.exportCsv(id);
    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(bom + csv);
  } catch (error: any) {
    return res.status(error.message === 'Billing not found' ? 404 : 500)
      .json({ success: false, error: error.message || 'Export failed' });
  }
});

export default router;
