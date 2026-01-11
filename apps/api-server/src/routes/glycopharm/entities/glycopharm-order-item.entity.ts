/**
 * Glycopharm Order Item Entity
 *
 * ============================================================================
 * ⚠️ LEGACY TABLE (READ-ONLY) - Phase 9-A Frozen
 * ============================================================================
 *
 * This table is part of the GlycoPharm legacy order structure.
 * New order items are created in checkout_order_items via E-commerce Core.
 *
 * DO NOT:
 * - Create new records in this table
 * - Add new references to this entity
 *
 * @see docs/_platform/legacy/GLYCOPHARM-LEGACY-POSTMORTEM.md
 * @see GlycopharmOrder for full context
 * @deprecated Phase 5-A - Use E-commerce Core instead
 * ============================================================================
 *
 * Original: H8-2 주문/결제 API v1 Implementation
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { GlycopharmOrder } from './glycopharm-order.entity.js';
import type { GlycopharmProduct } from './glycopharm-product.entity.js';

@Entity({ name: 'glycopharm_order_items', schema: 'public' })
export class GlycopharmOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  order_id!: string;

  @Column({ type: 'uuid' })
  product_id!: string;

  @Column({ type: 'varchar', length: 255 })
  product_name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  product_sku?: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unit_price!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  // Relations (using type-only imports to avoid circular dependency in ESM)
  @ManyToOne('GlycopharmOrder', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: GlycopharmOrder;

  @ManyToOne('GlycopharmProduct')
  @JoinColumn({ name: 'product_id' })
  product?: GlycopharmProduct;
}
