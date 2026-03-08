/**
 * SupplierProductOffer Entity
 *
 * 공급자의 상품 공급 제안 (Offer)
 * 하나의 ProductMaster에 대해 공급자별 1개의 Offer만 가능
 *
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { ProductMaster } from './ProductMaster.entity.js';
import type { NetureSupplier } from './NetureSupplier.entity.js';

export enum OfferDistributionType {
  PUBLIC = 'PUBLIC',
  SERVICE = 'SERVICE',
  PRIVATE = 'PRIVATE',
}

export enum OfferApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('supplier_product_offers')
export class SupplierProductOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'master_id', type: 'uuid' })
  masterId: string;

  @ManyToOne('ProductMaster', 'offers', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'master_id' })
  master?: ProductMaster;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @ManyToOne('NetureSupplier', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: NetureSupplier;

  @Column({
    name: 'distribution_type',
    type: 'enum',
    enum: OfferDistributionType,
    enumName: 'supplier_product_offers_distribution_type_enum',
    default: OfferDistributionType.PRIVATE,
  })
  distributionType: OfferDistributionType;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: OfferApprovalStatus,
    enumName: 'supplier_product_offers_approval_status_enum',
    default: OfferApprovalStatus.PENDING,
  })
  approvalStatus: OfferApprovalStatus;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  @Column({ name: 'allowed_seller_ids', type: 'text', array: true, nullable: true })
  allowedSellerIds: string[] | null;

  /** B2B 일반가 */
  @Column({ name: 'price_general', type: 'int', default: 0 })
  priceGeneral: number;

  /** B2B 골드 등급가 */
  @Column({ name: 'price_gold', type: 'int', nullable: true })
  priceGold: number | null;

  /** B2B 플래티넘 등급가 */
  @Column({ name: 'price_platinum', type: 'int', nullable: true })
  pricePlatinum: number | null;

  /** 소비자 참고가 */
  @Column({ name: 'consumer_reference_price', type: 'int', nullable: true })
  consumerReferencePrice: number | null;

  // ==================== Inventory (WO-O4O-INVENTORY-ENGINE-V1) ====================

  /** 총 재고 수량 */
  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity: number;

  /** 예약 수량 (주문 생성 시 증가, 배송 완료/취소 시 감소) */
  @Column({ name: 'reserved_quantity', type: 'int', default: 0 })
  reservedQuantity: number;

  /** 재고 부족 경고 기준값 */
  @Column({ name: 'low_stock_threshold', type: 'int', default: 10 })
  lowStockThreshold: number;

  /** 재고 추적 활성화 (false = 무한 재고, 기존 상품 호환) */
  @Column({ name: 'track_inventory', type: 'boolean', default: false })
  trackInventory: boolean;

  /** V2: SEO slug for store URLs (/store/{store_slug}/product/{slug}) */
  @Column({ name: 'slug', type: 'varchar', length: 160, unique: true })
  slug: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
