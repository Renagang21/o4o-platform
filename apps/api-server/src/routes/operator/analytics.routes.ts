/**
 * Operator Analytics Routes
 *
 * WO-O4O-AUDIT-ANALYTICS-LAYER-V1
 *
 * action_logs 테이블 기반 운영자 액션 분석 API.
 * 서비스별 승인/거절 등 액션 통계와 최근 액션 이력을 제공합니다.
 *
 * Endpoints:
 *   GET /api/v1/operator/analytics/summary   — 기간별 액션 요약
 *   GET /api/v1/operator/analytics/actions    — 최근 액션 목록 (페이징)
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
  'glucoseview:admin', 'glucoseview:operator',
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

      const serviceFilter = serviceKeys.length > 0
        ? `AND service_key = ANY($1)`
        : '';
      const params: any[] = serviceKeys.length > 0 ? [serviceKeys] : [];
      const dateParamIdx = params.length + 1;

      // Action summary grouped by action_key and status
      const summary = await dataSource.query(
        `SELECT action_key, status, COUNT(*)::int AS count
         FROM action_logs
         WHERE created_at >= NOW() - INTERVAL '1 day' * $${dateParamIdx}
           ${serviceFilter}
         GROUP BY action_key, status
         ORDER BY count DESC`,
        [...params, days],
      );

      // Daily counts for trend
      const daily = await dataSource.query(
        `SELECT DATE(created_at) AS date, COUNT(*)::int AS count
         FROM action_logs
         WHERE created_at >= NOW() - INTERVAL '1 day' * $${dateParamIdx}
           ${serviceFilter}
         GROUP BY DATE(created_at)
         ORDER BY date DESC
         LIMIT 30`,
        [...params, days],
      );

      // Total counts
      const totalRow = await dataSource.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'success')::int AS success_count,
                COUNT(*) FILTER (WHERE status = 'failure')::int AS failure_count
         FROM action_logs
         WHERE created_at >= NOW() - INTERVAL '1 day' * $${dateParamIdx}
           ${serviceFilter}`,
        [...params, days],
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

  return router;
}
