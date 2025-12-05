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

  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ type: 'uuid', nullable: true })
  sellerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  referralCode: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  productPrice: number | null;

  @Column({ type: 'integer', nullable: true })
  quantity: number | null;

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

  @Column({ type: 'timestamp', nullable: true })
  convertedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Calculate commission amount from order details
   * Static helper method for commission calculation
   */
  static calculateCommission(
    unitPrice: number,
    quantity: number,
    commissionRate: number
  ): { commission: number; orderAmount: number } {
    const orderAmount = unitPrice * quantity;
    const commission = Math.round((orderAmount * commissionRate) / 100);

    return { commission, orderAmount };
  }

  /**
   * Confirm commission (after return period expires)
   */
  confirm(): void {
    if (this.status !== CommissionStatus.PENDING) {
      throw new Error(`Cannot confirm commission in status: ${this.status}`);
    }

    this.status = CommissionStatus.CONFIRMED;
    this.confirmedAt = new Date();
  }

  /**
   * Check if commission can be cancelled
   */
  canCancel(): boolean {
    return this.status === CommissionStatus.PENDING || this.status === CommissionStatus.CONFIRMED;
  }

  /**
   * Cancel commission (order cancelled or refunded)
   */
  cancel(reason?: string): void {
    if (!this.canCancel()) {
      throw new Error(`Cannot cancel commission in status: ${this.status}`);
    }

    this.status = CommissionStatus.CANCELLED;
    if (reason) {
      this.notes = reason;
    }
  }
}
