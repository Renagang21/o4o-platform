import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
  BeforeInsert
} from 'typeorm';
import { User } from '../User';
import { AffiliateStatus } from '../../types/dropshipping';

@Entity('affiliates')
@Index(['userId'], { unique: true })
@Index(['referralCode'], { unique: true })
@Index(['status'])
export class Affiliate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', length: 50, unique: true })
  referralCode!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  websiteUrl?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Social Media Profiles
  @Column({ type: 'json', nullable: true })
  socialMedia?: {
    youtube?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    blog?: string;
    twitter?: string;
    linkedin?: string;
  };

  // Audience Demographics
  @Column({ type: 'json', nullable: true })
  audienceInfo?: {
    size?: number;
    primaryPlatform?: string;
    demographics?: {
      ageRange?: string;
      gender?: string;
      location?: string[];
      interests?: string[];
    };
  };

  // Commission Settings
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.00 })
  baseCommissionRate!: number; // Base commission rate (%)

  @Column({ type: 'json', nullable: true })
  tieredRates?: {
    level: number;
    minSales: number;
    rate: number;
  }[];

  @Column({ type: 'json', nullable: true })
  specialRates?: {
    productId?: string;
    categoryId?: string;
    rate: number;
    validUntil?: Date;
  }[];

  // Performance Metrics
  @Column({ type: 'integer', default: 0 })
  totalClicks!: number;

  @Column({ type: 'integer', default: 0 })
  uniqueClicks!: number;

  @Column({ type: 'integer', default: 0 })
  totalConversions!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate!: number; // Percentage

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalEarnings!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  pendingEarnings!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidEarnings!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  currentMonthEarnings!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  lastMonthEarnings!: number;

  // Tracking Metrics
  @Column({ type: 'integer', default: 0 })
  totalOrders!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalOrderValue!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  averageOrderValue!: number;

  @Column({ type: 'integer', default: 0 })
  repeatCustomers!: number;

  // Payment Information
  @Column({ type: 'json', nullable: true })
  paymentMethod?: {
    type: 'bank' | 'paypal' | 'stripe' | 'crypto';
    details: Record<string, string>;
  };

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 100.00 })
  minimumPayoutAmount!: number;

  @Column({ type: 'varchar', length: 20, default: 'monthly' })
  payoutFrequency!: 'daily' | 'weekly' | 'biweekly' | 'monthly';

  @Column({ type: 'timestamp', nullable: true })
  lastPayoutDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextPayoutDate?: Date;

  // Affiliate Network (Multi-level)
  @Column({ type: 'uuid', nullable: true })
  parentAffiliateId?: string; // For multi-level affiliate programs

  @Column({ type: 'integer', default: 0 })
  networkLevel!: number; // 0 = direct, 1 = first level, etc.

  @Column({ type: 'integer', default: 0 })
  totalReferrals!: number; // Number of sub-affiliates

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  networkCommissionRate!: number; // Commission from sub-affiliates

  // Marketing Materials Access
  @Column({ type: 'simple-array', nullable: true })
  allowedCategories?: string[]; // Product categories allowed to promote

  @Column({ type: 'simple-array', nullable: true })
  blockedProducts?: string[]; // Specific products not allowed

  @Column({ type: 'json', nullable: true })
  customLinks?: {
    id: string;
    url: string;
    description?: string;
    clicks: number;
    conversions: number;
    createdAt: Date;
  }[];

  // Status and Compliance
  @Column({
    type: 'enum',
    enum: AffiliateStatus,
    default: AffiliateStatus.ACTIVE
  })
  status!: AffiliateStatus;

  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'text', nullable: true })
  taxId?: string;

  @Column({ type: 'boolean', default: false })
  agreementSigned!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  agreementSignedAt?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Generate unique referral code before insert
  @BeforeInsert()
  generateReferralCode() {
    if (!this.referralCode) {
      this.referralCode = this.generateUniqueCode();
    }
  }

  // Helper methods
  private generateUniqueCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  isActive(): boolean {
    return this.status === AffiliateStatus.ACTIVE && this.isVerified;
  }

  getCurrentCommissionRate(salesAmount?: number): number {
    if (!salesAmount || !this.tieredRates || this.tieredRates.length === 0) {
      return this.baseCommissionRate;
    }

    // Find the highest tier the affiliate qualifies for
    const qualifiedTier = this.tieredRates
      .filter(tier => salesAmount >= tier.minSales)
      .sort((a, b) => b.minSales - a.minSales)[0];

    return qualifiedTier ? qualifiedTier.rate : this.baseCommissionRate;
  }

  calculateCommission(orderAmount: number, productId?: string, categoryId?: string): number {
    let rate = this.baseCommissionRate;

    // Check for special rates
    if (this.specialRates && this.specialRates.length > 0) {
      const now = new Date();
      const specialRate = this.specialRates.find(sr => {
        const validDate = !sr.validUntil || new Date(sr.validUntil) > now;
        const matchProduct = sr.productId === productId;
        const matchCategory = sr.categoryId === categoryId;
        return validDate && (matchProduct || matchCategory);
      });

      if (specialRate) {
        rate = specialRate.rate;
      }
    }

    // Check tiered rates based on total earnings
    if (!rate) {
      rate = this.getCurrentCommissionRate(this.totalEarnings);
    }

    return (orderAmount * rate) / 100;
  }

  updateConversionRate(): void {
    if (this.totalClicks > 0) {
      this.conversionRate = (this.totalConversions / this.totalClicks) * 100;
    }
  }

  updateAverageOrderValue(): void {
    if (this.totalOrders > 0) {
      this.averageOrderValue = this.totalOrderValue / this.totalOrders;
    }
  }

  canRequestPayout(): boolean {
    return this.pendingEarnings >= this.minimumPayoutAmount && this.isActive();
  }

  toPublicProfile(): Partial<Affiliate> {
    return {
      id: this.id,
      referralCode: this.referralCode,
      websiteUrl: this.websiteUrl,
      description: this.description,
      socialMedia: this.socialMedia,
      audienceInfo: this.audienceInfo,
      isVerified: this.isVerified,
      totalConversions: this.totalConversions,
      conversionRate: this.conversionRate
    };
  }
}