/**
 * ProductContent Entity
 *
 * Maps supplier product content to ContentBundle for targeted delivery.
 * Enables product info delivery to sellers, consumers, and pharmacists.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Target audience type for product content
 */
export type TargetAudience = 'seller' | 'consumer' | 'pharmacist' | 'all';

/**
 * Targeting configuration for product content
 */
export interface ProductContentTargeting {
  /** Target audience types */
  targets: TargetAudience[];
  /** Target regions (optional) */
  regions?: string[];
  /** Marketing tags for filtering */
  tags?: string[];
  /** Seller types (for seller targeting) */
  sellerTypes?: string[];
}

@Entity('lms_marketing_product_contents')
@Index(['supplierId'])
@Index(['bundleId'])
@Index(['isActive'])
export class ProductContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Supplier who created this product content */
  @Column({ type: 'varchar', length: 255 })
  supplierId: string;

  /** Reference to ContentBundle in lms-core */
  @Column({ type: 'varchar', length: 255 })
  bundleId: string;

  /** Product title for quick reference */
  @Column({ type: 'varchar', length: 500 })
  title: string;

  /** Product SKU (optional) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sku: string | null;

  /** Brand name */
  @Column({ type: 'varchar', length: 255, nullable: true })
  brand: string | null;

  /** Product category */
  @Column({ type: 'varchar', length: 255, nullable: true })
  category: string | null;

  /** Whether the content is active and visible */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /** Whether the content is published (visible to targets) */
  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  /** Targeting configuration */
  @Column({ type: 'jsonb', default: { targets: ['all'] } })
  targeting: ProductContentTargeting;

  /** Additional metadata */
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  /** Published timestamp */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
