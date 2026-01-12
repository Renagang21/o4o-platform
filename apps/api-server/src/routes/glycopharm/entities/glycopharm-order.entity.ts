/**
 * Glycopharm Order Entity
 *
 * H8-2: 주문/결제 API v1 Implementation
 * Order management for blood glucose product sales
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { GlycopharmPharmacy } from './glycopharm-pharmacy.entity.js';
import type { GlycopharmOrderItem } from './glycopharm-order-item.entity.js';

export type GlycopharmOrderStatus = 'CREATED' | 'PAID' | 'FAILED';

@Entity({ name: 'glycopharm_orders', schema: 'public' })
export class GlycopharmOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  pharmacy_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 20, default: 'CREATED' })
  status!: GlycopharmOrderStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_amount!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_name?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  customer_phone?: string;

  @Column({ type: 'text', nullable: true })
  shipping_address?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'timestamp', nullable: true })
  paid_at?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_method?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_id?: string;

  @Column({ type: 'text', nullable: true })
  failure_reason?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  @ManyToOne('GlycopharmPharmacy')
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy?: GlycopharmPharmacy;

  @OneToMany('GlycopharmOrderItem', 'order', { cascade: true })
  items?: GlycopharmOrderItem[];
}
