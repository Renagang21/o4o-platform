/**
 * CatalogImportRow Entity
 *
 * Catalog Import Job 내 개별 row — 검증 결과 및 Master 연결 정보 보관
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { CatalogImportJob } from './CatalogImportJob.entity.js';
import {
  CatalogImportRowStatus,
  CatalogImportRowAction,
} from '../types/catalog-import.types.js';

@Entity('catalog_import_rows')
@Index(['jobId'])
@Index(['parsedBarcode'])
export class CatalogImportRow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @ManyToOne('CatalogImportJob', 'rows', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job?: CatalogImportJob;

  @Column({ name: 'row_number', type: 'int' })
  rowNumber: number;

  @Column({ name: 'raw_json', type: 'jsonb' })
  rawJson: Record<string, unknown>;

  @Column({ name: 'parsed_barcode', type: 'varchar', length: 50, nullable: true })
  parsedBarcode: string | null;

  @Column({ name: 'parsed_product_name', type: 'varchar', length: 500, nullable: true })
  parsedProductName: string | null;

  @Column({ name: 'parsed_price', type: 'int', nullable: true })
  parsedPrice: number | null;

  @Column({ name: 'parsed_distribution_type', type: 'varchar', length: 20, nullable: true })
  parsedDistributionType: string | null;

  @Column({ name: 'parsed_manufacturer_name', type: 'varchar', length: 255, nullable: true })
  parsedManufacturerName: string | null;

  @Column({ name: 'parsed_brand_name', type: 'varchar', length: 255, nullable: true })
  parsedBrandName: string | null;

  @Column({ name: 'parsed_supplier_sku', type: 'varchar', length: 100, nullable: true })
  parsedSupplierSku: string | null;

  @Column({ name: 'parsed_image_urls', type: 'jsonb', nullable: true })
  parsedImageUrls: string[] | null;

  // WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1
  @Column({ name: 'parsed_msrp', type: 'int', nullable: true })
  parsedMsrp: number | null;

  @Column({ name: 'parsed_stock_qty', type: 'int', nullable: true })
  parsedStockQty: number | null;

  @Column({ name: 'parsed_description', type: 'text', nullable: true })
  parsedDescription: string | null;

  @Column({
    name: 'validation_status',
    type: 'enum',
    enum: CatalogImportRowStatus,
    enumName: 'catalog_import_row_status_enum',
    default: CatalogImportRowStatus.PENDING,
  })
  validationStatus: CatalogImportRowStatus;

  @Column({ name: 'validation_error', type: 'varchar', length: 500, nullable: true })
  validationError: string | null;

  @Column({ name: 'master_id', type: 'uuid', nullable: true })
  masterId: string | null;

  @Column({
    name: 'action_type',
    type: 'enum',
    enum: CatalogImportRowAction,
    enumName: 'catalog_import_row_action_enum',
    nullable: true,
  })
  actionType: CatalogImportRowAction | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
