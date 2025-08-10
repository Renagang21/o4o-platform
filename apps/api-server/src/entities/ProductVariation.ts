import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index, Unique } from 'typeorm';
import { Product } from './Product';

/**
 * 상품 변형 엔티티 (특정 속성 조합의 개별 SKU)
 * 예: "빨간색 + L 사이즈" 조합
 */
@Entity('product_variations')
@Unique(['productId', 'sku'])
@Index(['productId', 'status'])
export class ProductVariation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  productId: string;

  @ManyToOne(() => Product, product => product.variations, { onDelete: 'CASCADE' })
  product: Product;

  @Column({ unique: true })
  sku: string; // 고유 SKU (예: 'SHIRT-RED-L')

  @Column({ nullable: true })
  barcode: string; // 바코드

  @Column({ type: 'json' })
  attributes: {
    [key: string]: {
      name: string;
      value: string;
      slug: string;
    }
  }; // { color: { name: 'Color', value: 'Red', slug: 'red' }, size: { name: 'Size', value: 'Large', slug: 'large' } }

  @Column({ length: 255 })
  attributeString: string; // "Red / Large" - 표시용 문자열

  // 가격 정보 (부모 상품 가격을 오버라이드할 수 있음)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  retailPrice: number; // null이면 부모 상품 가격 사용

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  wholesalePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  affiliatePrice: number;

  // 재고 정보
  @Column({ default: true })
  manageStock: boolean;

  @Column({ default: 0 })
  stockQuantity: number;

  @Column({ type: 'enum', enum: ['in_stock', 'out_of_stock', 'on_backorder'], default: 'in_stock' })
  stockStatus: 'in_stock' | 'out_of_stock' | 'on_backorder';

  @Column({ nullable: true })
  lowStockThreshold: number;

  // 물리적 속성
  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true })
  weight: number; // kg

  @Column({ type: 'json', nullable: true })
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };

  // 이미지
  @Column({ type: 'json', nullable: true })
  images: Array<{
    url: string;
    alt?: string;
    position: number;
  }>;

  @Column({ nullable: true })
  imageUrl: string; // 대표 이미지

  // 상태 및 설정
  @Column({ type: 'enum', enum: ['active', 'inactive', 'discontinued'], default: 'active' })
  status: 'active' | 'inactive' | 'discontinued';

  @Column({ default: true })
  enabled: boolean; // 판매 가능 여부

  @Column({ default: 0 })
  position: number; // 표시 순서

  // Compatibility fields
  get price(): number {
    return this.retailPrice;
  }
  
  set price(value: number) {
    this.retailPrice = value;
  }
  
  get compareAtPrice(): number | undefined {
    return this.salePrice;
  }
  
  set compareAtPrice(value: number | undefined) {
    this.salePrice = value || 0;
  }
  
  get stock(): number {
    return this.stockQuantity;
  }
  
  set stock(value: number) {
    this.stockQuantity = value;
  }
  
  get isActive(): boolean {
    return this.status === 'active';
  }
  
  @Column({ type: 'json', nullable: true })
  metadata: {
    costPrice?: number; // 원가
    compareAtPrice?: number; // 비교 가격
    fulfillmentService?: string; // 배송 서비스
    requiresShipping?: boolean;
    taxable?: boolean;
    gtin?: string; // Global Trade Item Number
    mpn?: string; // Manufacturer Part Number
    customFields?: Record<string, any>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isInStock(): boolean {
    if (!this.manageStock) return true;
    return this.stockQuantity > 0;
  }

  isLowStock(): boolean {
    if (!this.manageStock || !this.lowStockThreshold) return false;
    return this.stockQuantity <= this.lowStockThreshold;
  }

  getPrice(role: string = 'customer'): number {
    switch (role) {
      case 'wholesale':
        return this.wholesalePrice || this.retailPrice;
      case 'affiliate':
        return this.affiliatePrice || this.retailPrice;
      default:
        return this.salePrice || this.retailPrice;
    }
  }

  getDisplayName(): string {
    return `${this.product?.name || ''} - ${this.attributeString}`;
  }
}