/**
 * Supplier Signage Report Controller
 *
 * WO-O4O-SIGNAGE-SUPPLIER-CAMPAIGN-REPORT-API-V1
 *
 * 경로: GET /api/v1/kpa/supplier/signage/reports
 *
 * 공급자가 자신의 signage_media 기준 재생 성과를 서비스 단위로 조회한다.
 *
 * 핵심 정책:
 * - 공급자는 자신이 등록한 media (createdByUserId = me) 데이터만 조회 가능
 * - organization_id, 매장명, 약국명 절대 응답 미포함
 * - uniqueStoreCount: COUNT(DISTINCT organization_id) 내부 계산 후 숫자만 반환
 * - estimatedPlayTimeSeconds: playCount × media.duration (duration nullable → 0)
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';

type AuthMiddleware = import('express').RequestHandler;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportQuery {
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;    // YYYY-MM-DD
  serviceKey?: string;
  mediaId?: string;
  page?: string;
  limit?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string) {
  return DATE_RE.test(s) && !isNaN(Date.parse(s));
}

/**
 * 공통 WHERE 절 빌더.
 * 파라미터 배열에 순서대로 추가하며 $N placeholder를 반환한다.
 *
 * @param userId  공급자 userId (필수 — supplier ownership 필터)
 * @param q       쿼리 파라미터
 */
function buildWhere(
  userId: string,
  q: ReportQuery,
): { where: string; params: any[] } {
  const conditions: string[] = [`sm."createdByUserId" = $1`];
  const params: any[] = [userId];

  if (q.startDate && isValidDate(q.startDate)) {
    params.push(q.startDate);
    conditions.push(`spl.played_at >= $${params.length}::date`);
  }

  if (q.endDate && isValidDate(q.endDate)) {
    // endDate 당일 포함: < endDate + 1day
    params.push(q.endDate);
    conditions.push(`spl.played_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  if (q.serviceKey && typeof q.serviceKey === 'string' && q.serviceKey.trim()) {
    params.push(q.serviceKey.trim());
    conditions.push(`spl.service_key = $${params.length}`);
  }

  if (q.mediaId && UUID_RE.test(q.mediaId)) {
    params.push(q.mediaId);
    conditions.push(`spl.media_id = $${params.length}`);
  }

  return { where: conditions.join('\n  AND '), params };
}

// ── Controller Factory ────────────────────────────────────────────────────────

export function createSupplierSignageReportController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();

  router.use(requireAuth as any);

  /**
   * GET /api/v1/kpa/supplier/signage/reports
   *
   * Query params:
   *   startDate  YYYY-MM-DD (inclusive)
   *   endDate    YYYY-MM-DD (inclusive)
   *   serviceKey (optional)
   *   mediaId    UUID (optional)
   *   page       default 1
   *   limit      default 20, max 100
   */
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = (req as any).user as { id: string };
      const q = req.query as ReportQuery;

      // 페이지네이션 (byMedia에만 적용)
      const page = Math.max(1, parseInt(q.page ?? '1') || 1);
      const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '20') || 20));
      const offset = (page - 1) * limit;

      const { where, params } = buildWhere(user.id, q);

      // ── 4개 집계 쿼리 병렬 실행 ───────────────────────────────────────────

      const [summaryRows, byServiceRows, byMediaRows, byDateRows] = await Promise.all([

        // 1. Summary
        dataSource.query<any[]>(`
          SELECT
            COUNT(spl.id)::int                                                           AS "totalPlayCount",
            COALESCE(SUM(COALESCE(sm.duration, 0)), 0)::int                              AS "totalPlayTimeSeconds",
            COUNT(DISTINCT spl.service_key)::int                                         AS "uniqueServiceCount",
            COUNT(DISTINCT CASE WHEN spl.organization_id IS NOT NULL
                                THEN spl.organization_id END)::int                       AS "uniqueStoreCount"
          FROM signage_playback_logs spl
          JOIN signage_media sm ON sm.id = spl.media_id
          WHERE ${where}
        `, params),

        // 2. By Service
        dataSource.query<any[]>(`
          SELECT
            spl.service_key                                                               AS "serviceKey",
            COUNT(spl.id)::int                                                           AS "playCount",
            COALESCE(SUM(COALESCE(sm.duration, 0)), 0)::int                              AS "estimatedPlayTimeSeconds",
            COUNT(DISTINCT CASE WHEN spl.organization_id IS NOT NULL
                                THEN spl.organization_id END)::int                       AS "uniqueStoreCount"
          FROM signage_playback_logs spl
          JOIN signage_media sm ON sm.id = spl.media_id
          WHERE ${where}
          GROUP BY spl.service_key
          ORDER BY "playCount" DESC
        `, params),

        // 3. By Media (paginated)
        dataSource.query<any[]>(`
          SELECT
            spl.media_id                                                                  AS "mediaId",
            sm.name                                                                       AS "title",
            COUNT(spl.id)::int                                                           AS "playCount",
            (COUNT(spl.id) * COALESCE(MAX(sm.duration), 0))::int                        AS "estimatedPlayTimeSeconds"
          FROM signage_playback_logs spl
          JOIN signage_media sm ON sm.id = spl.media_id
          WHERE ${where}
          GROUP BY spl.media_id, sm.name
          ORDER BY "playCount" DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]),

        // 4. By Date (최근 90일 제한)
        dataSource.query<any[]>(`
          SELECT
            (spl.played_at::date)::text                                                   AS "date",
            COUNT(spl.id)::int                                                           AS "playCount"
          FROM signage_playback_logs spl
          JOIN signage_media sm ON sm.id = spl.media_id
          WHERE ${where}
          GROUP BY spl.played_at::date
          ORDER BY "date" ASC
          LIMIT 90
        `, params),
      ]);

      const summary = summaryRows[0] ?? {
        totalPlayCount: 0,
        totalPlayTimeSeconds: 0,
        uniqueServiceCount: 0,
        uniqueStoreCount: 0,
      };

      // ── 응답 — organization_id 절대 미포함 ───────────────────────────────

      res.json({
        success: true,
        summary: {
          totalPlayCount:       summary.totalPlayCount,
          totalPlayTimeSeconds: summary.totalPlayTimeSeconds,
          uniqueServiceCount:   summary.uniqueServiceCount,
          uniqueStoreCount:     summary.uniqueStoreCount,
          // organization_id: NEVER exposed
        },
        byService: byServiceRows.map((r: any) => ({
          serviceKey:               r.serviceKey,
          playCount:                r.playCount,
          estimatedPlayTimeSeconds: r.estimatedPlayTimeSeconds,
          uniqueStoreCount:         r.uniqueStoreCount,
          // organization_id: NEVER exposed
        })),
        byMedia: byMediaRows.map((r: any) => ({
          mediaId:                  r.mediaId,
          title:                    r.title,
          playCount:                r.playCount,
          estimatedPlayTimeSeconds: r.estimatedPlayTimeSeconds,
          // organization_id: NEVER exposed
        })),
        byDate: byDateRows.map((r: any) => ({
          date:      r.date,
          playCount: r.playCount,
        })),
        pagination: {
          page,
          limit,
          // byMedia 기준 (summary/byService/byDate는 전체 반환)
        },
      });
    }),
  );

  return router;
}
