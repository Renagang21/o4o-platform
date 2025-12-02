import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Seller } from './Seller.js';
import type { Product } from './Product.js';
import type { Supplier } from './Supplier.js';

/**
 * Phase 9: Seller Authorization Entity
 *
 * Represents product-level authorization for sellers to sell supplier products.
 * Implements dual-approval system: Platform (seller role) + Supplier (product access).
 *
 * Business Rules:
 * - One authorization per (seller, product) pair (UNIQUE constraint)
 * - 10-product limit per seller (enforced in business logic)
 * - 30-day cooldown after rejection (configurable)
 * - Permanent revocation capability
 * - Self-seller auto-approval (supplier_id = seller.user.supplier_id)
 *
 * States:
 * - REQUESTED: Seller has requested authorization, awaiting supplier approval
 * - APPROVED: Supplier approved, seller can sell this product
 * - REJECTED: Supplier rejected, cooldown period active (30 days default)
 * - REVOKED: Permanently revoked, seller cannot re-request
 * - CANCELLED: Seller cancelled their own request
 *
 * Created: 2025-01-07
 */

export enum AuthorizationStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVOKED = 'REVOKED',
  CANCELLED = 'CANCELLED',
}

@Entity('seller_authorizations')
@Index(['sellerId', 'productId'], { unique: true })
@Index(['productId', 'status'])
@Index(['sellerId', 'status'])
@Index(['supplierId', 'status'])
@Index(['supplierId', 'requestedAt'])
@Index(['sellerId', 'productId', 'cooldownUntil'])
export class SellerAuthorization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Foreign Keys
  @Column({ type: 'uuid', nullable: true })
  sellerId!: string;

  @ManyToOne('Seller', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller!: Seller;

  @Column({ type: 'uuid', nullable: true })
  productId!: string;

  @ManyToOne('Product', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'uuid', nullable: true })
  supplierId!: string;

  @ManyToOne('Supplier', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier;

  // Status
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    default: AuthorizationStatus.REQUESTED,
  })
  status!: AuthorizationStatus;

  // State Timestamps
  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP' })
  requestedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  // Reasons
  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'text', nullable: true })
  revocationReason?: string;

  // Actor Tracking
  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string;

  @Column({ type: 'uuid', nullable: true })
  rejectedBy?: string;

  @Column({ type: 'uuid', nullable: true })
  revokedBy?: string;

  // Business Rules
  @Column({ type: 'timestamp', nullable: true })
  cooldownUntil?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Audit Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  /**
   * Check if authorization is approved and active
   */
  isApproved(): boolean {
    return this.status === AuthorizationStatus.APPROVED;
  }

  /**
   * Check if authorization is in cooldown period
   */
  isInCooldown(): boolean {
    if (!this.cooldownUntil) return false;
    return new Date() < new Date(this.cooldownUntil);
  }

  /**
   * Check if seller can request authorization
   * (not in cooldown, not revoked)
   */
  canRequest(): boolean {
    if (this.status === AuthorizationStatus.REVOKED) return false;
    if (this.isInCooldown()) return false;
    return true;
  }

  /**
   * Approve authorization
   */
  approve(approvedBy: string): void {
    this.status = AuthorizationStatus.APPROVED;
    this.approvedAt = new Date();
    this.approvedBy = approvedBy;
  }

  /**
   * Reject authorization with cooldown
   */
  reject(rejectedBy: string, reason: string, cooldownDays: number = 30): void {
    this.status = AuthorizationStatus.REJECTED;
    this.rejectedAt = new Date();
    this.rejectedBy = rejectedBy;
    this.rejectionReason = reason;

    // Calculate cooldown expiry
    const cooldown = new Date();
    cooldown.setDate(cooldown.getDate() + cooldownDays);
    this.cooldownUntil = cooldown;
  }

  /**
   * Revoke authorization permanently
   */
  revoke(revokedBy: string, reason: string): void {
    this.status = AuthorizationStatus.REVOKED;
    this.revokedAt = new Date();
    this.revokedBy = revokedBy;
    this.revocationReason = reason;
  }

  /**
   * Cancel authorization (seller-initiated)
   */
  cancel(): void {
    if (this.status !== AuthorizationStatus.REQUESTED) {
      throw new Error('Can only cancel REQUESTED authorizations');
    }
    this.status = AuthorizationStatus.CANCELLED;
    this.cancelledAt = new Date();
  }

  /**
   * Get remaining cooldown days
   */
  getCooldownDaysRemaining(): number {
    if (!this.cooldownUntil) return 0;
    const now = new Date();
    const cooldown = new Date(this.cooldownUntil);
    if (now >= cooldown) return 0;

    const diffMs = cooldown.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Get authorization error message (for denied access)
   */
  getErrorMessage(): string {
    switch (this.status) {
      case AuthorizationStatus.REQUESTED:
        return 'Authorization request is pending supplier approval';
      case AuthorizationStatus.REJECTED:
        if (this.isInCooldown()) {
          const days = this.getCooldownDaysRemaining();
          return `Authorization was rejected. You can re-apply in ${days} day(s). Reason: ${this.rejectionReason}`;
        }
        return `Authorization was rejected. Reason: ${this.rejectionReason}`;
      case AuthorizationStatus.REVOKED:
        return `Authorization was permanently revoked. Reason: ${this.revocationReason}`;
      case AuthorizationStatus.CANCELLED:
        return 'Authorization request was cancelled';
      default:
        return 'Authorization not granted';
    }
  }
}
