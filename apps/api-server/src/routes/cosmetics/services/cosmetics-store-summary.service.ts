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
 *
 * WO-O4O-STORE-KPI-DASHBOARD-CHECKOUT-ORDERS-ALIGNMENT-V1 (Track A):
 *   Migrated from legacy `ecommerce_orders` + `ecommerce_order_items` (table absent
 *   in production) to canonical `checkout_orders` + `CheckoutOrder.items[]` JSONB.
 *
 * 정렬 정책:
 *   - K-Cosmetics 의 caller 가 전달하는 storeId 는 `cosmetics_stores.id` (cosmetics 스키마 PK).
 *   - canonical `checkout_orders.sellerOrganizationId` 는 `organizations.id` UUID.
 *   - bridge: `cosmetics_stores.organization_id` (nullable UUID — WO-O4O-COSMETICS-STORE-HUB-
 *     ADOPTION-V1). subquery 로 nested lookup.
 *   - **주의 (caller 안내)**: `cosmetics_stores.organization_id` 가 NULL 인 store 는
 *     매칭 안 됨 → 빈 결과 / 0 metrics. organization bridge 가 누락된 store 의 KPI 를
 *     보려면 organization 연결 보강이 선행되어야 함.
 *   - service scope: `metadata->>'serviceKey' = 'cosmetics'` 유지.
 *   - 매출 인정 양성 조건: `co.status = 'paid'`.
 *   - item-level 집계: `CROSS JOIN jsonb_array_elements(co.items)`.
 *   - channel: `co.metadata->>'channel'`.
 *   - controller-layer safe-fallback 보존.
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
// Cosmetics Adapter — implements StoreDataAdapter with checkout_orders SQL
// ============================================================================

/**
 * K-Cos store → organization bridge subquery snippet.
 * `cosmetics_stores.id = $1 AND organization_id IS NOT NULL` 인 경우에만 organization_id 반환.
 * 매핑 부재 시 빈 결과 셋 (caller 가 KPI 0 으로 받음 — silent 0 가 아닌 정상 미매칭).
 */
const ORG_FROM_COSMETICS_STORE = `(
  SELECT organization_id FROM cosmetics.cosmetics_stores
  WHERE id = $1 AND organization_id IS NOT NULL
)`;

export class CosmeticsStoreDataAdapter implements StoreDataAdapter {
  constructor(private dataSource: DataSource) {}

