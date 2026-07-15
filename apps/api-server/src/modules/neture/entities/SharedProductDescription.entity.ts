/**
 * SharedProductDescription Entity — O4O 공용 상품설명 후보 풀 / canonical 대표 설명
 *
 * WO-O4O-PRODUCT-DESCRIPTION-SHARED-CANDIDATE-STORAGE-V1
 * 정책: docs/investigations/IR-O4O-PRODUCT-DESCRIPTION-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1.md
 *
 * 상품설명은 매장별 자산이 아니라 O4O 전체 상품 DB 를 구성하는 공용 자산이다.
 * ProductMaster(barcode SSOT) 기준으로 여러 설명 후보를 모으고, O4O 전체 관리자가
 * 정비하여 master 당 canonical 대표 설명 1개를 지정한다.
 *
 * 원칙:
 *   - ProductMaster 구조를 변경하지 않는다 (단방향 nullable ManyToOne).
 *   - StoreLocalProduct(off-catalog) 는 대상이 아니다 (master 기준만).
 *   - product_ai_contents 의 의미를 바꾸지 않는다 (AI 초안/POP fallback 유지).
 *   - source_type / status 는 DB enum 이 아니라 varchar + application-level union.
 *   - canonical 은 master 당 1개만 (partial unique index — migration 에서 보장).
 *   - 매장별 override / selection 저장소를 만들지 않는다.
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

/** 후보 설명 출처 (application-level union, varchar) */
export type SharedProductDescriptionSourceType =
  | 'supplier'
  | 'operator'
  | 'ai'
  | 'store_contribution'
  | 'drug_extension'
  | 'mfds_easy_drug' // e약은요(공식 소비자 설명) 파생 — WO-O4O-EASY-DRUG-INFO-CANDIDATE-APPLY-AND-SHARED-DESCRIPTION-DERIVATION-V1
  | 'mfds_drug_otc_nutrition_combo' // 영양제류 복합제 canonical 승격(O4O 가공) — WO-...-NUTRITION-COMBO-CANONICAL-PROMOTION-APPLY-V1
  | 'mfds_drug_otc' // OTC single 그룹(성분·함량·제형) canonical 승격 — WO-O4O-OTC-SINGLE-GROUP-EXPANSION-APPLY-PATH-V1
  | 'migration'
  | 'manual';

export const SHARED_PRODUCT_DESCRIPTION_SOURCE_TYPES: SharedProductDescriptionSourceType[] = [
  'supplier',
  'operator',
  'ai',
  'store_contribution',
  'drug_extension',
  'mfds_easy_drug',
  'mfds_drug_otc_nutrition_combo',
  'mfds_drug_otc',
  'migration',
  'manual',
];

/**
 * 후보 검토 상태 (application-level union, varchar)
 * - draft: 공급자 임시저장(아직 검수요청 전, submitted_at=null) — WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1.
 *   매장 노출 대상 아님(canonical 아님). needs_review 로 전환 시 검수 큐 노출.
 * - revision_requested: 운영자가 수정 요청함. 공급자가 revision_due_at 이내에 수정 후 다시 검수요청(→needs_review) 가능.
 *   기한 경과 시 자동 삭제(hard delete). WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-REVISION-REQUEST-AND-AUTO-DELETE-V1.
 * - hidden: 관리자 숨김 또는 노출 중단 (공급자 수정 요청 기본 상태로 쓰지 않는다).
 */
export type SharedProductDescriptionStatus =
  | 'draft'
  | 'candidate'
  | 'canonical'
  | 'hidden'
  | 'needs_review'
  | 'revision_requested'
  | 'deprecated';

export const SHARED_PRODUCT_DESCRIPTION_STATUSES: SharedProductDescriptionStatus[] = [
  'draft',
  'candidate',
  'canonical',
  'hidden',
  'needs_review',
  'revision_requested',
  'deprecated',
];

/**
 * 설명서 유형 축 (application-level union, varchar) — WO-O4O-PRODUCT-DESCRIPTION-TYPE-IMPLEMENTATION-V1
 * Baseline: O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1 (F12) — Resource Type=DESCRIPTION 하위 속성.
 *   B2B/B2C/STORE/SUPPLIER_STORE. canonical 은 (master_id, description_type, COALESCE(language,'ko')) 당 1개
 *   (WO-O4O-STORE-MULTILINGUAL-CANONICAL-DESCRIPTION-V1 — 언어별 canonical 허용).
 */
export type SharedProductDescriptionType = 'B2B' | 'B2C' | 'STORE' | 'SUPPLIER_STORE';

