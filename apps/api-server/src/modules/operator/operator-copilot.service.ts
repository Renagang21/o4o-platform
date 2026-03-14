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

  private async safeQuery<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      console.error(`[OperatorCopilot] ${label} fallback triggered:`, (err as Error).message);
      return fallback;
    }
  }

  async getRecentStores(limit = 5): Promise<RecentStoreItem[]> {
    return this.safeQuery('getRecentStores', async () => {
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
    }, []);
  }

  async getSupplierActivity(limit = 5): Promise<SupplierActivityItem[]> {
    return this.safeQuery('getSupplierActivity', async () => {
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
    }, []);
  }

  async getPendingProducts(limit = 10): Promise<PendingProductItem[]> {
    return this.safeQuery('getPendingProducts', async () => {
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
    }, []);
  }

  async getPlatformTrends(): Promise<PlatformTrends> {
    const DEFAULT_TRENDS: PlatformTrends = {
      currentOrders: 0, previousOrders: 0, orderGrowth: 0, newStores: 0, newSuppliers: 0,
    };

    return this.safeQuery('getPlatformTrends', async () => {
      const [orderRows, storeRows, supplierRows] = await Promise.all([
        this.dataSource.query(
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
        ).catch(() => [{}]),
        this.dataSource.query(
          `SELECT COUNT(DISTINCT o.id)::int AS "newStores"
           FROM organizations o
           JOIN organization_service_enrollments ose ON ose.organization_id = o.id
           WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'`
        ).catch(() => [{}]),
        this.dataSource.query(
          `SELECT COUNT(*)::int AS "newSuppliers"
           FROM neture_suppliers
           WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`
        ).catch(() => [{}]),
      ]);

      return {
        currentOrders: orderRows[0]?.currentOrders ?? 0,
        previousOrders: orderRows[0]?.previousOrders ?? 0,
        orderGrowth: orderRows[0]?.orderGrowth ?? 0,
        newStores: storeRows[0]?.newStores ?? 0,
        newSuppliers: supplierRows[0]?.newSuppliers ?? 0,
      };
    }, DEFAULT_TRENDS);
  }

  async getAlerts(): Promise<AlertItem[]> {
    return this.safeQuery('getAlerts', async () => {
      const alerts: AlertItem[] = [];

      // Each alert query is independent — use Promise.allSettled
      const [pendingResult, inactiveResult, orderResult] = await Promise.allSettled([
        this.dataSource.query(
          `SELECT COUNT(*)::int AS cnt
           FROM users
           WHERE is_active = false AND created_at >= CURRENT_DATE - INTERVAL '30 days'`
        ),
        this.dataSource.query(
          `SELECT COUNT(*)::int AS cnt
           FROM supplier_product_offers
           WHERE is_active = false AND created_at >= CURRENT_DATE - INTERVAL '14 days'`
        ),
        this.dataSource.query(
          `SELECT COUNT(DISTINCT id)::int AS cnt
           FROM neture.neture_orders
           WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`
        ),
      ]);

      if (pendingResult.status === 'fulfilled') {
        const cnt = pendingResult.value[0]?.cnt ?? 0;
        if (cnt > 0) {
          alerts.push({
            id: 'alert-pending-registrations',
            message: `가입 승인 대기 ${cnt}건이 있습니다.`,
            severity: cnt > 10 ? 'high' : 'medium',
            link: '/workspace/operator/registrations',
          });
        }
      }

      if (inactiveResult.status === 'fulfilled') {
        const cnt = inactiveResult.value[0]?.cnt ?? 0;
        if (cnt > 0) {
          alerts.push({
            id: 'alert-inactive-products',
            message: `비활성 상품 ${cnt}개가 승인 대기 중입니다.`,
            severity: cnt > 5 ? 'medium' : 'low',
            link: '/workspace/operator/supply',
          });
        }
      }

      if (orderResult.status === 'fulfilled') {
        if ((orderResult.value[0]?.cnt ?? 0) === 0) {
          alerts.push({
            id: 'alert-no-orders',
            message: '최근 7일간 주문이 없습니다. 플랫폼 활동을 확인하세요.',
            severity: 'high',
          });
        }
      }

      return alerts;
    }, []);
  }
}
