/**
 * GlycoPharm Store Data Adapter
 *
 * WO-O4O-STORE-TEMPLATE-V1_1-EXTRACTION
 * WO-KPI-SERVICE-KEY-ISOLATION-V1
 *
 * Implements StoreDataAdapter for GlycoPharm pharmacies.
 *
 * WO-O4O-STORE-KPI-DASHBOARD-CHECKOUT-ORDERS-ALIGNMENT-V1 (Track A):
 *   Migrated from legacy `ecommerce_orders` + `ecommerce_order_items` (table absent
 *   in production — see IR-O4O-ECOMMERCE-ORDERS-TABLE-CROSSSERVICE-IMPACT-V1) to
 *   canonical `checkout_orders` + `CheckoutOrder.items[]` JSONB.
 *
 * 정렬 정책 (IR-O4O-ECOMMERCE-ORDERS-VS-CHECKOUT-ORDERS-SCHEMA-DIFF-V1):
 *   - GlycoPharm pharmacy.id == organizations.id == checkout_orders.sellerOrganizationId
 *     (OrganizationStore == @Entity('organizations'); 1:1 직접 매핑).
 *   - service scope: `metadata->>'serviceKey' = 'glycopharm'` (filter 유지).
 *   - 매출 인정 양성 조건: `co.status = 'paid'` (legacy `status != 'cancelled'` 회피 —
 *     REFUNDED 포함 위험).
 *   - item-level 집계: `CROSS JOIN jsonb_array_elements(co.items)` 패턴
 *     (KPA event-offer.service.ts:309-326 / kpa-checkout.controller.ts:442-450 검증).
 *   - channel: legacy `o.channel` 컬럼 부재 → `co.metadata->>'channel'` 로 정렬.
 *   - controller-layer safe-fallback (`isMissingOrderTable`) 보존 — checkout_orders 가
 *     production 존재 (2026-04-14 created) 이므로 본 adapter 는 정상 응답하나, fallback
 *     은 future regression 방어용으로 유지.
 *
 * Track A 제외 영역:
 *   - 결제 트랜잭션 / payment hook / FOR UPDATE (Track C — 별도 hardening WO)
 *   - K-Cos action-queue active-orders 정책 (Track B)
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
    let dateFilter = `AND co."createdAt" >= $2`;
    if (to) {
      params.push(to.toISOString());
      dateFilter += ` AND co."createdAt" < $3`;
    }

    const result = await this.dataSource.query(
      `SELECT COUNT(*)::int as count,
              COALESCE(SUM(co."totalAmount"), 0)::numeric as revenue
       FROM checkout_orders co
       WHERE co."sellerOrganizationId" = $1
         AND co.metadata->>'serviceKey' = 'glycopharm'
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
       WHERE co."sellerOrganizationId" = $1
         AND co.metadata->>'serviceKey' = 'glycopharm'
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
   * StoreLocalProduct(store_local_products)는 Display Domain이며
   * checkout 도메인에 진입할 수 없으므로 KPI 에 포함되지 않는다.
   *
   * WO-O4O-STORE-KPI-DASHBOARD-CHECKOUT-ORDERS-ALIGNMENT-V1: JSONB 패턴.
   * legacy ecommerce_order_items JOIN → jsonb_array_elements(co.items) CROSS JOIN.
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
       WHERE co."sellerOrganizationId" = $1
         AND co.metadata->>'serviceKey' = 'glycopharm'
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
    // Recent orders 는 결제 완료 외 상태 (created, pending_payment, cancelled, refunded)
    // 도 운영자가 보고 싶어할 수 있음 — Track A 정책: 매출 KPI 는 paid 양성 조건이나,
    // recent orders 목록은 lifecycle 가시성 우선. cancelled/refunded 제외만 적용.
    const rows = await this.dataSource.query(
      `SELECT
         co.id,
         co."orderNumber",
         co."totalAmount",
         co.status,
         co.metadata->>'channel' as channel,
         co."createdAt"
       FROM checkout_orders co
       WHERE co."sellerOrganizationId" = $1
         AND co.metadata->>'serviceKey' = 'glycopharm'
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
       WHERE co."sellerOrganizationId" = $1
         AND co.metadata->>'serviceKey' = 'glycopharm'
         AND co.status = 'paid'`,
      [storeId],
    );

    return result[0]?.count || 0;
  }

  async getRevenueBetween(storeId: string, from: Date, to: Date): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COALESCE(SUM(co."totalAmount"), 0)::numeric as revenue
       FROM checkout_orders co
       WHERE co."sellerOrganizationId" = $1
         AND co.metadata->>'serviceKey' = 'glycopharm'
         AND co."createdAt" >= $2
         AND co."createdAt" < $3
         AND co.status = 'paid'`,
      [storeId, from.toISOString(), to.toISOString()],
    );

    return Number(result[0]?.revenue || 0);
  }
}
