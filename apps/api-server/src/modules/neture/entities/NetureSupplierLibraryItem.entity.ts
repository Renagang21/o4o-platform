/**
 * NetureSupplierLibraryItem Entity
 *
 * 공급자 전용 자료실 항목 (문서, 이미지, 파일 등)
 * 외부 URL 기반 — S3 업로드 없음
 *
 * WO-O4O-NETURE-LIBRARY-FOUNDATION-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { NetureSupplier } from './NetureSupplier.entity.js';

@Entity('neture_supplier_library_items')
@Index('IDX_nsli_supplier_id', ['supplierId'])
@Index('IDX_nsli_created_at', ['createdAt'])
@Index('IDX_nsli_is_public', ['isPublic'])
export class NetureSupplierLibraryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @ManyToOne('NetureSupplier', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: NetureSupplier;

  @Column({ name: 'title', type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'category', type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ name: 'content_type', type: 'varchar', length: 50, default: 'media' })
  contentType: string;

  @Column({ name: 'visibility', type: 'varchar', length: 20, default: 'personal' })
  visibility: string;

  @Column({ name: 'blocks', type: 'jsonb', nullable: true })
  blocks: Record<string, unknown>[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
