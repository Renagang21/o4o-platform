import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import type { User } from './User.js';
import type { SettlementItem } from './SettlementItem.js';

/**
 * Settlement Entity
 * Phase PD-5: Dropshipping Settlement System
 *
 * Represents settlement/payout records for sellers, suppliers, and platform
 */

export type SettlementPartyType = 'seller' | 'supplier' | 'platform';

export enum SettlementStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('settlements')
@Index(['partyType', 'partyId'])
@Index(['status'])
@Index(['periodStart', 'periodEnd'])
@Index(['createdAt'])
export class Settlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Party information
  @Column({ type: 'varchar', length: 20 })
  partyType: SettlementPartyType; // 'seller' | 'supplier' | 'platform'

  @Column({ type: 'uuid' })
  partyId: string; // sellerId or supplierId or platformId

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'partyId' })
  party?: User;

  // Settlement period
  @Column({ type: 'timestamp with time zone' })
  periodStart: Date;

  @Column({ type: 'timestamp with time zone' })
  periodEnd: Date;

  // Financial amounts (stored as numeric for precision)
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalSaleAmount: string; // 총 판매금액 (for sellers)

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalBaseAmount: string; // 총 공급가/원가 (for suppliers)

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalCommissionAmount: string; // 총 커미션 (for platform/partners)

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalMarginAmount: string; // 총 마진 (sale - base)

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  payableAmount: string; // 실제 정산해야 할 금액 (net amount)

  // Status and dates
  @Column({
    type: 'enum',
    enum: SettlementStatus,
    default: SettlementStatus.PENDING,
  })
  status: SettlementStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paidAt?: Date;

  // Additional information
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Relations
  @OneToMany('SettlementItem', 'settlement')
  items?: SettlementItem[];

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods

  /**
   * Mark settlement as paid
   */
  markAsPaid(paidAt?: Date): void {
    this.status = SettlementStatus.PAID;
    this.paidAt = paidAt || new Date();
  }

  /**
   * Cancel settlement
   */
  cancel(): void {
    if (this.status === SettlementStatus.PAID) {
      throw new Error('Cannot cancel a paid settlement');
    }
    this.status = SettlementStatus.CANCELLED;
  }

  /**
   * Check if settlement can be modified
   */
  canModify(): boolean {
    return this.status === SettlementStatus.PENDING;
  }

  /**
   * Calculate period label (e.g., "2025-11")
   */
  getPeriodLabel(): string {
    const start = new Date(this.periodStart);
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  }
}
