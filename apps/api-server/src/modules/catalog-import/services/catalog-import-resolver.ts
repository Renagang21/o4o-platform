/**
 * Catalog Import Resolver
 *
 * Delegates to NetureService.resolveOrCreateMaster() for master creation
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
 */

import { NetureService } from '../../neture/neture.service.js';
import { CatalogImportRow } from '../entities/CatalogImportRow.entity.js';
import logger from '../../../utils/logger.js';

const netureService = new NetureService();

export class CatalogImportResolver {
  async resolveMaster(row: CatalogImportRow): Promise<string | null> {
    const barcode = row.parsedBarcode;
    if (!barcode) return null;

    // If already linked, return existing masterId
    if (row.masterId) return row.masterId;

    // Build manualData from parsed fields
    const manualData = {
      regulatoryName: row.parsedProductName || barcode,
      manufacturerName: row.parsedManufacturerName || 'Unknown',
      name: row.parsedProductName || undefined,
    };

    const result = await netureService.resolveOrCreateMaster(barcode, manualData);

    if (result.success && result.data) {
      logger.info(`[CatalogImport] Resolved master ${result.data.id} for barcode ${barcode}`);
      return result.data.id;
    }

    logger.warn(`[CatalogImport] Failed to resolve master for barcode ${barcode}: ${result.error}`);
    return null;
  }
}
