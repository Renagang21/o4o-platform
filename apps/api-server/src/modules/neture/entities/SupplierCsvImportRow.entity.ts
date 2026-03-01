/**
 * SupplierCsvImportRow Entity
 *
 * CSV batch 내 개별 row — 검증 결과 및 Master 연결 정보 보관
 *
 * WO-O4O-B2B-CSV-INGEST-PIPELINE-V1
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
import type { SupplierCsvImportBatch } from './SupplierCsvImportBatch.entity.js';

export enum CsvRowValidationStatus {
  PENDING = 'PENDING',
  VALID = 'VALID',
  REJECTED = 'REJECTED',
}

export enum CsvRowActionType {
  LINK_EXISTING = 'LINK_EXISTING',
  CREATE_MASTER = 'CREATE_MASTER',
  REJECT = 'REJECT',
}

@Entity('supplier_csv_import_rows')
@Index(['batchId'])
@Index(['parsedBarcode'])
export class SupplierCsvImportRow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_id', type: 'uuid' })
  batchId: string;

  @ManyToOne('SupplierCsvImportBatch', 'rows', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch?: SupplierCsvImportBatch;

  @Column({ name: 'row_number', type: 'int' })
  rowNumber: number;

  /** 원본 CSV row 데이터 */
  @Column({ name: 'raw_json', type: 'jsonb' })
  rawJson: Record<string, unknown>;

  @Column({ name: 'parsed_barcode', type: 'varchar', length: 14, nullable: true })
  parsedBarcode: string | null;

  @Column({ name: 'parsed_supply_price', type: 'int', nullable: true })
  parsedSupplyPrice: number | null;

  @Column({ name: 'parsed_distribution_type', type: 'varchar', length: 10, nullable: true })
  parsedDistributionType: string | null;

  @Column({
    name: 'validation_status',
    type: 'enum',
    enum: CsvRowValidationStatus,
    enumName: 'supplier_csv_import_row_validation_enum',
    default: CsvRowValidationStatus.PENDING,
  })
  validationStatus: CsvRowValidationStatus;

  @Column({ name: 'validation_error', type: 'varchar', length: 255, nullable: true })
  validationError: string | null;

  /** 검증 통과 시 연결된 Master ID */
  @Column({ name: 'master_id', type: 'uuid', nullable: true })
  masterId: string | null;

  @Column({
    name: 'action_type',
    type: 'enum',
    enum: CsvRowActionType,
    enumName: 'supplier_csv_import_row_action_enum',
    nullable: true,
  })
  actionType: CsvRowActionType | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
