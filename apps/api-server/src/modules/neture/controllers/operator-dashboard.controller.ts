/**
 * Neture Operator Dashboard Controller
 *
 * WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1 (Phase 2)
 *
 * GET /api/v1/neture/operator/dashboard
 *   → Returns 5-block OperatorDashboardConfig for Neture service operators
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 * Data sources:
 *   - organizations + organization_service_enrollments (service_code='neture')
 *   - neture_suppliers (status counts)
 *   - supplier_product_offers (active/pending)
 *   - neture.neture_orders (recent orders, revenue)
 *   - service_memberships (pending registrations)
 *   - cms_contents (serviceKey='neture')
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import logger from '../../../utils/logger.js';

// 5-Block types matching @o4o/operator-ux-core OperatorDashboardConfig
interface KpiItem { key: string; label: string; value: number | string; delta?: number; status?: 'neutral' | 'warning' | 'critical'; link?: string; }
interface AiSummaryItem { id: string; message: string; level: 'info' | 'warning' | 'critical'; link?: string; }
interface ActionItem { id: string; label: string; count: number; link: string; }
interface ActivityItem { id: string; message: string; timestamp: string; }
interface QuickActionItem { id: string; label: string; link: string; icon?: string; }
interface OperatorDashboardConfig {
  kpis: KpiItem[];
  aiSummary?: AiSummaryItem[];
  actionQueue: ActionItem[];
  activityLog: ActivityItem[];
  quickActions: QuickActionItem[];
}

export function createOperatorDashboardController(dataSource: DataSource): Router {
  const router = Router();

  // Router-level guard: neture:operator (includes neture:admin via scopeRoleMapping)
  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  /**
   * GET /operator/dashboard
   * Neture service operator dashboard — 5-block response
   */
  router.get('/dashboard', async (_req: Request, res: Response): Promise<void> => {
    try {
      // === Parallel data fetch ===
      const [
        orgCounts,
        supplierCounts,
        productCounts,
        orderStats,
        pendingRegistrations,
        cmsCounts,
        recentOrders,
      ] = await Promise.all([
        // 1. Organizations enrolled in neture
        dataSource.query(`
          SELECT o."isActive" AS is_active, COUNT(*)::int AS cnt
          FROM organizations o
          JOIN organization_service_enrollments ose
            ON ose.organization_id = o.id AND ose.service_code = 'neture'
          GROUP BY o."isActive"
        `) as Promise<Array<{ is_active: boolean; cnt: number }>>,

        // 2. Supplier status counts
        dataSource.query(`
          SELECT status, COUNT(*)::int AS cnt
          FROM neture_suppliers
          GROUP BY status
        `) as Promise<Array<{ status: string; cnt: number }>>,

        // 3. Product offer counts
        dataSource.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_active = true AND approval_status = 'APPROVED')::int AS active,
            COUNT(*) FILTER (WHERE approval_status = 'PENDING')::int AS pending
          FROM supplier_product_offers
        `) as Promise<Array<{ total: number; active: number; pending: number }>>,

        // 4. Order statistics (last 30 days)
        dataSource.query(`
          SELECT
            COUNT(*)::int AS total_orders,
            COUNT(*) FILTER (WHERE status IN ('paid','preparing','shipped','delivered'))::int AS paid_orders,
            COALESCE(SUM(final_amount) FILTER (WHERE status IN ('paid','preparing','shipped','delivered')), 0)::int AS total_revenue
          FROM neture.neture_orders
          WHERE created_at >= NOW() - INTERVAL '30 days'
        `) as Promise<Array<{ total_orders: number; paid_orders: number; total_revenue: number }>>,

        // 5. Pending registrations (service_memberships)
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt
          FROM service_memberships
          WHERE service_code = 'neture' AND status = 'pending'
        `) as Promise<Array<{ cnt: number }>>,

        // 6. CMS content counts
        dataSource.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'published')::int AS published
          FROM cms_contents
          WHERE "serviceKey" = 'neture'
        `) as Promise<Array<{ total: number; published: number }>>,

        // 7. Recent order activity (last 5)
        dataSource.query(`
          SELECT order_number, status, final_amount, created_at
          FROM neture.neture_orders
          ORDER BY created_at DESC
          LIMIT 5
        `) as Promise<Array<{ order_number: string; status: string; final_amount: number; created_at: string }>>,
      ]);

      // === Parse results ===
      const activeOrgs = orgCounts.find(r => r.is_active === true)?.cnt || 0;
      const inactiveOrgs = orgCounts.find(r => r.is_active === false)?.cnt || 0;

      const activeSuppliers = supplierCounts.find(r => r.status === 'ACTIVE')?.cnt || 0;
      const pendingSuppliers = supplierCounts.find(r => r.status === 'PENDING')?.cnt || 0;
      const totalSuppliers = supplierCounts.reduce((sum, r) => sum + r.cnt, 0);

      const products = productCounts[0] || { total: 0, active: 0, pending: 0 };
      const orders = orderStats[0] || { total_orders: 0, paid_orders: 0, total_revenue: 0 };
      const pendingRegs = pendingRegistrations[0]?.cnt || 0;
      const cms = cmsCounts[0] || { total: 0, published: 0 };

      // === Build 5-block response ===

      // Block 1: KPIs
      const kpis: KpiItem[] = [
        { key: 'active-orgs', label: '활성 약국', value: activeOrgs, status: 'neutral' },
        { key: 'active-suppliers', label: '활성 공급사', value: activeSuppliers, status: 'neutral' },
        { key: 'active-products', label: '판매 상품', value: products.active, status: 'neutral' },
        { key: 'monthly-orders', label: '월간 주문', value: orders.total_orders, status: 'neutral' },
        { key: 'monthly-revenue', label: '월간 매출', value: orders.total_revenue, status: 'neutral' },
        { key: 'cms-published', label: '게시 콘텐츠', value: cms.published, status: 'neutral' },
      ];

      // Block 2: AI Summary (static insights based on data)
      const aiSummary: AiSummaryItem[] = [];
      if (pendingSuppliers > 0) {
        aiSummary.push({
          id: 'pending-suppliers',
          message: `승인 대기 공급사 ${pendingSuppliers}건이 있습니다.`,
          level: 'warning',
          link: '/workspace/operator/suppliers?status=PENDING',
        });
      }
      if (pendingRegs > 0) {
        aiSummary.push({
          id: 'pending-registrations',
          message: `가입 승인 대기 ${pendingRegs}건이 있습니다.`,
          level: 'warning',
          link: '/workspace/operator/registrations',
        });
      }
      if (products.pending > 0) {
        aiSummary.push({
          id: 'pending-products',
          message: `상품 승인 대기 ${products.pending}건이 있습니다.`,
          level: 'info',
          link: '/workspace/operator/products?status=PENDING',
        });
      }
      if (aiSummary.length === 0) {
        aiSummary.push({
          id: 'all-clear',
          message: '현재 긴급한 처리 항목이 없습니다.',
          level: 'info',
        });
      }

      // Block 3: Action Queue
      const actionQueue: ActionItem[] = [
        { id: 'pending-regs', label: '가입 승인 대기', count: pendingRegs, link: '/workspace/operator/registrations' },
        { id: 'pending-suppliers', label: '공급사 승인 대기', count: pendingSuppliers, link: '/workspace/operator/suppliers?status=PENDING' },
        { id: 'pending-products', label: '상품 승인 대기', count: products.pending, link: '/workspace/operator/products?status=PENDING' },
      ];

      // Block 4: Activity Log (from recent orders)
      const activityLog: ActivityItem[] = recentOrders.map((o, i) => ({
        id: `order-${i}`,
        message: `주문 ${o.order_number} — ${formatOrderStatus(o.status)} (₩${Number(o.final_amount).toLocaleString()})`,
        timestamp: o.created_at,
      }));

      // Block 5: Quick Actions
      const quickActions: QuickActionItem[] = [
        { id: 'manage-suppliers', label: '공급사 관리', link: '/workspace/operator/suppliers', icon: 'store' },
        { id: 'manage-products', label: '상품 관리', link: '/workspace/operator/products', icon: 'package' },
        { id: 'manage-orders', label: '주문 관리', link: '/workspace/operator/orders', icon: 'shopping-cart' },
        { id: 'manage-content', label: '콘텐츠 관리', link: '/workspace/operator/content', icon: 'file-text' },
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
      logger.error('[Neture Operator Dashboard] Error:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}

/** Map order status to Korean label */
function formatOrderStatus(status: string): string {
  const map: Record<string, string> = {
    created: '생성',
    pending_payment: '결제대기',
    paid: '결제완료',
    preparing: '준비중',
    shipped: '배송중',
    delivered: '배송완료',
    cancelled: '취소',
    refunded: '환불',
  };
  return map[status] || status;
}
