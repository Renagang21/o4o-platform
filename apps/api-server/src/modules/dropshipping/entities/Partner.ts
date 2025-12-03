import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import type { User } from './User.js';
import type { Seller } from './Seller.js';

export enum PartnerStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected'
}

export enum PartnerTier {
  BRONZE = 'bronze',
  SILVER = 'silver', 
  GOLD = 'gold',
  PLATINUM = 'platinum'
}

export interface PartnerMetrics {
  totalClicks: number;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  conversionRate: number;
  averageOrderValue: number;
  clicksThisMonth: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
  commissionThisMonth: number;
}

export interface PartnerProfile {
  bio?: string;
  website?: string;
  socialMedia?: {
    youtube?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
    blog?: string;
  };
  audience?: {
    size?: number;
    demographics?: string;
    interests?: string[];
  };
  marketingChannels?: string[];
}

export interface PayoutInfo {
  method: 'bank' | 'paypal' | 'crypto';
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  paypalEmail?: string;
  cryptoAddress?: string;
  currency: string;
}

@Entity('partners')
@Index(['userId'], { unique: true })
@Index(['sellerId', 'status'])
@Index(['referralCode'], { unique: true })
@Index(['status', 'tier'])
@Index(['isActive', 'status'])
export class Partner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // User relationship (One-to-One)
  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne('User', 'partner', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // Seller relationship (Many-to-One) - 문서 #66: 파트너가 판매자 선택
  @Column({ type: 'uuid' })
  sellerId!: string;

  @ManyToOne('Seller', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller!: Seller;

  // Partner Status and Tier
  @Column({ type: 'enum', enum: PartnerStatus, default: PartnerStatus.PENDING })
  status!: PartnerStatus;

  @Column({ type: 'enum', enum: PartnerTier, default: PartnerTier.BRONZE })
  tier!: PartnerTier;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // Referral System (문서 #66: 추적 시스템)
  @Column({ type: 'varchar', length: 20, unique: true })
  referralCode!: string; // 고유 추천 코드

  @Column({ type: 'varchar', length: 500 })
  referralLink!: string; // 추적 링크 (ref=파트너코드)

  // Partner Profile
  @Column({ type: 'json', nullable: true })
  profile?: PartnerProfile;

  // Performance Metrics
  @Column({ type: 'json', nullable: true })
  metrics?: PartnerMetrics;

  // Commission and Earnings
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalEarnings!: number; // 총 수익

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  availableBalance!: number; // 출금 가능 금액

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pendingBalance!: number; // 보류 중인 금액

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidOut!: number; // 지급 완료 금액

  // Payout Information
  @Column({ type: 'json', nullable: true })
  payoutInfo?: PayoutInfo;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 50000 })
  minimumPayout!: number; // 최소 출금 금액

  // Performance Tracking
  @Column({ type: 'integer', default: 0 })
  totalClicks!: number;

  @Column({ type: 'integer', default: 0 })
  totalOrders!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageOrderValue!: number;

  // Monthly Performance Reset
  @Column({ type: 'integer', default: 0 })
  monthlyClicks!: number;

  @Column({ type: 'integer', default: 0 })
  monthlyOrders!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monthlyEarnings!: number;

  // Partner Application Info
  @Column({ type: 'text', nullable: true })
  applicationMessage?: string; // 지원 시 메시지

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string; // 거절 사유

  // Marketing Materials
  @Column({ type: 'simple-array', nullable: true })
  allowedPromotionTypes?: string[]; // 허용된 프로모션 유형

  @Column({ type: 'boolean', default: true })
  canUseProductImages!: boolean;

  @Column({ type: 'boolean', default: true })
  canCreateCoupons!: boolean;

  // Communication
  @Column({ type: 'boolean', default: true })
  emailNotifications!: boolean;

  @Column({ type: 'boolean', default: true })
  smsNotifications!: boolean;

  @Column({ type: 'varchar', length: 10, nullable: true })
  preferredLanguage?: string;

  // Additional Information
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  // Webhook Configuration
  @Column({ type: 'varchar', length: 500, nullable: true })
  webhookUrl?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  webhookSecret?: string | null;

  @Column({ type: 'boolean', default: true })
  webhookEnabled!: boolean;

  @Column({ type: 'simple-json', nullable: true })
  webhookEvents?: string[];

  @Column({ type: 'timestamp', nullable: true })
  webhookLastDeliveredAt?: Date;

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

  @Column({ type: 'timestamp', nullable: true })
  lastPayoutAt?: Date;

  // Helper Methods
  isApproved(): boolean {
    return this.status === PartnerStatus.ACTIVE && this.isActive;
  }

  canPromote(): boolean {
    return this.isApproved();
  }

  // 추적 링크 생성 (문서 #66)
  generateReferralLink(productId?: string, sellerId?: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://o4o.co.kr';
    let link = `${baseUrl}?ref=${this.referralCode}`;
    
    if (productId) {
      link += `&product=${productId}`;
    }
    
    if (sellerId) {
      link += `&seller=${sellerId}`;
    }
    
    return link;
  }

  // 파트너 등급별 혜택
  getCommissionBonus(): number {
    switch (this.tier) {
      case PartnerTier.BRONZE:
        return 0; // 추가 보너스 없음
      case PartnerTier.SILVER:
        return 0.5; // 0.5% 추가
      case PartnerTier.GOLD:
        return 1.0; // 1% 추가
      case PartnerTier.PLATINUM:
        return 2.0; // 2% 추가
      default:
        return 0;
    }
  }

  getPayoutFrequency(): string {
    switch (this.tier) {
      case PartnerTier.BRONZE:
        return 'monthly';
      case PartnerTier.SILVER:
        return 'bi-weekly';
      case PartnerTier.GOLD:
        return 'weekly';
      case PartnerTier.PLATINUM:
        return 'on-demand';
      default:
        return 'monthly';
    }
  }

  // 등급 업그레이드 조건 확인
  checkTierUpgradeEligibility(): PartnerTier | null {
    if (!this.metrics) return null;

    const { totalOrders, totalRevenue, conversionRate } = this.metrics;

    // Platinum 조건
    if (totalOrders >= 1000 && totalRevenue >= 50000000 && conversionRate >= 5.0) {
      return PartnerTier.PLATINUM;
    }

    // Gold 조건
    if (totalOrders >= 500 && totalRevenue >= 20000000 && conversionRate >= 4.0) {
      return PartnerTier.GOLD;
    }

    // Silver 조건
    if (totalOrders >= 100 && totalRevenue >= 5000000 && conversionRate >= 2.0) {
      return PartnerTier.SILVER;
    }

    return null;
  }

  // 성과 추적 업데이트
  recordClick(): void {
    this.totalClicks += 1;
    this.monthlyClicks += 1;
    this.updateConversionRate();
  }

  recordOrder(orderValue: number, commission: number): void {
    this.totalOrders += 1;
    this.monthlyOrders += 1;
    this.totalEarnings += commission;
    this.monthlyEarnings += commission;
    this.pendingBalance += commission;
    
    // 평균 주문 금액 업데이트
    this.averageOrderValue = (this.averageOrderValue * (this.totalOrders - 1) + orderValue) / this.totalOrders;
    
    this.updateConversionRate();
    this.updateMetrics({
      totalOrders: this.totalOrders,
      totalRevenue: this.metrics?.totalRevenue ?? 0 + orderValue,
      totalCommission: this.totalEarnings,
      averageOrderValue: this.averageOrderValue
    });
  }

  private updateConversionRate(): void {
    if (this.totalClicks > 0) {
      this.conversionRate = (this.totalOrders / this.totalClicks) * 100;
    }
  }

  // 메트릭 업데이트
  updateMetrics(metrics: Partial<PartnerMetrics>): void {
    this.metrics = {
      ...this.metrics,
      ...metrics
    } as PartnerMetrics;
  }

  // 출금 처리
  processPayout(amount: number): boolean {
    if (amount > this.availableBalance || amount < this.minimumPayout) {
      return false;
    }

    this.availableBalance -= amount;
    this.paidOut += amount;
    this.lastPayoutAt = new Date();
    
    return true;
  }

  // 보류 금액을 출금 가능 금액으로 이동
  confirmPendingBalance(): void {
    this.availableBalance += this.pendingBalance;
    this.pendingBalance = 0;
  }

  // 월간 성과 리셋
  resetMonthlyMetrics(): void {
    this.monthlyClicks = 0;
    this.monthlyOrders = 0;
    this.monthlyEarnings = 0;
  }

  // 파트너 상태 변경
  approve(approvedBy: string): void {
    this.status = PartnerStatus.ACTIVE;
    this.approvedAt = new Date();
    this.approvedBy = approvedBy;
  }

  suspend(): void {
    this.status = PartnerStatus.SUSPENDED;
    this.isActive = false;
  }

  reject(reason: string): void {
    this.status = PartnerStatus.REJECTED;
    this.rejectionReason = reason;
    this.isActive = false;
  }

  reactivate(): void {
    if (this.status === PartnerStatus.ACTIVE) {
      this.isActive = true;
    }
  }

  // 등급 업그레이드
  upgradeTier(newTier: PartnerTier): void {
    this.tier = newTier;
  }

  // 활동 상태 업데이트
  updateLastActive(): void {
    this.lastActiveAt = new Date();
  }
}