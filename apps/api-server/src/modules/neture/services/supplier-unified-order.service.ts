/**
 * SupplierUnifiedOrderService — WO-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1 (READ ONLY)
 *
 * neture_orders(공급자 fulfillment 원장) + checkout_orders(이벤트오퍼/서비스 주문)을
 * supplierId 기준으로 함께 조회하는 통합 "읽기" view. 병합/동기화/상태변경 없음.
 *
 * - neture_orders: join(neture_order_items→supplier_product_offers.supplier_id) 으로 공급자 스코프.
 * - checkout_orders: order-level "supplierId" 컬럼(camelCase, 반드시 따옴표)으로 스코프.
 * - 동일 snapshot에서 전체 건수와 DB 페이지를 조회한다(원장별 300건 제한 없음).
 * - 정렬은 createdAt DESC, source ASC, id ASC로 동률에서도 안정적이다.
 * - 어느 원장 조회든 실패하면 기존 controller의 HTTP 500 계약으로 전달한다.
 */
// WO-O4O-SUPPLIER-FULFILLMENT-SERVICE-SCOPE-V1
import { SUPPLIER_VISIBLE_FULFILLMENT_SERVICE_KEYS, checkoutOrderServiceSetSql, netureOrderServiceSetSql } from '../constants/fulfillment-service-scope.js';
import type { DataSource } from 'typeorm';

export type UnifiedOrderSource = 'neture' | 'checkout' | 'all';

export interface UnifiedSupplierOrder {
  id: string;
  source: 'neture_order' | 'checkout_order';
  orderNumber: string | null;
  serviceKey: string | null;
  orderType: 'neture' | 'event_offer' | 'service_checkout';
  status: string | null;
  paymentStatus: string | null;
  fulfillmentStatus: string | null;
  supplierId: string;
  buyerName: string | null;
  buyerOrganizationName: string | null;
  /** 테스트 결제(실결제 아님) 주문 — WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 */
  testPayment?: boolean;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  itemCount: number;
  itemsPreview: Array<{ name: string; quantity: number; unitPrice?: number | null; lineTotal?: number | null }>;
  createdAt: string;
  updatedAt: string | null;
  canFulfill: boolean;
  fulfillmentUrl: string | null;
  readOnlyReason: string | null;
}

export class SupplierUnifiedOrderService {
  constructor(private dataSource: DataSource) {}

