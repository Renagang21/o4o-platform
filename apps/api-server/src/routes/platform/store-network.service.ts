/**
 * Store Network Aggregator Service
 *
 * WO-O4O-STORE-NETWORK-DASHBOARD-V1
 * WO-O4O-STORE-NETWORK-AI-HYBRID-V1 (last month stats for insights)
 *
 * Aggregates KPI data across all store services (K-Cosmetics, GlycoPharm)
 * for platform admin network-level dashboard.
 *
 * Uses bulk SQL queries per service (not per-store adapter calls) for performance.
 */

import { DataSource } from 'typeorm';

export interface ServiceBreakdown {
  serviceType: string;
  storeCount: number;
  monthlyRevenue: number;
  monthlyOrders: number;
}

export interface NetworkSummary {
  totalStores: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  serviceBreakdown: ServiceBreakdown[];
}

export interface TopStore {
  storeId: string;
  storeName: string;
  serviceType: string;
  monthlyRevenue: number;
  monthlyOrders: number;
}

/** Revenue/orders for a date range (no store counts) */
export interface NetworkPeriodStats {
  totalRevenue: number;
  totalOrders: number;
  serviceBreakdown: Array<{
    serviceType: string;
    revenue: number;
    orders: number;
  }>;
}

export class StoreNetworkService {
  constructor(private dataSource: DataSource) {}

  async getNetworkSummary(): Promise<NetworkSummary> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartISO = monthStart.toISOString();

    const [cosmetics, glycopharm] = await Promise.all([
      this.getCosmeticsServiceStats(monthStartISO),
      this.getGlycopharmServiceStats(monthStartISO),
    ]);

    const serviceBreakdown: ServiceBreakdown[] = [
      {
        serviceType: 'cosmetics',
        storeCount: cosmetics.storeCount,
        monthlyRevenue: cosmetics.monthlyRevenue,
        monthlyOrders: cosmetics.monthlyOrders,
      },
      {
        serviceType: 'glycopharm',
        storeCount: glycopharm.storeCount,
        monthlyRevenue: glycopharm.monthlyRevenue,
        monthlyOrders: glycopharm.monthlyOrders,
      },
    ];

