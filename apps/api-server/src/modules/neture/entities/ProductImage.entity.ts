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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
