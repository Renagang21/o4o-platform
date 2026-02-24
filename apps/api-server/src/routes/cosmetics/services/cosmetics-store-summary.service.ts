/**
 * Cosmetics Store Summary Service
 *
 * WO-KCOS-STORES-PHASE2-ORDER-ATTRIBUTION-V1
 * WO-O4O-STORE-TEMPLATE-V1_1-EXTRACTION (refactored to use store-core)
 * WO-KPI-SERVICE-KEY-ISOLATION-V1
 *
 * KPI aggregation for store dashboards.
 * Uses StoreSummaryEngine from @o4o/store-core with a Cosmetics-specific adapter.
 * All queries filter by metadata->>'serviceKey' = 'cosmetics' to prevent cross-service KPI contamination.
 */

import { DataSource } from 'typeorm';
import {
  StoreSummaryEngine,
  type StoreDataAdapter,
  type ChannelBreakdown,
  type TopProduct,
  type RecentOrder,
} from '@o4o/store-core';

// Re-export types for backward compatibility
export type {
  StoreSummaryStats,
  ChannelBreakdown,
  TopProduct,
  RecentOrder,
  StoreSummary,
} from '@o4o/store-core';

// ============================================================================
// Cosmetics Adapter — implements StoreDataAdapter with ecommerce_orders SQL
// ============================================================================

export class CosmeticsStoreDataAdapter implements StoreDataAdapter {
  constructor(private dataSource: DataSource) {}

  async getOrderStats(
    storeId: string,
    from: Date,
    to?: Date,
  ): Promise<{ count: number; revenue: number }> {
    const params: any[] = [storeId, from.toISOString()];
    let dateFilter = `AND "createdAt" >= $2`;
    if (to) {
      params.push(to.toISOString());
      dateFilter += ` AND "createdAt" < $3`;
    }

    const result = await this.dataSource.query(
      `SELECT COUNT(*)::int as count, COALESCE(SUM("totalAmount"), 0)::numeric as revenue
       FROM ecommerce_orders
       WHERE store_id = $1
         AND metadata->>'serviceKey' = 'cosmetics'
         ${dateFilter}
         AND status != 'cancelled'`,
      params,
    );

    return {
      count: result[0]?.count || 0,
      revenue: Number(result[0]?.revenue || 0),
    };
  }

  async getChannelBreakdown(storeId: string, from: Date): Promise<ChannelBreakdown[]> {
    const rows = await this.dataSource.query(
      `SELECT
         COALESCE(channel, 'unknown') as channel,
         COUNT(*)::int as "orderCount",
         COALESCE(SUM("totalAmount"), 0)::numeric as revenue
       FROM ecommerce_orders
       WHERE store_id = $1
         AND metadata->>'serviceKey' = 'cosmetics'
         AND "createdAt" >= $2
         AND status != 'cancelled'
       GROUP BY channel
       ORDER BY revenue DESC`,
      [storeId, from.toISOString()],
    );

    return rows.map((row: any) => ({
      channel: row.channel,
      orderCount: row.orderCount,
      revenue: Number(row.revenue),
    }));
  }

  /**
   * WO-STORE-LOCAL-PRODUCT-HARDENING-V1: KPI 오염 방지
   * 이 쿼리는 ecommerce_order_items만 집계한다.
   * StoreLocalProduct(store_local_products)는 Display Domain이며
   * ecommerce_order_items에 진입할 수 없으므로 KPI에 포함되지 않는다.
   * → store_local_products 오염 경로 없음 (구조적 보장)
   */
  async getTopProducts(storeId: string, limit: number, from: Date): Promise<TopProduct[]> {
    const rows = await this.dataSource.query(
      `SELECT
         oi."productId" as "productId",
         oi."productName" as "productName",
         SUM(oi.quantity)::int as quantity,
         SUM(oi.subtotal)::numeric as revenue
       FROM ecommerce_order_items oi
       INNER JOIN ecommerce_orders o ON o.id = oi."orderId"
       WHERE o.store_id = $1
         AND o.metadata->>'serviceKey' = 'cosmetics'
         AND o."createdAt" >= $2
         AND o.status != 'cancelled'
       GROUP BY oi."productId", oi."productName"
       ORDER BY revenue DESC
       LIMIT $3`,
      [storeId, from.toISOString(), limit],
    );

    return rows.map((row: any) => ({
      productId: row.productId,
      productName: row.productName,
      quantity: row.quantity,
      revenue: Number(row.revenue),
    }));
  }

