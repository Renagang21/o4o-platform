/**
 * NetureOrderItem Entity
 *
 * Phase G-3: 주문/결제 플로우 구현
 * Schema: neture (isolated from Core)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { NetureOrder } from './neture-order.entity.js';
import type { NetureProduct } from './neture-product.entity.js';
import { type NetureProductImage } from './neture-product.entity.js';

@Entity({ name: 'neture_order_items', schema: 'neture' })
export class NetureOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  @Index()
  orderId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  @Index()
  productId!: string;

  @Column({ name: 'product_name', type: 'varchar', length: 200 })
  productName!: string;

  @Column({ name: 'product_image', type: 'jsonb', nullable: true })
  productImage?: NetureProductImage | null;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'int', default: 0 })
  unitPrice!: number;

  @Column({ name: 'total_price', type: 'int', default: 0 })
  totalPrice!: number;

  @Column({ type: 'jsonb', nullable: true })
  options?: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Relations
  @ManyToOne('NetureOrder', 'items')
  @JoinColumn({ name: 'order_id' })
  order?: NetureOrder;

  @ManyToOne('NetureProduct')
  @JoinColumn({ name: 'product_id' })
  product?: NetureProduct;
}
