/**
 * Store Analytics Controller
 *
 * WO-O4O-MARKETING-ANALYTICS-V1
 *
 * 매장 마케팅 성과 분석 API.
 * store_qr_scan_events + store_qr_codes 집계.
 *
 * AUTHENTICATED (requireAuth + requirePharmacyOwner):
 *   GET /pharmacy/analytics/marketing      — 조직 전체 마케팅 KPI + TOP QR + 디바이스 + 일별 추이
 *   GET /pharmacy/analytics/recent-scans   — 최근 스캔 로그 (최대 20건)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = RequestHandler;

export function createStoreAnalyticsController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const requirePharmacyOwner = createRequireStoreOwner(dataSource);

  // ─── GET /pharmacy/analytics/marketing ───────────────────────
  router.get(
    '/pharmacy/analytics/marketing',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;

      const [kpiResult, qrCountResult, topQrResult, deviceResult, dailyResult] = await Promise.all([
        // 1. KPI: 총/오늘/이번주 스캔
        dataSource.query(
          `SELECT
             COUNT(*)::int AS "totalScans",
             COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS "todayScans",
             COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::int AS "weeklyScans"
           FROM store_qr_scan_events
           WHERE organization_id = $1`,
          [organizationId],
        ),

        // 2. 활성 QR 수
        dataSource.query(
          `SELECT COUNT(*)::int AS count
           FROM store_qr_codes
           WHERE organization_id = $1 AND is_active = true`,
          [organizationId],
        ),

        // 3. TOP QR (스캔 수 기준, 최대 10개)
        dataSource.query(
          `SELECT
             qr.id,
             qr.title,
             qr.slug,
             COUNT(e.id)::int AS "scanCount"
           FROM store_qr_codes qr
           LEFT JOIN store_qr_scan_events e
             ON e.qr_code_id = qr.id AND e.organization_id = $1
           WHERE qr.organization_id = $1 AND qr.is_active = true
           GROUP BY qr.id, qr.title, qr.slug
           ORDER BY "scanCount" DESC
           LIMIT 10`,
          [organizationId],
        ),

        // 4. 디바이스 분포
        dataSource.query(
          `SELECT device_type AS "deviceType", COUNT(*)::int AS count
           FROM store_qr_scan_events
           WHERE organization_id = $1
           GROUP BY device_type`,
          [organizationId],
        ),

        // 5. 일별 스캔 추이 (최근 14일)
        dataSource.query(
          `SELECT
             TO_CHAR(created_at::date, 'YYYY-MM-DD') AS date,
             COUNT(*)::int AS count
           FROM store_qr_scan_events
           WHERE organization_id = $1
             AND created_at >= CURRENT_DATE - INTERVAL '14 days'
           GROUP BY created_at::date
           ORDER BY created_at::date`,
          [organizationId],
        ),
      ]);

      const kpi = kpiResult[0] || { totalScans: 0, todayScans: 0, weeklyScans: 0 };
      const activeQrCount = qrCountResult[0]?.count || 0;

      const deviceStats: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 };
      for (const row of deviceResult) {
        deviceStats[row.deviceType] = row.count;
      }

      res.json({
        success: true,
        data: {
          totalScans: kpi.totalScans,
          todayScans: kpi.todayScans,
          weeklyScans: kpi.weeklyScans,
          activeQrCount,
          topQrCodes: topQrResult,
          deviceStats,
          dailyScans: dailyResult,
        },
      });
    }),
  );

  // ─── GET /pharmacy/analytics/recent-scans ─────────────────────
  router.get(
    '/pharmacy/analytics/recent-scans',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;

      const rows = await dataSource.query(
        `SELECT
           e.device_type AS "deviceType",
           e.created_at AS "createdAt",
           qr.title AS "qrTitle",
           qr.slug AS "qrSlug"
         FROM store_qr_scan_events e
         LEFT JOIN store_qr_codes qr
           ON qr.id = e.qr_code_id AND qr.organization_id = $1
         WHERE e.organization_id = $1
         ORDER BY e.created_at DESC
         LIMIT 20`,
        [organizationId],
      );

      res.json({ success: true, data: rows });
    }),
  );

  return router;
}
