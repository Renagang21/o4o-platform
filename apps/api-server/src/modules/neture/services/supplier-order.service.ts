/**
 * SupplierOrderService — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts (WO-O4O-SUPPLIER-ORDER-PROCESSING-V1, WO-O4O-SHIPMENT-ENGINE-V1)
 */
import type { DataSource } from 'typeorm';

/** Allowed supplier status transitions */
const SUPPLIER_STATUS_TRANSITIONS: Record<string, string[]> = {
  created: ['preparing'],
  paid: ['preparing'],
  preparing: ['shipped'],
  shipped: ['delivered'],
};

/** Extract region (시/도) from shipping address */
function extractRegion(shipping: any): string | null {
  try {
    const s = typeof shipping === 'string' ? JSON.parse(shipping) : shipping;
    if (s?.address) {
      const first = s.address.trim().split(/\s+/)[0];
      return first || null;
    }
    return null;
  } catch { return null; }
}

export class SupplierOrderService {
  constructor(private dataSource: DataSource) {}

  async getOrderKpi(supplierId: string) {
    const result = await this.dataSource.query(
      `SELECT
         COUNT(DISTINCT o.id) FILTER (WHERE o.created_at >= CURRENT_DATE)::int AS today_orders,
         COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('created', 'paid'))::int AS pending_processing,
         COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'preparing')::int AS pending_shipping,
         COUNT(DISTINCT o.id)::int AS total_orders
       FROM neture_orders o
       JOIN neture.neture_order_items oi ON oi.order_id = o.id
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       WHERE spo.supplier_id = $1`,
      [supplierId],
    );
    return {
      today_orders: Number(result[0]?.today_orders || 0),
      pending_processing: Number(result[0]?.pending_processing || 0),
      pending_shipping: Number(result[0]?.pending_shipping || 0),
      total_orders: Number(result[0]?.total_orders || 0),
    };
  }

