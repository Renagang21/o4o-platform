/**
 * InventoryService — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts (WO-O4O-INVENTORY-ENGINE-V1)
 */
import type { DataSource } from 'typeorm';

// Opaque inventory snapshot, including non-UI writes such as fulfillment. No schema/version column required.
const INVENTORY_VERSION_SQL = `md5(jsonb_build_array(spo.stock_quantity, spo.reserved_quantity,
  spo.low_stock_threshold, spo.track_inventory, EXTRACT(EPOCH FROM spo.updated_at))::text)`;

export class InventoryService {
  constructor(private dataSource: DataSource) {}

  async getSupplierInventory(supplierId: string) {
    return this.dataSource.query(
      `SELECT spo.id AS offer_id, spo.master_id,
              pm.name, pm.brand_name, pm.barcode, pm.specification,
              pi.image_url AS primary_image_url,
              spo.price_general,
              spo.is_active,
              spo.stock_quantity, spo.reserved_quantity,
              spo.low_stock_threshold, spo.track_inventory,
              ${INVENTORY_VERSION_SQL} AS inventory_version,
              (spo.stock_quantity - spo.reserved_quantity) AS available_stock
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       LEFT JOIN product_images pi ON pi.master_id = pm.id AND pi.is_primary = true
       WHERE spo.supplier_id = $1
       ORDER BY spo.track_inventory DESC, pm.name ASC`,
      [supplierId],
    );
  }

  async getInventoryDetail(offerId: string, supplierId: string) {
    return this.dataSource.query(
      `SELECT spo.id AS offer_id, spo.master_id,
              pm.name, pm.brand_name, pm.barcode, pm.specification,
              pi.image_url AS primary_image_url,
              spo.price_general,
              spo.is_active,
              spo.stock_quantity, spo.reserved_quantity,
              spo.low_stock_threshold, spo.track_inventory,
              ${INVENTORY_VERSION_SQL} AS inventory_version,
              (spo.stock_quantity - spo.reserved_quantity) AS available_stock
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       LEFT JOIN product_images pi ON pi.master_id = pm.id AND pi.is_primary = true
       WHERE spo.id = $1 AND spo.supplier_id = $2`,
      [offerId, supplierId],
    );
  }

  async updateInventory(
    offerId: string,
    supplierId: string,
    data: { stock_quantity?: number; low_stock_threshold?: number; track_inventory?: boolean; expected_version?: string },
  ) {
    return this.dataSource.transaction(async (manager) => {
      // Verify ownership
      const ownerCheck = await manager.query(
        `SELECT spo.id, ${INVENTORY_VERSION_SQL} AS inventory_version
         FROM supplier_product_offers spo WHERE spo.id = $1 AND spo.supplier_id = $2 FOR UPDATE`,
        [offerId, supplierId],
      );
      if (ownerCheck.length === 0) return null;

      // Build update fields
      const setClauses: string[] = [];
      const params: any[] = [offerId, supplierId];
      let paramIdx = 3;

      if (data.stock_quantity !== undefined) {
        setClauses.push(`stock_quantity = $${paramIdx++}`);
        params.push(data.stock_quantity);
      }
      if (data.low_stock_threshold !== undefined) {
        setClauses.push(`low_stock_threshold = $${paramIdx++}`);
        params.push(data.low_stock_threshold);
      }
      if (data.track_inventory !== undefined) {
        setClauses.push(`track_inventory = $${paramIdx++}`);
        params.push(!!data.track_inventory);
      }

      if (setClauses.length === 0) return 'NO_UPDATES';
      // Old clients without a version retain their existing contract. The current UI sends its edit-start snapshot.
      if (data.expected_version !== undefined && ownerCheck[0].inventory_version !== data.expected_version) {
        return 'INVENTORY_CONFLICT';
      }

      setClauses.push('updated_at = NOW()');

      await manager.query(
        `UPDATE supplier_product_offers SET ${setClauses.join(', ')} WHERE id = $1 AND supplier_id = $2`,
        params,
      );

      // Return updated inventory
      const updated = await manager.query(
        `SELECT spo.id AS offer_id, spo.master_id,
              pm.name, pm.brand_name,
              spo.stock_quantity, spo.reserved_quantity,
              spo.low_stock_threshold, spo.track_inventory,
              ${INVENTORY_VERSION_SQL} AS inventory_version,
              (spo.stock_quantity - spo.reserved_quantity) AS available_stock
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       WHERE spo.id = $1 AND spo.supplier_id = $2`,
        [offerId, supplierId],
      );

      return updated[0];
    });
  }
}
