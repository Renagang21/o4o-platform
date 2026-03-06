/**
 * CatalogImportJob Entity
 *
 * Catalog Import 작업 단위 관리
 * Extension Framework: CSV, Firstmall Excel 등 다양한 소스 지원
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
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
import type { NetureSupplier } from '../../neture/entities/NetureSupplier.entity.js';
import type { CatalogImportRow } from './CatalogImportRow.entity.js';
import {
  CatalogImportJobStatus,
  type CatalogImportExtensionKey,
} from '../types/catalog-import.types.js';

@Entity('catalog_import_jobs')
@Index(['supplierId'])
export class CatalogImportJob {
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

  @Column({ name: 'extension_key', type: 'varchar', length: 50 })
  extensionKey: CatalogImportExtensionKey;

  @Column({ name: 'total_rows', type: 'int', default: 0 })
  totalRows: number;

  @Column({ name: 'valid_rows', type: 'int', default: 0 })
  validRows: number;

  @Column({ name: 'warning_rows', type: 'int', default: 0 })
  warningRows: number;

  @Column({ name: 'rejected_rows', type: 'int', default: 0 })
  rejectedRows: number;

  @Column({
    type: 'enum',
    enum: CatalogImportJobStatus,
    enumName: 'catalog_import_job_status_enum',
    default: CatalogImportJobStatus.UPLOADED,
  })
  status: CatalogImportJobStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'validated_at', type: 'timestamp', nullable: true })
  validatedAt: Date | null;

  @Column({ name: 'applied_at', type: 'timestamp', nullable: true })
  appliedAt: Date | null;

  @OneToMany('CatalogImportRow', 'job')
  rows: CatalogImportRow[];
}
