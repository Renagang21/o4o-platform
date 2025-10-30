import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique
} from 'typeorm';
import { Seller } from './Seller.js';
import { Product } from './Product.js';

export enum SellerProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued'
}

@Entity('seller_products')
@Unique(['sellerId', 'productId'])
@Index(['sellerId', 'status'])
@Index(['productId', 'status'])
@Index(['status', 'isActive'])
@Index(['sellerPrice', 'status'])
export class SellerProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Seller relationship
  @Column({ type: 'uuid' })
  sellerId!: string;

  @ManyToOne(() => Seller, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller!: Seller;

  // Product relationship
  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  // Seller-specific pricing (문서 #66: 판매자가 판매가 결정)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  sellerPrice!: number; // 판매자가 설정한 판매가

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  comparePrice?: number; // 정가 (할인 표시용)

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  costPrice!: number; // 공급가 (판매자 등급별 할인 적용된 가격)

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  profit!: number; // 예상 이익 (sellerPrice - costPrice - commissions)

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  profitMargin!: number; // 이익률 (%)

  // Status and Availability
  @Column({ type: 'enum', enum: SellerProductStatus, default: SellerProductStatus.ACTIVE })
  status!: SellerProductStatus;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: true })
  isVisible!: boolean; // 스토어에서 표시 여부

  // Seller-specific inventory
  @Column({ type: 'integer', nullable: true })
  sellerInventory?: number; // 판매자별 재고 (없으면 공급자 재고 사용)

  @Column({ type: 'integer', nullable: true })
  reservedInventory?: number; // 예약된 재고

  // Sales performance
  @Column({ type: 'integer', default: 0 })
  totalSold!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalRevenue!: number;

  @Column({ type: 'integer', default: 0 })
  viewCount!: number;

  @Column({ type: 'integer', default: 0 })
  cartAddCount!: number; // 장바구니 추가 횟수

  // Seller-specific customization
  @Column({ type: 'varchar', length: 255, nullable: true })
  sellerSku?: string; // 판매자별 SKU

  @Column({ type: 'text', nullable: true })
  sellerDescription?: string; // 판매자별 상품 설명

  @Column({ type: 'simple-array', nullable: true })
  sellerTags?: string[]; // 판매자별 태그

  @Column({ type: 'json', nullable: true })
  sellerImages?: string[]; // 판매자가 추가한 이미지

  // Promotion and Marketing
  @Column({ type: 'boolean', default: false })
  isFeatured!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  featuredUntil?: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountRate?: number; // 할인율

  @Column({ type: 'timestamp', nullable: true })
  saleStartDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  saleEndDate?: Date;

  // SEO and URLs
  @Column({ type: 'varchar', length: 255, nullable: true })
  sellerSlug?: string; // 판매자별 URL slug

  @Column({ type: 'json', nullable: true })
  seoMetadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };

  // Performance metrics
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate!: number; // 전환율

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageOrderValue!: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating!: number;

  @Column({ type: 'integer', default: 0 })
  reviewCount!: number;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSoldAt?: Date;

  // Helper Methods
  calculateProfit(): number {
    // 실제 이익 = 판매가 - 공급가 - 플랫폼 수수료 - 기타 비용
    const platformCommission = this.sellerPrice * 0.025; // 2.5% 플랫폼 수수료
    return this.sellerPrice - this.costPrice - platformCommission;
  }

  calculateProfitMargin(): number {
    if (this.sellerPrice === 0) return 0;
    return (this.calculateProfit() / this.sellerPrice) * 100;
  }

  updatePricing(): void {
    this.profit = this.calculateProfit();
    this.profitMargin = this.calculateProfitMargin();
  }

  getDiscountedPrice(): number {
    if (!this.discountRate || !this.isOnSale()) {
      return this.sellerPrice;
    }
    return this.sellerPrice * (1 - this.discountRate / 100);
  }

  isOnSale(): boolean {
    const now = new Date();
    return !!(
      this.discountRate &&
      this.discountRate > 0 &&
      this.saleStartDate &&
      this.saleEndDate &&
      now >= this.saleStartDate &&
      now <= this.saleEndDate
    );
  }

  getAvailableInventory(): number {
    // 판매자별 재고가 있으면 그것을 사용, 없으면 상품 재고 사용
    const baseInventory = this.sellerInventory ?? this.product?.inventory ?? 0;
    const reserved = this.reservedInventory ?? 0;
    return Math.max(0, baseInventory - reserved);
  }

  canOrder(quantity: number): boolean {
    if (!this.isActive || this.status !== SellerProductStatus.ACTIVE) {
      return false;
    }
    return this.getAvailableInventory() >= quantity;
  }

  recordSale(quantity: number, amount: number): void {
    this.totalSold += quantity;
    this.totalRevenue += amount;
    this.lastSoldAt = new Date();
    
    // 재고 차감
    if (this.sellerInventory !== null) {
      this.sellerInventory = Math.max(0, this.sellerInventory - quantity);
    }
  }

  recordView(): void {
    this.viewCount += 1;
  }

  recordCartAdd(): void {
    this.cartAddCount += 1;
  }

  updateConversionRate(): void {
    if (this.viewCount > 0) {
      this.conversionRate = (this.totalSold / this.viewCount) * 100;
    }
  }

  updateRating(newRating: number): void {
    const totalRating = this.averageRating * this.reviewCount + newRating;
    this.reviewCount += 1;
    this.averageRating = totalRating / this.reviewCount;
  }

  // 상태 변경 메서드
  activate(): void {
    this.status = SellerProductStatus.ACTIVE;
    this.isActive = true;
    if (!this.publishedAt) {
      this.publishedAt = new Date();
    }
  }

  deactivate(): void {
    this.status = SellerProductStatus.INACTIVE;
    this.isActive = false;
  }

  markOutOfStock(): void {
    this.status = SellerProductStatus.OUT_OF_STOCK;
  }

  discontinue(): void {
    this.status = SellerProductStatus.DISCONTINUED;
    this.isActive = false;
  }

  // 할인 설정
  setDiscount(rate: number, startDate: Date, endDate: Date): void {
    this.discountRate = rate;
    this.saleStartDate = startDate;
    this.saleEndDate = endDate;
  }

  clearDiscount(): void {
    this.discountRate = null;
    this.saleStartDate = null;
    this.saleEndDate = null;
  }

  // 피처드 상품 설정
  setFeatured(until: Date): void {
    this.isFeatured = true;
    this.featuredUntil = until;
  }

  clearFeatured(): void {
    this.isFeatured = false;
    this.featuredUntil = null;
  }

  isFeaturedActive(): boolean {
    if (!this.isFeatured || !this.featuredUntil) return false;
    return new Date() <= this.featuredUntil;
  }
}