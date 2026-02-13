/**
 * O4O Store Core - Data Adapter Interface
 *
 * WO-O4O-STORE-TEMPLATE-V1_1-EXTRACTION
 *
 * Each service (Cosmetics, GlycoPharm, etc.) implements this interface
 * to provide store order data to the shared engines.
 *
 * The adapter abstracts database access so engines remain DB-free.
 */

import type { ChannelBreakdown, TopProduct, RecentOrder } from './types.js';

export interface StoreDataAdapter {
  /**
   * Get order count and revenue for a store within a date range.
   * @param from - Start date (inclusive)
   * @param to - End date (exclusive). If omitted, up to now.
   */
  getOrderStats(
    storeId: string,
    from: Date,
    to?: Date,
  ): Promise<{ count: number; revenue: number }>;

  /**
   * Get revenue breakdown by channel (e.g., 'local', 'travel', 'online').
   * @param from - Start of the period
   */
  getChannelBreakdown(storeId: string, from: Date): Promise<ChannelBreakdown[]>;

  /**
   * Get top-selling products by revenue.
   * @param limit - Max number of products to return
   * @param from - Start of the period
   */
  getTopProducts(storeId: string, limit: number, from: Date): Promise<TopProduct[]>;

  /**
   * Get most recent orders for a store.
   * @param limit - Max number of orders to return
   */
  getRecentOrders(storeId: string, limit: number): Promise<RecentOrder[]>;

  /**
   * Get total non-cancelled order count for a store (all time).
   */
  getTotalOrderCount(storeId: string): Promise<number>;

  /**
   * Get total revenue between two dates.
   * Used for month-over-month comparison in insights.
   */
  getRevenueBetween(storeId: string, from: Date, to: Date): Promise<number>;
}