    return {
      totalStores: cosmetics.storeCount + glycopharm.storeCount,
      monthlyRevenue: cosmetics.monthlyRevenue + glycopharm.monthlyRevenue,
      monthlyOrders: cosmetics.monthlyOrders + glycopharm.monthlyOrders,
      serviceBreakdown,
    };
  }

  /** Get last month's revenue/orders for growth rate calculation */
  async getLastMonthStats(): Promise<NetworkPeriodStats> {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [cosmetics, glycopharm] = await Promise.all([
      this.getServiceOrdersBetween('cosmetics', lastMonthStart.toISOString(), thisMonthStart.toISOString()),
      this.getServiceOrdersBetween('glycopharm', lastMonthStart.toISOString(), thisMonthStart.toISOString()),
    ]);

    return {
      totalRevenue: cosmetics.revenue + glycopharm.revenue,
      totalOrders: cosmetics.orders + glycopharm.orders,
      serviceBreakdown: [
        { serviceType: 'cosmetics', revenue: cosmetics.revenue, orders: cosmetics.orders },
        { serviceType: 'glycopharm', revenue: glycopharm.revenue, orders: glycopharm.orders },
      ],
    };
  }

  private async getServiceOrdersBetween(
    service: 'cosmetics' | 'glycopharm',
    fromISO: string,
    toISO: string,
  ): Promise<{ revenue: number; orders: number }> {
    const storeSubquery =
      service === 'cosmetics'
        ? `SELECT id FROM cosmetics.cosmetics_stores`
        : `SELECT o.id FROM organizations o JOIN organization_service_enrollments ose ON ose.organization_id = o.id AND ose.service_code = 'glycopharm'`;

    const result = await this.dataSource.query(
      `SELECT
         COUNT(*)::int as "orderCount",
         COALESCE(SUM("totalAmount"), 0)::numeric as revenue
       FROM ecommerce_orders
       WHERE store_id IN (${storeSubquery})
         AND "createdAt" >= $1
         AND "createdAt" < $2
         AND status != 'cancelled'`,
      [fromISO, toISO],
    );

    return {
      revenue: Number(result[0]?.revenue || 0),
      orders: result[0]?.orderCount || 0,
    };
  }

  async getTopStores(limit = 10): Promise<TopStore[]> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartISO = monthStart.toISOString();

    const [cosmeticsStores, glycopharmStores] = await Promise.all([
      this.getCosmeticsTopStores(monthStartISO, limit),
      this.getGlycopharmTopStores(monthStartISO, limit),
    ]);

    // Merge and sort by revenue descending, take top N
    const merged = [...cosmeticsStores, ...glycopharmStores];
    merged.sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);
    return merged.slice(0, limit);
  }

  // ---- Cosmetics bulk queries ----

  private async getCosmeticsServiceStats(monthStartISO: string) {
    const [storeResult, orderResult] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int as count
         FROM cosmetics.cosmetics_stores
         WHERE status = 'approved'`,
      ),
      this.dataSource.query(
        `SELECT
           COUNT(*)::int as "orderCount",
           COALESCE(SUM("totalAmount"), 0)::numeric as revenue
         FROM ecommerce_orders
         WHERE store_id IN (SELECT id FROM cosmetics.cosmetics_stores)
           AND "createdAt" >= $1
           AND status != 'cancelled'`,
        [monthStartISO],
      ),
    ]);

    return {
      storeCount: storeResult[0]?.count || 0,
      monthlyRevenue: Number(orderResult[0]?.revenue || 0),
      monthlyOrders: orderResult[0]?.orderCount || 0,
    };
  }

  private async getGlycopharmServiceStats(monthStartISO: string) {
    const [storeResult, orderResult] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int as count
         FROM organizations o
         JOIN organization_service_enrollments ose ON ose.organization_id = o.id AND ose.service_code = 'glycopharm'
         WHERE o."isActive" = true`,
      ),
      this.dataSource.query(
        `SELECT
           COUNT(*)::int as "orderCount",
           COALESCE(SUM("totalAmount"), 0)::numeric as revenue
         FROM ecommerce_orders
         WHERE store_id IN (SELECT o.id FROM organizations o JOIN organization_service_enrollments ose ON ose.organization_id = o.id AND ose.service_code = 'glycopharm')
           AND "createdAt" >= $1
           AND status != 'cancelled'`,
        [monthStartISO],
      ),
    ]);

    return {
      storeCount: storeResult[0]?.count || 0,
      monthlyRevenue: Number(orderResult[0]?.revenue || 0),
      monthlyOrders: orderResult[0]?.orderCount || 0,
    };
  }

  // ---- Top stores per service ----

  private async getCosmeticsTopStores(monthStartISO: string, limit: number): Promise<TopStore[]> {
    const rows = await this.dataSource.query(
      `SELECT
         o.store_id as "storeId",
         s.name as "storeName",
         COUNT(*)::int as "monthlyOrders",
         COALESCE(SUM(o."totalAmount"), 0)::numeric as "monthlyRevenue"
       FROM ecommerce_orders o
       INNER JOIN cosmetics.cosmetics_stores s ON s.id = o.store_id
       WHERE o."createdAt" >= $1
         AND o.status != 'cancelled'
         AND o.store_id IS NOT NULL
       GROUP BY o.store_id, s.name
       ORDER BY "monthlyRevenue" DESC
       LIMIT $2`,
      [monthStartISO, limit],
    );

    return rows.map((row: any) => ({
      storeId: row.storeId,
      storeName: row.storeName || 'Unknown Store',
      serviceType: 'cosmetics' as const,
      monthlyRevenue: Number(row.monthlyRevenue),
      monthlyOrders: row.monthlyOrders,
    }));
  }

  private async getGlycopharmTopStores(monthStartISO: string, limit: number): Promise<TopStore[]> {
    const rows = await this.dataSource.query(
      `SELECT
         o.store_id as "storeId",
         p.name as "storeName",
         COUNT(*)::int as "monthlyOrders",
         COALESCE(SUM(o."totalAmount"), 0)::numeric as "monthlyRevenue"
       FROM ecommerce_orders o
       INNER JOIN organizations p ON p.id = o.store_id
       WHERE o."createdAt" >= $1
         AND o.status != 'cancelled'
         AND o.store_id IS NOT NULL
       GROUP BY o.store_id, p.name
       ORDER BY "monthlyRevenue" DESC
       LIMIT $2`,
      [monthStartISO, limit],
    );

    return rows.map((row: any) => ({
      storeId: row.storeId,
      storeName: row.storeName || 'Unknown Pharmacy',
      serviceType: 'glycopharm' as const,
      monthlyRevenue: Number(row.monthlyRevenue),
      monthlyOrders: row.monthlyOrders,
    }));
  }
}
