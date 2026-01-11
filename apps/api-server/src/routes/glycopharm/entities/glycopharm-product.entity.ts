/**
 * Glycopharm Product Entity
 *
 * ============================================================================
 * ⚠️ ACTIVE TABLE - GlycoPharm Domain (Phase 9-A Reviewed)
 * ============================================================================
 *
 * This table remains ACTIVE for product catalog management.
 * Unlike glycopharm_orders, this is NOT deprecated.
 *
 * The product entity is used for:
 * - Blood glucose product catalog (CGM devices, test strips, etc.)
 * - Pricing and inventory management
 * - Product display in pharmacy storefronts
 *
 * When orders are created, product info is copied to:
 * - checkout_order_items.metadata.productDetails
 *
 * @see CLAUDE.md §7 for E-commerce Core rules
 * ============================================================================
 *
 * Original: Phase B-1 Glycopharm API Implementation
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

@Entity({ name: 'glycopharm_products', schema: 'public' })
export class GlycopharmProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  pharmacy_id?: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku!: string;

  @Column({ type: 'varchar', length: 50, default: 'other' })
  category!: GlycopharmProductCategory;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  sale_price?: number;

  @Column({ type: 'int', default: 0 })
  stock_quantity!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer?: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: GlycopharmProductStatus;

  @Column({ type: 'boolean', default: false })
  is_featured!: boolean;

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

  // Relations (using type-only imports to avoid circular dependency in ESM)
  @ManyToOne('GlycopharmPharmacy', 'products')
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy?: GlycopharmPharmacy;

  @OneToMany('GlycopharmProductLog', 'product')
  logs?: GlycopharmProductLog[];
}
