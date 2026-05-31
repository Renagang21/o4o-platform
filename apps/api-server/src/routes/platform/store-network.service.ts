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
 *
 * WO-O4O-STORE-KPI-DASHBOARD-CHECKOUT-ORDERS-ALIGNMENT-V1 (Track A):
 *   Migrated from legacy `ecommerce_orders` (table absent in production) to
 *   canonical `checkout_orders`.
 *
 * 정렬 정책:
 *   - cross-service aggregation 은 `metadata->>'serviceKey'` 단일 filter 로 단순화.
 *     subquery JOIN (`store_id IN (SELECT id FROM ...)`) 제거.
 *   - Top stores 의 store name 은 service-specific subquery (cosmetics_stores 또는
 *     organizations) 로 LEFT JOIN. canonical sellerOrganizationId 가 모든 매장에
 *     채워졌다고 가정 — 신규 주문 생성 시점 보장 책임은 checkout flow.
 *     · Cosmetics: cosmetics_stores 의 organization_id 가 NULL 인 store 는
 *       Top stores 목록에 자동 제외 (organization bridge 부재 시 결과 누락).
 *     · GlycoPharm: organizations.id 직접 매핑 ✅.
 *   - 매출 인정 양성 조건: `status = 'paid'`.
 *   - functional index 권장: idx_checkout_orders_servicekey_status_createdat
 *     ((metadata->>'serviceKey'), status, "createdAt") — 별도 migration WO.
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
    // WO-O4O-STORE-KPI-DASHBOARD-CHECKOUT-ORDERS-ALIGNMENT-V1:
    // metadata->>'serviceKey' 단일 filter — subquery JOIN 불필요.
    const result = await this.dataSource.query(
      `SELECT
         COUNT(*)::int as "orderCount",
         COALESCE(SUM(co."totalAmount"), 0)::numeric as revenue
       FROM checkout_orders co
       WHERE co.metadata->>'serviceKey' = $1
         AND co."createdAt" >= $2
         AND co."createdAt" < $3
         AND co.status = 'paid'`,
      [service, fromISO, toISO],
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
    // WO-O4O-STORE-KPI-DASHBOARD-CHECKOUT-ORDERS-ALIGNMENT-V1:
    // store count 는 service-specific (cosmetics_stores) — 변경 없음.
    // 주문 집계는 checkout_orders + metadata->>'serviceKey' filter.
    const [storeResult, orderResult] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int as count
         FROM cosmetics.cosmetics_stores
         WHERE status = 'approved'`,
      ),
      this.dataSource.query(
        `SELECT
           COUNT(*)::int as "orderCount",
           COALESCE(SUM(co."totalAmount"), 0)::numeric as revenue
         FROM checkout_orders co
         WHERE co.metadata->>'serviceKey' = 'cosmetics'
           AND co."createdAt" >= $1
           AND co.status = 'paid'`,
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
    // WO-O4O-STORE-KPI-DASHBOARD-CHECKOUT-ORDERS-ALIGNMENT-V1: 동일 패턴.
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
           COALESCE(SUM(co."totalAmount"), 0)::numeric as revenue
         FROM checkout_orders co
         WHERE co.metadata->>'serviceKey' = 'glycopharm'
           AND co."createdAt" >= $1
           AND co.status = 'paid'`,
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
    // WO-O4O-STORE-KPI-DASHBOARD-CHECKOUT-ORDERS-ALIGNMENT-V1:
    // checkout_orders.sellerOrganizationId GROUP BY + cosmetics_stores 의 name lookup.
    // cosmetics_stores.organization_id 가 NULL 인 store 는 자동 제외 (INNER JOIN).
    const rows = await this.dataSource.query(
      `SELECT
         co."sellerOrganizationId" as "storeId",
         s.name as "storeName",
         COUNT(*)::int as "monthlyOrders",
         COALESCE(SUM(co."totalAmount"), 0)::numeric as "monthlyRevenue"
       FROM checkout_orders co
       INNER JOIN cosmetics.cosmetics_stores s ON s.organization_id = co."sellerOrganizationId"
       WHERE co.metadata->>'serviceKey' = 'cosmetics'
         AND co."createdAt" >= $1
         AND co.status = 'paid'
         AND co."sellerOrganizationId" IS NOT NULL
       GROUP BY co."sellerOrganizationId", s.name
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
    // WO-O4O-STORE-KPI-DASHBOARD-CHECKOUT-ORDERS-ALIGNMENT-V1:
    // GlycoPharm pharmacy.id == organizations.id == sellerOrganizationId 직접 매핑.
    const rows = await this.dataSource.query(
      `SELECT
         co."sellerOrganizationId" as "storeId",
         p.name as "storeName",
         COUNT(*)::int as "monthlyOrders",
         COALESCE(SUM(co."totalAmount"), 0)::numeric as "monthlyRevenue"
       FROM checkout_orders co
       INNER JOIN organizations p ON p.id = co."sellerOrganizationId"
       WHERE co.metadata->>'serviceKey' = 'glycopharm'
         AND co."createdAt" >= $1
         AND co.status = 'paid'
         AND co."sellerOrganizationId" IS NOT NULL
       GROUP BY co."sellerOrganizationId", p.name
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
