/**
 * Catalog Import Offer Service
 *
 * Offer UPSERT — same SQL as csv-import.service.ts
 * ON CONFLICT (master_id, supplier_id) DO UPDATE
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
 */

import type { EntityManager } from 'typeorm';
import { OfferApprovalStatus } from '../../neture/entities/index.js';
import logger from '../../../utils/logger.js';

export class CatalogImportOfferService {
  async upsertOffer(
    manager: EntityManager,
    masterId: string,
    supplierId: string,
    distributionType: string,
    price: number,
    barcode: string,
  ): Promise<void> {
    const slug = `${barcode}-${supplierId.slice(0, 8)}-${Date.now()}`;

    await manager.query(
      `INSERT INTO supplier_product_offers
        (id, master_id, supplier_id, distribution_type, approval_status, is_active,
         price_general, slug, created_at, updated_at)
       VALUES
        (gen_random_uuid(), $1, $2, $3, $4, false, $5, $6, NOW(), NOW())
       ON CONFLICT (master_id, supplier_id) DO UPDATE SET
         price_general = EXCLUDED.price_general,
         distribution_type = EXCLUDED.distribution_type::supplier_product_offers_distribution_type_enum,
         updated_at = NOW()`,
      [masterId, supplierId, distributionType, OfferApprovalStatus.PENDING, price, slug],
    );

    logger.info(`[CatalogImport] Upserted offer for master=${masterId}, supplier=${supplierId}`);
  }
}
