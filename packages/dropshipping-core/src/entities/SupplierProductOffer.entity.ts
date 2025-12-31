/**
 * SupplierProductOffer Entity
 *
 * S2S 구조에서 Supplier가 Seller에게 제시하는 공급 조건
 *
 * ## S2S 역할
 * - Supplier가 소유하는 데이터 (Supplier 측 Source of Truth)
 * - Product Master를 기반으로 가격, 재고, 배송 조건 정의
 * - Seller는 이 Offer를 선택하여 Listing 생성
 *
 * ## 소유권 구조
 * - ProductMaster (Supplier 소유) → Offer (Supplier 소유) → Listing (Seller 소유)
 *
 * ## Supplier 소유 필드
 * - supplierPrice (공급가)
 * - suggestedRetailPrice (권장 소비자가)
 * - stockQuantity (재고)
 * - shippingOptions (배송 조건)
 *
 * ## 비고
 * - 하나의 ProductMaster에 여러 Supplier의 Offer 가능
 * - Offer 승인 조건은 서비스별 Extension에서 정의
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Supplier } from './Supplier.entity.js';
import { ProductMaster } from './ProductMaster.entity.js';
import { SellerListing } from './SellerListing.entity.js';

export enum OfferStatus {
  ACTIVE = 'active',         // 활성 상태
  INACTIVE = 'inactive',     // 비활성 상태
  OUT_OF_STOCK = 'out_of_stock', // 품절
}

@Entity('dropshipping_supplier_product_offers')
export class SupplierProductOffer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  supplierId!: string;

  @Column({ type: 'uuid' })
  productMasterId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  supplierPrice!: number; // 공급가

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  suggestedRetailPrice?: number; // 권장 소비자가

  @Column({ type: 'int', default: 0 })
  stockQuantity!: number;

  @Column({ type: 'int', nullable: true })
  minOrderQuantity?: number;

  @Column({ type: 'int', nullable: true })
  maxOrderQuantity?: number;

  @Column({
    type: 'enum',
    enum: OfferStatus,
    default: OfferStatus.ACTIVE,
  })
  status!: OfferStatus;

  @Column({ type: 'jsonb', nullable: true })
  shippingOptions?: Record<string, any>; // 배송 옵션

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Supplier, (supplier) => supplier.offers)
  @JoinColumn({ name: 'supplierId' })
  supplier?: Supplier;

  @ManyToOne(() => ProductMaster, (product) => product.offers)
  @JoinColumn({ name: 'productMasterId' })
  productMaster?: ProductMaster;

  @OneToMany(() => SellerListing, (listing) => listing.offer)
  listings?: SellerListing[];
}
