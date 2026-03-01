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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
