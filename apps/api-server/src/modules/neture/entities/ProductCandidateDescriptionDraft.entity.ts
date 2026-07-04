/**
 * ProductCandidateDescriptionDraft Entity — 후보 기반 AI 매장 설명 draft 저장소
 *
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-V1
 * 설계: docs/design/O4O-HEALTH-FUNCTIONAL-FOOD-CANDIDATE-DESCRIPTION-DRAFT-STORAGE-V1.md
 *
 * ProductMaster 가 없는 ProductCandidate 기반 AI 설명 draft 를 검토 전 단계로 보관한다.
 * shared_product_descriptions(master_id NOT NULL, master 기준 canonical) 와 별도 — 건강기능식품처럼
 * master 부재 후보의 매장 설명 후보 풀. HFF 외 다른 public candidate 에도 확장 가능.
 *
 * 원칙:
 *   - ProductCandidate 구조를 변경하지 않는다 (단방향 nullable ManyToOne, ESM 문자열 관계).
 *   - review_status / draft_type 은 DB enum 이 아니라 varchar + application-level union.
 *   - `canonical` 상태를 쓰지 않는다 (canonical 은 ProductMaster 기준 용어).
 *   - approved 도 자동 노출이 아니다 (매장 실행은 별도 능동 행위).
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

/** draft 유형 (application-level union, varchar) */
export type ProductCandidateDescriptionDraftType = 'store_description' | 'pop' | 'blog' | 'raw_material_note';

export const PRODUCT_CANDIDATE_DESCRIPTION_DRAFT_TYPES: ProductCandidateDescriptionDraftType[] = [
  'store_description',
  'pop',
  'blog',
  'raw_material_note',
];

/** 검토 상태 (application-level union, varchar). canonical 미사용(master 용어). */
export type ProductCandidateDescriptionReviewStatus =
  | 'draft'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'hidden'
  | 'deprecated';

export const PRODUCT_CANDIDATE_DESCRIPTION_REVIEW_STATUSES: ProductCandidateDescriptionReviewStatus[] = [
  'draft',
  'needs_review',
  'approved',
  'rejected',
  'hidden',
  'deprecated',
];

@Entity('product_candidate_description_drafts')
@Index('idx_pcdd_candidate', ['candidateId'])
@Index('idx_pcdd_source_label_review_status', ['sourceLabel', 'reviewStatus'])
@Index('idx_pcdd_review_status_created_at', ['reviewStatus', 'createdAt'])
@Index('idx_pcdd_source_identifier', ['sourceIdentifierValue'])
export class ProductCandidateDescriptionDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 근거 후보 (ProductCandidate) */
  @Column({ name: 'candidate_id', type: 'uuid' })
  candidateId: string;

  /** 단방향 nullable 관계 — ProductCandidate 구조 무변경 (ESM 문자열 관계) */
  @ManyToOne('ProductCandidate', { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate?: ProductCandidate | null;

  /** 공공 seed 라벨 (예: MFDS_HEALTH_FUNCTIONAL_FOOD) */
  @Column({ name: 'source_label', type: 'varchar', length: 128 })
  sourceLabel: string;

  /** 원천 식별자 값 (예: STTEMNT_NO) — 추적/조인 */
  @Column({ name: 'source_identifier_value', type: 'varchar', length: 255, nullable: true })
  sourceIdentifierValue: string | null;

  /** draft 유형 */
  @Column({ name: 'draft_type', type: 'varchar', length: 64 })
  draftType: ProductCandidateDescriptionDraftType;

  /** 언어 코드 */
  @Column({ type: 'varchar', length: 16, default: 'ko' })
  language: string;

  @Column({ type: 'text', nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  /** 구조화 draft (HealthFunctionalFoodStoreDescriptionDraft) */
  @Column({ name: 'content_json', type: 'jsonb' })
  contentJson: Record<string, unknown>;

  /** 렌더 결과 (선택) */
  @Column({ name: 'content_html', type: 'text', nullable: true })
  contentHtml: string | null;

  /** 생성 입력 seed (추적) */
  @Column({ name: 'seed_json', type: 'jsonb' })
  seedJson: Record<string, unknown>;

  /** guard 결과 (preFlags/verdict/sourceFidelity/medicineLike/quality) */
  @Column({ name: 'guard_result', type: 'jsonb' })
  guardResult: Record<string, unknown>;

  /** 검토 상태 (기본 needs_review) */
  @Column({ name: 'review_status', type: 'varchar', length: 32, default: 'needs_review' })
  reviewStatus: ProductCandidateDescriptionReviewStatus;

  /** 검토 flag (빠른 필터) */
  @Column({ name: 'review_flags', type: 'text', array: true, default: '{}' })
  reviewFlags: string[];

  @Column({ name: 'ai_provider', type: 'varchar', length: 64, nullable: true })
  aiProvider: string | null;

  @Column({ name: 'ai_model', type: 'varchar', length: 128, nullable: true })
  aiModel: string | null;

  @Column({ name: 'ai_policy_scope', type: 'varchar', length: 128, nullable: true })
  aiPolicyScope: string | null;

  @Column({ name: 'ai_cost_estimate', type: 'numeric', precision: 12, scale: 6, nullable: true })
  aiCostEstimate: string | null;

  @Column({ name: 'generated_at', type: 'timestamp', nullable: true })
  generatedAt: Date | null;

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
