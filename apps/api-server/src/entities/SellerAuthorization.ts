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
import type { Seller } from './Seller.js';
import type { Supplier } from './Supplier.js';

/**
 * SellerAuthorization Entity
 * Phase 9: Seller Authorization System
 *
 * Manages seller requests to access supplier products.
 * Implements:
 * - 10-supplier limit per seller
 * - 30-day cooldown after rejection
 * - Permanent block capability
 * - Admin approval workflow
 *
 * Created: 2025-01-07
 */

export enum AuthorizationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  BLOCKED = 'blocked'
}

@Entity('seller_authorizations')
@Index(['sellerId', 'supplierId'], { unique: true, where: 'status != \'blocked\'' })
@Index(['status', 'requestedAt'])
@Index(['sellerId', 'cooldownUntil'], { where: '"cooldownUntil" IS NOT NULL' })
export class SellerAuthorization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Seller relationship
  @Column({ type: 'uuid' })
  sellerId!: string;

  @ManyToOne('Seller', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller!: Seller;

  // Supplier relationship
  @Column({ type: 'uuid' })
  supplierId!: string;

  @ManyToOne('Supplier', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier;

  // Authorization Status
  @Column({ type: 'varchar', length: 20, default: AuthorizationStatus.PENDING })
  status!: AuthorizationStatus;

  // Request Timestamp
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  requestedAt!: Date;

  // Approval Information
  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string; // Admin user ID

  // Rejection Information
  @Column({ type: 'timestamp', nullable: true })
  rejectedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  rejectedBy?: string; // Admin user ID

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  // Block Information
  @Column({ type: 'timestamp', nullable: true })
  blockedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  blockedBy?: string; // Admin user ID

  @Column({ type: 'text', nullable: true })
  blockReason?: string;

  // Cooldown Period (30 days after rejection)
  @Column({ type: 'timestamp', nullable: true })
  cooldownUntil?: Date;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    applicationNote?: string;
    businessJustification?: string;
    expectedVolume?: number;
    previousRejectionCount?: number;
    [key: string]: any;
  };

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods
  isPending(): boolean {
    return this.status === AuthorizationStatus.PENDING;
  }

  isApproved(): boolean {
    return this.status === AuthorizationStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.status === AuthorizationStatus.REJECTED;
  }

  isBlocked(): boolean {
    return this.status === AuthorizationStatus.BLOCKED;
  }

  isInCooldown(): boolean {
    if (!this.cooldownUntil) return false;
    return new Date() < this.cooldownUntil;
  }

  canRequest(): boolean {
    return !this.isBlocked() && !this.isInCooldown();
  }

  approve(adminId: string): void {
    if (!this.isPending()) {
      throw new Error('Only pending authorizations can be approved');
    }
    this.status = AuthorizationStatus.APPROVED;
    this.approvedAt = new Date();
    this.approvedBy = adminId;
  }

  reject(adminId: string, reason: string): void {
    if (!this.isPending()) {
      throw new Error('Only pending authorizations can be rejected');
    }
    this.status = AuthorizationStatus.REJECTED;
    this.rejectedAt = new Date();
    this.rejectedBy = adminId;
    this.rejectionReason = reason;

    // Set 30-day cooldown
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() + 30);
    this.cooldownUntil = cooldownDate;

    // Track rejection count
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata.previousRejectionCount = (this.metadata.previousRejectionCount || 0) + 1;
  }

  block(adminId: string, reason: string): void {
    this.status = AuthorizationStatus.BLOCKED;
    this.blockedAt = new Date();
    this.blockedBy = adminId;
    this.blockReason = reason;
  }
}
