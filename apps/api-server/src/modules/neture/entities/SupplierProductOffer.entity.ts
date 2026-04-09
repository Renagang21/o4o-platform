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
  DeleteDateColumn,
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

  /**
   * WO-NETURE-DISTRIBUTION-MODEL-SPLIT-PUBLIC-AND-SERVICE-SUPPLY-V1
   * 기본 공개 여부 — distributionType과 독립적으로 관리
   * true = 전체 공개, false = 비공개 (서비스 공급은 serviceKeys로 별도 관리)
   */
  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  /**
   * 파생 필드 — isPublic + serviceKeys 조합으로 자동 결정
   * isPublic=true → PUBLIC, serviceKeys.length > 0 → SERVICE, else → PRIVATE
   * 하위호환용으로 유지 (기존 쿼리/필터 호환)
   */
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

  /** 공급가 — 기본 B2B 공급 가격 */
  @Column({ name: 'price_general', type: 'int', default: 0 })
  priceGeneral: number;

  /** 서비스가 — 서비스 채널용 특별 공급 가격 (참고용, 주문 미반영) */
  @Column({ name: 'price_gold', type: 'int', nullable: true })
  priceGold: number | null;

  /** 스팟가 — 특별 공급가 기록용 (참고용, 주문 미반영) */
  @Column({ name: 'price_platinum', type: 'int', nullable: true })
  pricePlatinum: number | null;

  /** 소비자 참고가 */
  @Column({ name: 'consumer_reference_price', type: 'int', nullable: true })
  consumerReferencePrice: number | null;

  // ==================== Description (WO-NETURE-PRODUCT-DESCRIPTION-FIELDS-V1) ====================

  /** B2C 간이 설명 (Tiptap HTML) */
  @Column({ name: 'consumer_short_description', type: 'text', nullable: true })
  consumerShortDescription: string | null;

  /** B2C 상세 설명 (Tiptap HTML) */
  @Column({ name: 'consumer_detail_description', type: 'text', nullable: true })
  consumerDetailDescription: string | null;

  /** B2B 간이 설명 (Tiptap HTML) */
  @Column({ name: 'business_short_description', type: 'text', nullable: true })
  businessShortDescription: string | null;

  /** B2B 상세 설명 (Tiptap HTML) */
  @Column({ name: 'business_detail_description', type: 'text', nullable: true })
  businessDetailDescription: string | null;

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

  // ==================== Service Keys (WO-NETURE-PRODUCT-REGISTRATION-REFACTOR-AND-AI-TAGGING-V1) ====================

  /** 공급자가 선택한 서비스 (neture, glycopharm 등) */
  @Column({ name: 'service_keys', type: 'text', array: true, default: '{}' })
  serviceKeys: string[];

  // ==================== Supplier Highlight (WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1) ====================

  /** 공급자가 직접 설정하는 "추천 노출 희망" 플래그 (운영자 개입 없음) */
  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  /** V2: SEO slug for store URLs (/store/{store_slug}/product/{slug}) */
  @Column({ name: 'slug', type: 'varchar', length: 160, unique: true })
  slug: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ==================== Soft Delete (WO-NETURE-APPROVED-PRODUCT-SOFT-DELETE-AND-RECYCLE-BIN-FLOW-V1) ====================

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy: string | null;

  @Column({ name: 'delete_reason', type: 'text', nullable: true })
  deleteReason: string | null;
}
