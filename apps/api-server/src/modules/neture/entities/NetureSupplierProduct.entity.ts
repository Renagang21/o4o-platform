import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { NetureSupplier } from './NetureSupplier.entity.js';

/**
 * 제품 목적 (WO-NETURE-EXTENSION-P3)
 */
export enum ProductPurpose {
  CATALOG = 'CATALOG',           // 정보 제공용
  APPLICATION = 'APPLICATION',   // 신청 가능
  ACTIVE_SALES = 'ACTIVE_SALES', // 판매 중
}

/**
 * 상품 승인 상태 (WO-NETURE-SUPPLIER-AND-PRODUCT-APPROVAL-BETA-V1)
 */
export enum ProductApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * 유통 정책 (WO-NETURE-PRODUCT-DISTRIBUTION-POLICY-V1)
 */
export enum DistributionType {
  PUBLIC = 'PUBLIC',   // HUB 공개 (모든 운영자에게 노출), 승인 불필요
  SERVICE = 'SERVICE', // 서비스 범위 공개, 운영자 승인 필요
  PRIVATE = 'PRIVATE', // 지정 판매자 전용
}

@Entity('neture_supplier_products')
export class NetureSupplierProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProductPurpose,
    default: ProductPurpose.CATALOG,
  })
  purpose: ProductPurpose;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @Column({ name: 'accepts_applications', default: false })
  acceptsApplications: boolean;

  @Column({
    name: 'distribution_type',
    type: 'enum',
    enum: DistributionType,
    default: DistributionType.PUBLIC,
  })
  distributionType: DistributionType;

  @Column({
    name: 'allowed_seller_ids',
    type: 'text',
    array: true,
    nullable: true,
  })
  allowedSellerIds: string[] | null;

  /** WO-NETURE-SUPPLIER-AND-PRODUCT-APPROVAL-BETA-V1: 상품 승인 상태 */
  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ProductApprovalStatus,
    default: ProductApprovalStatus.PENDING,
  })
  approvalStatus: ProductApprovalStatus;

  @Column({ name: 'approval_note', type: 'text', nullable: true })
  approvalNote: string | null;

  /** WO-NETURE-PRICE-ARCHITECTURE-FREEZE-V1: B2B 가격 필드 */
  @Column({ name: 'price_general', type: 'int', default: 0 })
  priceGeneral: number;

  @Column({ name: 'price_gold', type: 'int', nullable: true })
  priceGold: number | null;

  @Column({ name: 'price_platinum', type: 'int', nullable: true })
  pricePlatinum: number | null;

  @Column({ name: 'consumer_reference_price', type: 'int', nullable: true })
  consumerReferencePrice: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne('NetureSupplier', 'products', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier: NetureSupplier;
}
