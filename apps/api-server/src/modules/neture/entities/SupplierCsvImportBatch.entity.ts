/**
 * SupplierCsvImportBatch Entity
 *
 * B2B CSV 대량 유입 batch 단위 관리
 * 2-Phase: Upload+Validate → Apply
 *
 * WO-O4O-B2B-CSV-INGEST-PIPELINE-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import type { NetureSupplier } from './NetureSupplier.entity.js';
import type { SupplierCsvImportRow } from './SupplierCsvImportRow.entity.js';

export enum CsvImportBatchStatus {
  UPLOADED = 'UPLOADED',
  VALIDATING = 'VALIDATING',
  READY = 'READY',
  APPLIED = 'APPLIED',
  FAILED = 'FAILED',
}

@Entity('supplier_csv_import_batches')
@Index(['supplierId'])
export class SupplierCsvImportBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @ManyToOne('NetureSupplier', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: NetureSupplier;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ name: 'total_rows', type: 'int', default: 0 })
  totalRows: number;

  @Column({ name: 'valid_rows', type: 'int', default: 0 })
  validRows: number;

  @Column({ name: 'rejected_rows', type: 'int', default: 0 })
  rejectedRows: number;

  @Column({
    type: 'enum',
    enum: CsvImportBatchStatus,
    enumName: 'supplier_csv_import_batch_status_enum',
    default: CsvImportBatchStatus.UPLOADED,
  })
  status: CsvImportBatchStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'applied_at', type: 'timestamp', nullable: true })
  appliedAt: Date | null;

  @OneToMany('SupplierCsvImportRow', 'batch')
  rows: SupplierCsvImportRow[];
}
