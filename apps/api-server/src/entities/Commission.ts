import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToOne
} from 'typeorm';
import type { Partner } from './Partner.js';
import type { Product } from './Product.js';
import { ConversionEvent } from './ConversionEvent.js';
import type { CommissionPolicy } from './CommissionPolicy.js';

/**
 * Commission Entity (Phase 2.1)
 *
 * Stores commission records created from conversion events.
 * Implements state machine: Pending → Confirmed → Paid
 * Includes hold period, refund adjustment, and payment tracking.
 */

export enum CommissionStatus {
  PENDING = 'pending',       // Commission created, awaiting hold period
  CONFIRMED = 'confirmed',   // Hold period passed, ready for payment
  PAID = 'paid',            // Payment completed
  CANCELLED = 'cancelled'    // Cancelled due to order cancellation/refund
}

@Entity('commissions')
@Index(['partnerId', 'status'])
@Index(['conversionId'])
@Index(['status', 'createdAt'])
@Index(['holdUntil'])
@Index(['policyId', 'status'])
export class Commission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Partner relationship (who receives the commission)
  @Column({ type: 'uuid' })
  partnerId!: string;

  @ManyToOne('Partner', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partnerId' })
  partner!: Partner;

  // Product relationship
  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne('Product', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  // Seller/Supplier relationship (optional)
  @Column({ type: 'uuid', nullable: true })
  sellerId?: string;

  // Order reference
  @Column({ type: 'uuid' })
  orderId!: string;

  // Conversion event reference (UNIQUE - one commission per conversion)
  @Column({ type: 'uuid', unique: true })
  conversionId!: string;

  @ManyToOne(() => ConversionEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversionId' })
  conversion!: ConversionEvent;

  // Referral tracking
  @Column({ type: 'varchar', length: 20 })
  referralCode!: string;

  // Commission status
  @Column({ type: 'enum', enum: CommissionStatus, default: CommissionStatus.PENDING })
  status!: CommissionStatus;

  // Financial information
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderAmount!: number;

  @Column({ type: 'varchar', length: 3, default: 'KRW' })
  currency!: string;

  // Policy information
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate?: number; // Percentage rate if applicable

  @Column({ type: 'uuid' })
  policyId!: string;

  @ManyToOne('CommissionPolicy')
  @JoinColumn({ name: 'policyId' })
  policy!: CommissionPolicy;

  @Column({ type: 'varchar', length: 50 })
  policyType!: string; // Snapshot of policy type at creation

  // Hold period (refund window)
  @Column({ type: 'timestamp' })
  holdUntil!: Date; // Commission confirmed after this date

  // Payment information
  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentMethod?: string; // How commission was paid (bank_transfer, paypal, etc.)

  @Column({ type: 'varchar', length: 200, nullable: true })
  paymentReference?: string; // Payment transaction reference

  // Metadata (flexible for additional info)
  @Column({ type: 'json', nullable: true })
  metadata?: {
    policyCode?: string;
    policyName?: string;
    attributionModel?: string;
    attributionWeight?: number;
    conversionType?: string;
    adjustmentHistory?: Array<{
      oldAmount: number;
      newAmount: number;
      reason: string;
      adjustedAt: string;
      adjustedBy?: string;
    }>;
    cancellationReason?: string;
    paymentReference?: string;
    [key: string]: any;
  };

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  // Helper methods
  isPending(): boolean {
    return this.status === CommissionStatus.PENDING;
  }

  isConfirmed(): boolean {
    return this.status === CommissionStatus.CONFIRMED;
  }

  isPaid(): boolean {
    return this.status === CommissionStatus.PAID;
  }

  isCancelled(): boolean {
    return this.status === CommissionStatus.CANCELLED;
  }

  canConfirm(): boolean {
    return this.status === CommissionStatus.PENDING && new Date() >= this.holdUntil;
  }

  canPay(): boolean {
    return this.status === CommissionStatus.CONFIRMED;
  }

  canCancel(): boolean {
    return [CommissionStatus.PENDING, CommissionStatus.CONFIRMED].includes(this.status);
  }

  confirm(): void {
    if (this.canConfirm()) {
      this.status = CommissionStatus.CONFIRMED;
      this.confirmedAt = new Date();
    }
  }

  markAsPaid(paymentMethod: string, paymentReference?: string): void {
    if (this.canPay()) {
      this.status = CommissionStatus.PAID;
      this.paidAt = new Date();
      this.paymentMethod = paymentMethod;
      if (paymentReference) {
        this.paymentReference = paymentReference;
      }
    }
  }

  cancel(reason?: string, adminId?: string): void {
    if (this.canCancel()) {
      this.status = CommissionStatus.CANCELLED;
      this.cancelledAt = new Date();
      if (reason || adminId) {
        this.metadata = {
          ...this.metadata,
          cancellationReason: reason,
          cancelledBy: adminId
        };
      }
    }
  }

  adjustAmount(newAmount: number, reason: string, adminId?: string): void {
    const oldAmount = this.commissionAmount;
    this.commissionAmount = newAmount;

    if (!this.metadata) {
      this.metadata = {};
    }

    if (!this.metadata.adjustmentHistory) {
      this.metadata.adjustmentHistory = [];
    }

    this.metadata.adjustmentHistory.push({
      oldAmount,
      newAmount,
      reason,
      adjustedAt: new Date().toISOString(),
      adjustedBy: adminId
    });
  }

  // Validation
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.commissionAmount < 0) {
      errors.push('Commission amount cannot be negative');
    }

    if (this.orderAmount <= 0) {
      errors.push('Order amount must be positive');
    }

    if (this.commissionRate !== null && this.commissionRate !== undefined) {
      if (this.commissionRate < 0 || this.commissionRate > 100) {
        errors.push('Commission rate must be between 0 and 100');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
