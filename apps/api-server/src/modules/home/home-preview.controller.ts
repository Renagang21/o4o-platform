/**
 * Home Preview Controller
 *
 * WO-HOME-LIVE-PREVIEW-V1
 * WO-O4O-GLYCOPHARM-CARE-DEAD-CODE-REMOVAL-V1: Care 집계 제거
 *
 * Public API: GET /api/v1/home/preview
 * - 인증 선택적: 토큰 있으면 pharmacy-scoped, 없으면 global aggregate
 * - Store 운영 데이터 집계 (Care 제거됨)
 * - 개인정보(이름, 전화번호) 반환 금지
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import jwt from 'jsonwebtoken';
import logger from '../../utils/logger.js';
import { cacheGetOrSet } from '../../infrastructure/cache.service.js';
import { resolveGlycopharmPharmacyId } from '../glycopharm/resolve-pharmacy.js';

// ============================================================================
// Types
// ============================================================================

type MetricStatus = 'OK' | 'ZERO' | 'TABLE_MISSING' | 'NOT_ACTIVATED';

type QueryOutcome = 'QUERY_OK' | 'TABLE_MISSING';

interface SafeQueryResult {
  rows: any[];
  outcome: QueryOutcome;
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

  // B. Pending requests (v2: product_approvals)
  const pendingResult = isGlobal
    ? await safeQuery(ds, `
        SELECT COUNT(*)::int AS count FROM product_approvals
        WHERE approval_status = 'pending'
      `)
    : await safeQuery(ds, `
        SELECT COUNT(*)::int AS count FROM product_approvals
        WHERE approval_status = 'pending' AND requested_by = $1
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
        pharmacyId = await resolveGlycopharmPharmacyId(dataSource, userId);
      }

      // Global (비로그인) → Redis 캐시, Pharmacy-scoped → 실시간
      const isGlobal = !pharmacyId;

      if (isGlobal) {
        const data = await cacheGetOrSet<HomePreviewData>(
          GLOBAL_CACHE_KEY,
          GLOBAL_CACHE_TTL,
          async () => {
            const store = await buildStorePreview(dataSource, null, null);
            return { store };
          },
        );
        return res.json({ success: true, data });
      }

      // Pharmacy-scoped: 캐시 없이 실시간
      const store = await buildStorePreview(dataSource, pharmacyId, userId);

      res.json({ success: true, data: { store } });
    } catch (error) {
      logger.error('[HomePreview] Aggregation error:', error);
      // Fallback: return zeros with TABLE_MISSING status instead of 500
      res.json({
        success: true,
        data: {
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
