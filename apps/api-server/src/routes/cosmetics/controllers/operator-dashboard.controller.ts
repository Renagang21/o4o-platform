/**
 * K-Cosmetics Operator Dashboard Controller
 *
 * WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1 (Phase 3)
 *
 * GET /api/v1/cosmetics/operator/dashboard
 *   → Returns 5-block OperatorDashboardConfig for K-Cosmetics service operators
 *
 * Auth: requireAuth + requireCosmeticsScope('cosmetics:operator')
 * Data sources:
 *   - cosmetics.cosmetics_stores (store counts)
 *   - ecommerce_orders (order/revenue stats, serviceKey='cosmetics')
 *   - cosmetics_products (catalog stats)
 *   - cms_contents (serviceKey='cosmetics')
 *
 * NOTE: Old path /api/v1/cosmetics/admin/dashboard/summary is preserved (no breaking change).
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireCosmeticsScope } from '../../../middleware/cosmetics-scope.middleware.js';
import { CosmeticsStoreSummaryService } from '../services/cosmetics-store-summary.service.js';
import { generateRuleBasedInsights } from '../../../copilot/insight-rules.js';
import logger from '../../../utils/logger.js';
// WO-O4O-STORE-DASHBOARD-ORDER-METRICS-SAFE-FALLBACK-V1
import {
  isMissingOrderTable,
  READY_META,
  NOT_READY_META,
} from '../../../utils/order-metrics-fallback.js';
import type { KpiItem, AiSummaryItem, ActionItem, ActivityItem, QuickActionItem, OperatorDashboardConfig } from '../../../types/operator-dashboard.types.js';

export function createCosmeticsOperatorDashboardController(dataSource: DataSource): Router {
  const router = Router();
  const storeSummaryService = new CosmeticsStoreSummaryService(dataSource);

  // Router-level guard: cosmetics:operator (includes cosmetics:admin via scopeRoleMapping)
  router.use(requireAuth);
  router.use(requireCosmeticsScope('cosmetics:operator') as any);

  /**
   * GET /operator/dashboard
   * K-Cosmetics service operator dashboard — 5-block response
   */
  router.get('/dashboard', async (_req: Request, res: Response): Promise<void> => {
    try {
      // WO-O4O-STORE-DASHBOARD-ORDER-METRICS-SAFE-FALLBACK-V1:
      // adminSummary 의 ecommerce_orders 의존 분기. 테이블 부재 (42P01) 면
      // featureStatus='not_ready' 로 응답을 격하 — silent 0 거짓 신호 차단.
      let orderMetricsReady = true;

      // === Parallel data fetch ===
      const [
        adminSummary,
        productCounts,
        cmsCounts,
      // WO-O4O-DASHBOARD-QUERY-STABILITY-V1: individual .catch() per query
      ] = await Promise.all([
        // 1. Store & order summary (reuses existing service)
        storeSummaryService.getAdminSummary().catch((e) => {
          if (isMissingOrderTable(e)) {
            orderMetricsReady = false;
            logger.warn('[CosmeticsDashboard] adminSummary: order table not ready', { code: e?.code });
          } else {
            logger.warn('[CosmeticsDashboard] adminSummary failed:', e.message);
          }
          return { totalStores: 0, activeOrders: 0, monthlyRevenue: 0, recentOrders: [] };
        }),

        // 2. Product catalog stats
        dataSource.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
            COUNT(*) FILTER (WHERE status = 'DRAFT')::int AS draft,
            COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending
          FROM cosmetics.cosmetics_products
        `).catch((e) => { logger.warn('[CosmeticsDashboard] productCounts failed:', e.message); return [{ total: 0, active: 0, draft: 0, pending: 0 }]; }) as Promise<Array<{ total: number; active: number; draft: number; pending: number }>>,

        // 3. CMS content counts
        dataSource.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'published')::int AS published
          FROM cms_contents
          WHERE "serviceKey" = 'cosmetics'
        `).catch((e) => { logger.warn('[CosmeticsDashboard] cmsCounts failed:', e.message); return [{ total: 0, published: 0 }]; }) as Promise<Array<{ total: number; published: number }>>,
      ]);

      const products = productCounts[0] || { total: 0, active: 0, draft: 0, pending: 0 };
      const cms = cmsCounts[0] || { total: 0, published: 0 };

      // === Build 5-block response ===

      // Block 1: KPIs
      const kpis: KpiItem[] = [
        { key: 'total-stores', label: '승인 매장', value: adminSummary.totalStores, status: 'neutral' },
        { key: 'active-orders', label: '진행 주문', value: adminSummary.activeOrders, status: 'neutral' },
        { key: 'monthly-revenue', label: '월간 매출', value: adminSummary.monthlyRevenue, status: 'neutral' },
        { key: 'active-products', label: '판매 상품', value: products.active, status: 'neutral' },
        { key: 'cms-published', label: '게시 콘텐츠', value: cms.published, status: 'neutral' },
      ];

      // Block 2: AI Summary (rule-based, no external AI call)
      const copilotMetrics = {
        products: { active: products.active, pending: products.pending, total: products.total },
        orders: { active: adminSummary.activeOrders },
        stores: { active: adminSummary.totalStores },
      };
      const aiSummary = generateRuleBasedInsights('cosmetics', copilotMetrics);

      // Block 3: Action Queue
      const actionQueue: ActionItem[] = [
        { id: 'active-orders', label: '진행 주문 처리', count: adminSummary.activeOrders, link: '/operator/orders' },
        { id: 'pending-products', label: '상품 승인 대기', count: products.pending, link: '/operator/products?status=PENDING' },
        { id: 'draft-products', label: '임시저장 상품', count: products.draft, link: '/operator/products?status=DRAFT' },
      ];

      // Block 4: Activity Log (from recent orders)
      const activityLog: ActivityItem[] = adminSummary.recentOrders.map((o, i) => ({
        id: `order-${i}`,
        message: `주문 ${o.orderNumber} — ${o.status} (₩${o.totalAmount.toLocaleString()})`,
        timestamp: o.createdAt,
      }));

      // Block 5: Quick Actions
      const quickActions: QuickActionItem[] = [
        { id: 'manage-stores', label: '매장 관리', link: '/operator/stores', icon: 'store' },
        { id: 'manage-products', label: '상품 관리', link: '/operator/products', icon: 'package' },
        { id: 'manage-orders', label: '주문 관리', link: '/operator/orders', icon: 'shopping-cart' },
        { id: 'manage-content', label: '콘텐츠 관리', link: '/operator/content', icon: 'file-text' },
      ];

      const response: OperatorDashboardConfig = {
        kpis,
        aiSummary,
        actionQueue,
        activityLog,
        quickActions,
      };

      // WO-O4O-STORE-DASHBOARD-ORDER-METRICS-SAFE-FALLBACK-V1: meta 부착
      res.json({
        success: true,
        data: response,
        meta: orderMetricsReady ? READY_META : NOT_READY_META,
      });
    } catch (error: any) {
      // WO-O4O-STORE-DASHBOARD-ORDER-METRICS-SAFE-FALLBACK-V1: 다른 raw query (cosmetics_products,
      // cms_contents 등) 이 잘못된 isMissingOrderTable 검사로 위장되지 않도록, 본 catch 의
      // top-level 에서는 order-table 분기를 적용하지 않는다. adminSummary 분기는 위 .catch() 에서 처리.
      console.error('[K-Cosmetics Operator Dashboard] Error:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
