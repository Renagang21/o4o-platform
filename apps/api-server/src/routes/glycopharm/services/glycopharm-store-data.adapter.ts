/**
 * GlycoPharm Store Data Adapter
 *
 * WO-O4O-STORE-TEMPLATE-V1_1-EXTRACTION
 *
 * Implements StoreDataAdapter for GlycoPharm pharmacies.
 * Queries ecommerce_orders by pharmacy store_id.
 *
 * This adapter provides the data foundation for future GlycoPharm
 * cockpit KPI and insights endpoints (separate WO).
 */

import { DataSource } from 'typeorm';
import type {
  StoreDataAdapter,
  ChannelBreakdown,
  TopProduct,
  RecentOrder,
} from '@o4o/store-core';

export class GlycopharmStoreDataAdapter implements StoreDataAdapter {
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
         AND "createdAt" >= $2
         AND "createdAt" < $3
         AND status != 'cancelled'`,
      [storeId, from.toISOString(), to.toISOString()],
    );

    return Number(result[0]?.revenue || 0);
  }
}