export const SHARED_PRODUCT_DESCRIPTION_TYPES: SharedProductDescriptionType[] = [
  'B2B',
  'B2C',
  'STORE',
  'SUPPLIER_STORE',
];

/** 조회 기본값 — 기존 소비자/매장 화면 회귀 방지 (전량 STORE 백필과 정합) */
export const DEFAULT_SHARED_PRODUCT_DESCRIPTION_TYPE: SharedProductDescriptionType = 'STORE';

@Entity('shared_product_descriptions')
@Index('idx_shared_product_descriptions_master', ['masterId'])
@Index('idx_shared_product_descriptions_master_status', ['masterId', 'status'])
@Index('idx_shared_product_descriptions_source_type', ['sourceType'])
export class SharedProductDescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** ProductMaster(barcode SSOT) 기준 — 공용 자산의 식별 축 */
  @Column({ name: 'master_id', type: 'uuid' })
  masterId: string;

  /** 단방향 nullable 관계 — ProductMaster 구조 무변경 */
  @ManyToOne('ProductMaster', { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'master_id' })
  master?: ProductMaster | null;

  /** 설명 본문 (HTML) */
  @Column({ type: 'text' })
  content: string;

  /** 요약/단문 (선택) */
  @Column({ type: 'text', nullable: true })
  summary: string | null;

  /** 후보 출처 유형 */
  @Column({ name: 'source_type', type: 'varchar', length: 32 })
  sourceType: SharedProductDescriptionSourceType;

  /**
   * 설명서 유형 (B2B/B2C/STORE/SUPPLIER_STORE) — WO-...-DESCRIPTION-TYPE-IMPLEMENTATION-V1
   * canonical 은 (master_id, description_type, COALESCE(language,'ko')) 당 1개(언어별 canonical). 기본값 STORE.
   */
  @Column({ name: 'description_type', type: 'varchar', length: 32, default: 'STORE' })
  descriptionType: SharedProductDescriptionType;

  /** 출처 레코드 ID (offer_id / ai_content_id / user 등) */
  @Column({ name: 'source_ref_id', type: 'uuid', nullable: true })
  sourceRefId: string | null;

  /** 검토 상태 (master 당 canonical 1개) */
  @Column({ type: 'varchar', length: 32, default: 'candidate' })
  status: SharedProductDescriptionStatus;

  /** 언어 코드 */
  @Column({ type: 'varchar', length: 16, nullable: true, default: 'ko' })
  language: string | null;

  /** 품질 점수 (0~1, 선택) */
  @Column({ name: 'quality_score', type: 'numeric', precision: 5, scale: 4, nullable: true })
  qualityScore: string | null;

  // ── 큐레이션 흔적 (O4O 전체 관리자) ──

  @Column({ name: 'curated_by', type: 'uuid', nullable: true })
  curatedBy: string | null;

  @Column({ name: 'curated_at', type: 'timestamp', nullable: true })
  curatedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  // ── 작성 주체(공급자) attribution — WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1 ──

  /**
   * 작성 주체가 공급자인 경우 그 공급자의 영구 SSOT (neture_suppliers.id, 단방향, onDelete SET NULL).
   * "어떤 공급자가 이 STORE 설명서를 작성했는가"를 조인 없이 표현한다.
   * 축 구분: created_by=작성 user / created_by_supplier_id=작성 공급자 조직 /
   *   source_ref_id=원천 offer 추적·legacy fallback. 서로 경쟁 아님(누가 만들었나 vs 어디서 시작했나).
   * FK 는 DB 레벨(migration)로 강제 — 기존 created_by/curated_by 와 동일하게 엔티티는 plain uuid 컬럼만 둔다.
   */
  @Column({ name: 'created_by_supplier_id', type: 'uuid', nullable: true })
  createdBySupplierId: string | null;

  /** 공급자가 운영자 검수를 요청(status→needs_review)한 시각. 신규 write 부터 세팅(기존 row 백필 없음). */
  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  // ── 수정 요청(revision request) — WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-REVISION-REQUEST-AND-AUTO-DELETE-V1 ──

  /** 운영자가 수정 요청 시 남긴 사유 메모. 공급자에게 노출. 재검수 요청 시 null 로 초기화. */
  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string | null;

  /** 운영자가 수정 요청한 시각. status='revision_requested' 로 전환할 때 세팅. */
  @Column({ name: 'revision_requested_at', type: 'timestamp', nullable: true })
  revisionRequestedAt: Date | null;

  /** 공급자가 재검수 요청 가능한 마감 시각(기본 revision_requested_at + 30일). 경과 시 자동 삭제 대상. */
  @Column({ name: 'revision_due_at', type: 'timestamp', nullable: true })
  revisionDueAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