  async getOrderStats(
    storeId: string,
    from: Date,
    to?: Date,
  ): Promise<{ count: number; revenue: number }> {
    const params: any[] = [storeId, from.toISOString()];
    let dateFilter = `AND co."createdAt" >= $2`;
    if (to) {
      params.push(to.toISOString());
      dateFilter += ` AND co."createdAt" < $3`;
    }

    const result = await this.dataSource.query(
      `SELECT COUNT(*)::int as count,
              COALESCE(SUM(co."totalAmount"), 0)::numeric as revenue
       FROM checkout_orders co
       WHERE co."sellerOrganizationId" = ${ORG_FROM_COSMETICS_STORE}
         AND co.metadata->>'serviceKey' = 'cosmetics'
         ${dateFilter}
         AND co.status = 'paid'`,
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
         COALESCE(co.metadata->>'channel', 'unknown') as channel,
         COUNT(*)::int as "orderCount",
         COALESCE(SUM(co."totalAmount"), 0)::numeric as revenue
       FROM checkout_orders co
       WHERE co."sellerOrganizationId" = ${ORG_FROM_COSMETICS_STORE}
         AND co.metadata->>'serviceKey' = 'cosmetics'
         AND co."createdAt" >= $2
         AND co.status = 'paid'
       GROUP BY co.metadata->>'channel'
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
   * 이 쿼리는 checkout_orders.items JSONB 만 집계한다.
   *
   * WO-O4O-STORE-KPI-DASHBOARD-CHECKOUT-ORDERS-ALIGNMENT-V1: JSONB 패턴.
   */
  async getTopProducts(storeId: string, limit: number, from: Date): Promise<TopProduct[]> {
    const rows = await this.dataSource.query(
      `SELECT
         item->>'productId' as "productId",
         item->>'productName' as "productName",
         SUM((item->>'quantity')::int)::int as quantity,
         SUM((item->>'subtotal')::numeric)::numeric as revenue
       FROM checkout_orders co
       CROSS JOIN jsonb_array_elements(co.items) AS item
       WHERE co."sellerOrganizationId" = ${ORG_FROM_COSMETICS_STORE}
         AND co.metadata->>'serviceKey' = 'cosmetics'
         AND co."createdAt" >= $2
         AND co.status = 'paid'
       GROUP BY item->>'productId', item->>'productName'
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
    // Track A 정책: recent orders 는 lifecycle 가시성 우선. cancelled/refunded 제외.
    const rows = await this.dataSource.query(
      `SELECT
         co.id,
         co."orderNumber",
         co."totalAmount",
         co.status,
         co.metadata->>'channel' as channel,
         co."createdAt"
       FROM checkout_orders co
       WHERE co."sellerOrganizationId" = ${ORG_FROM_COSMETICS_STORE}
         AND co.metadata->>'serviceKey' = 'cosmetics'
         AND co.status NOT IN ('cancelled', 'refunded')
       ORDER BY co."createdAt" DESC
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
       FROM checkout_orders co
       WHERE co."sellerOrganizationId" = ${ORG_FROM_COSMETICS_STORE}
         AND co.metadata->>'serviceKey' = 'cosmetics'
         AND co.status = 'paid'`,
      [storeId],
    );

    return result[0]?.count || 0;
  }

  async getRevenueBetween(storeId: string, from: Date, to: Date): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COALESCE(SUM(co."totalAmount"), 0)::numeric as revenue
       FROM checkout_orders co
       WHERE co."sellerOrganizationId" = ${ORG_FROM_COSMETICS_STORE}
         AND co.metadata->>'serviceKey' = 'cosmetics'
         AND co."createdAt" >= $2
         AND co."createdAt" < $3
         AND co.status = 'paid'`,
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
   * Cosmetics-specific — bulk aggregation via metadata->>'serviceKey' filter.
   *
   * WO-O4O-STORE-KPI-DASHBOARD-CHECKOUT-ORDERS-ALIGNMENT-V1:
   *   bulk 의 경우 sellerOrganizationId 별 lookup 불필요 — service-level filter 면
   *   충분. cosmetics_stores 의 organization_id 부재 store 의 주문은 자동 제외됨.
   *
   * activeOrders 정의:
   *   - canonical checkout_orders 에는 legacy 의 'processing', 'shipped', 'confirmed' 가
   *     없음 (Track B 의 NEEDS_POLICY 대상 — action queue active-orders 의미 결정).
   *   - 본 Track A 에서는 monthlyRevenue 와 동일한 paid 기준 적용 — silent 0 거짓
   *     신호 회피. 다른 정의가 필요하면 Track B WO 에서 확정.
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

    // Track A: active = paid (Track B 에서 재정의 대상)
    const activeResult = await this.dataSource.query(
      `SELECT COUNT(*)::int as count
       FROM checkout_orders co
       WHERE co.metadata->>'serviceKey' = 'cosmetics'
         AND co.status = 'paid'`,
    );

    const revenueResult = await this.dataSource.query(
      `SELECT COALESCE(SUM(co."totalAmount"), 0)::numeric as revenue
       FROM checkout_orders co
       WHERE co.metadata->>'serviceKey' = 'cosmetics'
         AND co."createdAt" >= $1
         AND co.status = 'paid'`,
      [monthStart.toISOString()],
    );

    const recentRows = await this.dataSource.query(
      `SELECT
         co.id,
         co."orderNumber",
         co."totalAmount",
         co.status,
         co.metadata->>'channel' as channel,
         co."createdAt"
       FROM checkout_orders co
       WHERE co.metadata->>'serviceKey' = 'cosmetics'
         AND co.status NOT IN ('cancelled', 'refunded')
       ORDER BY co."createdAt" DESC
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
