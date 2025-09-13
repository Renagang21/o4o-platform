import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany
} from 'typeorm';
import { Supplier } from './Supplier';

@Entity('dropshipping_products')
@Index(['supplierId'])
@Index(['sku'], { unique: true })
@Index(['category'])
@Index(['isActive'])
@Index(['name'])
export class DropshippingProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  supplierId!: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  shortDescription?: string;

  @Column({ type: 'varchar', length: 100 })
  category!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subcategory?: string;

  @Column({ type: 'simple-array' })
  images!: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail?: string;

  // Pricing
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  supplierPrice!: number; // 공급가

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  msrp!: number; // 권장소비자가

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minSellingPrice?: number; // 최소 판매가

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  compareAtPrice?: number; // 할인 전 가격

  // Inventory
  @Column({ type: 'integer', default: 0 })
  quantity!: number;

  @Column({ type: 'integer', default: 0 })
  reserved!: number; // 예약된 수량

  @Column({ type: 'integer', default: 10 })
  lowStockThreshold!: number;

  @Column({ type: 'boolean', default: true })
  trackInventory!: boolean;

  @Column({ type: 'boolean', default: false })
  allowBackorder!: boolean;

  // Shipping
  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true })
  weight?: number; // kg

  @Column({ type: 'json', nullable: true })
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };

  @Column({ type: 'varchar', length: 50, default: 'standard' })
  shippingClass!: string;

  @Column({ type: 'integer', default: 3 })
  estimatedShippingDays!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingCost!: number;

  @Column({ type: 'boolean', default: false })
  freeShipping!: boolean;

  // Product Details
  @Column({ type: 'json', nullable: true })
  attributes?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  specifications?: Record<string, string>;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  barcode?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  isbn?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  mpn?: string; // Manufacturer Part Number

  // Variations
  @Column({ type: 'json', nullable: true })
  variations?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    attributes: Record<string, any>;
    image?: string;
  }[];

  @Column({ type: 'json', nullable: true })
  variationOptions?: {
    name: string;
    values: string[];
  }[];

  // SEO
  @Column({ type: 'varchar', length: 255, nullable: true })
  seoTitle?: string;

  @Column({ type: 'text', nullable: true })
  seoDescription?: string;

  @Column({ type: 'simple-array', nullable: true })
  seoKeywords?: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  slug?: string;

  // Statistics
  @Column({ type: 'integer', default: 0 })
  views!: number;

  @Column({ type: 'integer', default: 0 })
  totalSold!: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating!: number;

  @Column({ type: 'integer', default: 0 })
  totalReviews!: number;

  // Status
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isFeatured!: boolean;

  @Column({ type: 'boolean', default: false })
  isNewArrival!: boolean;

  @Column({ type: 'boolean', default: false })
  isBestSeller!: boolean;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status!: 'draft' | 'pending' | 'publish' | 'archived';

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  // Import/Export
  @Column({ type: 'json', nullable: true })
  importData?: Record<string, any>; // Original import data

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId?: string; // ID from external system

  @Column({ type: 'varchar', length: 100, nullable: true })
  externalSource?: string; // Source system name

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt?: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  get availableQuantity(): number {
    return Math.max(0, this.quantity - this.reserved);
  }

  isInStock(): boolean {
    return this.availableQuantity > 0 || this.allowBackorder;
  }

  isLowStock(): boolean {
    return this.availableQuantity <= this.lowStockThreshold && this.availableQuantity > 0;
  }

  isOutOfStock(): boolean {
    return this.availableQuantity <= 0 && !this.allowBackorder;
  }

  canBeSold(): boolean {
    return this.isActive && this.status === 'publish' && this.isInStock();
  }

  calculateSellerPrice(markup: number): number {
    return this.supplierPrice * (1 + markup / 100);
  }

  calculateProfit(sellingPrice: number): number {
    return sellingPrice - this.supplierPrice - this.shippingCost;
  }

  calculateMargin(sellingPrice: number): number {
    if (sellingPrice === 0) return 0;
    return ((sellingPrice - this.supplierPrice) / sellingPrice) * 100;
  }

  reserveStock(quantity: number): boolean {
    if (this.availableQuantity >= quantity) {
      this.reserved += quantity;
      return true;
    }
    return false;
  }

  releaseStock(quantity: number): void {
    this.reserved = Math.max(0, this.reserved - quantity);
  }

  updateStock(quantity: number): void {
    this.quantity = Math.max(0, this.quantity - quantity);
    this.totalSold += quantity;
  }

  toPublicData(): Partial<DropshippingProduct> {
    return {
      id: this.id,
      sku: this.sku,
      name: this.name,
      description: this.description,
      shortDescription: this.shortDescription,
      category: this.category,
      subcategory: this.subcategory,
      images: this.images,
      thumbnail: this.thumbnail,
      msrp: this.msrp,
      compareAtPrice: this.compareAtPrice,
      brand: this.brand,
      specifications: this.specifications,
      variations: this.variations,
      variationOptions: this.variationOptions,
      shippingClass: this.shippingClass,
      estimatedShippingDays: this.estimatedShippingDays,
      freeShipping: this.freeShipping,
      averageRating: this.averageRating,
      totalReviews: this.totalReviews,
      isActive: this.isActive,
      isFeatured: this.isFeatured,
      isNewArrival: this.isNewArrival,
      isBestSeller: this.isBestSeller,
      tags: this.tags
    };
  }
}