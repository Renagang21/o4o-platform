/**
 * SupplierCopilotService
 *
 * WO-O4O-SUPPLIER-COPILOT-DASHBOARD-V1
 *
 * Copilot dashboard data: KPI, product performance, distribution, trending.
 *
 * Orders: checkout_orders table (JSONB items), NOT neture_orders.
 * Column naming: snake_case (SnakeNamingStrategy was active at table creation).
 *
 * NOTE: checkout_orders table may not exist yet in production.
 * All order queries are wrapped in try/catch to return 0/empty gracefully.
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

    // Recent orders (7 days) — table may not exist yet
    let recentOrders = 0;
    try {
      const orderRows = await this.dataSource.query(
        `SELECT COUNT(*)::int AS "recentOrders"
         FROM checkout_orders
         WHERE supplier_id = $1
           AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
        [supplierId]
      );
      recentOrders = orderRows[0]?.recentOrders ?? 0;
    } catch {
      // checkout_orders table may not exist yet
    }

    return {
      registeredProducts: productRows[0]?.registeredProducts ?? 0,
      activeProducts: productRows[0]?.activeProducts ?? 0,
      storeListings: listingRows[0]?.storeListings ?? 0,
      recentOrders,
    };
  }

  async getProductPerformance(supplierId: string, limit = 10): Promise<ProductPerformanceItem[]> {
    // Try full query with checkout_orders; fall back to products-only if table missing
    try {
      const rows = await this.dataSource.query(
        `SELECT
           pm.id AS "productId",
           pm.name AS "productName",
           COUNT(DISTINCT o.id)::int AS orders,
           COALESCE(SUM((item->>'subtotal')::int), 0)::int AS revenue,
           0 AS "qrScans"
         FROM supplier_product_offers spo
         JOIN product_masters pm ON pm.id = spo.master_id
         LEFT JOIN checkout_orders o ON o.supplier_id = $1
           AND o.status IN ('paid','created')
         LEFT JOIN LATERAL jsonb_array_elements(o.items) AS item
           ON (item->>'productId')::uuid = spo.id
         WHERE spo.supplier_id = $1
         GROUP BY pm.id, pm.name
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
    } catch {
      // checkout_orders table may not exist — return products with 0 order metrics
      const rows = await this.dataSource.query(
        `SELECT pm.id AS "productId", pm.name AS "productName"
         FROM supplier_product_offers spo
         JOIN product_masters pm ON pm.id = spo.master_id
         WHERE spo.supplier_id = $1
         ORDER BY spo.created_at DESC
         LIMIT $2`,
        [supplierId, limit]
      );
      return rows.map((r: any) => ({
        productId: r.productId,
        productName: r.productName || '(이름 없음)',
        orders: 0,
        revenue: 0,
        qrScans: 0,
      }));
    }
  }

  async getDistribution(supplierId: string): Promise<DistributionItem[]> {
    const rows = await this.dataSource.query(
      `SELECT
         pm.id AS "productId",
         pm.name AS "productName",
         COUNT(DISTINCT opl.organization_id)::int AS "storeCount",
         COUNT(DISTINCT opl.organization_id) FILTER (
           WHERE opl.created_at >= CURRENT_DATE - INTERVAL '7 days'
         )::int AS "newStores"
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN organization_product_listings opl ON opl.offer_id = spo.id AND opl.is_active = true
       WHERE spo.supplier_id = $1
       GROUP BY pm.id, pm.name
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
    try {
      const rows = await this.dataSource.query(
        `WITH current_period AS (
           SELECT (item->>'productId') AS product_id, COUNT(DISTINCT o.id)::int AS orders
           FROM checkout_orders o,
                jsonb_array_elements(o.items) AS item
           JOIN supplier_product_offers spo ON spo.id = (item->>'productId')::uuid
           WHERE spo.supplier_id = $1
             AND o.supplier_id = $1
             AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'
             AND o.status IN ('paid','created')
           GROUP BY (item->>'productId')
         ),
         prev_period AS (
           SELECT (item->>'productId') AS product_id, COUNT(DISTINCT o.id)::int AS orders
           FROM checkout_orders o,
                jsonb_array_elements(o.items) AS item
           JOIN supplier_product_offers spo ON spo.id = (item->>'productId')::uuid
           WHERE spo.supplier_id = $1
             AND o.supplier_id = $1
             AND o.created_at >= CURRENT_DATE - INTERVAL '14 days'
             AND o.created_at < CURRENT_DATE - INTERVAL '7 days'
             AND o.status IN ('paid','created')
           GROUP BY (item->>'productId')
         )
         SELECT
           pm.name AS "productName",
           COALESCE(cp.orders, 0)::int AS "currentOrders",
           COALESCE(pp.orders, 0)::int AS "previousOrders",
           CASE WHEN COALESCE(pp.orders, 0) > 0
             THEN ROUND((COALESCE(cp.orders, 0) - pp.orders)::numeric / pp.orders * 100)::int
             ELSE CASE WHEN COALESCE(cp.orders, 0) > 0 THEN 100 ELSE 0 END
           END AS "growthRate"
         FROM supplier_product_offers spo
         JOIN product_masters pm ON pm.id = spo.master_id
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
    } catch {
      // checkout_orders table may not exist yet
      return [];
    }
  }
}
