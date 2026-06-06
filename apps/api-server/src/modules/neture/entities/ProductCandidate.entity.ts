/**
 * ProductCandidate Entity — Product Candidate Review Queue (Phase 3)
 *
 * WO-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §2, §8 (Mobile/Web 경계)
 *
 * "아직 ProductMaster 로 확정되지 않은 상품 후보" 를 안전하게 수용하는 검토 큐(완충지대).
 * 웹 등록 / 모바일 수집 / CSV·xlsx import / 공급자·약국 입력 등에서 발생하는 미확정
 * 데이터를 ProductMaster 에 직접 넣지 않고 이 테이블에 보관한 뒤,
 * Identifier Core(Phase 2) 기반으로 기존 Master 와 매칭하거나 신규 Master 후보로 분류한다.
 *
 * 원칙:
 *   - ProductMaster / ProductIdentifier 구조를 변경하지 않는다 (단방향 nullable ManyToOne).
 *   - 미검증 데이터를 ProductMaster 에 직접 저장하지 않는다.
 *   - candidate_status / match_status / source_type 은 DB enum 이 아니라
 *     varchar + application-level union (확장 시 enum migration 회피).
 *   - 전역 UNIQUE 를 두지 않는다 (후보 큐). 중복 방지는 service logic.
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
  Index,
} from 'typeorm';
import type { ProductMaster } from './ProductMaster.entity.js';
import type { ProductIdentifier } from './ProductIdentifier.entity.js';

/** 후보 유입 출처 (application-level union, varchar) */
export type ProductCandidateSourceType =
  | 'supplier_web'
  | 'pharmacy_web'
  | 'store_web'
  | 'mobile_draft'
  | 'csv_import'
  | 'xlsx_import'
  | 'operator_import'
  | 'external_api'
  | 'unknown';

export const PRODUCT_CANDIDATE_SOURCE_TYPES: ProductCandidateSourceType[] = [
  'supplier_web',
  'pharmacy_web',
  'store_web',
  'mobile_draft',
  'csv_import',
  'xlsx_import',
  'operator_import',
  'external_api',
  'unknown',
];

/** 후보 검토 상태 (application-level union, varchar) */
export type ProductCandidateStatus =
  | 'pending'
  | 'reviewing'
  | 'matched'
  | 'approved_new_master'
  | 'rejected'
  | 'merged'
  | 'archived';

export const PRODUCT_CANDIDATE_STATUSES: ProductCandidateStatus[] = [
  'pending',
  'reviewing',
  'matched',
  'approved_new_master',
  'rejected',
  'merged',
  'archived',
];

/** 매칭 상태 (application-level union, varchar) */
export type ProductCandidateMatchStatus =
  | 'unmatched'
  | 'exact_identifier_match'
  | 'possible_identifier_match'
  | 'possible_text_match'
  | 'conflict'
  | 'no_match'
  | 'manually_matched';

export const PRODUCT_CANDIDATE_MATCH_STATUSES: ProductCandidateMatchStatus[] = [
  'unmatched',
  'exact_identifier_match',
  'possible_identifier_match',
  'possible_text_match',
  'conflict',
  'no_match',
  'manually_matched',
];

@Entity('product_candidates')
@Index('idx_product_candidates_status', ['candidateStatus'])
@Index('idx_product_candidates_match_status', ['matchStatus'])
@Index('idx_product_candidates_source_type', ['sourceType'])
@Index('idx_product_candidates_service_key', ['serviceKey'])
@Index('idx_product_candidates_organization_id', ['organizationId'])
@Index('idx_product_candidates_normalized_identifier', ['normalizedIdentifierValue'])
@Index('idx_product_candidates_matched_product_master_id', ['matchedProductMasterId'])
@Index('idx_product_candidates_created_at', ['createdAt'])
export class ProductCandidate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 서비스 스코프 (kpa/glycopharm/cosmetics/neture …). 미지정 가능 */
  @Column({ name: 'service_key', type: 'varchar', length: 50, nullable: true })
  serviceKey: string | null;

  /** 매장/조직 경계 (CLAUDE.md §7 Store Ops = organizationId) */
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  /** 유입 출처 유형 */
  @Column({ name: 'source_type', type: 'varchar', length: 32 })
  sourceType: ProductCandidateSourceType;

  /** 출처 레코드 ID (draft/import row/offer 등) */
  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId: string | null;

  /** 출처 표시 라벨 */
  @Column({ name: 'source_label', type: 'varchar', length: 128, nullable: true })
  sourceLabel: string | null;

  /** 제출자 user id */
  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy: string | null;

  /** 검토 상태 */
  @Column({ name: 'candidate_status', type: 'varchar', length: 32, default: 'pending' })
  candidateStatus: ProductCandidateStatus;

  /** 매칭 상태 */
  @Column({ name: 'match_status', type: 'varchar', length: 32, default: 'unmatched' })
  matchStatus: ProductCandidateMatchStatus;

  // ── 매칭 결과 (단방향 nullable 관계 — ProductMaster/ProductIdentifier 구조 무변경) ──

  @Column({ name: 'matched_product_master_id', type: 'uuid', nullable: true })
  matchedProductMasterId: string | null;

  @ManyToOne('ProductMaster', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'matched_product_master_id' })
  matchedProductMaster?: ProductMaster | null;

  @Column({ name: 'matched_identifier_id', type: 'uuid', nullable: true })
  matchedIdentifierId: string | null;

  @ManyToOne('ProductIdentifier', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'matched_identifier_id' })
  matchedIdentifier?: ProductIdentifier | null;

  /** 매칭 신뢰도 (0~1) */
  @Column({ name: 'confidence_score', type: 'numeric', precision: 5, scale: 4, nullable: true })
  confidenceScore: string | null;

  // ── 후보 식별자 (Identifier Core 매칭 입력) ──

  @Column({ name: 'identifier_type', type: 'varchar', length: 40, nullable: true })
  identifierType: string | null;

  @Column({ name: 'identifier_value', type: 'varchar', length: 128, nullable: true })
  identifierValue: string | null;

  @Column({ name: 'normalized_identifier_value', type: 'varchar', length: 128, nullable: true })
  normalizedIdentifierValue: string | null;

  // ── 후보 상품 정보 (미확정, ProductMaster 로 승격 전) ──

  @Column({ name: 'candidate_name', type: 'varchar', length: 255, nullable: true })
  candidateName: string | null;

  @Column({ name: 'candidate_brand', type: 'varchar', length: 255, nullable: true })
  candidateBrand: string | null;

  @Column({ name: 'candidate_manufacturer', type: 'varchar', length: 255, nullable: true })
  candidateManufacturer: string | null;

  @Column({ name: 'candidate_category', type: 'varchar', length: 255, nullable: true })
  candidateCategory: string | null;

  @Column({ name: 'candidate_spec', type: 'varchar', length: 255, nullable: true })
  candidateSpec: string | null;

  @Column({ name: 'candidate_unit', type: 'varchar', length: 64, nullable: true })
  candidateUnit: string | null;

  @Column({ name: 'candidate_image_url', type: 'text', nullable: true })
  candidateImageUrl: string | null;

  @Column({ name: 'candidate_price', type: 'numeric', precision: 12, scale: 2, nullable: true })
  candidatePrice: string | null;

  /** 원본 수집 payload (모바일/CSV/공급자 입력 원형) */
  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload: Record<string, unknown> | null;

  // ── 검토 흔적 ──

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
