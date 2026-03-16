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
import { CopilotEngineService } from '../../../copilot/copilot-engine.service.js';
import type { KpiItem, AiSummaryItem, ActionItem, ActivityItem, QuickActionItem, OperatorDashboardConfig } from '../../../types/operator-dashboard.types.js';

export function createCosmeticsOperatorDashboardController(dataSource: DataSource): Router {
  const router = Router();
  const storeSummaryService = new CosmeticsStoreSummaryService(dataSource);
  const copilotEngine = new CopilotEngineService();

  // Router-level guard: cosmetics:operator (includes cosmetics:admin via scopeRoleMapping)
  router.use(requireAuth);
  router.use(requireCosmeticsScope('cosmetics:operator') as any);

  /**
   * GET /operator/dashboard
   * K-Cosmetics service operator dashboard — 5-block response
   */
  router.get('/dashboard', async (_req: Request, res: Response): Promise<void> => {
    try {
      // === Parallel data fetch ===
      const [
        adminSummary,
        productCounts,
        cmsCounts,
      ] = await Promise.all([
        // 1. Store & order summary (reuses existing service)
        storeSummaryService.getAdminSummary(),

        // 2. Product catalog stats
        dataSource.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
            COUNT(*) FILTER (WHERE status = 'DRAFT')::int AS draft,
            COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending
          FROM cosmetics.cosmetics_products
        `) as Promise<Array<{ total: number; active: number; draft: number; pending: number }>>,

        // 3. CMS content counts
        dataSource.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'published')::int AS published
          FROM cms_contents
          WHERE "serviceKey" = 'cosmetics'
        `) as Promise<Array<{ total: number; published: number }>>,
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

      // Block 2: AI Summary (Copilot Engine)
      const copilotMetrics = {
        products: { active: products.active, pending: products.pending, total: products.total },
        orders: { active: adminSummary.activeOrders },
        stores: { active: adminSummary.totalStores },
      };
      const copilotUser = {
        id: (_req as any).user?.id || '',
        role: 'cosmetics:operator',
      };
      const { insights: aiSummary } = await copilotEngine.generateInsights(
        'cosmetics', copilotMetrics, copilotUser,
      );

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

      res.json({ success: true, data: response });
    } catch (error: any) {
      console.error('[K-Cosmetics Operator Dashboard] Error:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
