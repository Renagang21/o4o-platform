import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import type { Partner } from './Partner.js';
import type { Product } from './Product.js';
import type { ReferralClick } from './ReferralClick.js';

/**
 * ConversionEvent Entity
 *
 * Tracks conversion events (orders) with attribution to referral clicks.
 * Implements multi-touch attribution with configurable models.
 */

export enum ConversionType {
  DIRECT_PURCHASE = 'direct_purchase',   // User purchased immediately
  ASSISTED_PURCHASE = 'assisted_purchase', // Click assisted but not last touch
  REPEAT_PURCHASE = 'repeat_purchase',   // Returning customer purchase
  CANCELLED = 'cancelled'                 // Order was cancelled
}

export enum AttributionModel {
  LAST_TOUCH = 'last_touch',         // Credit to last click before purchase
  FIRST_TOUCH = 'first_touch',       // Credit to first click
  LINEAR = 'linear',                  // Equal credit to all clicks
  TIME_DECAY = 'time_decay',         // More credit to recent clicks
  POSITION_BASED = 'position_based'  // 40% first, 40% last, 20% middle
}

export enum ConversionStatus {
  PENDING = 'pending',       // Order placed, awaiting confirmation
  CONFIRMED = 'confirmed',   // Order confirmed, commission should be calculated
  CANCELLED = 'cancelled',   // Order cancelled
  REFUNDED = 'refunded',     // Full refund processed
  PARTIAL_REFUND = 'partial_refund' // Partial refund processed
}

@Entity('conversion_events')
@Index(['partnerId', 'createdAt'])
@Index(['orderId'])
@Index(['referralClickId'])
@Index(['status', 'createdAt'])
@Index(['conversionType', 'status'])
export class ConversionEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Partner relationship (who gets credit)
  @Column({ type: 'uuid' })
  partnerId!: string;

  @ManyToOne('Partner', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partnerId' })
  partner!: Partner;

  // Order relationship
  @Column({ type: 'uuid' })
  orderId!: string;

  // Note: Order entity will be created later, FK constraint added then
  // @ManyToOne('Order', { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'orderId' })
  // order!: Order;

  // Product relationship
  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne('Product', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  // Referral click attribution
  @Column({ type: 'uuid' })
  referralClickId!: string;

  @ManyToOne('ReferralClick', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referralClickId' })
  referralClick!: ReferralClick;

  @Column({ type: 'varchar', length: 20 })
  referralCode!: string;

  // Conversion metadata
  @Column({ type: 'enum', enum: ConversionType, default: ConversionType.DIRECT_PURCHASE })
  conversionType!: ConversionType;

  @Column({ type: 'enum', enum: AttributionModel, default: AttributionModel.LAST_TOUCH })
  attributionModel!: AttributionModel;

  @Column({ type: 'enum', enum: ConversionStatus, default: ConversionStatus.PENDING })
  status!: ConversionStatus;

  // Financial information
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  productPrice!: number;

  @Column({ type: 'integer', default: 1 })
  quantity!: number;

  @Column({ type: 'varchar', length: 3, default: 'KRW' })
  currency!: string;

  // Refund tracking
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refundedAmount!: number;

  @Column({ type: 'integer', default: 0 })
  refundedQuantity!: number;

  // Attribution weights (for multi-touch attribution)
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 1.0 })
  attributionWeight!: number; // 0.0 to 1.0

  @Column({ type: 'json', nullable: true })
  attributionPath?: {
    clickId: string;
    timestamp: Date;
    weight: number;
  }[]; // Full attribution path for multi-touch

  // Timing information
  @Column({ type: 'timestamp' })
  clickedAt!: Date; // When the referral click happened

  @Column({ type: 'timestamp' })
  convertedAt!: Date; // When the order was placed

  @Column({ type: 'integer' })
  conversionTimeMinutes!: number; // Time from click to conversion

  // Attribution window validation
  @Column({ type: 'integer', default: 30 })
  attributionWindowDays!: number; // How many days is the click valid

  @Column({ type: 'boolean', default: false })
  isWithinAttributionWindow!: boolean;

  // Campaign tracking
  @Column({ type: 'varchar', length: 100, nullable: true })
  campaign?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  medium?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source?: string;

  // Customer information (minimal, for reporting only)
  @Column({ type: 'uuid', nullable: true })
  customerId?: string;

  @Column({ type: 'boolean', default: false })
  isNewCustomer!: boolean;

  @Column({ type: 'boolean', default: false })
  isRepeatCustomer!: boolean;

  // Idempotency and duplicate prevention
  @Column({ type: 'varchar', length: 100, unique: true })
  idempotencyKey!: string; // orderId + productId + referralCode

  @Column({ type: 'boolean', default: false })
  isDuplicate!: boolean;

  // Additional metadata
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  // Audit fields
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt?: Date;

  // Helper methods
  calculateConversionTime(): number {
    const diffMs = this.convertedAt.getTime() - this.clickedAt.getTime();
    return Math.floor(diffMs / (1000 * 60)); // minutes
  }

  isWithinWindow(windowDays: number = 30): boolean {
    const diffMs = this.convertedAt.getTime() - this.clickedAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= windowDays;
  }

  markAsConfirmed(): void {
    this.status = ConversionStatus.CONFIRMED;
    this.confirmedAt = new Date();
  }

  markAsCancelled(): void {
    this.status = ConversionStatus.CANCELLED;
    this.cancelledAt = new Date();
  }

  processRefund(amount: number, quantity: number = 0): void {
    this.refundedAmount += amount;
    if (quantity > 0) {
      this.refundedQuantity += quantity;
    }

    if (this.refundedAmount >= this.orderAmount) {
      this.status = ConversionStatus.REFUNDED;
    } else {
      this.status = ConversionStatus.PARTIAL_REFUND;
    }

    this.refundedAt = new Date();
  }

  getNetAmount(): number {
    return this.orderAmount - this.refundedAmount;
  }

  generateIdempotencyKey(): string {
    return `${this.orderId}-${this.productId}-${this.referralCode}`;
  }
}
