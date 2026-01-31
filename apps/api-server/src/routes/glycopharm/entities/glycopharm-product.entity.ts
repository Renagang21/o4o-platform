/**
 * Glycopharm Product Entity
 *
 * Phase B-1: Glycopharm API Implementation
 * Blood glucose related products (CGM devices, test strips, etc.)
 *
 * WO-PRODUCT-DB-CLEANUP-FOR-SITE-V1:
 * - Added subtitle, short_description for listing/detail
 * - Added origin_country, legal_category, certification_ids
 * - Added usage_info, caution_info for product details
 * - Added barcodes for identification (Product DB Constitution v1)
 *
 * WO-PRODUCT-IMAGES-AND-BARCODE-UNBLOCK-V1:
 * - Added images field for UI rendering (schema parity with Neture/Cosmetics)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import type { GlycopharmPharmacy } from './glycopharm-pharmacy.entity.js';
import type { GlycopharmProductLog } from './glycopharm-product-log.entity.js';

export type GlycopharmProductStatus = 'draft' | 'active' | 'inactive' | 'discontinued';
export type GlycopharmProductCategory = 'cgm_device' | 'test_strip' | 'lancet' | 'meter' | 'accessory' | 'other';

/**
 * Product Image Interface
 */
export interface GlycopharmProductImage {
  url: string;
  alt?: string;
  is_primary: boolean;
  order?: number;
}

@Entity({ name: 'glycopharm_products', schema: 'public' })
export class GlycopharmProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  pharmacy_id?: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subtitle?: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku!: string;

  @Column({ type: 'jsonb', nullable: true })
  barcodes?: string[];

  @Column({ type: 'jsonb', nullable: true })
  images?: GlycopharmProductImage[] | null;

  @Column({ type: 'varchar', length: 50, default: 'other' })
  category!: GlycopharmProductCategory;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  short_description?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  sale_price?: number;

  @Column({ type: 'int', default: 0 })
  stock_quantity!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  origin_country?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  legal_category?: string;

  @Column({ type: 'jsonb', nullable: true })
  certification_ids?: string[];

  @Column({ type: 'text', nullable: true })
  usage_info?: string;

  @Column({ type: 'text', nullable: true })
  caution_info?: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: GlycopharmProductStatus;

  @Column({ type: 'boolean', default: false })
  is_featured!: boolean;

  @Column({ type: 'boolean', default: false })
  is_partner_recruiting!: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  created_by_user_name?: string;

  @Column({ type: 'uuid', nullable: true })
  updated_by_user_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  updated_by_user_name?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  @ManyToOne('GlycopharmPharmacy', 'products')
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy?: GlycopharmPharmacy;

  @OneToMany('GlycopharmProductLog', 'product')
  logs?: GlycopharmProductLog[];
}
