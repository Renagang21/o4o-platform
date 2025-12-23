/**
 * CommissionPolicy Entity (Stub)
 *
 * This is a minimal stub entity to satisfy TypeScript compilation.
 * Used by PolicyResolutionService and ShadowModeService.
 *
 * @deprecated Consider migrating to a package-based commission system
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export enum PolicyType {
  PRODUCT = 'product',
  SUPPLIER = 'supplier',
  TIER = 'tier',
  DEFAULT = 'default'
}

export enum PolicyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  EXPIRED = 'expired'
}

export enum CommissionType {
  RATE = 'rate',
  FIXED = 'fixed',
  PERCENTAGE = 'rate' // Alias for RATE
}

@Entity('commission_policies')
@Index(['policyType', 'status'])
@Index(['policyCode'], { unique: true })
export class CommissionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, name: 'policy_code' })
  policyCode!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: PolicyType,
    name: 'policy_type'
  })
  policyType!: PolicyType;

  @Column({
    type: 'enum',
    enum: PolicyStatus,
    default: PolicyStatus.PENDING
  })
  status!: PolicyStatus;

  @Column({
    type: 'enum',
    enum: CommissionType,
    name: 'commission_type'
  })
  commissionType!: CommissionType;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true, name: 'commission_rate' })
  commissionRate?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'commission_amount' })
  commissionAmount?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'min_commission' })
  minCommission?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'max_commission' })
  maxCommission?: number;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'timestamp', nullable: true, name: 'valid_from' })
  validFrom?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'valid_until' })
  validUntil?: Date;

  @Column({ type: 'uuid', nullable: true, name: 'product_id' })
  productId?: string;

  @Column({ type: 'uuid', nullable: true, name: 'supplier_id' })
  supplierId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'partner_tier' })
  partnerTier?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
