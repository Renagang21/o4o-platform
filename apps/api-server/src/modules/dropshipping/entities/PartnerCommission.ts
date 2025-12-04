/**
 * PartnerCommission Entity
 * Phase B-4 - Partner commission tracking for referral sales
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import type { Partner } from './Partner.js';
import type { Order } from '../../commerce/entities/Order.js';

export enum CommissionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

@Entity('partner_commissions')
@Index(['partnerId'])
@Index(['orderId'])
@Index(['status'])
export class PartnerCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  partnerId: string;

  @ManyToOne('Partner', { nullable: false })
  @JoinColumn({ name: 'partnerId' })
  partner: Partner;

  @Column('uuid')
  orderId: string;

  @ManyToOne('Order', { nullable: false })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'varchar', nullable: true })
  referralCode: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderAmount: number;

  @Column({
    type: 'enum',
    enum: CommissionStatus,
    default: CommissionStatus.PENDING
  })
  status: CommissionStatus;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
