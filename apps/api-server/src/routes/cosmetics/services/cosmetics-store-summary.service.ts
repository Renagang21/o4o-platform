/**
 * Cosmetics Store Summary Service
 *
 * WO-KCOS-STORES-PHASE2-ORDER-ATTRIBUTION-V1
 * KPI aggregation for store dashboards
 *
 * Queries ecommerce_orders by store_id to produce:
 * - Today's orders count & revenue
 * - Monthly revenue
 * - Channel breakdown (local vs travel)
 * - Top products
 * - Recent orders
 */

import { DataSource } from 'typeorm';

export interface StoreSummaryStats {
  todayOrders: number;
  todayRevenue: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  totalOrders: number;
}

export interface ChannelBreakdown {
  channel: string;
  orderCount: number;
  revenue: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  channel: string | null;
  createdAt: string;
}

export interface StoreSummary {
  stats: StoreSummaryStats;
  channelBreakdown: ChannelBreakdown[];
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
}

export class CosmeticsStoreSummaryService {
  constructor(private dataSource: DataSource) {}

  async getStoreSummary(storeId: string): Promise<StoreSummary> {
    const [stats, channelBreakdown, topProducts, recentOrders] = await Promise.all([
      this.getStats(storeId),
      this.getChannelBreakdown(storeId),
      this.getTopProducts(storeId),
      this.getRecentOrders(storeId),
    ]);

    return { stats, channelBreakdown, topProducts, recentOrders };
  }

  private async getStats(storeId: string): Promise<StoreSummaryStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's orders
    const todayResult = await this.dataSource.query(
      `SELECT COUNT(*)::int as count, COALESCE(SUM("totalAmount"), 0)::numeric as revenue
       FROM ecommerce_orders
       WHERE store_id = $1
         AND "createdAt" >= $2
         AND status != 'cancelled'`,
      [storeId, todayStart.toISOString()],
    );

    // Monthly orders
    const monthlyResult = await this.dataSource.query(
      `SELECT COUNT(*)::int as count, COALESCE(SUM("totalAmount"), 0)::numeric as revenue
       FROM ecommerce_orders
       WHERE store_id = $1
         AND "createdAt" >= $2
         AND status != 'cancelled'`,
      [storeId, monthStart.toISOString()],
    );

    // Total orders
    const totalResult = await this.dataSource.query(
      `SELECT COUNT(*)::int as count
       FROM ecommerce_orders
       WHERE store_id = $1
         AND status != 'cancelled'`,
      [storeId],
    );

    return {
      todayOrders: todayResult[0]?.count || 0,
      todayRevenue: Number(todayResult[0]?.revenue || 0),
      monthlyOrders: monthlyResult[0]?.count || 0,
      monthlyRevenue: Number(monthlyResult[0]?.revenue || 0),
      totalOrders: totalResult[0]?.count || 0,
    };
  }

  private async getChannelBreakdown(storeId: string): Promise<ChannelBreakdown[]> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const rows = await this.dataSource.query(
      `SELECT
         COALESCE(channel, 'unknown') as channel,
         COUNT(*)::int as "orderCount",
         COALESCE(SUM("totalAmount"), 0)::numeric as revenue
       FROM ecommerce_orders
       WHERE store_id = $1
         AND "createdAt" >= $2
         AND status != 'cancelled'
       GROUP BY channel
       ORDER BY revenue DESC`,
      [storeId, monthStart.toISOString()],
    );

    return rows.map((row: any) => ({
      channel: row.channel,
      orderCount: row.orderCount,
      revenue: Number(row.revenue),
    }));
  }

  async getTopProducts(storeId: string, limit = 5): Promise<TopProduct[]> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const rows = await this.dataSource.query(
      `SELECT
         oi."productId" as "productId",
         oi."productName" as "productName",
         SUM(oi.quantity)::int as quantity,
         SUM(oi.subtotal)::numeric as revenue
       FROM ecommerce_order_items oi
       INNER JOIN ecommerce_orders o ON o.id = oi."orderId"
       WHERE o.store_id = $1
         AND o."createdAt" >= $2
         AND o.status != 'cancelled'
       GROUP BY oi."productId", oi."productName"
       ORDER BY revenue DESC
       LIMIT $3`,
      [storeId, monthStart.toISOString(), limit],
    );

    return rows.map((row: any) => ({
      productId: row.productId,
      productName: row.productName,
      quantity: row.quantity,
      revenue: Number(row.revenue),
    }));
  }

  private async getRecentOrders(storeId: string, limit = 10): Promise<RecentOrder[]> {
    const rows = await this.dataSource.query(
      `SELECT id, "orderNumber", "totalAmount", status, channel, "createdAt"
       FROM ecommerce_orders
       WHERE store_id = $1
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

  /**
   * Aggregate summary across all stores (for admin dashboard)
   */
  async getAdminSummary(): Promise<{
    totalStores: number;
    activeOrders: number;
    monthlyRevenue: number;
    recentOrders: RecentOrder[];
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count approved stores
    const storeResult = await this.dataSource.query(
      `SELECT COUNT(*)::int as count
       FROM cosmetics.cosmetics_stores
       WHERE status = 'approved'`,
    );

    // Active orders (not cancelled/completed) across all cosmetics stores
    const activeResult = await this.dataSource.query(
      `SELECT COUNT(*)::int as count
       FROM ecommerce_orders
       WHERE store_id IS NOT NULL
         AND store_id IN (SELECT id FROM cosmetics.cosmetics_stores)
         AND status IN ('created', 'pending_payment', 'paid', 'confirmed', 'processing', 'shipped')`,
    );

    // Monthly revenue across all cosmetics stores
    const revenueResult = await this.dataSource.query(
      `SELECT COALESCE(SUM("totalAmount"), 0)::numeric as revenue
       FROM ecommerce_orders
       WHERE store_id IS NOT NULL
         AND store_id IN (SELECT id FROM cosmetics.cosmetics_stores)
         AND "createdAt" >= $1
         AND status != 'cancelled'`,
      [monthStart.toISOString()],
    );

    // Recent orders across all cosmetics stores
    const recentRows = await this.dataSource.query(
      `SELECT o.id, o."orderNumber", o."totalAmount", o.status, o.channel, o."createdAt"
       FROM ecommerce_orders o
       WHERE o.store_id IS NOT NULL
         AND o.store_id IN (SELECT id FROM cosmetics.cosmetics_stores)
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
