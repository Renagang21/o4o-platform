/**
 * Operator Analytics Routes
 *
 * WO-O4O-AUDIT-ANALYTICS-LAYER-V1
 * WO-O4O-AI-OPERATOR-INSIGHT-V1
 *
 * action_logs 테이블 기반 운영자 액션 분석 API.
 * 서비스별 승인/거절 등 액션 통계와 최근 액션 이력을 제공합니다.
 *
 * Endpoints:
 *   GET /api/v1/operator/analytics/summary    — 기간별 액션 요약
 *   GET /api/v1/operator/analytics/actions     — 최근 액션 목록 (페이징)
 *   GET /api/v1/operator/analytics/auth/logs   — Auth 이벤트 조회 (WO-O4O-AUTH-MONITORING-V1)
 *   GET /api/v1/operator/analytics/insight     — AI 운영 인사이트 (규칙 기반 + AI 강화)
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { injectServiceScope } from '../../utils/serviceScope.js';
import type { ServiceScope } from '../../utils/serviceScope.js';

const requireOperatorOrAdmin = requireRole([
  'admin', 'super_admin', 'operator',
  'platform:admin', 'platform:super_admin',
  'neture:admin', 'neture:operator',
  'glycopharm:admin', 'glycopharm:operator',
  'kpa-society:admin', 'kpa-society:operator',
]);

export function createOperatorAnalyticsRoutes(dataSource: DataSource): Router {
  const router = Router();

  router.use(authenticate, requireOperatorOrAdmin, injectServiceScope);

  /**
   * GET /api/v1/operator/analytics/summary
   *
   * Query params:
   *   serviceKey — 서비스 필터 (optional, defaults to scope)
   *   days       — 기간 (default 30, max 365)
   */
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const requestedService = req.query.serviceKey as string | undefined;
      const days = Math.min(parseInt(req.query.days as string) || 30, 365);

      // Determine which service keys to query
      let serviceKeys: string[];
      if (scope.isPlatformAdmin) {
        serviceKeys = requestedService ? [requestedService] : [];
      } else {
        serviceKeys = requestedService
          ? scope.serviceKeys.filter(k => k === requestedService)
          : scope.serviceKeys;
      }

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const serviceFilter = serviceKeys.length > 0
        ? `AND service_key = ANY($1)`
        : '';
      const params: any[] = serviceKeys.length > 0 ? [serviceKeys] : [];
      const dateParamIdx = params.length + 1;

      // Action summary grouped by action_key and status
      const summary = await dataSource.query(
        `SELECT action_key, status, COUNT(*)::int AS count
         FROM action_logs
         WHERE created_at >= $${dateParamIdx}
           ${serviceFilter}
         GROUP BY action_key, status
         ORDER BY count DESC`,
        [...params, fromDate],
      );

      // Daily counts for trend
      const daily = await dataSource.query(
        `SELECT DATE(created_at) AS date, COUNT(*)::int AS count
         FROM action_logs
         WHERE created_at >= $${dateParamIdx}
           ${serviceFilter}
         GROUP BY DATE(created_at)
         ORDER BY date DESC
         LIMIT 30`,
        [...params, fromDate],
      );

      // Total counts
      const totalRow = await dataSource.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'success')::int AS success_count,
                COUNT(*) FILTER (WHERE status = 'failure')::int AS failure_count
         FROM action_logs
         WHERE created_at >= $${dateParamIdx}
           ${serviceFilter}`,
        [...params, fromDate],
      );

      res.json({
        success: true,
        data: {
          period: { days },
          totals: totalRow[0] || { total: 0, success_count: 0, failure_count: 0 },
          byAction: summary,
          daily,
        },
      });
    } catch (error) {
      console.error('[OperatorAnalytics] Summary error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch analytics summary' });
    }
  });

  /**
   * GET /api/v1/operator/analytics/actions
   *
   * Query params:
   *   serviceKey — 서비스 필터
   *   actionKey  — 특정 action_key 필터
   *   page       — 페이지 (default 1)
   *   limit      — 건수 (default 20, max 100)
   */
  router.get('/actions', async (req: Request, res: Response) => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const requestedService = req.query.serviceKey as string | undefined;
      const actionKey = req.query.actionKey as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      // Build conditions
      const conditions: string[] = [];
      const params: any[] = [];
      let idx = 1;

      // Service key filter
      let serviceKeys: string[];
      if (scope.isPlatformAdmin) {
        serviceKeys = requestedService ? [requestedService] : [];
      } else {
        serviceKeys = requestedService
          ? scope.serviceKeys.filter(k => k === requestedService)
          : scope.serviceKeys;
      }
      if (serviceKeys.length > 0) {
        conditions.push(`service_key = ANY($${idx++})`);
        params.push(serviceKeys);
      }

      // Action key filter
      if (actionKey) {
        conditions.push(`action_key = $${idx++}`);
        params.push(actionKey);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const [countResult, rows] = await Promise.all([
        dataSource.query(
          `SELECT COUNT(*)::int AS total FROM action_logs ${where}`,
          params,
        ),
        dataSource.query(
          `SELECT id, service_key, user_id, action_key, source, status,
                  duration_ms, error_message, meta, created_at
           FROM action_logs
           ${where}
           ORDER BY created_at DESC
           LIMIT $${idx++} OFFSET $${idx++}`,
          [...params, limit, offset],
        ),
      ]);

      const total = countResult[0]?.total || 0;

      res.json({
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('[OperatorAnalytics] Actions error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch action logs' });
    }
  });

  /**
   * GET /api/v1/operator/analytics/auth/logs
   *
   * WO-O4O-AUTH-MONITORING-V1
   *
   * Auth 이벤트 조회 (action_logs 기반).
   * 로그인 성공/실패 이력을 운영자 대시보드에서 확인할 수 있다.
   *
   * Query params:
   *   limit  — 최대 건수 (default 50, max 200)
   *   status — 'success' | 'failure' 필터 (optional)
   */
  router.get('/auth/logs', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const status = req.query.status as string | undefined;

      const conditions: string[] = [`action_key LIKE 'auth.login.%'`];
      const params: any[] = [];
      let idx = 1;

      if (status === 'success' || status === 'failure') {
        conditions.push(`status = $${idx++}`);
        params.push(status);
      }

      conditions.push(`created_at >= NOW() - INTERVAL '30 days'`);

      const where = `WHERE ${conditions.join(' AND ')}`;

      const rows = await dataSource.query(
        `SELECT id, user_id, action_key, status, error_message, meta, created_at
         FROM action_logs
         ${where}
         ORDER BY created_at DESC
         LIMIT $${idx}`,
        [...params, limit],
      );

      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('[OperatorAnalytics] Auth logs error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch auth logs' });
    }
  });

  // ─────────────────────────────────────────────────────
  // Insight Cache (in-memory, TTL 30min)
  // ─────────────────────────────────────────────────────
  const insightCache = new Map<string, { data: any; ts: number }>();
  const INSIGHT_TTL_MS = 30 * 60 * 1000;

  function getCachedInsight(key: string): any | null {
    const entry = insightCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > INSIGHT_TTL_MS) {
      insightCache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * GET /api/v1/operator/analytics/insight
   *
   * WO-O4O-AI-OPERATOR-INSIGHT-V1
   *
   * Analytics 데이터 기반 AI 운영 인사이트.
   * 규칙 기반 판단 + 선택적 AI 강화 (CopilotEngineService).
   *
   * Query params:
   *   serviceKey — 서비스 필터
   *   days       — 기간 (default 30, max 365)
   */
  router.get('/insight', async (req: Request, res: Response) => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const requestedService = req.query.serviceKey as string | undefined;
      const days = Math.min(parseInt(req.query.days as string) || 30, 365);

      // Service key resolution
      let serviceKeys: string[];
      if (scope.isPlatformAdmin) {
        serviceKeys = requestedService ? [requestedService] : [];
      } else {
        serviceKeys = requestedService
          ? scope.serviceKeys.filter(k => k === requestedService)
          : scope.serviceKeys;
      }

      // Cache check
      const cacheKey = `${serviceKeys.join(',')}:${days}`;
      const cached = getCachedInsight(cacheKey);
      if (cached) {
        res.json({ success: true, data: cached });
        return;
      }

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const serviceFilter = serviceKeys.length > 0
        ? `AND service_key = ANY($1)`
        : '';
      const params: any[] = serviceKeys.length > 0 ? [serviceKeys] : [];
      const dateParamIdx = params.length + 1;

      // 1. Total counts
      const totalRow = await dataSource.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'success')::int AS success_count,
                COUNT(*) FILTER (WHERE status = 'failure')::int AS failure_count
         FROM action_logs
         WHERE created_at >= $${dateParamIdx}
           ${serviceFilter}`,
        [...params, fromDate],
      );
      const totals = totalRow[0] || { total: 0, success_count: 0, failure_count: 0 };

      // 2. Approve / reject breakdown
      const actionBreakdown = await dataSource.query(
        `SELECT action_key, COUNT(*)::int AS count
         FROM action_logs
         WHERE created_at >= $${dateParamIdx}
           AND status = 'success'
           ${serviceFilter}
         GROUP BY action_key`,
        [...params, fromDate],
      );

      // 3. Operator distribution
      const operatorDist = await dataSource.query(
        `SELECT user_id, COUNT(*)::int AS count
         FROM action_logs
         WHERE created_at >= $${dateParamIdx}
           ${serviceFilter}
         GROUP BY user_id
         ORDER BY count DESC
         LIMIT 5`,
        [...params, fromDate],
      );

      // ── Derive metrics ──
      const total = totals.total as number;
      let approveCount = 0;
      let rejectCount = 0;
      for (const row of actionBreakdown) {
        const key = (row.action_key as string) || '';
        if (key.includes('approve')) approveCount += row.count;
        if (key.includes('reject')) rejectCount += row.count;
      }

      const approvalRate = total > 0 ? Math.round((approveCount / total) * 100) : 0;
      const rejectionRate = total > 0 ? Math.round((rejectCount / total) * 100) : 0;
      const avgDaily = days > 0 ? Math.round((total / days) * 10) / 10 : 0;

      let topOperator: { userId: string; actionCount: number; percentage: number } | undefined;
      if (operatorDist.length > 0 && total > 0) {
        const top = operatorDist[0];
        topOperator = {
          userId: top.user_id,
          actionCount: top.count,
          percentage: Math.round((top.count / total) * 100),
        };
      }

      // ── Rule-based analysis ──
      const warnings: string[] = [];
      const recommendations: string[] = [];

      if (total === 0) {
        // No data
        const insight = {
          summary: `최근 ${days}일간 기록된 운영 액션이 없습니다.`,
          warnings: [],
          recommendations: [],
          metrics: { approvalRate: 0, rejectionRate: 0, totalActions: 0, avgDaily: 0 },
          source: 'rule-based' as const,
        };
        insightCache.set(cacheKey, { data: insight, ts: Date.now() });
        res.json({ success: true, data: insight });
        return;
      }

      // Rule: High approval rate
      if (approvalRate > 95) {
        warnings.push(`승인율이 ${approvalRate}%로 과도합니다. 심사 기준을 점검하세요.`);
        recommendations.push('자동 승인 조건을 검토하고, 샘플링 심사를 도입하세요.');
      }

      // Rule: High rejection rate
      if (rejectionRate > 40) {
        warnings.push(`거절율이 ${rejectionRate}%로 높습니다. 신청 가이드 개선을 검토하세요.`);
        recommendations.push('신청 가이드를 개선하거나 사전 검증 단계를 추가하세요.');
      }

      // Rule: Operator concentration
      if (topOperator && topOperator.percentage > 60 && operatorDist.length > 1) {
        warnings.push(`운영자 1명이 전체 액션의 ${topOperator.percentage}%를 수행합니다. 권한 분산을 검토하세요.`);
        recommendations.push('승인 권한을 분산하는 것이 좋습니다.');
      }

      // Rule: Low activity
      if (avgDaily < 1 && total > 0) {
        recommendations.push(`최근 ${days}일간 일평균 ${avgDaily}건으로 운영 활동이 저조합니다.`);
      }

      // Build summary
      const rateDesc = approvalRate >= 80 ? '안정적' :
                       approvalRate >= 50 ? '보통' : '낮은 편';
      const summary = `최근 ${days}일간 총 ${total}건의 운영 액션이 수행되었습니다. 승인율 ${approvalRate}%로 ${rateDesc}입니다.`;

      const insight = {
        summary,
        warnings,
        recommendations,
        metrics: {
          approvalRate,
          rejectionRate,
          totalActions: total,
          avgDaily,
          topOperator,
        },
        source: 'rule-based' as const,
      };

      // Cache result
      insightCache.set(cacheKey, { data: insight, ts: Date.now() });

      res.json({ success: true, data: insight });
    } catch (error) {
      console.error('[OperatorAnalytics] Insight error:', error);
      res.status(500).json({ success: false, error: 'Failed to generate insight' });
    }
  });

  return router;
}
