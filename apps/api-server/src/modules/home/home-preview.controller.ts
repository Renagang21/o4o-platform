/**
 * Home Preview Controller
 *
 * WO-HOME-LIVE-PREVIEW-V1
 *
 * Public API: GET /api/v1/home/preview
 * - 인증 선택적: 토큰 있으면 pharmacy-scoped, 없으면 global aggregate
 * - Care + Store 운영 데이터 집계
 * - 개인정보(이름, 전화번호, patient_id) 반환 금지
 *
 * 패턴: care-dashboard.controller.ts의 buildDashboard 재사용
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import jwt from 'jsonwebtoken';
import logger from '../../utils/logger.js';
import { cacheGetOrSet } from '../../infrastructure/cache.service.js';

// ============================================================================
// Types
// ============================================================================

type MetricStatus = 'OK' | 'ZERO' | 'TABLE_MISSING' | 'NOT_ACTIVATED';

type QueryOutcome = 'QUERY_OK' | 'TABLE_MISSING';

interface SafeQueryResult {
  rows: any[];
  outcome: QueryOutcome;
}

interface HomePreviewCare {
  totalPatients: number;
  totalPatientsStatus: MetricStatus;
  highRiskCount: number;
  highRiskCountStatus: MetricStatus;
  recentCoaching: number;
  recentCoachingStatus: MetricStatus;
  recentAnalysis: number;
  recentAnalysisStatus: MetricStatus;
  recentChanges: Array<{
    tirChange?: number;
    cvChange?: number;
    riskTrend: 'improving' | 'stable' | 'worsening';
  }>;
}

interface HomePreviewStore {
  monthlyOrders: number;
  monthlyOrdersStatus: MetricStatus;
  pendingRequests: number;
  pendingRequestsStatus: MetricStatus;
  activeProducts: number;
  activeProductsStatus: MetricStatus;
  monthlyRevenue: number;
  monthlyRevenueStatus: MetricStatus;
}

interface HomePreviewData {
  care: HomePreviewCare;
  store: HomePreviewStore;
}

// ============================================================================
// Optional Auth Middleware
// ============================================================================

/**
 * JWT 검증 시도하되 실패해도 통과.
 * 토큰 있으면 req.user에 decoded 정보 첨부, 없으면 그냥 통과.
 */
function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    (req as any).user = { id: decoded.userId || decoded.sub };
  } catch {
    // 토큰 검증 실패 — 무시하고 비인증으로 진행
  }
  next();
}

// ============================================================================
// Pharmacy ID Resolution
// ============================================================================

async function resolvePharmacyId(ds: DataSource, userId: string): Promise<string | null> {
  try {
    const result = await ds.query(
      `SELECT o.id FROM organizations o
       JOIN organization_service_enrollments ose ON ose.organization_id = o.id AND ose.service_code = 'glycopharm'
       WHERE o.created_by_user_id = $1 AND o."isActive" = true LIMIT 1`,
      [userId]
    );
    return result?.[0]?.id || null;
  } catch {
    return null;
  }
}

// ============================================================================
// Aggregation Queries
// ============================================================================

/** Safe query wrapper — returns rows + outcome (QUERY_OK | TABLE_MISSING) */
async function safeQuery(ds: DataSource, sql: string, params?: any[]): Promise<SafeQueryResult> {
  try {
    const rows = await ds.query(sql, params);
    return { rows, outcome: 'QUERY_OK' };
  } catch (err: any) {
    logger.warn('[HomePreview] safeQuery TABLE_MISSING:', err?.message || err);
    return { rows: [], outcome: 'TABLE_MISSING' };
  }
}

function deriveStatus(outcome: QueryOutcome, value: number): MetricStatus {
  if (outcome === 'TABLE_MISSING') return 'TABLE_MISSING';
  return value > 0 ? 'OK' : 'ZERO';
}

