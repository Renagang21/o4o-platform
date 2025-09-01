import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany
} from 'typeorm';

export enum CouponDiscountType {
  PERCENT = 'percent',
  PERCENTAGE = 'percentage',
  FIXED_CART = 'fixed_cart',
  FIXED_PRODUCT = 'fixed_product'
}

export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired'
}

@Entity('coupons')
@Index(['code'], { unique: true })
@Index(['status', 'validFrom', 'validUntil'])
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  code!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: CouponDiscountType,
    default: CouponDiscountType.PERCENT
  })
  discountType!: CouponDiscountType;

  @Column('decimal', { precision: 10, scale: 2 })
  discountValue!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  minOrderAmount?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  maxDiscountAmount?: number;

  @Column({ type: 'timestamp', nullable: true })
  validFrom?: Date;

  @Column({ type: 'timestamp', nullable: true })
  validUntil?: Date;

  @Column({ default: 0 })
  usageLimitPerCoupon!: number;

  @Column({ default: 1 })
  usageLimitPerCustomer!: number;

  @Column({ default: 0 })
  usedCount!: number;

  @Column({
    type: 'enum',
    enum: CouponStatus,
    default: CouponStatus.ACTIVE
  })
  status!: CouponStatus;

  // Product restrictions
  @Column('simple-array', { nullable: true })
  productIds?: string[];

  @Column('simple-array', { nullable: true })
  categoryIds?: string[];

  @Column('simple-array', { nullable: true })
  excludeProductIds?: string[];

  // Customer restrictions
  @Column('simple-array', { nullable: true })
  customerIds?: string[];

  @Column('simple-array', { nullable: true })
  customerGroups?: string[];

  @Column({ default: false })
  freeShipping!: boolean;

  @Column({ default: false })
  excludeSaleItems!: boolean;

  @Column({ default: true })
  individualUseOnly!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations removed to prevent circular dependencies
  // Use lazy loading for reverse relationships:
  // usages: () => CouponUsage[]

  // Compatibility properties for legacy code
  get isActive(): boolean {
    return this.status === CouponStatus.ACTIVE;
  }

  get usageLimit(): number {
    return this.usageLimitPerCoupon;
  }

  get usageCount(): number {
    return this.usedCount;
  }

  get minimumAmount(): number {
    return this.minOrderAmount || 0;
  }

  get maximumDiscount(): number {
    return this.maxDiscountAmount || 0;
  }

  // Validation methods
  isValid(): boolean {
    const now = new Date();
    
    if (this.status !== CouponStatus.ACTIVE) {
      return false;
    }

    if (this.validFrom && now < this.validFrom) {
      return false;
    }

    if (this.validUntil && now > this.validUntil) {
      return false;
    }

    if (this.usageLimitPerCoupon > 0 && this.usedCount >= this.usageLimitPerCoupon) {
      return false;
    }

    return true;
  }

  canBeUsedByCustomer(customerId: string, usageCount: number = 0): boolean {
    if (!this.isValid()) {
      return false;
    }

    // Check customer restrictions
    if (this.customerIds && this.customerIds.length > 0) {
      if (!this.customerIds.includes(customerId)) {
        return false;
      }
    }

    // Check usage limit per customer
    if (this.usageLimitPerCustomer > 0 && usageCount >= this.usageLimitPerCustomer) {
      return false;
    }

    return true;
  }

  calculateDiscount(subtotal: number, productTotal?: number): number {
    let discount = 0;

    switch (this.discountType) {
      case CouponDiscountType.PERCENT:
        discount = (subtotal * this.discountValue) / 100;
        break;
      case CouponDiscountType.FIXED_CART:
        discount = this.discountValue;
        break;
      case CouponDiscountType.FIXED_PRODUCT:
        discount = productTotal ? this.discountValue : 0;
        break;
    }

    // Apply max discount limit
    if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount;
    }

    // Ensure discount doesn't exceed subtotal
    if (discount > subtotal) {
      discount = subtotal;
    }

    return discount;
  }
}

@Entity('coupon_usage')
@Index(['couponId', 'customerId'])
@Index(['orderId'])
export class CouponUsage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  couponId!: string;

  @Column()
  customerId!: string;

  @Column({ nullable: true })
  orderId?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  discountAmount!: number;

  @CreateDateColumn()
  usedAt!: Date;

  @Column({ nullable: true })
  customerEmail?: string;

  @Column({ nullable: true })
  customerName?: string;

  coupon?: Coupon;
}