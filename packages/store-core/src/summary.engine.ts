/**
 * O4O Store Core - Summary Engine
 *
 * WO-O4O-STORE-TEMPLATE-V1_1-EXTRACTION
 *
 * Orchestrates KPI aggregation using a StoreDataAdapter.
 * Handles date range computation and parallel data fetching.
 *
 * Extracted from CosmeticsStoreSummaryService (Phase 3).
 */

import type { StoreDataAdapter } from './store-data.adapter.js';
import type { StoreSummary } from './types.js';

export class StoreSummaryEngine {
  constructor(private adapter: StoreDataAdapter) {}

  /**
   * Compute full store KPI summary.
   * Fetches today/monthly/total stats, channel breakdown, top products,
   * and recent orders in parallel.
   */
  async getSummary(storeId: string): Promise<StoreSummary> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayStats, monthlyStats, totalOrders, channelBreakdown, topProducts, recentOrders] =
      await Promise.all([
        this.adapter.getOrderStats(storeId, todayStart),
        this.adapter.getOrderStats(storeId, monthStart),
        this.adapter.getTotalOrderCount(storeId),
        this.adapter.getChannelBreakdown(storeId, monthStart),
        this.adapter.getTopProducts(storeId, 5, monthStart),
        this.adapter.getRecentOrders(storeId, 10),
      ]);

    return {
      stats: {
        todayOrders: todayStats.count,
        todayRevenue: todayStats.revenue,
        monthlyOrders: monthlyStats.count,
        monthlyRevenue: monthlyStats.revenue,
        totalOrders,
      },
      channelBreakdown,
      topProducts,
      recentOrders,
    };
  }

  /**
   * Get top products for a store (convenience method for playlist generation).
   */
  async getTopProducts(storeId: string, limit = 5) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.adapter.getTopProducts(storeId, limit, monthStart);
  }

  /**
   * Get last month's revenue (for insights month-over-month comparison).
   */
  async getLastMonthRevenue(storeId: string): Promise<number> {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.adapter.getRevenueBetween(storeId, lastMonthStart, thisMonthStart);
  }
}
