/**
 * ProductImage Entity
 *
 * WO-O4O-NETURE-PRODUCT-IMAGE-STRUCTURE-V1
 *
 * ProductMaster 상품 이미지 — GCS 저장, 대표 이미지 관리
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { ProductMaster } from './ProductMaster.entity.js';

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'master_id', type: 'uuid' })
  masterId: string;

  @ManyToOne('ProductMaster', 'images', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'master_id' })
  master?: ProductMaster;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @Column({ name: 'gcs_path', type: 'text' })
  gcsPath: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  /** WO-NETURE-IMAGE-ASSET-STRUCTURE-V1: 이미지 용도 분류 */
  @Column({ name: 'type', type: 'varchar', length: 16, default: 'detail' })
  type: 'thumbnail' | 'detail' | 'content';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-ACTION-V1: action/audit 지원 컬럼 (additive).
  // deleted_at/deleted_by 는 후속 soft-delete WO 용 placeholder (이번 WO 는 write 안 함).
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy: string | null;

  /** 이미지 출처. admin 업로드는 'admin_upload'. */
  @Column({ name: 'source', type: 'varchar', length: 32, nullable: true })
  source: string | null;
}
