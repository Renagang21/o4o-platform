/**
 * Glycopharm Order Item Entity
 *
 * H8-2: 주문/결제 API v1 Implementation
 * Order line items for blood glucose product orders
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

  @ManyToOne('GlycopharmOrder', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: GlycopharmOrder;

  @ManyToOne('GlycopharmProduct')
  @JoinColumn({ name: 'product_id' })
  product?: GlycopharmProduct;
}
