/**
 * OperatorCopilotService
 *
 * WO-O4O-OPERATOR-COPILOT-DASHBOARD-V1
 * WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: Added service scope filtering
 *
 * Platform-level copilot data: KPI, stores, suppliers, products, trends, alerts.
 */

import type { DataSource } from 'typeorm';
import type { ServiceScope } from '../../utils/serviceScope.js';
import { hasServiceAccess } from '../../utils/serviceScope.js';

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

  private async safeCountParam(label: string, sql: string, params: any[]): Promise<number> {
    try {
      const rows = await this.dataSource.query(sql, params);
      const val = rows[0] ? Object.values(rows[0])[0] : 0;
      return (val as number) ?? 0;
    } catch (err) {
      console.error(`[OperatorCopilot] KPI "${label}" failed:`, (err as Error).message);
      return 0;
    }
  }

  async getKpiSummary(scope?: ServiceScope): Promise<OperatorKpiSummary> {
    const isScoped = scope && !scope.isPlatformAdmin;
    const isNeture = !scope || scope.isPlatformAdmin || hasServiceAccess(scope, 'neture');

    const [totalStores, totalSuppliers, totalProducts, recentOrders] = await Promise.all([
      // Stores: filter by enrollment service_code
      isScoped
        ? this.safeCountParam('totalStores',
            `SELECT COUNT(DISTINCT o.id)::int AS val
             FROM organizations o
             JOIN organization_service_enrollments ose ON ose.organization_id = o.id
             WHERE o."isActive" = true AND ose.service_code = ANY($1)`,
            [scope!.serviceKeys])
        : this.safeCount('totalStores',
            `SELECT COUNT(DISTINCT o.id)::int AS val
             FROM organizations o
             JOIN organization_service_enrollments ose ON ose.organization_id = o.id
             WHERE o."isActive" = true`),
      // Suppliers: Neture-specific
      isNeture
        ? this.safeCount('totalSuppliers',
            `SELECT COUNT(*)::int AS val FROM neture_suppliers WHERE status = 'ACTIVE'`)
        : Promise.resolve(0),
      // Products: Neture-specific (supplier_product_offers)
      isNeture
        ? this.safeCount('totalProducts',
            `SELECT COUNT(*)::int AS val FROM supplier_product_offers WHERE is_active = true`)
        : Promise.resolve(0),
      // Orders: Neture-specific
      isNeture
        ? this.safeCount('recentOrders',
            `SELECT COUNT(DISTINCT id)::int AS val
             FROM neture.neture_orders
             WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`)
        : Promise.resolve(0),
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

  async getRecentStores(limit = 5, scope?: ServiceScope): Promise<RecentStoreItem[]> {
    return this.safeQuery('getRecentStores', async () => {
      const isScoped = scope && !scope.isPlatformAdmin;
      const rows = isScoped
        ? await this.dataSource.query(
            `SELECT DISTINCT o.id, o.name, o.created_at AS "createdAt"
             FROM organizations o
             JOIN organization_service_enrollments ose ON ose.organization_id = o.id
             WHERE o."isActive" = true AND ose.service_code = ANY($1)
             ORDER BY o.created_at DESC
             LIMIT $2`,
            [scope!.serviceKeys, limit]
          )
        : await this.dataSource.query(
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

  async getSupplierActivity(limit = 5, scope?: ServiceScope): Promise<SupplierActivityItem[]> {
    // Neture-specific: only show if user has neture access or is platform admin
    if (scope && !scope.isPlatformAdmin && !hasServiceAccess(scope, 'neture')) {
      return [];
    }
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

  async getPendingProducts(limit = 10, scope?: ServiceScope): Promise<PendingProductItem[]> {
    // Neture-specific: only show if user has neture access or is platform admin
    if (scope && !scope.isPlatformAdmin && !hasServiceAccess(scope, 'neture')) {
      return [];
    }
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

  async getPlatformTrends(scope?: ServiceScope): Promise<PlatformTrends> {
    const DEFAULT_TRENDS: PlatformTrends = {
      currentOrders: 0, previousOrders: 0, orderGrowth: 0, newStores: 0, newSuppliers: 0,
    };
    const isScoped = scope && !scope.isPlatformAdmin;
    const isNeture = !scope || scope.isPlatformAdmin || hasServiceAccess(scope, 'neture');

    return this.safeQuery('getPlatformTrends', async () => {
      const [orderRows, storeRows, supplierRows] = await Promise.all([
        // Orders: Neture-specific
        isNeture
          ? this.dataSource.query(
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
            ).catch(() => [{}])
          : Promise.resolve([{}]),
        // Stores: scoped by enrollment
        isScoped
          ? this.dataSource.query(
              `SELECT COUNT(DISTINCT o.id)::int AS "newStores"
               FROM organizations o
               JOIN organization_service_enrollments ose ON ose.organization_id = o.id
               WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'
                 AND ose.service_code = ANY($1)`,
              [scope!.serviceKeys]
            ).catch(() => [{}])
          : this.dataSource.query(
              `SELECT COUNT(DISTINCT o.id)::int AS "newStores"
               FROM organizations o
               JOIN organization_service_enrollments ose ON ose.organization_id = o.id
               WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'`
            ).catch(() => [{}]),
        // Suppliers: Neture-specific
        isNeture
          ? this.dataSource.query(
              `SELECT COUNT(*)::int AS "newSuppliers"
               FROM neture_suppliers
               WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`
            ).catch(() => [{}])
          : Promise.resolve([{}]),
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

  async getAlerts(scope?: ServiceScope): Promise<AlertItem[]> {
    const isNeture = !scope || scope.isPlatformAdmin || hasServiceAccess(scope, 'neture');

    return this.safeQuery('getAlerts', async () => {
      const alerts: AlertItem[] = [];

      // Each alert query is independent — use Promise.allSettled
      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: scope-aware alert queries
      const isScoped = scope && !scope.isPlatformAdmin;

      const [pendingResult, inactiveResult, orderResult] = await Promise.allSettled([
        // Pending registrations — scoped by service_memberships
        isScoped
          ? this.dataSource.query(
              `SELECT COUNT(*)::int AS cnt
               FROM service_memberships
               WHERE status = 'pending' AND service_key = ANY($1)
                 AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
              [scope!.serviceKeys]
            )
          : this.dataSource.query(
              `SELECT COUNT(*)::int AS cnt
               FROM service_memberships
               WHERE status = 'pending'
                 AND created_at >= CURRENT_DATE - INTERVAL '30 days'`
            ),
        // Inactive products — Neture-specific
        isNeture
          ? this.dataSource.query(
              `SELECT COUNT(*)::int AS cnt
               FROM supplier_product_offers
               WHERE is_active = false AND created_at >= CURRENT_DATE - INTERVAL '14 days'`
            )
          : Promise.resolve([{ cnt: 0 }]),
        // Recent orders — Neture-specific
        isNeture
          ? this.dataSource.query(
              `SELECT COUNT(DISTINCT id)::int AS cnt
               FROM neture.neture_orders
               WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`
            )
          : Promise.resolve([{ cnt: 0 }]),
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
        if (isNeture && (orderResult.value[0]?.cnt ?? 0) === 0) {
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
