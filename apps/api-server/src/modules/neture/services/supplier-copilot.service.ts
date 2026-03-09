/**
 * SupplierCopilotService
 *
 * WO-O4O-SUPPLIER-COPILOT-DASHBOARD-V1
 *
 * Copilot dashboard data: KPI, product performance, distribution, trending.
 */

import type { DataSource } from 'typeorm';

export interface SupplierKpiSummary {
  registeredProducts: number;
  activeProducts: number;
  storeListings: number;
  recentOrders: number;
}

export interface ProductPerformanceItem {
  productId: string;
  productName: string;
  orders: number;
  revenue: number;
  qrScans: number;
}

export interface DistributionItem {
  productId: string;
  productName: string;
  storeCount: number;
  newStores: number;
}

export interface TrendingProductItem {
  productName: string;
  currentOrders: number;
  previousOrders: number;
  growthRate: number;
}

export class SupplierCopilotService {
  constructor(private dataSource: DataSource) {}

  async getKpiSummary(supplierId: string): Promise<SupplierKpiSummary> {
    // Product counts
    const productRows = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS "registeredProducts",
         COUNT(*) FILTER (WHERE spo.is_active = true)::int AS "activeProducts"
       FROM supplier_product_offers spo
       WHERE spo.supplier_id = $1`,
      [supplierId]
    );

    // Store listings
    const listingRows = await this.dataSource.query(
      `SELECT COUNT(DISTINCT opl.id)::int AS "storeListings"
       FROM organization_product_listings opl
       JOIN supplier_product_offers spo ON spo.id = opl.offer_id
       WHERE spo.supplier_id = $1 AND opl.is_active = true`,
      [supplierId]
    );

    // Recent orders (7 days)
    const orderRows = await this.dataSource.query(
      `SELECT COUNT(DISTINCT o.id)::int AS "recentOrders"
       FROM neture_orders o
       JOIN neture_order_items oi ON oi.order_id = o.id
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       WHERE spo.supplier_id = $1
         AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [supplierId]
    );

    return {
      registeredProducts: productRows[0]?.registeredProducts ?? 0,
      activeProducts: productRows[0]?.activeProducts ?? 0,
      storeListings: listingRows[0]?.storeListings ?? 0,
      recentOrders: orderRows[0]?.recentOrders ?? 0,
    };
  }

  async getProductPerformance(supplierId: string, limit = 10): Promise<ProductPerformanceItem[]> {
    const rows = await this.dataSource.query(
      `SELECT
         pm.id AS "productId",
         pm.marketing_name AS "productName",
         COUNT(DISTINCT o.id)::int AS orders,
         COALESCE(SUM(oi.total_price), 0)::int AS revenue,
         0 AS "qrScans"
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.product_master_id
       LEFT JOIN neture_order_items oi ON oi.product_id = spo.id::text
       LEFT JOIN neture_orders o ON o.id = oi.order_id
         AND o.status IN ('paid','preparing','shipped','delivered')
       WHERE spo.supplier_id = $1
       GROUP BY pm.id, pm.marketing_name
       ORDER BY revenue DESC
       LIMIT $2`,
      [supplierId, limit]
    );

    return rows.map((r: any) => ({
      productId: r.productId,
      productName: r.productName || '(이름 없음)',
      orders: r.orders,
      revenue: r.revenue,
      qrScans: r.qrScans,
    }));
  }

  async getDistribution(supplierId: string): Promise<DistributionItem[]> {
    const rows = await this.dataSource.query(
      `SELECT
         pm.id AS "productId",
         pm.marketing_name AS "productName",
         COUNT(DISTINCT opl.organization_id)::int AS "storeCount",
         COUNT(DISTINCT opl.organization_id) FILTER (
           WHERE opl.created_at >= CURRENT_DATE - INTERVAL '7 days'
         )::int AS "newStores"
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.product_master_id
       JOIN organization_product_listings opl ON opl.offer_id = spo.id AND opl.is_active = true
       WHERE spo.supplier_id = $1
       GROUP BY pm.id, pm.marketing_name
       ORDER BY "storeCount" DESC`,
      [supplierId]
    );

    return rows.map((r: any) => ({
      productId: r.productId,
      productName: r.productName || '(이름 없음)',
      storeCount: r.storeCount,
      newStores: r.newStores,
    }));
  }

  async getTrendingProducts(supplierId: string, limit = 5): Promise<TrendingProductItem[]> {
    const rows = await this.dataSource.query(
      `WITH current_period AS (
         SELECT oi.product_id, COUNT(DISTINCT o.id)::int AS orders
         FROM neture_orders o
         JOIN neture_order_items oi ON oi.order_id = o.id
         JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
         WHERE spo.supplier_id = $1
           AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'
           AND o.status IN ('paid','preparing','shipped','delivered')
         GROUP BY oi.product_id
       ),
       prev_period AS (
         SELECT oi.product_id, COUNT(DISTINCT o.id)::int AS orders
         FROM neture_orders o
         JOIN neture_order_items oi ON oi.order_id = o.id
         JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
         WHERE spo.supplier_id = $1
           AND o.created_at >= CURRENT_DATE - INTERVAL '14 days'
           AND o.created_at < CURRENT_DATE - INTERVAL '7 days'
           AND o.status IN ('paid','preparing','shipped','delivered')
         GROUP BY oi.product_id
       )
       SELECT
         pm.marketing_name AS "productName",
         COALESCE(cp.orders, 0)::int AS "currentOrders",
         COALESCE(pp.orders, 0)::int AS "previousOrders",
         CASE WHEN COALESCE(pp.orders, 0) > 0
           THEN ROUND((COALESCE(cp.orders, 0) - pp.orders)::numeric / pp.orders * 100)::int
           ELSE CASE WHEN COALESCE(cp.orders, 0) > 0 THEN 100 ELSE 0 END
         END AS "growthRate"
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.product_master_id
       LEFT JOIN current_period cp ON cp.product_id = spo.id::text
       LEFT JOIN prev_period pp ON pp.product_id = spo.id::text
       WHERE spo.supplier_id = $1
         AND (COALESCE(cp.orders, 0) > 0 OR COALESCE(pp.orders, 0) > 0)
       ORDER BY "growthRate" DESC, "currentOrders" DESC
       LIMIT $2`,
      [supplierId, limit]
    );

    return rows.map((r: any) => ({
      productName: r.productName || '(이름 없음)',
      currentOrders: r.currentOrders,
      previousOrders: r.previousOrders,
      growthRate: r.growthRate,
    }));
  }
}