async function buildCarePreview(
  ds: DataSource,
  _pharmacyId: string | null,
  userId: string | null,
): Promise<HomePreviewCare> {
  // WO-CARE-KPI-PHARMACY-SCOPE-FIX-V1: Care는 pharmacist_id(=userId) 기준 개인 단위 모델
  const isGlobal = !userId;

  // A. Total patients
  const totalResult = isGlobal
    ? await safeQuery(ds, `SELECT COUNT(*)::int AS count FROM glucoseview_customers`)
    : await safeQuery(ds,
        `SELECT COUNT(*)::int AS count FROM glucoseview_customers WHERE pharmacist_id = $1`,
        [userId]
      );
  const totalPatients = totalResult.rows[0]?.count ?? 0;
  const totalPatientsStatus = deriveStatus(totalResult.outcome, totalPatients);

  // B. High risk count (latest snapshot per patient)
  const highRiskResult = isGlobal
    ? await safeQuery(ds, `
        SELECT COUNT(*)::int AS count
        FROM care_kpi_snapshots s
        INNER JOIN (
          SELECT patient_id, MAX(created_at) AS max_at
          FROM care_kpi_snapshots GROUP BY patient_id
        ) latest ON s.patient_id = latest.patient_id AND s.created_at = latest.max_at
        WHERE s.risk_level = 'high'
      `)
    : await safeQuery(ds, `
        SELECT COUNT(*)::int AS count
        FROM care_kpi_snapshots s
        JOIN glucoseview_customers c ON s.patient_id = c.id
        INNER JOIN (
          SELECT patient_id, MAX(created_at) AS max_at
          FROM care_kpi_snapshots GROUP BY patient_id
        ) latest ON s.patient_id = latest.patient_id AND s.created_at = latest.max_at
        WHERE c.pharmacist_id = $1 AND s.risk_level = 'high'
      `, [userId]);
  const highRiskCount = highRiskResult.rows[0]?.count ?? 0;
  const highRiskCountStatus = deriveStatus(highRiskResult.outcome, highRiskCount);

  // C. Recent coaching (last 7 days)
  const coachingResult = isGlobal
    ? await safeQuery(ds, `
        SELECT COUNT(*)::int AS count FROM care_coaching_sessions
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `)
    : await safeQuery(ds, `
        SELECT COUNT(*)::int AS count FROM care_coaching_sessions
        WHERE created_at >= NOW() - INTERVAL '7 days' AND pharmacist_id = $1
      `, [userId]);
  const recentCoaching = coachingResult.rows[0]?.count ?? 0;
  const recentCoachingStatus = deriveStatus(coachingResult.outcome, recentCoaching);

  // D. Recent analysis (distinct patients with snapshots in last 7 days)
  const analysisResult = isGlobal
    ? await safeQuery(ds, `
        SELECT COUNT(DISTINCT patient_id)::int AS count FROM care_kpi_snapshots
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `)
    : await safeQuery(ds, `
        SELECT COUNT(DISTINCT s.patient_id)::int AS count FROM care_kpi_snapshots s
        JOIN glucoseview_customers c ON s.patient_id = c.id
        WHERE s.created_at >= NOW() - INTERVAL '7 days' AND c.pharmacist_id = $1
      `, [userId]);
  const recentAnalysis = analysisResult.rows[0]?.count ?? 0;
  const recentAnalysisStatus = deriveStatus(analysisResult.outcome, recentAnalysis);

  // E. Recent changes (anonymous, 3 most recent patients with 2+ snapshots)
  const changesQuery = isGlobal
    ? `
      WITH ranked AS (
        SELECT patient_id, tir, cv,
               ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at DESC) AS rn
        FROM care_kpi_snapshots
      )
      SELECT
        r1.tir - r2.tir AS "tirChange",
        r1.cv - r2.cv AS "cvChange",
        CASE
          WHEN r1.tir > r2.tir THEN 'improving'
          WHEN r1.tir < r2.tir THEN 'worsening'
          ELSE 'stable'
        END AS "riskTrend"
      FROM ranked r1
      JOIN ranked r2 ON r1.patient_id = r2.patient_id AND r1.rn = 1 AND r2.rn = 2
      ORDER BY r1.tir - r2.tir DESC
      LIMIT 3
    `
    : `
      WITH ranked AS (
        SELECT s.patient_id, s.tir, s.cv,
               ROW_NUMBER() OVER (PARTITION BY s.patient_id ORDER BY s.created_at DESC) AS rn
        FROM care_kpi_snapshots s
        JOIN glucoseview_customers c ON s.patient_id = c.id
        WHERE c.pharmacist_id = $1
      )
      SELECT
        r1.tir - r2.tir AS "tirChange",
        r1.cv - r2.cv AS "cvChange",
        CASE
          WHEN r1.tir > r2.tir THEN 'improving'
          WHEN r1.tir < r2.tir THEN 'worsening'
          ELSE 'stable'
        END AS "riskTrend"
      FROM ranked r1
      JOIN ranked r2 ON r1.patient_id = r2.patient_id AND r1.rn = 1 AND r2.rn = 2
      ORDER BY r1.tir - r2.tir DESC
      LIMIT 3
    `;
  const changesResult = isGlobal
    ? await safeQuery(ds, changesQuery)
    : await safeQuery(ds, changesQuery, [userId]);

  return {
    totalPatients,
    totalPatientsStatus,
    highRiskCount,
    highRiskCountStatus,
    recentCoaching,
    recentCoachingStatus,
    recentAnalysis,
    recentAnalysisStatus,
    recentChanges: changesResult.rows.map((r: any) => ({
      tirChange: r.tirChange,
      cvChange: r.cvChange,
      riskTrend: r.riskTrend,
    })),
  };
}

