/**
 * ProductDrugExtension Entity — Drug Extension persistence (의약품 상세·검증·정책 영속)
 *
 * WO-O4O-PRODUCT-DRUG-EXTENSION-PERSISTENCE-V1
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §9, §10
 *
 * active ProductMaster 에 1:1 로 연결되는 의약품 확장. dormant PharmaProductMaster 를 살리지 않고
 * api-server 활성 계층에 상세/검증/출처/노출·광고·판매 정책을 저장한다.
 *
 * 원칙:
 *   - ProductMaster 가 SSOT. drug_category 빠른 분류 필드는 ProductMaster 에 유지하고,
 *     본 extension 은 상세·정책을 담는다 (drug_category mirror 동기화).
 *   - 노출/판매/광고는 **보수적 기본값**(약국전용·고객노출/온라인판매 차단)으로 저장. 권한 여는 로직 아님.
 *   - verification_status / 정책 / reviewer 는 DB enum 이 아니라 varchar + application-level union.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { ProductMaster } from './ProductMaster.entity.js';
import type { ProductDrugCategory, DrugVerificationStatus, DrugReviewer } from '../utils/product-type.util.js';

/** 광고/홍보 검토 상태 (DrugDisplayPolicy.advertisingReviewStatus 와 정합) */
export type AdvertisingReviewStatus =
  | 'not_reviewed'
  | 'needs_review'
  | 'approved_limited'
  | 'rejected'
  | 'blocked';

/** 태블릿 노출 정책 */
export type TabletDisplayPolicy = 'blocked' | 'limited' | 'internal_only';

/** 고객 공개 노출 정책 */
export type PublicDisplayPolicy = 'blocked' | 'limited' | 'pharmacy_only' | 'allowed';

@Entity('product_drug_extensions')
@Index('idx_product_drug_extensions_product_master_id', ['productMasterId'])
@Index('idx_product_drug_extensions_drug_category', ['drugCategory'])
@Index('idx_product_drug_extensions_verification_status', ['verificationStatus'])
@Index('idx_product_drug_extensions_drug_code', ['drugCode'])
@Index('idx_product_drug_extensions_insurance_code', ['insuranceCode'])
@Index('idx_product_drug_extensions_mfds_code', ['mfdsCode'])
@Index('idx_product_drug_extensions_ad_review_status', ['advertisingReviewStatus'])
@Index('idx_product_drug_extensions_deleted_at', ['deletedAt'])
export class ProductDrugExtension {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** ProductMaster 1:1 (unique) */
  @Column({ name: 'product_master_id', type: 'uuid', unique: true })
  productMasterId: string;

  @OneToOne('ProductMaster', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_master_id' })
  productMaster?: ProductMaster;

  /** 의약품 분류 (ProductMaster.drug_category mirror) */
  @Column({ name: 'drug_category', type: 'varchar', length: 32 })
  drugCategory: ProductDrugCategory;

  // ── 검증/검토 ──
  @Column({ name: 'verification_status', type: 'varchar', length: 32, default: 'pending_review' })
  verificationStatus: DrugVerificationStatus;

  @Column({ name: 'reviewer_type', type: 'varchar', length: 32, nullable: true })
  reviewerType: DrugReviewer | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string | null;

  // ── 식별/허가 ──
  @Column({ name: 'drug_code', type: 'varchar', length: 64, nullable: true })
  drugCode: string | null;

  @Column({ name: 'insurance_code', type: 'varchar', length: 64, nullable: true })
  insuranceCode: string | null;

  @Column({ name: 'mfds_code', type: 'varchar', length: 64, nullable: true })
  mfdsCode: string | null;

  @Column({ name: 'atc_code', type: 'varchar', length: 64, nullable: true })
  atcCode: string | null;

  @Column({ name: 'approval_number', type: 'varchar', length: 128, nullable: true })
  approvalNumber: string | null;

  @Column({ name: 'approval_date', type: 'date', nullable: true })
  approvalDate: string | null;

  @Column({ name: 'regulatory_status', type: 'varchar', length: 64, nullable: true })
  regulatoryStatus: string | null;

  // ── 기본 정보 ──
  @Column({ name: 'ingredient_summary', type: 'text', nullable: true })
  ingredientSummary: string | null;

  @Column({ name: 'active_ingredients', type: 'jsonb', nullable: true })
  activeIngredients: Array<{ name: string; amount?: string; unit?: string }> | null;

  @Column({ name: 'dosage_form', type: 'varchar', length: 100, nullable: true })
  dosageForm: string | null;

  @Column({ name: 'strength', type: 'varchar', length: 100, nullable: true })
  strength: string | null;

  @Column({ name: 'package_unit', type: 'varchar', length: 64, nullable: true })
  packageUnit: string | null;

  @Column({ name: 'package_quantity', type: 'varchar', length: 64, nullable: true })
  packageQuantity: string | null;

  @Column({ name: 'manufacturer_name', type: 'varchar', length: 255, nullable: true })
  manufacturerName: string | null;

  // ── 표시/문구 ──
  @Column({ name: 'efficacy_text', type: 'text', nullable: true })
  efficacyText: string | null;

  @Column({ name: 'dosage_text', type: 'text', nullable: true })
  dosageText: string | null;

  @Column({ name: 'caution_text', type: 'text', nullable: true })
  cautionText: string | null;

  @Column({ name: 'storage_text', type: 'text', nullable: true })
  storageText: string | null;

  @Column({ name: 'contraindication_text', type: 'text', nullable: true })
  contraindicationText: string | null;

  // ── 출처 ──
  @Column({ name: 'data_source', type: 'varchar', length: 128, nullable: true })
  dataSource: string | null;

  @Column({ name: 'mfds_source_url', type: 'text', nullable: true })
  mfdsSourceUrl: string | null;

  @Column({ name: 'source_updated_at', type: 'timestamp', nullable: true })
  sourceUpdatedAt: Date | null;

  @Column({ name: 'efficacy_source', type: 'varchar', length: 128, nullable: true })
  efficacySource: string | null;

  @Column({ name: 'dosage_source', type: 'varchar', length: 128, nullable: true })
  dosageSource: string | null;

  @Column({ name: 'caution_source', type: 'varchar', length: 128, nullable: true })
  cautionSource: string | null;

  @Column({ name: 'storage_source', type: 'varchar', length: 128, nullable: true })
  storageSource: string | null;

  // ── 정책 (보수 기본값) ──
  @Column({ name: 'pharmacy_only', type: 'boolean', default: true })
  pharmacyOnly: boolean;

  @Column({ name: 'customer_display_allowed', type: 'boolean', default: false })
  customerDisplayAllowed: boolean;

  @Column({ name: 'tablet_display_allowed', type: 'varchar', length: 32, default: 'limited' })
  tabletDisplayAllowed: TabletDisplayPolicy;

  @Column({ name: 'online_sale_allowed', type: 'boolean', default: false })
  onlineSaleAllowed: boolean;

  @Column({ name: 'advertising_review_status', type: 'varchar', length: 32, default: 'needs_review' })
  advertisingReviewStatus: AdvertisingReviewStatus;

  @Column({ name: 'public_display_policy', type: 'varchar', length: 32, default: 'blocked' })
  publicDisplayPolicy: PublicDisplayPolicy;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
