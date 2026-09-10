/**
 * StorePopDocument — POP V2 canonical 저작물 원장
 * WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 * 정본 계약: docs/architecture/O4O-STORE-POP-V2-CANONICAL-MODEL-V1.md
 *
 * `store_pops` 와 다른 축이다 — `store_pops` 는 slug·published_at 을 가진 **발행 아티클**이고
 * 이쪽은 매장 내부 인쇄물의 **저작 문서**다. 재사용하지 않는 이유는 위 문서 §3.
 *
 * 불변식(요약):
 *   I1 Source-Required   — sources 길이 >= 1 (콘텐츠 원장이 아니다)
 *   I2 원본 불변         — 편집은 fields 만 바꾼다. source 원장에 write 하지 않는다
 *   I3 Output-Append-Only— 출력 이력은 store_execution_assets 에 append
 *   I5 QR != Placement   — qrCodeId 는 지면 삽입일 뿐 배치 사실이 아니다
 *
 * 경계: Store Ops = organization_id (CLAUDE.md §7). service_key 는 표시축이며
 *       경계 판정에 쓰지 않는다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** POP 종류 — 상품 기반 / 일반 내 매장 콘텐츠 기반 */
export type PopV2Kind = 'product' | 'content';

/** 일반 콘텐츠 POP 의 세부 유형 (pop_kind='content' 일 때만 의미 있다) */
export type PopV2ContentType =
  | 'health-info'
  | 'consult'
  | 'seasonal'
  | 'store-guide'
  | 'campaign'
  | 'general';

/**
 * source origin — 기존 `ProductionSourceItem.origin` 어휘(direct/snapshot/library/local)를
 * 그대로 쓰고, V2 에서 3개를 추가한다. 모두 **이미 존재하는 원장**을 가리킨다.
 *   store_pop = `store_pops` (콘텐츠 축)
 *   spd       = `shared_product_descriptions` (STORE canonical 설명서)
 *   listing   = `organization_product_listings` (상품 기본정보)
 */
export type PopV2SourceOrigin =
  | 'direct'
  | 'snapshot'
  | 'library'
  | 'local'
  | 'store_pop'
  | 'spd'
  | 'listing';

export interface PopV2Source {
  origin: PopV2SourceOrigin;
  id: string;
  title: string;
}

/** POP 지면에 실제로 찍히는 필드 집합 */
export interface PopV2Fields {
  title: string;
  bullets: string[];
  shortText: string;
  longText: string;
  imageUrl: string | null;
}

export type PopV2Status = 'draft' | 'ready' | 'archived';
export type PopV2Layout = 'A4' | 'A5';

@Entity({ name: 'store_pop_documents' })
@Index('IDX_store_pop_documents_org_status', ['organizationId', 'status'])
@Index('IDX_store_pop_documents_org_updated', ['organizationId', 'updatedAt'])
export class StorePopDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'service_key', type: 'varchar', length: 50 })
  serviceKey!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'pop_kind', type: 'varchar', length: 20 })
  popKind!: PopV2Kind;

  @Column({ name: 'content_type', type: 'varchar', length: 40, nullable: true })
  contentType!: PopV2ContentType | null;

  /** I1 — 항상 1개 이상. DB CHECK 로도 강제한다. */
  @Column({ type: 'jsonb' })
  sources!: PopV2Source[];

  @Column({ type: 'jsonb' })
  fields!: PopV2Fields;

  @Column({ name: 'template_id', type: 'varchar', length: 60 })
  templateId!: string;

  @Column({ type: 'varchar', length: 10 })
  layout!: PopV2Layout;

  /** I5 — 지면 삽입용 QR. 매장 배치(Placement) 를 뜻하지 않는다. */
  @Column({ name: 'qr_code_id', type: 'uuid', nullable: true })
  qrCodeId!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: PopV2Status;

  /** I3 — 마지막 산출물 포인터. 이력 자체는 store_execution_assets 가 갖는다. */
  @Column({ name: 'last_output_asset_id', type: 'uuid', nullable: true })
  lastOutputAssetId!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