  async listUnifiedOrders(
    supplierId: string,
    params: { page: number; limit: number; source?: UnifiedOrderSource },
  ): Promise<{ data: UnifiedSupplierOrder[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const { page, limit } = params;
    const source = params.source ?? 'all';
    // 내부 호출도 잘못된 페이지나 source를 SQL에 전달하지 않는다.
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100
      || !['all', 'neture', 'checkout'].includes(source) || !Number.isSafeInteger((page - 1) * limit)) {
      throw new Error('INVALID_UNIFIED_ORDER_PAGINATION');
    }

    const references: string[] = [];
    if (source !== 'checkout') references.push(`
      SELECT o.id::text AS id, 'neture_order'::text AS source, o.created_at AS created_at
      FROM neture_orders o WHERE ${this.netureScopeSql()}`);
    if (source !== 'neture') references.push(`
      SELECT co.id::text AS id, 'checkout_order'::text AS source, co."createdAt" AS created_at
      FROM checkout_orders co WHERE ${this.checkoutScopeSql()}`);

    // 건수와 페이지는 단일 SQL/snapshot. 무거운 명세 집계는 해당 페이지의 주문만 수행한다.
    const netureDetail = source === 'checkout' ? 'NULL::jsonb' : `(
      SELECT to_jsonb(detail) FROM (${this.netureDetailSql()}
        WHERE o.id = p.id::uuid AND p.source = 'neture_order') detail)`;
    const checkoutDetail = source === 'neture' ? 'NULL::jsonb' : `(
      SELECT to_jsonb(detail) FROM (${this.checkoutDetailSql()}
        WHERE co.id = p.id::uuid AND p.source = 'checkout_order') detail)`;
    const rows: Array<{ total: string; source: UnifiedSupplierOrder['source'] | null; detail: Record<string, any> | null }> =
      await this.dataSource.query(`
        WITH order_refs AS MATERIALIZED (${references.join(' UNION ALL ')}),
        page_refs AS (
          SELECT * FROM order_refs ORDER BY created_at DESC, source ASC, id ASC LIMIT $3 OFFSET $4
        )
        SELECT totals.total, p.source, COALESCE(${netureDetail}, ${checkoutDetail}) AS detail
        FROM (SELECT COUNT(*)::text AS total FROM order_refs) totals
        LEFT JOIN page_refs p ON TRUE
        ORDER BY p.created_at DESC, p.source ASC, p.id ASC`,
      [supplierId, SUPPLIER_VISIBLE_FULFILLMENT_SERVICE_KEYS, limit, (page - 1) * limit]);

    const total = Number(rows[0]?.total ?? 0);
    const data = rows.filter((row) => row.source !== null).map((row) => {
      if (!row.detail) throw new Error('UNIFIED_ORDER_DETAIL_MISSING');
      return row.source === 'neture_order'
        ? this.mapNetureOrder(row.detail, supplierId)
        : this.mapCheckoutOrder(row.detail, supplierId);
    });
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  // A shared bind spans UUID offer ownership and varchar checkout ownership.
  // Cast parameters, preserving the stored identifiers and column indexes.
  private netureScopeSql(): string {
    return `EXISTS (
      SELECT 1 FROM neture.neture_order_items oi
      JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
      WHERE oi.order_id = o.id AND spo.supplier_id = $1::uuid
    ) AND ${netureOrderServiceSetSql('o', '$2')}`;
  }

  private checkoutScopeSql(): string {
    return `co."supplierId" = $1::varchar
      AND ${checkoutOrderServiceSetSql('co', '$2')}
      AND co."paymentStatus" = 'paid'
      AND NOT EXISTS (
        SELECT 1 FROM neture_orders no2 WHERE no2.metadata->>'checkoutOrderId' = co.id::text
      )`;
  }

  private netureDetailSql(): string {
    return `SELECT o.id::text AS id, o.order_number, o.status::text AS status,
              o.total_amount, o.shipping_fee, o.final_amount,
              o.orderer_name, o.created_at, o.updated_at,
              o.service_key, o.metadata->>'buyerOrganizationName' AS buyer_organization_name,
              COALESCE((o.metadata->>'testPayment')::boolean, false) AS test_payment,
              (SELECT COUNT(*)::int FROM neture.neture_order_items oi2
                 JOIN supplier_product_offers spo2 ON spo2.id = oi2.product_id::uuid
                 WHERE oi2.order_id = o.id AND spo2.supplier_id = $1::uuid) AS item_count,
              (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'name', oi3.product_name, 'quantity', oi3.quantity,
                        'unitPrice', oi3.unit_price, 'lineTotal', oi3.total_price)), '[]'::jsonb)
                 FROM neture.neture_order_items oi3
                 JOIN supplier_product_offers spo3 ON spo3.id = oi3.product_id::uuid
                 WHERE oi3.order_id = o.id AND spo3.supplier_id = $1::uuid) AS items_preview
       FROM neture_orders o`;
  }

  private mapNetureOrder(o: Record<string, any>, supplierId: string): UnifiedSupplierOrder {
    return {
      id: o.id,
      source: 'neture_order' as const,
      orderNumber: o.order_number ?? null,
      serviceKey: o.service_key ?? null,
      orderType: 'neture' as const,
      status: o.status ?? null,
      paymentStatus: null,
      fulfillmentStatus: o.status ?? null,
      supplierId,
      buyerName: o.orderer_name ?? null,
      buyerOrganizationName: o.buyer_organization_name ?? null,
      testPayment: o.test_payment === true,
      subtotal: Number(o.total_amount ?? 0),
      shippingFee: Number(o.shipping_fee ?? 0),
      totalAmount: Number(o.final_amount ?? 0),
      itemCount: Number(o.item_count ?? 0),
      itemsPreview: Array.isArray(o.items_preview) ? o.items_preview : [],
      createdAt: new Date(o.created_at).toISOString(),
      updatedAt: o.updated_at == null ? null : new Date(o.updated_at).toISOString(),
      canFulfill: true,
      // WO-O4O-NETURE-SUPPLIER-ORDER-ROUTE-CANONICALIZATION-V1:
      // read model URL 계약만 canonical 트리로 이관 (/account/supplier/orders/:id → /supplier/orders/:id).
      // canFulfill 판정 · source · 상태 · 처리 불가 주문의 fulfillmentUrl=null 계약은 무변경.
      fulfillmentUrl: `/supplier/orders/${o.id}`,
      readOnlyReason: null,
    };
  }
  private checkoutDetailSql(): string {
    return `SELECT co.id::text AS id, co."orderNumber" AS order_number,
              co.metadata->>'serviceKey' AS service_key,
              co.metadata->>'productListingId' AS product_listing_id,
              co.status::text AS status, co."paymentStatus"::text AS payment_status,
              co.subtotal, co."shippingFee" AS shipping_fee, co."totalAmount" AS total_amount,
              COALESCE(jsonb_array_length(co.items), 0) AS item_count,
              COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                         'name', elem->>'productName',
                         'quantity', (elem->>'quantity')::int,
                         'unitPrice', (elem->>'unitPrice')::numeric,
                         'lineTotal', (elem->>'subtotal')::numeric))
                FROM jsonb_array_elements(co.items) AS elem
              ), '[]'::jsonb) AS items_preview,
              u.name AS buyer_name, org.name AS org_name,
              co."createdAt" AS created_at, co."updatedAt" AS updated_at
       FROM checkout_orders co
       LEFT JOIN users u ON u.id = co."buyerId"
       LEFT JOIN organizations org ON org.id = co."sellerOrganizationId"`;
  }

  private mapCheckoutOrder(o: Record<string, any>, supplierId: string): UnifiedSupplierOrder {
    return {
      id: o.id,
      source: 'checkout_order' as const,
      orderNumber: o.order_number ?? null,
      serviceKey: o.service_key ?? null,
      orderType: o.product_listing_id ? ('event_offer' as const) : ('service_checkout' as const),
      status: o.status ?? null,
      paymentStatus: o.payment_status ?? null,
      fulfillmentStatus: null,
      supplierId,
      buyerName: o.buyer_name ?? null,
      buyerOrganizationName: o.org_name ?? null,
      subtotal: Number(o.subtotal ?? 0),
      shippingFee: Number(o.shipping_fee ?? 0),
      totalAmount: Number(o.total_amount ?? 0),
      itemCount: Number(o.item_count ?? 0),
      itemsPreview: Array.isArray(o.items_preview) ? o.items_preview : [],
      createdAt: new Date(o.created_at).toISOString(),
      updatedAt: o.updated_at == null ? null : new Date(o.updated_at).toISOString(),
      // WO-O4O-SUPPLIER-FULFILLMENT-PAYMENT-READINESS-GUARD-V1
      // checkout_orders 는 fulfillment bridge 가 도입되기 전까지 read-only(canFulfill=false)를 유지한다.
      // bridge 도입 시 fulfillable 판정은 payment/collection readiness(paymentStatus='paid' 등,
      // IR-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1) 충족 주문에 한정해야 한다. paymentStatus 는 위에서 노출.
      canFulfill: false,
      fulfillmentUrl: null,
      readOnlyReason: '결제 확인 및 공급자 배송 연결(bridge)이 완료된 주문만 배송 처리할 수 있습니다. 배송 처리 연결 상태를 확인해야 합니다.',
    };
  }

}
