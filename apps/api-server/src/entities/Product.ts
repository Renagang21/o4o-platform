import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from './User';
import { Category } from './Category';
import { Supplier } from './Supplier';

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued'
}

export enum ProductType {
  PHYSICAL = 'physical',
  DIGITAL = 'digital',
  SERVICE = 'service',
  SUBSCRIPTION = 'subscription'
}

export interface ProductDimensions {
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  unit?: 'cm' | 'in' | 'kg' | 'lb';
}

export interface ProductImages {
  main: string;
  gallery?: string[];
  thumbnails?: string[];
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  comparePrice?: number;
  inventory: number;
  attributes: Record<string, string>; // color: red, size: L
}

export interface ProductSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  slug?: string;
}

export interface ShippingInfo {
  weight?: number;
  dimensions?: ProductDimensions;
  shippingClass?: string;
  freeShipping?: boolean;
  shippingCost?: number;
}

@Entity('products')
@Index(['supplierId', 'status'])
@Index(['categoryId', 'status'])
@Index(['sku'], { unique: true })
@Index(['slug'], { unique: true })
@Index(['status', 'createdAt'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Supplier relationship
  @Column({ type: 'uuid' })
  supplierId!: string;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier;

  // Category relationship
  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category?: Category;

  // Basic Product Information
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  shortDescription?: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug!: string;

  // Product Type and Status
  @Column({ type: 'enum', enum: ProductType, default: ProductType.PHYSICAL })
  type!: ProductType;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status!: ProductStatus;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // Pricing Information
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  supplierPrice!: number; // 공급가

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  recommendedPrice!: number; // 권장 판매가

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  comparePrice?: number; // 정가 (할인 비교용)

  @Column({ type: 'varchar', length: 3, default: 'KRW' })
  currency!: string;

  // Commission Settings (문서 #66: 공급자가 파트너 커미션 설정)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  partnerCommissionRate!: number; // 파트너 커미션 비율 (%)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  partnerCommissionAmount?: number; // 고정 커미션 금액


  // Inventory Management
  @Column({ type: 'integer', default: 0 })
  inventory!: number;

  @Column({ type: 'integer', nullable: true })
  lowStockThreshold?: number;

  @Column({ type: 'boolean', default: true })
  trackInventory!: boolean;

  @Column({ type: 'boolean', default: false })
  allowBackorder!: boolean;

  // Product Media
  @Column({ type: 'jsonb', nullable: true })
  images?: ProductImages;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  // Product Variants (사이즈, 색상 등)
  @Column({ type: 'jsonb', nullable: true })
  variants?: ProductVariant[];

  @Column({ type: 'boolean', default: false })
  hasVariants!: boolean;

  // Physical Product Information
  @Column({ type: 'jsonb', nullable: true })
  dimensions?: ProductDimensions;

  @Column({ type: 'jsonb', nullable: true })
  shipping?: ShippingInfo;

  // SEO and Marketing
  @Column({ type: 'jsonb', nullable: true })
  seo?: ProductSEO;

  @Column({ type: 'simple-array', nullable: true })
  features?: string[];

  @Column({ type: 'text', nullable: true })
  specifications?: string;

  // Supplier Tier Pricing (문서 #66: 판매자 등급별 공급가)
  @Column({ type: 'jsonb', nullable: true })
  tierPricing?: {
    bronze?: number;
    silver?: number;
    gold?: number;
    platinum?: number;
  };

  // Additional Information
  @Column({ type: 'varchar', length: 100, nullable: true })
  brand?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model?: string;

  @Column({ type: 'text', nullable: true })
  warranty?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  // Helper Methods
  getCurrentPrice(sellerTier?: 'bronze' | 'silver' | 'gold' | 'platinum'): number {
    if (sellerTier && this.tierPricing?.[sellerTier]) {
      return this.tierPricing[sellerTier];
    }
    return this.supplierPrice;
  }

  calculatePartnerCommission(salePrice: number): number {
    if (this.partnerCommissionAmount) {
      return this.partnerCommissionAmount;
    }
    return (salePrice * this.partnerCommissionRate) / 100;
  }

  isInStock(): boolean {
    if (!this.trackInventory) return true;
    return this.inventory > 0;
  }

  isLowStock(): boolean {
    if (!this.trackInventory || !this.lowStockThreshold) return false;
    return this.inventory <= this.lowStockThreshold;
  }

  getMainImage(): string | null {
    return this.images?.main || null;
  }

  getGalleryImages(): string[] {
    return this.images?.gallery || [];
  }

  isPublished(): boolean {
    return this.status === ProductStatus.ACTIVE && !!this.publishedAt;
  }

  getDiscountPercentage(): number {
    if (!this.comparePrice || this.comparePrice <= this.recommendedPrice) {
      return 0;
    }
    return Math.round(((this.comparePrice - this.recommendedPrice) / this.comparePrice) * 100);
  }

  // Inventory Management Methods
  reduceInventory(quantity: number): void {
    if (this.trackInventory) {
      this.inventory = Math.max(0, this.inventory - quantity);
    }
  }

  increaseInventory(quantity: number): void {
    if (this.trackInventory) {
      this.inventory += quantity;
    }
  }

  canOrder(quantity: number): boolean {
    if (!this.trackInventory) return true;
    if (this.allowBackorder) return true;
    return this.inventory >= quantity;
  }
}