/**
 * CSV Parser Extension
 *
 * Generic CSV → NormalizedProduct[] parser
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
 */

import { parse } from 'csv-parse/sync';
import type { CatalogParserExtension, NormalizedProduct } from '../../types/catalog-import.types.js';

export const csvParserExtension: CatalogParserExtension = {
  extensionKey: 'csv',

  parse(buffer: Buffer, _originalname: string): NormalizedProduct[] {
    const csvString = buffer.toString('utf-8');
    const records = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, string>[];

    return records.map((raw, index) => ({
      rowNumber: index + 1,
      rawData: raw,
      barcode: raw.barcode?.trim() || null,
      productName: raw.product_name?.trim() || null,
      brandName: raw.brand_name?.trim() || null,
      manufacturerName: raw.manufacturer_name?.trim() || null,
      regulatoryName: raw.regulatory_name?.trim() || null,
      regulatoryType: raw.regulatory_type?.trim() || null,
      price: raw.supply_price ? parseInt(raw.supply_price.trim(), 10) || null : null,
      distributionType: raw.distribution_type?.trim().toUpperCase() || null,
      supplierSku: raw.supplier_sku?.trim() || null,
      imageUrls: [],
      metadata: {},
    }));
  },
};
