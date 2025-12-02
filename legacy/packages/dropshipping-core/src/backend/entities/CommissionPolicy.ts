import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

/**
 * CommissionPolicy Entity
 *
 * Manages commission calculation rules with priority-based conflict resolution.
 * Supports multiple policy types: default, tier-based, product-specific, category-based, promotional.
 */

export enum PolicyType {
  DEFAULT = 'default',           // Platform-wide default
  TIER_BASED = 'tier_based',     // Based on partner tier
  PRODUCT_SPECIFIC = 'product_specific', // Specific product override
  CATEGORY = 'category',         // Product category-based
  PROMOTIONAL = 'promotional',   // Time-limited promotion
  PARTNER_SPECIFIC = 'partner_specific' // Individual partner negotiation
}

export enum PolicyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled',   // Will become active in future
  EXPIRED = 'expired'        // Was active, now ended
}

export enum CommissionType {
  PERCENTAGE = 'percentage',  // X% of sale price
  FIXED = 'fixed',           // Fixed amount per sale
  TIERED = 'tiered'          // Different rates based on volume
}

@Entity('commission_policies')
@Index(['policyType', 'status'])
@Index(['partnerId', 'status'])
@Index(['productId', 'status'])
@Index(['category', 'status'])
@Index(['priority', 'status'])
@Index(['validFrom', 'validUntil'])
export class CommissionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Policy identification
  @Column({ type: 'varchar', length: 100, unique: true })
  policyCode!: string; // e.g., "DEFAULT-2025", "TIER-GOLD", "PROMO-SUMMER2025"

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Policy type and status
  @Column({ type: 'enum', enum: PolicyType })
  policyType!: PolicyType;

  @Column({ type: 'enum', enum: PolicyStatus, default: PolicyStatus.ACTIVE })
  status!: PolicyStatus;

  // Priority (higher number = higher priority, used for conflict resolution)
  @Column({ type: 'integer', default: 0 })
  priority!: number;

  // Scope filters (null means "applies to all")
  @Column({ type: 'uuid', nullable: true })
  partnerId?: string; // Specific partner (for partner_specific type)

  @Column({ type: 'varchar', length: 50, nullable: true })
  partnerTier?: string; // bronze, silver, gold, platinum

  @Column({ type: 'uuid', nullable: true })
  productId?: string; // Specific product

  @Column({ type: 'uuid', nullable: true })
  supplierId?: string; // All products from specific supplier

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string; // Product category

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[]; // Product tags

  // Commission structure
  @Column({ type: 'enum', enum: CommissionType, default: CommissionType.PERCENTAGE })
  commissionType!: CommissionType;

  // For percentage type
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate?: number; // e.g., 10.50 for 10.5%

  // For fixed type
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  commissionAmount?: number; // Fixed amount in KRW

  // For tiered type
  @Column({ type: 'json', nullable: true })
  tieredRates?: {
    minAmount: number;
    maxAmount?: number;
    rate?: number;
    amount?: number;
  }[];

  // Minimum/maximum commission constraints
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minCommission?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxCommission?: number;

  // Validity period
  @Column({ type: 'timestamp', nullable: true })
  validFrom?: Date;

  @Column({ type: 'timestamp', nullable: true })
  validUntil?: Date;

  // Conditions
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minOrderAmount?: number; // Minimum order value to qualify

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxOrderAmount?: number; // Maximum order value (for promotional rates)

  @Column({ type: 'boolean', default: false })
  requiresNewCustomer!: boolean; // Only for new customers

  @Column({ type: 'boolean', default: false })
  excludeDiscountedItems!: boolean; // Don't apply to discounted products

  // Usage limits (for promotional policies)
  @Column({ type: 'integer', nullable: true })
  maxUsagePerPartner?: number;

  @Column({ type: 'integer', nullable: true })
  maxUsageTotal?: number;

  @Column({ type: 'integer', default: 0 })
  currentUsageCount!: number;

  // Stacking rules
  @Column({ type: 'boolean', default: false })
  canStackWithOtherPolicies!: boolean;

  @Column({ type: 'simple-array', nullable: true })
  exclusiveWith?: string[]; // Policy codes that cannot be combined

  // Additional metadata
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  // Approval workflow
  @Column({ type: 'boolean', default: false })
  requiresApproval!: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  // Audit fields
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  isActive(): boolean {
    if (this.status !== PolicyStatus.ACTIVE) {
      return false;
    }

    const now = new Date();

    if (this.validFrom && now < this.validFrom) {
      return false;
    }

    if (this.validUntil && now > this.validUntil) {
      return false;
    }

    if (this.maxUsageTotal && this.currentUsageCount >= this.maxUsageTotal) {
      return false;
    }

    return true;
  }

  calculateCommission(orderAmount: number, quantity: number = 1): number {
    let commission = 0;

    switch (this.commissionType) {
      case CommissionType.PERCENTAGE:
        if (this.commissionRate) {
          commission = (orderAmount * this.commissionRate) / 100;
        }
        break;

      case CommissionType.FIXED:
        if (this.commissionAmount) {
          commission = this.commissionAmount * quantity;
        }
        break;

      case CommissionType.TIERED:
        if (this.tieredRates) {
          const tier = this.tieredRates.find(
            t => orderAmount >= t.minAmount && (!t.maxAmount || orderAmount <= t.maxAmount)
          );
          if (tier) {
            commission = tier.rate
              ? (orderAmount * tier.rate) / 100
              : (tier.amount || 0) * quantity;
          }
        }
        break;
    }

    // Apply min/max constraints
    if (this.minCommission && commission < this.minCommission) {
      commission = this.minCommission;
    }

    if (this.maxCommission && commission > this.maxCommission) {
      commission = this.maxCommission;
    }

    return Math.round(commission * 100) / 100; // Round to 2 decimal places
  }

  appliesTo(context: {
    partnerId?: string;
    partnerTier?: string;
    productId?: string;
    supplierId?: string;
    category?: string;
    tags?: string[];
    orderAmount?: number;
    isNewCustomer?: boolean;
  }): boolean {
    // Check partner match
    if (this.partnerId && this.partnerId !== context.partnerId) {
      return false;
    }

    if (this.partnerTier && this.partnerTier !== context.partnerTier) {
      return false;
    }

    // Check product match
    if (this.productId && this.productId !== context.productId) {
      return false;
    }

    if (this.supplierId && this.supplierId !== context.supplierId) {
      return false;
    }

    if (this.category && this.category !== context.category) {
      return false;
    }

    // Check tags overlap
    if (this.tags && context.tags) {
      const hasMatchingTag = this.tags.some(tag => context.tags!.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Check order amount conditions
    if (this.minOrderAmount && context.orderAmount && context.orderAmount < this.minOrderAmount) {
      return false;
    }

    if (this.maxOrderAmount && context.orderAmount && context.orderAmount > this.maxOrderAmount) {
      return false;
    }

    // Check new customer requirement
    if (this.requiresNewCustomer && !context.isNewCustomer) {
      return false;
    }

    return true;
  }

  incrementUsage(): void {
    this.currentUsageCount += 1;

    // Auto-expire if hit max usage
    if (this.maxUsageTotal && this.currentUsageCount >= this.maxUsageTotal) {
      this.status = PolicyStatus.EXPIRED;
    }
  }
}
