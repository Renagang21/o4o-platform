/**
 * MobileProductDraft Entity — Mobile Product Draft (Phase 4)
 *
 * WO-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §8 (Mobile = 수집, Web = 확정)
 *
 * 모바일에서 수집한 상품 정보를 정식 ProductMaster 로 직접 저장하지 않고 임시 보관하는 draft.
 * draft → product_candidates(Phase 3) 검토 큐로 전환된 뒤, Identifier Core(Phase 2) 매칭을 거친다.
 *
 * 원칙:
 *   - 모바일은 "수집"만 한다. ProductMaster / ProductIdentifier 를 직접 생성하지 않는다.
 *   - draft_status / source_app 은 DB enum 이 아니라 varchar + application-level union.
 *   - 같은 상품을 여러 번 촬영할 수 있으므로 전역 UNIQUE 를 두지 않는다 (중복은 검토 큐에서 처리).
 *   - ProductCandidate 와는 단방향 nullable ManyToOne (ProductCandidate 구조 무변경).
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
import type { ProductCandidate } from './ProductCandidate.entity.js';

/** 모바일 draft 상태 (application-level union, varchar) */
export type MobileProductDraftStatus =
  | 'draft'
  | 'submitted'
  | 'candidate_created'
  | 'reviewed'
  | 'rejected'
  | 'archived';

export const MOBILE_PRODUCT_DRAFT_STATUSES: MobileProductDraftStatus[] = [
  'draft',
  'submitted',
  'candidate_created',
  'reviewed',
  'rejected',
  'archived',
];

/** 수집 출처 앱 (application-level union, varchar) */
export type MobileProductDraftSourceApp =
  | 'mobile_app'
  | 'mobile_web'
  | 'tablet'
  | 'operator_input'
  | 'unknown';

export const MOBILE_PRODUCT_DRAFT_SOURCE_APPS: MobileProductDraftSourceApp[] = [
  'mobile_app',
  'mobile_web',
  'tablet',
  'operator_input',
  'unknown',
];

@Entity('mobile_product_drafts')
@Index('idx_mobile_product_drafts_status', ['draftStatus'])
@Index('idx_mobile_product_drafts_service_key', ['serviceKey'])
@Index('idx_mobile_product_drafts_organization_id', ['organizationId'])
@Index('idx_mobile_product_drafts_store_id', ['storeId'])
@Index('idx_mobile_product_drafts_submitted_by', ['submittedBy'])
@Index('idx_mobile_product_drafts_normalized_identifier', ['normalizedIdentifierValue'])
@Index('idx_mobile_product_drafts_candidate_id', ['candidateId'])
@Index('idx_mobile_product_drafts_created_at', ['createdAt'])
export class MobileProductDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_key', type: 'varchar', length: 50, nullable: true })
  serviceKey: string | null;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ name: 'store_id', type: 'uuid', nullable: true })
  storeId: string | null;

  /** 수집한 사용자 (소유 경계 — 본인 draft 만 조회/수정) */
  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy: string | null;

  @Column({ name: 'source_app', type: 'varchar', length: 32, nullable: true })
  sourceApp: MobileProductDraftSourceApp | null;

  @Column({ name: 'draft_status', type: 'varchar', length: 32, default: 'draft' })
  draftStatus: MobileProductDraftStatus;

  // ── candidate 연결 (단방향 nullable — ProductCandidate 구조 무변경) ──

  @Column({ name: 'candidate_id', type: 'uuid', nullable: true })
  candidateId: string | null;

  @ManyToOne('ProductCandidate', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'candidate_id' })
  candidate?: ProductCandidate | null;

  // ── 수집 식별자 ──

  @Column({ name: 'identifier_type', type: 'varchar', length: 40, nullable: true })
  identifierType: string | null;

  @Column({ name: 'identifier_value', type: 'varchar', length: 128, nullable: true })
  identifierValue: string | null;

  @Column({ name: 'normalized_identifier_value', type: 'varchar', length: 128, nullable: true })
  normalizedIdentifierValue: string | null;

  // ── 수집 상품 정보 (미확정) ──

  @Column({ name: 'captured_name', type: 'varchar', length: 255, nullable: true })
  capturedName: string | null;

  @Column({ name: 'captured_brand', type: 'varchar', length: 255, nullable: true })
  capturedBrand: string | null;

  @Column({ name: 'captured_manufacturer', type: 'varchar', length: 255, nullable: true })
  capturedManufacturer: string | null;

  @Column({ name: 'captured_category', type: 'varchar', length: 255, nullable: true })
  capturedCategory: string | null;

  @Column({ name: 'captured_spec', type: 'varchar', length: 255, nullable: true })
  capturedSpec: string | null;

  @Column({ name: 'captured_unit', type: 'varchar', length: 64, nullable: true })
  capturedUnit: string | null;

  @Column({ name: 'captured_price', type: 'numeric', precision: 12, scale: 2, nullable: true })
  capturedPrice: string | null;

  @Column({ name: 'captured_currency', type: 'varchar', length: 8, nullable: true })
  capturedCurrency: string | null;

  /** 썸네일 이미지 URL (문자열만 저장 — 업로드 파이프라인은 후속 WO) */
  @Column({ name: 'thumbnail_image_url', type: 'text', nullable: true })
  thumbnailImageUrl: string | null;

  /** 이미지 URL 목록 (문자열 배열만 저장) */
  @Column({ name: 'image_urls', type: 'jsonb', nullable: true })
  imageUrls: string[] | null;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  /** 원본 수집 payload */
  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload: Record<string, unknown> | null;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'converted_at', type: 'timestamp', nullable: true })
  convertedAt: Date | null;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
