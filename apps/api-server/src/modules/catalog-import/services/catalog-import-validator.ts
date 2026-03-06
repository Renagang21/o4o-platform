/**
 * Catalog Import Validator
 *
 * GTIN + barcode + price + distribution_type validation
 * Looks up existing ProductMaster by barcode → LINK_EXISTING or CREATE_MASTER
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
 */

import { Repository } from 'typeorm';
import { validateGtin } from '../../../utils/gtin.js';
import { ProductMaster } from '../../neture/entities/index.js';
import { CatalogImportRow } from '../entities/CatalogImportRow.entity.js';
import {
  CatalogImportRowStatus,
  CatalogImportRowAction,
} from '../types/catalog-import.types.js';

const VALID_DISTRIBUTION_TYPES = ['PUBLIC', 'PRIVATE', 'SERVICE'];

export interface ValidationResult {
  validCount: number;
  warningCount: number;
  rejectedCount: number;
}

export class CatalogImportValidator {
  constructor(private readonly masterRepo: Repository<ProductMaster>) {}

  async validateRows(rows: CatalogImportRow[]): Promise<ValidationResult> {
    const seenBarcodes = new Set<string>();
    let validCount = 0;
    let warningCount = 0;
    let rejectedCount = 0;

    for (const row of rows) {
      const barcode = row.parsedBarcode?.trim() || '';

      // 1. barcode presence
      if (!barcode) {
        this.rejectRow(row, 'MISSING_BARCODE');
        rejectedCount++;
        continue;
      }

      // 2. GTIN check
      const gtinError = validateGtin(barcode);
      if (gtinError) {
        this.rejectRow(row, `INVALID_GTIN: ${gtinError}`);
        rejectedCount++;
        continue;
      }

      // 3. batch-internal dedup
      if (seenBarcodes.has(barcode)) {
        this.rejectRow(row, 'DUPLICATE_IN_BATCH');
        rejectedCount++;
        continue;
      }
      seenBarcodes.add(barcode);

      // 4. price validation
      if (row.parsedPrice !== null && row.parsedPrice !== undefined) {
        if (isNaN(row.parsedPrice) || row.parsedPrice < 0) {
          this.rejectRow(row, 'INVALID_PRICE');
          rejectedCount++;
          continue;
        }
      }

      // 5. distribution_type check
      const dist = row.parsedDistributionType?.toUpperCase() || '';
      if (dist && !VALID_DISTRIBUTION_TYPES.includes(dist)) {
        this.rejectRow(row, `INVALID_DISTRIBUTION_TYPE: ${dist}`);
        rejectedCount++;
        continue;
      }

      // 6. Lookup existing ProductMaster by barcode
      const existingMaster = await this.masterRepo.findOne({
        where: { barcode },
        select: ['id'],
      });

      if (existingMaster) {
        row.masterId = existingMaster.id;
        row.actionType = CatalogImportRowAction.LINK_EXISTING;
        row.validationStatus = CatalogImportRowStatus.VALID;
        validCount++;
      } else {
        // Master not found → will be created during apply phase if manualData available
        row.actionType = CatalogImportRowAction.CREATE_MASTER;
        if (row.parsedProductName && row.parsedManufacturerName) {
          row.validationStatus = CatalogImportRowStatus.VALID;
          validCount++;
        } else {
          row.validationStatus = CatalogImportRowStatus.WARNING;
          row.validationError = 'MASTER_NOT_FOUND: product_name and manufacturer_name recommended for auto-creation';
          warningCount++;
        }
      }
    }

    return { validCount, warningCount, rejectedCount };
  }

  private rejectRow(row: CatalogImportRow, error: string): void {
    row.validationStatus = CatalogImportRowStatus.REJECTED;
    row.actionType = CatalogImportRowAction.REJECT;
    row.validationError = error;
  }
}
