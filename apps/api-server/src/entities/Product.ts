import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User';
import { ProductAttribute } from './ProductAttribute';

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock'
}

export enum ProductType {
  PHYSICAL = 'physical',
  DIGITAL = 'digital',
  SERVICE = 'service'
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  shortDescription?: string;

  @Column()
  sku!: string;

  // 가격 정보 (역할별 차등 가격)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  retailPrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  wholesalePrice?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  affiliatePrice?: number;
  
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salePrice?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost?: number;

  // 재고 관리
  @Column({ name: 'stock', default: 0 })
  stockQuantity!: number;

  @Column({ default: false })
  manageStock!: boolean;

  @Column({ nullable: true })
  lowStockThreshold?: number;

  // 상품 속성
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weight?: number;

  @Column({ type: 'json', nullable: true })
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };

  // 상태 및 설정
  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT
  })
  status!: ProductStatus;

  @Column({
    type: 'enum',
    enum: ProductType,
    default: ProductType.PHYSICAL
  })
  type!: ProductType;

  @Column({ default: false })
  featured!: boolean;

  @Column({ default: true })
  requiresShipping!: boolean;

  // 이미지 및 미디어
  @Column({ type: 'json', nullable: true })
  images?: string[];

  @Column({ nullable: true })
  featuredImage?: string;

  // 카테고리
  @Column({ nullable: true })
  categoryId?: string;

  @Column({ type: 'json', nullable: true })
  tags?: string[];

  // SEO
  @Column({ nullable: true })
  metaTitle?: string;

  @Column({ type: 'text', nullable: true })
  metaDescription?: string;

  // 판매자 정보
  @Column()
  createdBy!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator!: User;

  @Column({ nullable: true })
  vendorId?: string;

  // Supplier info for dropshipping
  @Column({ nullable: true })
  supplierId?: string;

  @Column({ nullable: true })
  userId?: string;

  // 변형 관련 필드
  @Column({ default: false })
  hasVariations!: boolean;

  @OneToMany(() => ProductAttribute, attr => attr.product)
  attributes!: ProductAttribute[];

  // Additional fields for compatibility
  @Column({ type: 'json', nullable: true })
  reviews?: any[];
  
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  compareAtPrice?: number;
  
  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, default: 0 })
  rating?: number;
  
  @Column({ type: 'int', nullable: true, default: 0 })
  reviewCount?: number;
  
  @Column({ type: 'int', nullable: true, default: 0 })
  salesCount?: number;
  
  @Column({ nullable: true })
  brand?: string;
  
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
  
  @Column({ nullable: true, default: 'visible' })
  visibility?: string;

  // Compatibility fields
  get price(): number {
    return this.retailPrice;
  }

  set price(value: number) {
    this.retailPrice = value;
  }

  get stock(): number {
    return this.stockQuantity;
  }
  
  set stock(value: number) {
    this.stockQuantity = value;
  }

  get isActive(): boolean {
    return this.status === ProductStatus.ACTIVE;
  }

  get category(): string | undefined {
    return this.categoryId;
  }

  get vendor(): string | undefined {
    return this.vendorId;
  }

  // 배송 정보
  @Column({ type: 'json', nullable: true })
  shipping?: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    shippingClass?: string;
    freeShipping?: boolean;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 비즈니스 로직 메서드
  getPriceForUser(userRole: string): number {
    switch (userRole) {
      case 'business':
        return this.wholesalePrice || this.retailPrice;
      case 'affiliate':
        return this.affiliatePrice || this.retailPrice;
      default:
        return this.retailPrice;
    }
  }

  isInStock(): boolean {
    if (!this.manageStock) return true;
    return this.stockQuantity > 0;
  }

  isLowStock(): boolean {
    if (!this.manageStock || !this.lowStockThreshold) return false;
    return this.stockQuantity <= this.lowStockThreshold;
  }
}
