/**
 * Neture Operator Dashboard Controller
 *
 * WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1 (Phase 2)
 * WO-NETURE-OPERATOR-DASHBOARD-IMPLEMENTATION-V1:
 *   KPI 6→8, ActionQueue 3→5, ActivityLog 1→5 sources,
 *   QuickActions 4→7, Orders API endpoint
 *
 * GET /api/v1/neture/operator/dashboard
 *   → Returns 5-block OperatorDashboardConfig for Neture service operators
 * GET /api/v1/neture/operator/orders
 *   → Paginated order list with filters
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 * Data sources:
 *   - organizations + organization_service_enrollments (service_code='neture')
 *   - neture_suppliers (status counts)
 *   - supplier_product_offers (active/pending)
 *   - neture.neture_orders (recent orders, revenue)
 *   - service_memberships (pending registrations)
 *   - cms_contents (serviceKey='neture')
 *   - neture.neture_partners (active partners)
 *   - neture_settlements (pending settlements)
 *   - neture_contact_messages (unread messages)
 *   - neture_partnership_requests (open requests)
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { CopilotEngineService } from '../../../copilot/copilot-engine.service.js';
import logger from '../../../utils/logger.js';
import type { KpiItem, ActionItem, ActivityItem, QuickActionItem, OperatorDashboardConfig } from '../../../types/operator-dashboard.types.js';

export function createOperatorDashboardController(dataSource: DataSource): Router {
  const router = Router();
  const copilotEngine = new CopilotEngineService();

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
        recentActivity,
        partnerCount,
        settlementCount,
        contactCount,
        partnerRequestCount,
      ] = await Promise.all([
        // 1. Organizations enrolled in neture
        dataSource.query(`
          SELECT o."isActive" AS is_active, COUNT(*)::int AS cnt
          FROM organizations o
          JOIN organization_service_enrollments ose
            ON ose.organization_id = o.id AND ose.service_code = 'neture'
          GROUP BY o."isActive"
        `).catch(() => []) as Promise<Array<{ is_active: boolean; cnt: number }>>,

        // 2. Supplier status counts
        dataSource.query(`
          SELECT status, COUNT(*)::int AS cnt
          FROM neture_suppliers
          GROUP BY status
        `).catch(() => []) as Promise<Array<{ status: string; cnt: number }>>,

        // 3. Product offer counts
        dataSource.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_active = true AND approval_status = 'APPROVED')::int AS active,
            COUNT(*) FILTER (WHERE approval_status = 'PENDING')::int AS pending
          FROM supplier_product_offers
        `).catch(() => [{ total: 0, active: 0, pending: 0 }]) as Promise<Array<{ total: number; active: number; pending: number }>>,

        // 4. Order statistics (last 30 days) — .catch: neture_orders migration 미존재 방어
        dataSource.query(`
          SELECT
            COUNT(*)::int AS total_orders,
            COUNT(*) FILTER (WHERE status IN ('paid','preparing','shipped','delivered'))::int AS paid_orders,
            COALESCE(SUM(final_amount) FILTER (WHERE status IN ('paid','preparing','shipped','delivered')), 0)::int AS total_revenue
          FROM neture.neture_orders
          WHERE created_at >= NOW() - INTERVAL '30 days'
        `).catch(() => [{ total_orders: 0, paid_orders: 0, total_revenue: 0 }]) as Promise<Array<{ total_orders: number; paid_orders: number; total_revenue: number }>>,

        // 5. Pending registrations (service_memberships)
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt
          FROM service_memberships
          WHERE service_key = 'neture' AND status = 'pending'
        `).catch(() => [{ cnt: 0 }]) as Promise<Array<{ cnt: number }>>,

        // 6. CMS content counts
        dataSource.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'published')::int AS published
          FROM cms_contents
          WHERE "serviceKey" = 'neture'
        `).catch(() => [{ total: 0, published: 0 }]) as Promise<Array<{ total: number; published: number }>>,

        // 7. Recent activity (multi-source: suppliers, products, contacts)
        // WO-O4O-NETURE-OPERATOR-DASHBOARD-500-FIX-V1:
        //   - supplier_product_offers has no 'name' column → JOIN product_masters
        //   - neture_contact_messages uses "createdAt" (camelCase), not created_at
        dataSource.query(`
          (SELECT 'supplier' AS source, name AS ref, status AS detail, created_at
           FROM neture_suppliers ORDER BY created_at DESC LIMIT 2)
          UNION ALL
          (SELECT 'product' AS source, pm.name AS ref, spo.approval_status AS detail, spo.created_at
           FROM supplier_product_offers spo
           JOIN product_masters pm ON pm.id = spo.master_id
           ORDER BY spo.created_at DESC LIMIT 1)
          UNION ALL
          (SELECT 'contact' AS source, subject AS ref, status AS detail, "createdAt" AS created_at
           FROM neture_contact_messages ORDER BY "createdAt" DESC LIMIT 1)
          ORDER BY created_at DESC
          LIMIT 5
        `).catch(() => []) as Promise<Array<{ source: string; ref: string; detail: string; created_at: string }>>,

        // 8. Active partners — .catch: neture_partners migration 미존재 방어
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt
          FROM neture.neture_partners
          WHERE status = 'active'
        `).catch(() => [{ cnt: 0 }]) as Promise<Array<{ cnt: number }>>,

        // 9. Pending settlements
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt
          FROM neture_settlements
          WHERE status = 'pending'
        `).catch(() => [{ cnt: 0 }]) as Promise<Array<{ cnt: number }>>,

        // 10. Unread contact messages
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt
          FROM neture_contact_messages
          WHERE status != 'resolved'
        `).catch(() => [{ cnt: 0 }]) as Promise<Array<{ cnt: number }>>,

        // 11. Open partnership requests
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt
          FROM neture_partnership_requests
          WHERE status = 'OPEN'
        `).catch(() => [{ cnt: 0 }]) as Promise<Array<{ cnt: number }>>,
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
      const activePartners = partnerCount[0]?.cnt || 0;
      const pendingSettlements = settlementCount[0]?.cnt || 0;
      const unreadMessages = contactCount[0]?.cnt || 0;
      const partnerRequests = partnerRequestCount[0]?.cnt || 0;

      // === Build 5-block response ===

      // Block 1: KPIs (8개)
      const kpis: KpiItem[] = [
        { key: 'active-orgs', label: '활성 약국', value: activeOrgs, status: 'neutral' },
        { key: 'active-suppliers', label: '활성 공급사', value: activeSuppliers, status: 'neutral' },
        { key: 'active-products', label: '판매 상품', value: products.active, status: 'neutral' },
        { key: 'monthly-orders', label: '월간 주문', value: orders.total_orders, status: 'neutral' },
        { key: 'monthly-revenue', label: '월간 매출', value: orders.total_revenue, status: 'neutral' },
        { key: 'cms-published', label: '게시 콘텐츠', value: cms.published, status: 'neutral' },
        { key: 'active-partners', label: '활성 파트너', value: activePartners, status: 'neutral' },
        { key: 'pending-settlements', label: '정산 대기', value: pendingSettlements, status: pendingSettlements > 0 ? 'warning' : 'neutral' },
      ];

      // Block 2: AI Summary (Copilot Engine)
      const copilotMetrics = {
        stores: { active: activeOrgs, inactive: inactiveOrgs },
        suppliers: { active: activeSuppliers, pending: pendingSuppliers, total: totalSuppliers },
        products: { active: products.active, pending: products.pending, total: products.total },
        orders: { monthly: orders.total_orders, revenue: orders.total_revenue },
        registrations: { pending: pendingRegs },
        cms: { published: cms.published, total: cms.total },
        partners: { active: activePartners },
        settlements: { pending: pendingSettlements },
        contacts: { unread: unreadMessages },
      };
      const copilotUser = {
        id: (_req as any).user?.id || '',
        role: 'neture:operator',
      };
      const { insights: aiSummary } = await copilotEngine.generateInsights(
        'neture', copilotMetrics, copilotUser,
      );

      // Block 3: Action Queue (5개)
      const actionQueue: ActionItem[] = [
        { id: 'pending-regs', label: '가입 승인 대기', count: pendingRegs, link: '/workspace/operator/registrations' },
        { id: 'pending-suppliers', label: '공급사 승인 대기', count: pendingSuppliers, link: '/workspace/operator/suppliers?status=PENDING' },
        { id: 'pending-products', label: '상품 승인 대기', count: products.pending, link: '/workspace/operator/products?status=PENDING' },
        { id: 'partner-requests', label: '파트너 요청', count: partnerRequests, link: '/workspace/operator/registrations' },
        { id: 'unread-messages', label: '미확인 문의', count: unreadMessages, link: '/workspace/admin/contact-messages' },
      ];

      // Block 4: Activity Log (multi-source: orders, suppliers, products, partners, contacts)
      const sourceLabel: Record<string, string> = {
        order: '주문', supplier: '공급사', product: '상품', partner: '파트너', contact: '문의',
      };
      const activityLog: ActivityItem[] = recentActivity.map((a, i) => ({
        id: `${a.source}-${i}`,
        message: `[${sourceLabel[a.source] || a.source}] ${a.ref} — ${a.detail}`,
        timestamp: a.created_at,
      }));

      // Block 5: Quick Actions (7개)
      const quickActions: QuickActionItem[] = [
        { id: 'manage-suppliers', label: '공급사 관리', link: '/workspace/operator/suppliers', icon: 'store' },
        { id: 'manage-products', label: '상품 관리', link: '/workspace/operator/products', icon: 'package' },
        { id: 'manage-orders', label: '주문 관리', link: '/workspace/operator/orders', icon: 'shopping-cart' },
        { id: 'manage-content', label: '콘텐츠 관리', link: '/workspace/operator/content', icon: 'file-text' },
        { id: 'manage-signage', label: '사이니지', link: '/workspace/operator/signage/hq-media', icon: 'monitor' },
        { id: 'manage-forum', label: '포럼 관리', link: '/workspace/operator/forum-management', icon: 'message-square' },
        { id: 'manage-registrations', label: '가입 관리', link: '/workspace/operator/registrations', icon: 'user-check' },
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

  /**
   * GET /operator/orders
   * Paginated order list with status/search filters
   * WO-NETURE-OPERATOR-DASHBOARD-IMPLEMENTATION-V1
   */
  router.get('/orders', async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;
      const status = (req.query.status as string) || null;
      const search = (req.query.search as string) || null;

      // neture_orders migration 미존재 — .catch 방어
      const [orders, statsResult] = await Promise.all([
        dataSource.query(`
          SELECT id, order_number, status, payment_status, final_amount,
                 buyer_name, buyer_email, created_at
          FROM neture.neture_orders
          WHERE ($1::text IS NULL OR status = $1)
            AND ($2::text IS NULL OR order_number ILIKE '%' || $2 || '%' OR buyer_name ILIKE '%' || $2 || '%')
          ORDER BY created_at DESC
          LIMIT $3 OFFSET $4
        `, [status, search, limit, offset]).catch(() => []),

        dataSource.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'pending_payment')::int AS pending,
            COUNT(*) FILTER (WHERE status IN ('paid','preparing'))::int AS processing,
            COUNT(*) FILTER (WHERE status = 'shipped')::int AS shipped,
            COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered
          FROM neture.neture_orders
          WHERE ($1::text IS NULL OR status = $1)
            AND ($2::text IS NULL OR order_number ILIKE '%' || $2 || '%' OR buyer_name ILIKE '%' || $2 || '%')
        `, [status, search]).catch(() => [{ total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0 }]),
      ]);

      const s = statsResult[0] || { total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0 };

      res.json({
        success: true,
        data: {
          orders,
          stats: s,
          pagination: { page, limit, total: s.total, totalPages: Math.ceil(s.total / limit) },
        },
      });
    } catch (error: any) {
      logger.error('[Neture Operator Orders] Error:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}