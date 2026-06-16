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
  | 'migration'
  | 'manual';

export const SHARED_PRODUCT_DESCRIPTION_SOURCE_TYPES: SharedProductDescriptionSourceType[] = [
  'supplier',
  'operator',
  'ai',
  'store_contribution',
  'drug_extension',
  'migration',
  'manual',
];

/** 후보 검토 상태 (application-level union, varchar) */
export type SharedProductDescriptionStatus =
  | 'candidate'
  | 'canonical'
  | 'hidden'
  | 'needs_review'
  | 'deprecated';

export const SHARED_PRODUCT_DESCRIPTION_STATUSES: SharedProductDescriptionStatus[] = [
  'candidate',
  'canonical',
  'hidden',
  'needs_review',
  'deprecated',
];

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
