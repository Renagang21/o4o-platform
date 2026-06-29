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
  PARTIAL = 'PARTIAL',       // WO-O4O-NETURE-CSV-PARTIAL-SUCCESS-V1: 부분 성공
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

  // WO-O4O-NETURE-CSV-PARTIAL-SUCCESS-V1
  @Column({ name: 'applied_rows', type: 'int', default: 0 })
  appliedRows: number;

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

  /**
   * 이미지 복사 파이프라인 요약 (WO-O4O-NETURE-PRODUCT-IMPORT-IMAGE-STORAGE-BUCKET-ALIGNMENT-V1).
   * apply 이후 비동기로 채워진다(완료 전엔 null). 부분 실패를 공급자에게 표시하기 위함.
   */
  @Column({ name: 'image_import_result', type: 'jsonb', nullable: true })
  imageImportResult: CsvBatchImageImportResult | null;

  @OneToMany('SupplierCsvImportRow', 'batch')
  rows: SupplierCsvImportRow[];
}

/** batch 에 저장하는 이미지 복사 요약 (실패 항목만 보존 — 성공 URL 은 product_images 에 존재) */
export interface CsvBatchImageImportResult {
  total: number;
  copied: number;
  failed: number;
  /** 실패한 이미지 (최대 50건만 저장) */
  failedItems: Array<{ masterId: string; imageUrl: string; reason?: string }>;
  /** 파이프라인 완료 시각(ISO) */
  completedAt: string;
}
