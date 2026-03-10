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
       JOIN neture_order_items oi ON oi.order_id = o.id
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
                (SELECT COUNT(*)::int FROM neture_order_items oi2
                 JOIN supplier_product_offers spo2 ON spo2.id = oi2.product_id::uuid
                 WHERE oi2.order_id = o.id AND spo2.supplier_id = $1) AS item_count
         FROM neture_orders o
         JOIN neture_order_items oi ON oi.order_id = o.id
         JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
         WHERE spo.supplier_id = $1 ${statusClause}
         ORDER BY o.created_at DESC, o.id
         LIMIT ${limit} OFFSET ${offset}`,
        baseParams,
      ),
      this.dataSource.query(
        `SELECT COUNT(DISTINCT o.id)::int AS total
         FROM neture_orders o
         JOIN neture_order_items oi ON oi.order_id = o.id
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
      `SELECT COUNT(*)::int AS cnt FROM neture_order_items oi
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
              s.id AS supplier_id, s.name AS supplier_name,
              s.contact_phone AS supplier_phone, s.contact_website AS supplier_website,
              pm.brand_name, pm.specification, pm.barcode,
              pi.image_url AS primary_image_url
       FROM supplier_product_offers spo
       JOIN neture_suppliers s ON s.id = spo.supplier_id
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
