/**
 * ShipmentService — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts (WO-O4O-SHIPMENT-ENGINE-V1)
 */
import type { DataSource } from 'typeorm';

const SHIPMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  shipped: ['in_transit', 'delivered'],
  in_transit: ['delivered'],
};

export class ShipmentService {
  constructor(private dataSource: DataSource) {}

  async updateShipment(shipmentId: string, supplierId: string, data: { status: string; tracking_number?: string }) {
    // Fetch shipment with ownership check
    const rows = await this.dataSource.query(
      `SELECT * FROM neture_shipments WHERE id = $1 AND supplier_id = $2 LIMIT 1`,
      [shipmentId, supplierId],
    );
    if (rows.length === 0) return { error: 'SHIPMENT_NOT_FOUND' };

    const shipment = rows[0];

    // Validate status transition
    const allowed = SHIPMENT_STATUS_TRANSITIONS[shipment.status] || [];
    if (!allowed.includes(data.status)) {
      return { error: 'INVALID_TRANSITION', currentStatus: shipment.status, targetStatus: data.status };
    }

    // Build update query
    const setClauses = [`status = $1`, `updated_at = NOW()`];
    const params: any[] = [data.status];
    let paramIdx = 2;

    if (data.status === 'delivered') {
      setClauses.push(`delivered_at = NOW()`);
    }

    if (data.tracking_number) {
      setClauses.push(`tracking_number = $${paramIdx}`);
      params.push(data.tracking_number);
      paramIdx++;
    }

    params.push(shipmentId);
    const [updated] = await this.dataSource.query(
      `UPDATE neture_shipments SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params,
    );

    return { success: true, data: updated, orderId: shipment.order_id, isDelivered: data.status === 'delivered' };
  }
}
