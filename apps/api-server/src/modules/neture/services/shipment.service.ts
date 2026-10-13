/**
 * ShipmentService — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts (WO-O4O-SHIPMENT-ENGINE-V1)
 */
import type { DataSource } from 'typeorm';
import { NetureService } from '../../../routes/neture/services/neture.service.js';
import { NetureOrderStatus } from '../../../routes/neture/entities/neture-order.entity.js';

const SHIPMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  shipped: ['in_transit', 'delivered'],
  in_transit: ['delivered'],
};

export class ShipmentService {
  constructor(private dataSource: DataSource) {}

  async updateShipment(shipmentId: string, supplierId: string, data: { status: string; tracking_number?: string }) {
    return this.dataSource.transaction(async (manager) => {
      const [reference] = await manager.query(
        'SELECT order_id FROM neture_shipments WHERE id = $1 AND supplier_id = $2',
        [shipmentId, supplierId],
      );
      if (!reference) return { error: 'SHIPMENT_NOT_FOUND' };
      // Lock order before shipment, consistently with shipment creation and direct status writes.
      const locked = await manager.query('SELECT id FROM neture_orders WHERE id = $1 FOR UPDATE', [reference.order_id]);
      if (!locked.length) throw new Error('Shipment order not found');
      // Fetch shipment with ownership check
      const rows = await manager.query(
        `SELECT * FROM neture_shipments WHERE id = $1 AND supplier_id = $2 LIMIT 1 FOR UPDATE`,
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
      const [updated] = await manager.query(
        `WITH changed AS (UPDATE neture_shipments SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *) SELECT * FROM changed`,
        params,
      );
      if (!updated) throw new Error('Shipment update failed');

      if (data.status === 'delivered') {
        const order = await new NetureService(manager).updateOrderStatus(
          shipment.order_id,
          { status: NetureOrderStatus.DELIVERED },
          manager,
        );
        if (!order) throw new Error('Order update failed');
      }
      return { success: true, data: updated, orderId: shipment.order_id, isDelivered: data.status === 'delivered' };
    });
  }
}
