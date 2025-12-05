import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import type { User } from '../../../entities/User.js';
import { BusinessInfo } from '../../../entities/BusinessInfo.js';

export enum SellerStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected'
}

export enum SellerTier {
  BRONZE = 'bronze',   // 신규 판매자
  SILVER = 'silver',   // 일반 판매자
  GOLD = 'gold',       // 우수 판매자
  PLATINUM = 'platinum' // 최우수 판매자
}

export interface SellerMetrics {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  customerSatisfaction: number;
  returnRate: number;
  responseTime: number; // hours
}

export interface SellerPolicy {
  returnPolicy?: string;
  shippingPolicy?: string;
  customerService?: string;
  termsOfService?: string;
}

export interface SellerBranding {
  storeName: string;
  storeDescription?: string;
  logo?: string;
  banner?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
}

@Entity('sellers')
@Index(['userId'], { unique: true })
@Index(['status', 'tier'])
@Index(['isActive', 'status'])
@Index(['tier', 'averageRating'])
export class Seller {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // User relationship (One-to-One)
  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne('User', 'seller', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // BusinessInfo relationship (One-to-One)
  @OneToOne('BusinessInfo', { cascade: true })
  @JoinColumn()
  businessInfo!: BusinessInfo;

  // Seller Status and Tier
  @Column({ type: 'enum', enum: SellerStatus, default: SellerStatus.PENDING })
  status!: SellerStatus;

  @Column({ type: 'enum', enum: SellerTier, default: SellerTier.BRONZE })
  tier!: SellerTier;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // Store Branding (문서 #66: 판매자는 서비스 차별화)
  @Column({ type: 'json' })
  branding!: SellerBranding;

  @Column({ type: 'varchar', length: 255, unique: true })
  storeSlug!: string; // 스토어 URL

  // Seller Policies
  @Column({ type: 'json', nullable: true })
  policies?: SellerPolicy;

  // Performance Metrics
  @Column({ type: 'json', nullable: true })
  metrics?: SellerMetrics;

  // Rating and Reviews
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating!: number;

  @Column({ type: 'integer', default: 0 })
  totalReviews!: number;

  // Financial Information
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalRevenue!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monthlyRevenue!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 2.5 })
  platformCommissionRate!: number; // 플랫폼 수수료

  // Product Management
  @Column({ type: 'integer', default: 0 })
  productCount!: number;

  @Column({ type: 'integer', default: 0 })
  activeProductCount!: number;

  // Customer Service
  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  responseTime?: number; // 평균 응답 시간 (시간)

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  customerSatisfactionRate!: number; // 고객 만족도

  // Operational Information
  @Column({ type: 'simple-array', nullable: true })
  operatingHours?: string[];

  @Column({ type: 'varchar', length: 10, nullable: true })
  timezone?: string;

  @Column({ type: 'simple-array', nullable: true })
  shippingMethods?: string[];

  @Column({ type: 'simple-array', nullable: true })
  paymentMethods?: string[];

  // Marketing and Promotion
  @Column({ type: 'boolean', default: false })
  featuredSeller!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  featuredUntil?: Date;

  @Column({ type: 'simple-array', nullable: true })
  specialOffers?: string[];

  // Social Media and Marketing
  @Column({ type: 'json', nullable: true })
  socialMedia?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };

  @Column({ type: 'text', nullable: true })
  marketingDescription?: string;

  // Partner Program (문서 #66: 판매자가 파트너 모집/관리)
  @Column({ type: 'boolean', default: true })
  allowPartners!: boolean;

  @Column({ type: 'text', nullable: true })
  partnerInviteMessage?: string;

  @Column({ type: 'simple-array', nullable: true })
  partnerRequirements?: string[];

  // Additional Information
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

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt?: Date;

  // Helper Methods
  isApproved(): boolean {
    return this.status === SellerStatus.APPROVED && this.isActive;
  }

  canSellProducts(): boolean {
    return this.isApproved();
  }

  // 판매자 등급별 혜택 (문서 #66: 공급자가 등급별 할인 제공)
  getSupplierDiscountEligibility(): number {
    switch (this.tier) {
      case SellerTier.BRONZE:
        return 0; // 할인 없음
      case SellerTier.SILVER:
        return 5; // 5% 할인 가능
      case SellerTier.GOLD:
        return 10; // 10% 할인 가능
      case SellerTier.PLATINUM:
        return 15; // 15% 할인 가능
      default:
        return 0;
    }
  }

  getMaxProducts(): number {
    switch (this.tier) {
      case SellerTier.BRONZE:
        return 50;
      case SellerTier.SILVER:
        return 200;
      case SellerTier.GOLD:
        return 500;
      case SellerTier.PLATINUM:
        return -1; // unlimited
      default:
        return 50;
    }
  }

  getPlatformCommissionRate(): number {
    switch (this.tier) {
      case SellerTier.BRONZE:
        return 5.0;
      case SellerTier.SILVER:
        return 4.0;
      case SellerTier.GOLD:
        return 3.0;
      case SellerTier.PLATINUM:
        return 2.0;
      default:
        return 5.0;
    }
  }

  // 판매자 등급 업그레이드 조건 확인
  checkTierUpgradeEligibility(): SellerTier | null {
    if (!this.metrics) return null;

    const { totalRevenue, totalOrders, averageOrderValue, customerSatisfaction, returnRate } = this.metrics;

    // Platinum 조건
    if (
      totalRevenue >= 100000000 && // 1억원
      totalOrders >= 1000 &&
      averageOrderValue >= 100000 && // 10만원
      customerSatisfaction >= 4.8 &&
      returnRate <= 2
    ) {
      return SellerTier.PLATINUM;
    }

    // Gold 조건
    if (
      totalRevenue >= 50000000 && // 5천만원
      totalOrders >= 500 &&
      averageOrderValue >= 50000 && // 5만원
      customerSatisfaction >= 4.5 &&
      returnRate <= 5
    ) {
      return SellerTier.GOLD;
    }

    // Silver 조건
    if (
      totalRevenue >= 10000000 && // 1천만원
      totalOrders >= 100 &&
      averageOrderValue >= 30000 && // 3만원
      customerSatisfaction >= 4.0 &&
      returnRate <= 10
    ) {
      return SellerTier.SILVER;
    }

    return null;
  }

  // 메트릭 업데이트
  updateMetrics(metrics: Partial<SellerMetrics>): void {
    this.metrics = {
      ...this.metrics,
      ...metrics
    } as SellerMetrics;
  }

  updateRating(newRating: number): void {
    const totalRating = this.averageRating * this.totalReviews + newRating;
    this.totalReviews += 1;
    this.averageRating = totalRating / this.totalReviews;
  }

  // 수익 업데이트
  addRevenue(amount: number): void {
    this.totalRevenue += amount;
    this.monthlyRevenue += amount;
  }

  // 상품 수 업데이트
  incrementProductCount(): void {
    this.productCount += 1;
    this.activeProductCount += 1;
  }

  decrementProductCount(isActive: boolean = true): void {
    this.productCount = Math.max(0, this.productCount - 1);
    if (isActive) {
      this.activeProductCount = Math.max(0, this.activeProductCount - 1);
    }
  }

  // 판매자 상태 변경
  approve(approvedBy: string): void {
    this.status = SellerStatus.APPROVED;
    this.approvedAt = new Date();
    this.approvedBy = approvedBy;
  }

  suspend(): void {
    this.status = SellerStatus.SUSPENDED;
    this.isActive = false;
  }

  reject(): void {
    this.status = SellerStatus.REJECTED;
    this.isActive = false;
  }

  reactivate(): void {
    if (this.status === SellerStatus.APPROVED) {
      this.isActive = true;
    }
  }

  // 등급 업그레이드
  upgradeTier(newTier: SellerTier): void {
    this.tier = newTier;
    this.platformCommissionRate = this.getPlatformCommissionRate();
  }

  // 스토어 URL 생성
  getStoreUrl(): string {
    return `/store/${this.storeSlug}`;
  }

  // 활동 상태 업데이트
  updateLastActive(): void {
    this.lastActiveAt = new Date();
  }
}