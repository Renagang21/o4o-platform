import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
  ManyToMany,
  JoinTable
} from 'typeorm';
import { User } from '../User';
import { SellerLevel } from '../../types/dropshipping';

@Entity('sellers')
@Index(['userId'], { unique: true })
@Index(['sellerLevel'])
@Index(['isActive'])
export class Seller {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', length: 255 })
  storeName!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  storeUrl?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo?: string; // URL to logo image

  @Column({ type: 'varchar', length: 500, nullable: true })
  banner?: string; // URL to banner image

  @Column({
    type: 'enum',
    enum: SellerLevel,
    default: SellerLevel.BRONZE
  })
  sellerLevel!: SellerLevel;

  // Sales Performance Metrics
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalSales!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  monthlyAverage!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  returnRate!: number; // Percentage

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  customerSatisfaction!: number; // 0-5 scale

  @Column({ type: 'integer', default: 0 })
  totalOrders!: number;

  @Column({ type: 'integer', default: 0 })
  completedOrders!: number;

  @Column({ type: 'integer', default: 0 })
  cancelledOrders!: number;

  // Marketplace Integration
  @Column({ type: 'simple-array', nullable: true })
  marketplaces?: string[]; // ['amazon', 'ebay', 'shopify', etc.]

  @Column({ type: 'json', nullable: true })
  marketplaceCredentials?: Record<string, {
    apiKey?: string;
    apiSecret?: string;
    storeUrl?: string;
    isActive: boolean;
  }>;

  // Commission Settings
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  customCommissionRate?: number; // Custom commission rate if negotiated

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 20.00 })
  defaultMarkup!: number; // Default markup percentage on products

  // Financial Information
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance!: number; // Current balance

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  pendingPayout!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalPayout!: number;

  @Column({ type: 'json', nullable: true })
  paymentInfo?: {
    method: 'bank' | 'paypal' | 'stripe';
    details: Record<string, string>;
  };

  // Store Settings
  @Column({ type: 'json', nullable: true })
  storeSettings?: {
    currency?: string;
    timezone?: string;
    language?: string;
    autoOrderProcessing?: boolean;
    inventorySyncEnabled?: boolean;
    pricingSyncEnabled?: boolean;
    lowStockAlert?: boolean;
    lowStockThreshold?: number;
    shippingPolicy?: string;
    returnPolicy?: string;
    termsAndConditions?: string;
  };

  // SEO Settings
  @Column({ type: 'json', nullable: true })
  seoSettings?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    ogImage?: string;
  };

  // Contact Information
  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone?: string;

  @Column({ type: 'json', nullable: true })
  businessHours?: {
    [key: string]: { open: string; close: string; }
  };

  @Column({ type: 'json', nullable: true })
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'boolean', default: false })
  vacationMode!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  vacationStartDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  vacationEndDate?: Date;

  @Column({ type: 'text', nullable: true })
  vacationMessage?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  isOperational(): boolean {
    return this.isActive && !this.vacationMode;
  }

  canSell(): boolean {
    return this.isOperational() && this.isVerified;
  }

  getCommissionRate(): number {
    return this.customCommissionRate || 10; // Default 10% if not set
  }

  calculateSellerPrice(supplierPrice: number, markup?: number): number {
    const markupRate = markup || this.defaultMarkup;
    return supplierPrice * (1 + markupRate / 100);
  }

  updateLevel(): void {
    // Update seller level based on performance
    if (this.totalSales >= 1000000 && this.customerSatisfaction >= 4.5) {
      this.sellerLevel = SellerLevel.PLATINUM;
    } else if (this.totalSales >= 500000 && this.customerSatisfaction >= 4.0) {
      this.sellerLevel = SellerLevel.GOLD;
    } else if (this.totalSales >= 100000 && this.customerSatisfaction >= 3.5) {
      this.sellerLevel = SellerLevel.SILVER;
    } else {
      this.sellerLevel = SellerLevel.BRONZE;
    }
  }

  toPublicProfile(): Partial<Seller> {
    return {
      id: this.id,
      storeName: this.storeName,
      storeUrl: this.storeUrl,
      description: this.description,
      logo: this.logo,
      banner: this.banner,
      sellerLevel: this.sellerLevel,
      customerSatisfaction: this.customerSatisfaction,
      totalOrders: this.totalOrders,
      returnRate: this.returnRate,
      isVerified: this.isVerified,
      vacationMode: this.vacationMode,
      vacationMessage: this.vacationMessage,
      businessHours: this.businessHours,
      socialMedia: this.socialMedia
    };
  }
}