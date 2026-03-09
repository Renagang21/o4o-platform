/**
 * Neture Supplier Orders Service
 *
 * Route handler에서 추출한 공급자 주문/배송 관련 SQL 쿼리.
 * SQL 자체는 변경 없이 단순 이동.
 *
 * WO-O4O-NETURE-SAFE-CLEANUP-V1
 */

import type { DataSource } from 'typeorm';

export class SupplierOrdersService {
  constructor(private dataSource: DataSource) {}

  // ==================== Order Queries ====================

  /** 공급자 대시보드 KPI */
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

  /** 공급자 주문 목록 (paginated) */
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

    return {
      orders,
      total: Number(countResult[0]?.total || 0),
      page,
      limit,
    };
  }

  /** 공급자가 소유한 주문인지 확인 (ownership check) */
  async checkOrderOwnership(orderId: string, supplierId: string): Promise<boolean> {
    const check = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM neture_order_items oi
       JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       WHERE oi.order_id = $1 AND spo.supplier_id = $2`,
      [orderId, supplierId],
    );
    return Number(check[0]?.cnt || 0) > 0;
  }

  /** 주문 아이템 enrichment (공급자/상품 마스터 정보) */
  async getOrderItemEnrichments(productIds: string[]) {
    return this.dataSource.query(
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
  }

  // ==================== Shipment Queries ====================

  /** 주문에 대한 기존 배송 레코드 존재 확인 */
  async checkShipmentExists(orderId: string, supplierId: string): Promise<boolean> {
    const existing = await this.dataSource.query(
      `SELECT id FROM neture_shipments WHERE order_id = $1 AND supplier_id = $2 LIMIT 1`,
      [orderId, supplierId],
    );
    return existing.length > 0;
  }

  /** 배송 레코드 생성 */
  async createShipment(data: {
    orderId: string;
    supplierId: string;
    carrierCode: string;
    carrierName: string;
    trackingNumber: string;
  }) {
    const [shipment] = await this.dataSource.query(
      `INSERT INTO neture_shipments (order_id, supplier_id, carrier_code, carrier_name, tracking_number, status, shipped_at)
       VALUES ($1, $2, $3, $4, $5, 'shipped', NOW())
       RETURNING *`,
      [data.orderId, data.supplierId, data.carrierCode, data.carrierName, data.trackingNumber],
    );
    return shipment;
  }

  /** 주문별 배송 레코드 조회 (공급자 소유 확인 포함) */
  async getShipmentByOrderAndSupplier(orderId: string, supplierId: string) {
    const rows = await this.dataSource.query(
      `SELECT * FROM neture_shipments WHERE order_id = $1 AND supplier_id = $2 LIMIT 1`,
      [orderId, supplierId],
    );
    return rows[0] || null;
  }

  /** 배송 ID + 공급자 소유 확인 조회 */
  async getShipmentById(shipmentId: string, supplierId: string) {
    const rows = await this.dataSource.query(
      `SELECT * FROM neture_shipments WHERE id = $1 AND supplier_id = $2 LIMIT 1`,
      [shipmentId, supplierId],
    );
    return rows[0] || null;
  }

  /** 배송 상태 업데이트 */
  async updateShipmentStatus(shipmentId: string, updates: { status: string; trackingNumber?: string }) {
    const setClauses = [`status = $1`, `updated_at = NOW()`];
    const params: any[] = [updates.status];
    let paramIdx = 2;

    if (updates.status === 'delivered') {
      setClauses.push(`delivered_at = NOW()`);
    }

    if (updates.trackingNumber) {
      setClauses.push(`tracking_number = $${paramIdx}`);
      params.push(updates.trackingNumber);
      paramIdx++;
    }

    params.push(shipmentId);
    const [updated] = await this.dataSource.query(
      `UPDATE neture_shipments SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params,
    );
    return updated;
  }
}