  async getRecentOrders(storeId: string, limit: number): Promise<RecentOrder[]> {
    const rows = await this.dataSource.query(
      `SELECT id, "orderNumber", "totalAmount", status, channel, "createdAt"
       FROM ecommerce_orders
       WHERE store_id = $1
         AND metadata->>'serviceKey' = 'cosmetics'
       ORDER BY "createdAt" DESC
       LIMIT $2`,
      [storeId, limit],
    );

    return rows.map((row: any) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      totalAmount: Number(row.totalAmount),
      status: row.status,
      channel: row.channel,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    }));
  }

  async getTotalOrderCount(storeId: string): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*)::int as count
       FROM ecommerce_orders
       WHERE store_id = $1
         AND metadata->>'serviceKey' = 'cosmetics'
         AND status != 'cancelled'`,
      [storeId],
    );

    return result[0]?.count || 0;
  }

  async getRevenueBetween(storeId: string, from: Date, to: Date): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COALESCE(SUM("totalAmount"), 0)::numeric as revenue
       FROM ecommerce_orders
       WHERE store_id = $1
         AND metadata->>'serviceKey' = 'cosmetics'
         AND "createdAt" >= $2
         AND "createdAt" < $3
         AND status != 'cancelled'`,
      [storeId, from.toISOString(), to.toISOString()],
    );

    return Number(result[0]?.revenue || 0);
  }
}

// ============================================================================
// Service (maintains backward-compatible API)
// ============================================================================

export class CosmeticsStoreSummaryService {
  private adapter: CosmeticsStoreDataAdapter;
  private engine: StoreSummaryEngine;

  constructor(private dataSource: DataSource) {
    this.adapter = new CosmeticsStoreDataAdapter(dataSource);
    this.engine = new StoreSummaryEngine(this.adapter);
  }

  async getStoreSummary(storeId: string) {
    return this.engine.getSummary(storeId);
  }

  async getTopProducts(storeId: string, limit = 5) {
    return this.engine.getTopProducts(storeId, limit);
  }

  /**
   * Aggregate summary across all stores (for admin dashboard).
   * Cosmetics-specific — queries cosmetics_stores directly.
   */
  async getAdminSummary(): Promise<{
    totalStores: number;
    activeOrders: number;
    monthlyRevenue: number;
    recentOrders: RecentOrder[];
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const storeResult = await this.dataSource.query(
      `SELECT COUNT(*)::int as count
       FROM cosmetics.cosmetics_stores
       WHERE status = 'approved'`,
    );

    const activeResult = await this.dataSource.query(
      `SELECT COUNT(*)::int as count
       FROM ecommerce_orders
       WHERE store_id IS NOT NULL
         AND store_id IN (SELECT id FROM cosmetics.cosmetics_stores)
         AND metadata->>'serviceKey' = 'cosmetics'
         AND status IN ('created', 'pending_payment', 'paid', 'confirmed', 'processing', 'shipped')`,
    );

    const revenueResult = await this.dataSource.query(
      `SELECT COALESCE(SUM("totalAmount"), 0)::numeric as revenue
       FROM ecommerce_orders
       WHERE store_id IS NOT NULL
         AND store_id IN (SELECT id FROM cosmetics.cosmetics_stores)
         AND metadata->>'serviceKey' = 'cosmetics'
         AND "createdAt" >= $1
         AND status != 'cancelled'`,
      [monthStart.toISOString()],
    );

    const recentRows = await this.dataSource.query(
      `SELECT o.id, o."orderNumber", o."totalAmount", o.status, o.channel, o."createdAt"
       FROM ecommerce_orders o
       WHERE o.store_id IS NOT NULL
         AND o.store_id IN (SELECT id FROM cosmetics.cosmetics_stores)
         AND o.metadata->>'serviceKey' = 'cosmetics'
       ORDER BY o."createdAt" DESC
       LIMIT 5`,
    );

    return {
      totalStores: storeResult[0]?.count || 0,
      activeOrders: activeResult[0]?.count || 0,
      monthlyRevenue: Number(revenueResult[0]?.revenue || 0),
      recentOrders: recentRows.map((row: any) => ({
        id: row.id,
        orderNumber: row.orderNumber,
        totalAmount: Number(row.totalAmount),
        status: row.status,
        channel: row.channel,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      })),
    };
  }
}
