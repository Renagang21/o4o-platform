/**
 * Catalog Import Types & Enums
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
 */

export type CatalogImportExtensionKey = 'csv';

export enum CatalogImportJobStatus {
  UPLOADED = 'UPLOADED',
  VALIDATING = 'VALIDATING',
  VALIDATED = 'VALIDATED',
  APPLYING = 'APPLYING',
  APPLIED = 'APPLIED',
  FAILED = 'FAILED',
}

export enum CatalogImportRowStatus {
  PENDING = 'PENDING',
  VALID = 'VALID',
  WARNING = 'WARNING',
  REJECTED = 'REJECTED',
}

export enum CatalogImportRowAction {
  LINK_EXISTING = 'LINK_EXISTING',
  CREATE_MASTER = 'CREATE_MASTER',
  REJECT = 'REJECT',
}

export interface NormalizedProduct {
  rowNumber: number;
  rawData: Record<string, unknown>;
  barcode: string | null;
  productName: string | null;
  brandName: string | null;
  manufacturerName: string | null;
  regulatoryName: string | null;
  regulatoryType: string | null;
  price: number | null;
  distributionType: string | null;
  supplierSku: string | null;
  imageUrls: string[];
  metadata: Record<string, unknown>;
  // WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1
  msrp?: number | null;
  stockQty?: number | null;
  description?: string | null;
  hasOptions?: boolean;
}

export interface CatalogParserExtension {
  extensionKey: CatalogImportExtensionKey;
  parse(buffer: Buffer, originalname: string): NormalizedProduct[];
}
