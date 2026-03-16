/**
 * Catalog Import Offer Service
 *
 * Offer UPSERT — delegates to ProductImportCommonService
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
 * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-REFINEMENT-V1 (3.5 공통화)
 */

import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { ProductImportCommonService } from '../../neture/services/product-import-common.service.js';

export class CatalogImportOfferService {
  private importCommon: ProductImportCommonService;

  constructor() {
    this.importCommon = new ProductImportCommonService(AppDataSource);
  }

  async upsertOffer(
    manager: EntityManager,
    masterId: string,
    supplierId: string,
    distributionType: string,
    price: number,
    barcode: string,
  ): Promise<void> {
    await this.importCommon.upsertSupplierOffer(
      manager, masterId, supplierId, distributionType, price, barcode,
    );
  }
}
