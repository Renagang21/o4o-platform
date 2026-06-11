/**
 * SupplierUnifiedOrderService — WO-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1 (READ ONLY)
 *
 * neture_orders(공급자 fulfillment 원장) + checkout_orders(이벤트오퍼/서비스 주문)을
 * supplierId 기준으로 함께 조회하는 통합 "읽기" view. 병합/동기화/상태변경 없음.
 *
 * - neture_orders: join(neture_order_items→supplier_product_offers.supplier_id) 으로 공급자 스코프.
 * - checkout_orders: order-level "supplierId" 컬럼(camelCase, 반드시 따옴표)으로 스코프.
 * - 정렬은 createdAt DESC. 두 원장을 in-memory 병합 후 페이지네이션.
 * - 각 원장 per-source CAP 적용(과다 조회 방지). CAP 도달 시 log 로 명시(silent truncation 금지).
 * - checkout_orders 조회 실패 시 neture 단독으로 degrade.
 */
import type { DataSource } from 'typeorm';

const PER_SOURCE_CAP = 300;

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
    const wantNeture = source !== 'checkout';
    const wantCheckout = source !== 'neture';

    let netureRows: UnifiedSupplierOrder[] = [];
    let checkoutRows: UnifiedSupplierOrder[] = [];

    if (wantNeture) {
      try {
        netureRows = await this.queryNetureOrders(supplierId);
        if (netureRows.length >= PER_SOURCE_CAP) {
          console.warn(`[unified-orders] supplier ${supplierId} neture_orders hit cap ${PER_SOURCE_CAP}; total may be capped`);
        }
      } catch (e) {
        // neture_orders 조회 실패 → checkout 단독으로 degrade (읽기 view 안정성 우선)
        console.warn('[unified-orders] neture_orders query failed, degrading:', e);
        netureRows = [];
      }
    }

    if (wantCheckout) {
      try {
        checkoutRows = await this.queryCheckoutOrders(supplierId);
        if (checkoutRows.length >= PER_SOURCE_CAP) {
          console.warn(`[unified-orders] supplier ${supplierId} checkout_orders hit cap ${PER_SOURCE_CAP}; total may be capped`);
        }
      } catch (e) {
        // checkout_orders 조회 실패 → neture 단독으로 degrade (읽기 view 안정성 우선)
        console.warn('[unified-orders] checkout_orders query failed, degrading to neture-only:', e);
        checkoutRows = [];
      }
    }

    const merged = [...netureRows, ...checkoutRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const total = merged.length;
    const offset = (page - 1) * limit;
    const data = merged.slice(offset, offset + limit);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  private async queryNetureOrders(supplierId: string): Promise<UnifiedSupplierOrder[]> {
    const rows = await this.dataSource.query(
      `SELECT o.id::text AS id, o.order_number, o.status::text AS status,
              o.total_amount, o.shipping_fee, o.final_amount,
              o.orderer_name, o.created_at, o.updated_at,
              (SELECT COUNT(*)::int FROM neture.neture_order_items oi2
                 JOIN supplier_product_offers spo2 ON spo2.id = oi2.product_id::uuid
                 WHERE oi2.order_id = o.id AND spo2.supplier_id = $1) AS item_count,
              (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'name', oi3.product_name, 'quantity', oi3.quantity,
                        'unitPrice', oi3.unit_price, 'lineTotal', oi3.total_price)), '[]'::jsonb)
                 FROM neture.neture_order_items oi3
                 JOIN supplier_product_offers spo3 ON spo3.id = oi3.product_id::uuid
                 WHERE oi3.order_id = o.id AND spo3.supplier_id = $1) AS items_preview
       FROM neture_orders o
       WHERE EXISTS (
         SELECT 1 FROM neture.neture_order_items oi
         JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
         WHERE oi.order_id = o.id AND spo.supplier_id = $1
       )
       ORDER BY o.created_at DESC
       LIMIT ${PER_SOURCE_CAP}`,
      [supplierId],
    );
    return rows.map((o: any) => ({
      id: o.id,
      source: 'neture_order' as const,
      orderNumber: o.order_number ?? null,
      serviceKey: null,
      orderType: 'neture' as const,
      status: o.status ?? null,
      paymentStatus: null,
      fulfillmentStatus: o.status ?? null,
      supplierId,
      buyerName: o.orderer_name ?? null,
      buyerOrganizationName: null,
      subtotal: Number(o.total_amount ?? 0),
      shippingFee: Number(o.shipping_fee ?? 0),
      totalAmount: Number(o.final_amount ?? 0),
      itemCount: Number(o.item_count ?? 0),
      itemsPreview: Array.isArray(o.items_preview) ? o.items_preview : [],
      createdAt: o.created_at,
      updatedAt: o.updated_at ?? null,
      canFulfill: true,
      fulfillmentUrl: `/account/supplier/orders/${o.id}`,
      readOnlyReason: null,
    }));
  }

  private async queryCheckoutOrders(supplierId: string): Promise<UnifiedSupplierOrder[]> {
    const rows = await this.dataSource.query(
      `SELECT co.id::text AS id, co."orderNumber" AS order_number,
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
       LEFT JOIN organizations org ON org.id = co."sellerOrganizationId"
       WHERE co."supplierId" = $1
         -- WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1: bridge 된 checkout_order 는
         -- neture_orders row 로 노출되므로 checkout 소스에서 제외(중복 표시 방지).
         AND NOT EXISTS (
           SELECT 1 FROM neture_orders no2 WHERE no2.metadata->>'checkoutOrderId' = co.id::text
         )
       ORDER BY co."createdAt" DESC
       LIMIT ${PER_SOURCE_CAP}`,
      [supplierId],
    );
    return rows.map((o: any) => ({
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
      createdAt: o.created_at,
      updatedAt: o.updated_at ?? null,
      // WO-O4O-SUPPLIER-FULFILLMENT-PAYMENT-READINESS-GUARD-V1
      // checkout_orders 는 fulfillment bridge 가 도입되기 전까지 read-only(canFulfill=false)를 유지한다.
      // bridge 도입 시 fulfillable 판정은 payment/collection readiness(paymentStatus='paid' 등,
      // IR-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1) 충족 주문에 한정해야 한다. paymentStatus 는 위에서 노출.
      canFulfill: false,
      fulfillmentUrl: null,
      readOnlyReason: '결제 확인 및 공급자 배송 연결(bridge)이 완료된 주문만 배송 처리할 수 있습니다. checkout 주문 배송 통합은 후속 작업입니다.',
    }));
  }
}