async function buildStorePreview(
  ds: DataSource,
  pharmacyId: string | null,
  userId: string | null,
): Promise<HomePreviewStore> {
  const isGlobal = !pharmacyId;

  // A. Monthly orders
  const ordersResult = isGlobal
    ? await safeQuery(ds, `
        SELECT COUNT(*)::int AS count FROM checkout_orders
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
      `)
    : await safeQuery(ds, `
        SELECT COUNT(*)::int AS count FROM checkout_orders
        WHERE created_at >= date_trunc('month', CURRENT_DATE) AND seller_id = $1
      `, [userId]);
  const monthlyOrders = ordersResult.rows[0]?.count ?? 0;
  const monthlyOrdersStatus = deriveStatus(ordersResult.outcome, monthlyOrders);

  // B. Pending requests (organization_product_applications)
  const pendingResult = isGlobal
    ? await safeQuery(ds, `
        SELECT COUNT(*)::int AS count FROM organization_product_applications
        WHERE status = 'pending'
      `)
    : await safeQuery(ds, `
        SELECT COUNT(*)::int AS count FROM organization_product_applications
        WHERE status = 'pending' AND requested_by = $1
      `, [userId]);
  const pendingRequests = pendingResult.rows[0]?.count ?? 0;
  const pendingRequestsStatus = deriveStatus(pendingResult.outcome, pendingRequests);

  // C. Active products
  const productsResult = isGlobal
    ? await safeQuery(ds, `
        SELECT COUNT(*)::int AS count FROM glycopharm_products
        WHERE status = 'active'
      `)
    : await safeQuery(ds, `
        SELECT COUNT(*)::int AS count FROM glycopharm_products
        WHERE status = 'active' AND pharmacy_id = $1
      `, [pharmacyId]);
  const activeProducts = productsResult.rows[0]?.count ?? 0;
  const activeProductsStatus = deriveStatus(productsResult.outcome, activeProducts);

  // D. Monthly revenue (paid orders only)
  const revenueResult = isGlobal
    ? await safeQuery(ds, `
        SELECT COALESCE(SUM(total_amount), 0)::int AS total FROM checkout_orders
        WHERE created_at >= date_trunc('month', CURRENT_DATE) AND status = 'paid'
      `)
    : await safeQuery(ds, `
        SELECT COALESCE(SUM(total_amount), 0)::int AS total FROM checkout_orders
        WHERE created_at >= date_trunc('month', CURRENT_DATE) AND status = 'paid' AND seller_id = $1
      `, [userId]);
  const monthlyRevenue = revenueResult.rows[0]?.total ?? 0;
  const monthlyRevenueStatus = deriveStatus(revenueResult.outcome, monthlyRevenue);

  return {
    monthlyOrders, monthlyOrdersStatus,
    pendingRequests, pendingRequestsStatus,
    activeProducts, activeProductsStatus,
    monthlyRevenue, monthlyRevenueStatus,
  };
}

// ============================================================================
// Router Factory
// ============================================================================

export function createHomePreviewRouter(dataSource: DataSource): Router {
  const router = Router();

  // WO-INFRA-REDIS-FOUNDATION-V1: Global aggregate TTL
  const GLOBAL_CACHE_KEY = 'home_preview_global';
  const GLOBAL_CACHE_TTL = 120; // seconds

  router.get('/preview', optionalAuthenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      let pharmacyId: string | null = null;
      let userId: string | null = null;

      if (user?.id) {
        userId = user.id;
        pharmacyId = await resolvePharmacyId(dataSource, userId);
      }

      // Global (비로그인) → Redis 캐시, Pharmacy-scoped → 실시간
      const isGlobal = !pharmacyId;

      if (isGlobal) {
        const data = await cacheGetOrSet<HomePreviewData>(
          GLOBAL_CACHE_KEY,
          GLOBAL_CACHE_TTL,
          async () => {
            const [care, store] = await Promise.all([
              buildCarePreview(dataSource, null, null),
              buildStorePreview(dataSource, null, null),
            ]);
            return { care, store };
          },
        );
        return res.json({ success: true, data });
      }

      // Pharmacy-scoped: 캐시 없이 실시간
      const [care, store] = await Promise.all([
        buildCarePreview(dataSource, pharmacyId, userId),
        buildStorePreview(dataSource, pharmacyId, userId),
      ]);

      res.json({ success: true, data: { care, store } });
    } catch (error) {
      logger.error('[HomePreview] Aggregation error:', error);
      // Fallback: return zeros with TABLE_MISSING status instead of 500
      res.json({
        success: true,
        data: {
          care: {
            totalPatients: 0, totalPatientsStatus: 'TABLE_MISSING',
            highRiskCount: 0, highRiskCountStatus: 'TABLE_MISSING',
            recentCoaching: 0, recentCoachingStatus: 'TABLE_MISSING',
            recentAnalysis: 0, recentAnalysisStatus: 'TABLE_MISSING',
            recentChanges: [],
          },
          store: {
            monthlyOrders: 0, monthlyOrdersStatus: 'TABLE_MISSING',
            pendingRequests: 0, pendingRequestsStatus: 'TABLE_MISSING',
            activeProducts: 0, activeProductsStatus: 'TABLE_MISSING',
            monthlyRevenue: 0, monthlyRevenueStatus: 'TABLE_MISSING',
          },
        },
      });
    }
  });

  return router;
}