  async listOrders(supplierId: string, params: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = params;
    const offset = (page - 1) * limit;

    const baseParams: any[] = [supplierId];
    let statusClause = '';
    if (status) {
      statusClause = 'AND o.status = $2';
      baseParams.push(status);
    }

    const [orders, countResult] = await Promise.all([
      this.dataSource.query(
        `SELECT DISTINCT ON (o.created_at, o.id)
                o.id, o.order_number, o.status, o.total_amount, o.shipping_fee,
                o.final_amount, o.orderer_name, o.orderer_phone, o.orderer_email,
                o.shipping, o.note, o.created_at, o.updated_at,
                (SELECT COUNT(*)::int FROM neture.neture_order_items oi2
                 JOIN supplier_product_offers spo2 ON spo2.id = oi2.product_id::uuid
                 WHERE oi2.order_id = o.id AND spo2.supplier_id = $1) AS item_count
         FROM neture_orders o
         JOIN neture.neture_order_items oi ON oi.order_id = o.id
         JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
         WHERE spo.supplier_id = $1 ${statusClause}
         ORDER BY o.created_at DESC, o.id
         LIMIT ${limit} OFFSET ${offset}`,
        baseParams,
      ),
      this.dataSource.query(
        `SELECT COUNT(DISTINCT o.id)::int AS total
         FROM neture_orders o
         JOIN neture.neture_order_items oi ON oi.order_id = o.id
         JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
         WHERE spo.supplier_id = $1 ${statusClause}`,
        baseParams,
      ),
    ]);

    const total = Number(countResult[0]?.total || 0);

    const data = orders.map((o: any) => {
      const shippingParsed = typeof o.shipping === 'string' ? JSON.parse(o.shipping) : o.shipping;
      return {
        ...o,
        item_count: Number(o.item_count || 0),
        shipping: shippingParsed,
        region: extractRegion(o.shipping),
      };
    });

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async validateOwnership(orderId: string, supplierId: string): Promise<boolean> {
    const ownerCheck = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM neture.neture_order_items oi
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       WHERE oi.order_id = $1 AND spo.supplier_id = $2`,
      [orderId, supplierId],
    );
    return Number(ownerCheck[0]?.cnt) > 0;
  }

  async enrichOrderItems(items: any[]) {
    if (!items || items.length === 0) return items;
    const productIds = items.map((i: any) => i.product_id);
    const enrichments = await this.dataSource.query(
      `SELECT spo.id AS offer_id,
              s.id AS supplier_id, supplier_org.name AS supplier_name,
              s.contact_phone AS supplier_phone, s.contact_website AS supplier_website,
              pm.brand_name, pm.specification, pm.barcode,
              pi.image_url AS primary_image_url
       FROM supplier_product_offers spo
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       LEFT JOIN organizations supplier_org ON supplier_org.id = s.organization_id
       JOIN product_masters pm ON pm.id = spo.master_id
       LEFT JOIN product_images pi ON pi.master_id = pm.id AND pi.is_primary = true
       WHERE spo.id = ANY($1::uuid[])`,
      [productIds],
    );
    const enrichMap = new Map<string, any>(enrichments.map((e: any) => [e.offer_id, e]));
    return items.map((item: any) => {
      const e = enrichMap.get(item.product_id);
      return {
        ...item,
        supplier_id: e?.supplier_id || null,
        supplier_name: e?.supplier_name || null,
        supplier_phone: e?.supplier_phone || null,
        supplier_website: e?.supplier_website || null,
        brand_name: e?.brand_name || null,
        specification: e?.specification || null,
        barcode: e?.barcode || null,
        primary_image_url: e?.primary_image_url || item.product_image || null,
      };
    });
  }

  getStatusTransitions() { return SUPPLIER_STATUS_TRANSITIONS; }

  /**
   * WO-O4O-SUPPLIER-FULFILLMENT-PAYMENT-READINESS-GUARD-V1
   *
   * checkout_order-origin(또는 future fulfillment bridge) 주문이 payment/collection readiness
   * 확인 전에 배송 흐름(preparing/shipped/delivered 전이, shipment 생성)에 들어가는 것을 막기 위한
   * readiness 판정.
   *
   * - 적용 대상은 metadata 로 식별되는 checkout-origin 주문에 한정한다.
   *   (metadata.source='checkout_order' | metadata.sourceOrderType='checkout_order' | metadata.checkoutOrderId)
   * - legacy neture_orders(위 마커 없음)는 V1 guard 비대상 → fulfillmentReady=true 로 통과시켜
   *   기존 Neture B2B 운영(created→preparing 등)을 그대로 유지한다.
   * - readiness 기준(IR-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1):
   *     paymentReady   := metadata.paymentStatus='paid' | metadata.paymentReady=true
   *     collectionReady:= metadata.collectionStatus='confirmed'  (V2 collectionStatus 모델 대비)
   *   + 보조: bridge 가 neture_order 자체를 paid 로 세팅한 경우(status='paid' | paid_at)도 ready 로 인정.
   *
   * 현재 bridge 가 아직 없어 checkout-origin neture_order 는 존재하지 않을 수 있다(positive guard hit 미발생).
   * 기준만 미리 박아 future bridge 가 미결제 주문을 배송에 태우지 못하게 한다.
   */
  async getFulfillmentReadiness(orderId: string): Promise<{ isCheckoutOrigin: boolean; fulfillmentReady: boolean }> {
    const rows = await this.dataSource.query(
      `SELECT status::text AS status, paid_at, metadata FROM neture_orders WHERE id = $1 LIMIT 1`,
      [orderId],
    );
    const row = rows[0];
    if (!row) return { isCheckoutOrigin: false, fulfillmentReady: true };

    const md = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const isCheckoutOrigin =
      md.source === 'checkout_order' ||
      md.sourceOrderType === 'checkout_order' ||
      !!md.checkoutOrderId;

    // legacy neture_orders — V1 guard 비대상 (기존 B2B 운영 보호)
    if (!isCheckoutOrigin) return { isCheckoutOrigin: false, fulfillmentReady: true };

    const paymentReady = md.paymentStatus === 'paid' || md.paymentReady === true;
    const collectionReady = md.collectionStatus === 'confirmed';
    const statusReady = row.status === 'paid' || !!row.paid_at;
    return { isCheckoutOrigin: true, fulfillmentReady: paymentReady || collectionReady || statusReady };
  }

  async createShipment(orderId: string, supplierId: string, data: { carrier_code: string; carrier_name: string; tracking_number: string }) {
    // Check if shipment already exists
    const existing = await this.dataSource.query(
      `SELECT id FROM neture_shipments WHERE order_id = $1 AND supplier_id = $2 LIMIT 1`,
      [orderId, supplierId],
    );
    if (existing.length > 0) return { error: 'SHIPMENT_EXISTS' };

    const [shipment] = await this.dataSource.query(
      `INSERT INTO neture_shipments (order_id, supplier_id, carrier_code, carrier_name, tracking_number, status, shipped_at)
       VALUES ($1, $2, $3, $4, $5, 'shipped', NOW())
       RETURNING *`,
      [orderId, supplierId, data.carrier_code, data.carrier_name, data.tracking_number],
    );

    return { success: true, data: shipment };
  }

  async getShipment(orderId: string, supplierId: string) {
    const rows = await this.dataSource.query(
      `SELECT * FROM neture_shipments WHERE order_id = $1 AND supplier_id = $2 LIMIT 1`,
      [orderId, supplierId],
    );
    return rows[0] || null;
  }
}
