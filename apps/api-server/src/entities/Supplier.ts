import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import type { User } from './User.js';
import { BusinessInfo } from './BusinessInfo.js';
import type { Product } from './Product.js';
import type { CommissionPolicy } from './CommissionPolicy.js';

export enum SupplierStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected'
}

export enum SupplierTier {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

export interface SupplierPolicy {
  minOrderAmount?: number;
  maxOrderAmount?: number;
  processingTime?: number; // days
  returnPolicy?: string;
  shippingPolicy?: string;
  paymentTerms?: string;
}

export interface SellerTierPricing {
  bronze: number; // 할인율 %
  silver: number;
  gold: number;
  platinum: number;
}

export interface SupplierMetrics {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  averageRating: number;
  responseTime: number; // hours
  fulfillmentRate: number; // %
}

@Entity('suppliers')
@Index(['userId'], { unique: true })
@Index(['status', 'tier'])
@Index(['isActive', 'status'])
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // User relationship (One-to-One)
  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne('User', 'supplier', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // BusinessInfo relationship (One-to-One)
  @OneToOne('BusinessInfo', { cascade: true })
  @JoinColumn()
  businessInfo!: BusinessInfo;

  // Products relationship (One-to-Many)
  @OneToMany('Product', 'supplier')
  products!: Product[];

  // Supplier Status and Tier
  @Column({ type: 'enum', enum: SupplierStatus, default: SupplierStatus.PENDING })
  status!: SupplierStatus;

  @Column({ type: 'enum', enum: SupplierTier, default: SupplierTier.BASIC })
  tier!: SupplierTier;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // Supplier Specific Information
  @Column({ type: 'text', nullable: true })
  companyDescription?: string;

  @Column({ type: 'simple-array', nullable: true })
  specialties?: string[]; // 전문 분야

  @Column({ type: 'simple-array', nullable: true })
  certifications?: string[]; // 인증서

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string;

  // Pricing and Policies (문서 #66: 공급자가 판매자 등급별 할인율 설정)
  @Column({ type: 'json', nullable: true })
  sellerTierDiscounts?: SellerTierPricing; // 판매자 등급별 할인율

  @Column({ type: 'json', nullable: true })
  supplierPolicy?: SupplierPolicy;

  // Phase 8: Commission Policy Integration
  @Column({ type: 'uuid', nullable: true })
  policyId?: string;

  @ManyToOne('CommissionPolicy', { nullable: true })
  @JoinColumn({ name: 'policyId' })
  policy?: CommissionPolicy;

  @Column({ type: 'integer', nullable: true })
  settlementCycleDays?: number; // Settlement cycle in days (e.g., 30)

  // Default Commission Settings (문서 #66: 공급자가 파트너 커미션 설정)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  defaultPartnerCommissionRate!: number; // 기본 파트너 커미션 비율

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  defaultPartnerCommissionAmount?: number; // 기본 고정 커미션

  // Financial Information
  @Column({ type: 'varchar', length: 50, nullable: true })
  taxId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankAccount?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  accountHolder?: string;

  // Performance Metrics
  @Column({ type: 'json', nullable: true })
  metrics?: SupplierMetrics;

  // Rating and Reviews
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating!: number;

  @Column({ type: 'integer', default: 0 })
  totalReviews!: number;

  // Contact Information
  @Column({ type: 'varchar', length: 100, nullable: true })
  contactPerson?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contactPhone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail?: string;

  // Operational Information
  @Column({ type: 'simple-array', nullable: true })
  operatingHours?: string[]; // ["09:00-18:00", "Monday-Friday"]

  @Column({ type: 'varchar', length: 10, nullable: true })
  timezone?: string;

  @Column({ type: 'simple-array', nullable: true })
  shippingMethods?: string[];

  @Column({ type: 'simple-array', nullable: true })
  paymentMethods?: string[];

  // Additional Information
  @Column({ type: 'integer', nullable: true })
  foundedYear?: number;

  @Column({ type: 'integer', nullable: true })
  employeeCount?: number;

  @Column({ type: 'json', nullable: true })
  socialMedia?: {
    website?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string;

  // Helper Methods
  isApproved(): boolean {
    return this.status === SupplierStatus.APPROVED && this.isActive;
  }

  canCreateProducts(): boolean {
    return this.isApproved();
  }

  // 판매자 등급별 할인가 계산 (문서 #66)
  getDiscountedPrice(originalPrice: number, sellerTier: 'bronze' | 'silver' | 'gold' | 'platinum'): number {
    if (!this.sellerTierDiscounts) return originalPrice;
    
    const discountRate = this.sellerTierDiscounts[sellerTier] || 0;
    return originalPrice * (1 - discountRate / 100);
  }

  // 파트너 커미션 계산
  calculatePartnerCommission(salePrice: number, productCommissionRate?: number): number {
    const commissionRate = productCommissionRate || this.defaultPartnerCommissionRate;
    
    if (this.defaultPartnerCommissionAmount) {
      return this.defaultPartnerCommissionAmount;
    }
    
    return (salePrice * commissionRate) / 100;
  }

  // 공급업체 등급별 혜택
  getMaxProducts(): number {
    switch (this.tier) {
      case SupplierTier.BASIC:
        return 100;
      case SupplierTier.PREMIUM:
        return 1000;
      case SupplierTier.ENTERPRISE:
        return -1; // unlimited
      default:
        return 100;
    }
  }

  getCommissionRate(): number {
    switch (this.tier) {
      case SupplierTier.BASIC:
        return 3.0; // 플랫폼 수수료 3%
      case SupplierTier.PREMIUM:
        return 2.0; // 플랫폼 수수료 2%
      case SupplierTier.ENTERPRISE:
        return 1.0; // 플랫폼 수수료 1%
      default:
        return 3.0;
    }
  }

  updateMetrics(metrics: Partial<SupplierMetrics>): void {
    this.metrics = {
      ...this.metrics,
      ...metrics
    } as SupplierMetrics;
  }

  updateRating(newRating: number): void {
    const totalRating = this.averageRating * this.totalReviews + newRating;
    this.totalReviews += 1;
    this.averageRating = totalRating / this.totalReviews;
  }

  // 공급업체 상태 변경 메서드
  approve(approvedBy: string): void {
    this.status = SupplierStatus.APPROVED;
    this.approvedAt = new Date();
    this.approvedBy = approvedBy;
  }

  suspend(): void {
    this.status = SupplierStatus.SUSPENDED;
    this.isActive = false;
  }

  reject(): void {
    this.status = SupplierStatus.REJECTED;
    this.isActive = false;
  }

  reactivate(): void {
    if (this.status === SupplierStatus.APPROVED) {
      this.isActive = true;
    }
  }
}