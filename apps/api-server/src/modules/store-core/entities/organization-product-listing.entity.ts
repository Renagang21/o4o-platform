/**
 * OrganizationProductListing Entity
 * 약국 매장 진열 상품
 *
 * WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1: product_id → master_id + offer_id
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { OrganizationStore } from './organization-store.entity.js';
import type { ProductMaster } from '../../neture/entities/ProductMaster.entity.js';
import type { SupplierProductOffer } from '../../neture/entities/SupplierProductOffer.entity.js';
import type { ServiceProduct } from '../../../routes/kpa/entities/service-product.entity.js';

@Entity('organization_product_listings')
@Index('IDX_org_product_listing_org_id', ['organization_id'])
@Index('IDX_org_product_listing_active', ['is_active'])
export class OrganizationProductListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne('OrganizationStore')
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationStore;

  @Column({ type: 'varchar', length: 50, default: 'kpa' })
  service_key: string;

  @Column({ type: 'boolean', default: false })
  is_active: boolean;

  /**
   * WO-O4O-EVENT-OFFER-CORE-REFORM-V1
   * 이벤트 상태: pending(대기) | approved(승인) | canceled(취소)
   * active/ended는 start_at/end_at 기반 런타임 계산값
   */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  /** 이벤트 시작일시 (null = 즉시 시작) */
  @Column({ name: 'start_at', type: 'timestamp', nullable: true })
  start_at: Date | null;

  /** 이벤트 종료일시 (null = 무기한) */
  @Column({ name: 'end_at', type: 'timestamp', nullable: true })
  end_at: Date | null;

  /** 총 수량 제한 (null = 무제한) */
  @Column({ name: 'total_quantity', type: 'integer', nullable: true })
  total_quantity: number | null;

  /** 매장별 구매 제한 (null = 무제한) */
  @Column({ name: 'per_store_limit', type: 'integer', nullable: true })
  per_store_limit: number | null;

  /** 1회 구매 제한 (null = 무제한) */
  @Column({ name: 'per_order_limit', type: 'integer', nullable: true })
  per_order_limit: number | null;

  @Column({ name: 'master_id', type: 'uuid' })
  master_id: string;

  @ManyToOne('ProductMaster')
  @JoinColumn({ name: 'master_id' })
  master?: ProductMaster;

  @Column({ name: 'offer_id', type: 'uuid' })
  offer_id: string;

  @ManyToOne('SupplierProductOffer', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offer_id' })
  offer?: SupplierProductOffer;

  /** WO-O4O-SERVICE-PRODUCT-LAYER-PREP-V1: 미래 FK — 현재 nullable, 기존 동작 무변경 */
  @Column({ type: 'uuid', nullable: true })
  service_product_id: string | null;

  @ManyToOne('ServiceProduct')
  @JoinColumn({ name: 'service_product_id' })
  service_product?: ServiceProduct;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  price: number | null;

  /**
   * Origin type of this listing — 'market_trial' when created via Trial listing flow.
   * WO-MARKET-TRIAL-LISTING-AUTOLINK-V1
   */
  @Column({ name: 'source_type', type: 'varchar', length: 50, nullable: true })
  source_type: string | null;

  /**
   * ID of the source record (e.g. Market Trial ID when source_type = 'market_trial').
   * WO-MARKET-TRIAL-LISTING-AUTOLINK-V1
   */
  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  source_id: string | null;

  // ─────────────────────────────────────────────────────────────────────
  // WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1: Approval Queue 메타필드
  // supplier 제안 → operator 승인/반려 lifecycle. nullable이라 기존 row 호환.
  // ─────────────────────────────────────────────────────────────────────

  /** proposal 작성자 (supplier user_id). operator 직접 등록 시 NULL 가능. */
  @Column({ name: 'requested_by', type: 'uuid', nullable: true })
  requested_by: string | null;

  /** 승인/반려 결정자 (operator user_id). pending 상태에서는 NULL. */
  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decided_by: string | null;

  /** 결정 시각. pending 상태에서는 NULL. */
  @Column({ name: 'decided_at', type: 'timestamp', nullable: true })
  decided_at: Date | null;

  /** 반려 사유. status='rejected'일 때 채워짐. */
  @Column({ name: 'rejected_reason', type: 'text', nullable: true })
  rejected_reason: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
