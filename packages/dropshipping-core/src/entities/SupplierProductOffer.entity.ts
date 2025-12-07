/**
 * SupplierProductOffer Entity
 *
 * 공급자가 판매자에게 제시하는 가격/재고/조건
 *
 * 하나의 ProductMaster에 대해 여러 Supplier가 각각의 조건으로 Offer를 제공할 수 있습니다.
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
