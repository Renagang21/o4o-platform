/**
 * OperatorCopilotService
 *
 * WO-O4O-OPERATOR-COPILOT-DASHBOARD-V1
 *
 * Platform-level copilot data: KPI, stores, suppliers, products, trends, alerts.
 */

import type { DataSource } from 'typeorm';

export interface OperatorKpiSummary {
  totalStores: number;
  totalSuppliers: number;
  totalProducts: number;
  recentOrders: number;
}

export interface RecentStoreItem {
  id: string;
  name: string;
  createdAt: string;
}

export interface SupplierActivityItem {
  supplierName: string;
  productName: string;
  createdAt: string;
}

export interface PendingProductItem {
  productId: string;
  productName: string;
  supplierName: string;
  createdAt: string;
}

export interface PlatformTrends {
  currentOrders: number;
  previousOrders: number;
  orderGrowth: number;
  newStores: number;
  newSuppliers: number;
}

export interface AlertItem {
  id: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  link?: string;
}

export class OperatorCopilotService {
  constructor(private dataSource: DataSource) {}

  private async safeCount(label: string, sql: string): Promise<number> {
    try {
      const rows = await this.dataSource.query(sql);
      const val = rows[0] ? Object.values(rows[0])[0] : 0;
      return (val as number) ?? 0;
    } catch (err) {
      console.error(`[OperatorCopilot] KPI "${label}" failed:`, (err as Error).message);
      return 0;
    }
  }

  async getKpiSummary(): Promise<OperatorKpiSummary> {
    const [totalStores, totalSuppliers, totalProducts, recentOrders] = await Promise.all([
      this.safeCount('totalStores',
        `SELECT COUNT(DISTINCT o.id)::int AS val
         FROM organizations o
         JOIN organization_service_enrollments ose ON ose.organization_id = o.id
         WHERE o."isActive" = true`),
      this.safeCount('totalSuppliers',
        `SELECT COUNT(*)::int AS val FROM neture_suppliers WHERE status = 'ACTIVE'`),
      this.safeCount('totalProducts',
        `SELECT COUNT(*)::int AS val FROM supplier_product_offers WHERE is_active = true`),
      this.safeCount('recentOrders',
        `SELECT COUNT(DISTINCT id)::int AS val
         FROM neture.neture_orders
         WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`),
    ]);

    return { totalStores, totalSuppliers, totalProducts, recentOrders };
  }

  async getRecentStores(limit = 5): Promise<RecentStoreItem[]> {
    const rows = await this.dataSource.query(
      `SELECT o.id, o.name, o.created_at AS "createdAt"
       FROM organizations o
       JOIN organization_service_enrollments ose ON ose.organization_id = o.id
       WHERE o."isActive" = true
       ORDER BY o.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name || '(이름 없음)',
      createdAt: r.createdAt,
    }));
  }

  async getSupplierActivity(limit = 5): Promise<SupplierActivityItem[]> {
    const rows = await this.dataSource.query(
      `SELECT
         ns.name AS "supplierName",
         pm.marketing_name AS "productName",
         spo.created_at AS "createdAt"
       FROM supplier_product_offers spo
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       JOIN product_masters pm ON pm.id = spo.master_id
       ORDER BY spo.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows.map((r: any) => ({
      supplierName: r.supplierName || '(공급자)',
      productName: r.productName || '(상품)',
      createdAt: r.createdAt,
    }));
  }

  async getPendingProducts(limit = 10): Promise<PendingProductItem[]> {
    const rows = await this.dataSource.query(
      `SELECT
         pm.id AS "productId",
         pm.marketing_name AS "productName",
         ns.name AS "supplierName",
         spo.created_at AS "createdAt"
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       WHERE spo.is_active = false
       ORDER BY spo.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows.map((r: any) => ({
      productId: r.productId,
      productName: r.productName || '(상품)',
      supplierName: r.supplierName || '(공급자)',
      createdAt: r.createdAt,
    }));
  }

  async getPlatformTrends(): Promise<PlatformTrends> {
    // Week-over-week orders
    const orderRows = await this.dataSource.query(
      `WITH current_week AS (
         SELECT COUNT(*)::int AS orders
         FROM neture.neture_orders
         WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
           AND status IN ('paid','preparing','shipped','delivered')
       ),
       prev_week AS (
         SELECT COUNT(*)::int AS orders
         FROM neture.neture_orders
         WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
           AND created_at < CURRENT_DATE - INTERVAL '7 days'
           AND status IN ('paid','preparing','shipped','delivered')
       )
       SELECT
         cw.orders AS "currentOrders",
         pw.orders AS "previousOrders",
         CASE WHEN pw.orders > 0
           THEN ROUND((cw.orders - pw.orders)::numeric / pw.orders * 100)::int
           ELSE CASE WHEN cw.orders > 0 THEN 100 ELSE 0 END
         END AS "orderGrowth"
       FROM current_week cw, prev_week pw`
    );

    // New stores this week
    const storeRows = await this.dataSource.query(
      `SELECT COUNT(DISTINCT o.id)::int AS "newStores"
       FROM organizations o
       JOIN organization_service_enrollments ose ON ose.organization_id = o.id
       WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'`
    );

    // New suppliers this week
    const supplierRows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS "newSuppliers"
       FROM neture_suppliers
       WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`
    );

    return {
      currentOrders: orderRows[0]?.currentOrders ?? 0,
      previousOrders: orderRows[0]?.previousOrders ?? 0,
      orderGrowth: orderRows[0]?.orderGrowth ?? 0,
      newStores: storeRows[0]?.newStores ?? 0,
      newSuppliers: supplierRows[0]?.newSuppliers ?? 0,
    };
  }

  async getAlerts(): Promise<AlertItem[]> {
    const alerts: AlertItem[] = [];

    // Pending registration requests
    const pendingRows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt
       FROM users
       WHERE is_active = false AND created_at >= CURRENT_DATE - INTERVAL '30 days'`
    );
    const pendingCount = pendingRows[0]?.cnt ?? 0;
    if (pendingCount > 0) {
      alerts.push({
        id: 'alert-pending-registrations',
        message: `가입 승인 대기 ${pendingCount}건이 있습니다.`,
        severity: pendingCount > 10 ? 'high' : 'medium',
        link: '/workspace/operator/registrations',
      });
    }

    // Inactive products (registered but not active)
    const inactiveRows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt
       FROM supplier_product_offers
       WHERE is_active = false AND created_at >= CURRENT_DATE - INTERVAL '14 days'`
    );
    const inactiveCount = inactiveRows[0]?.cnt ?? 0;
    if (inactiveCount > 0) {
      alerts.push({
        id: 'alert-inactive-products',
        message: `비활성 상품 ${inactiveCount}개가 승인 대기 중입니다.`,
        severity: inactiveCount > 5 ? 'medium' : 'low',
        link: '/workspace/operator/supply',
      });
    }

    // No orders in 7 days
    const recentOrderRows = await this.dataSource.query(
      `SELECT COUNT(DISTINCT id)::int AS cnt
       FROM neture.neture_orders
       WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`
    );
    if ((recentOrderRows[0]?.cnt ?? 0) === 0) {
      alerts.push({
        id: 'alert-no-orders',
        message: '최근 7일간 주문이 없습니다. 플랫폼 활동을 확인하세요.',
        severity: 'high',
      });
    }

    return alerts;
  }
}
