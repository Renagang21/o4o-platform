/**
 * CosmeticsStoreListing Entity
 *
 * WO-KCOS-STORES-PHASE1-V1: K-Cosmetics Store Core
 * Schema: cosmetics (isolated from Core)
 *
 * Links a store to products from the catalog with optional price overrides.
 * - product is owned by brand (catalog)
 * - listing is owned by store (store-specific display/pricing)
 * - same product can be listed by multiple stores
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
  Unique,
} from 'typeorm';
import type { CosmeticsStore } from './cosmetics-store.entity.js';
import type { CosmeticsProduct } from './cosmetics-product.entity.js';

@Entity({ name: 'cosmetics_store_listings', schema: 'cosmetics' })
@Unique(['storeId', 'productId'])
export class CosmeticsStoreListing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'store_id', type: 'uuid' })
  @Index()
  storeId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  @Index()
  productId!: string;

  @Column({ name: 'price_override', type: 'int', nullable: true })
  priceOverride?: number | null;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations - Using string references for ESM compatibility
  @ManyToOne('CosmeticsStore', 'listings')
  @JoinColumn({ name: 'store_id' })
  store?: CosmeticsStore;

  @ManyToOne('CosmeticsProduct')
  @JoinColumn({ name: 'product_id' })
  product?: CosmeticsProduct;
}
