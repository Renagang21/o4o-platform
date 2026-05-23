/**
 * KpaStoreContent Entity — 매장 전용 콘텐츠 편집 레이어
 * WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1
 * WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1
 * WO-O4O-OPERATOR-SOURCE-MATERIALS-DATA-MODEL-EXTENSION-V1 (2026-05-23)
 *
 * Core(o4o_asset_snapshots.content_json) 변경 없이
 * 매장이 독립적으로 콘텐츠를 편집·저장하는 Extension 테이블.
 * 렌더링 시 COALESCE(store_content, snapshot) 우선순위 적용.
 *
 * source_type:
 *   'snapshot_edit' — 기존 스냅샷 기반 편집 (snapshot_id NOT NULL)
 *   'direct'        — 직접 생성 콘텐츠 (snapshot_id NULL, 매장 내부 전용)
 *
 * Workspace A 정렬 (2026-05-23):
 *   본 테이블은 단기 SSOT 로서 Operator Workspace A 의 "운영자 수신 원천 자료" 도
 *   함께 저장한다. 신규 테이블 신설은 중장기 IR 후속 (별도 검토).
 *   Operator Source Material 은 공급자 직접 등록 자료가 아니다 — 운영자가 외부/오프라인으로
 *   수신한 원천 자료를 등록하는 용도이다. HUB 직접 노출 대상이 아니며,
 *   Workspace B (AI 작업) / C (큐레이션) 를 거쳐야 매장 실행 자산이 된다.
 *
 *   참조: docs/investigations/IR-O4O-OPERATOR-WORKSPACE-A-OFFLINE-SOURCE-INGESTION-DESIGN-V1.md
 *
 * Table: kpa_store_contents
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('kpa_store_contents')
@Index('IDX_kpa_store_contents_snap', ['snapshot_id'])
@Index('IDX_kpa_store_contents_org', ['organization_id'])
export class KpaStoreContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** snapshot 기반이면 UUID, direct 생성이면 null */
  @Column({ type: 'uuid', nullable: true })
  snapshot_id: string | null;

  /** WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1: 생성 경로 구분 */
  @Column({ type: 'varchar', length: 30, default: 'snapshot_edit' })
  source_type: 'snapshot_edit' | 'direct';

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'jsonb', default: '{}' })
  content_json: Record<string, unknown>;

  // WO-O4O-DIRECT-CONTENT-CREATED-AT-COLUMN-V1: 생성 시점 보존 (수정과 분리).
  // 기존 row 는 migration 으로 updated_at 값 backfill.
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string | null;

  // ── WO-O4O-STORE-CONTENT-HUB-SHARE-BACKEND-PHASE1-V1 ─────────────────────

  /** HUB 공유 상태: null=미요청 / pending=검토중 / approved=승인 / rejected=반려 */
  @Column({ type: 'varchar', length: 20, nullable: true })
  share_status: 'pending' | 'approved' | 'rejected' | null;

  /** 승인 시각 */
  @Column({ type: 'timestamptz', nullable: true })
  shared_at: Date | null;

  /** 연결된 kpa_approval_requests.id */
  @Column({ type: 'uuid', nullable: true })
  shared_request_id: string | null;

  // ── WO-O4O-OPERATOR-SOURCE-MATERIALS-DATA-MODEL-EXTENSION-V1 (2026-05-23) ──
  //
  // Workspace A 의 "운영자 수신 원천 자료" 식별 / 추적용 4개 컬럼.
  // DB CHECK 제약으로 author_role IN ('operator','store') / visibility_scope = 'organization'
  // 강제. 'supplier' / 'global' / 'service' 값은 DB 레벨에서 거부됨 — Workspace A 자료의
  // HUB 직접 노출 / 공급자 직접 Producer 흐름을 차단한다.

  /**
   * 등록자 역할 구분.
   * - 'operator' : 운영자가 외부/오프라인으로 수신한 원천 자료 등록 (Workspace A)
   * - 'store'    : 매장 직접 생성 콘텐츠
   *
   * 'supplier' 금지 — 공급자는 O4O 내부 Producer 가 아니다.
   * DB CHECK 제약: author_role IN ('operator','store')
   */
  @Column({ type: 'varchar', length: 30, default: 'operator' })
  author_role: 'operator' | 'store';

  /**
   * 가시성 범위 — Workspace A 자료는 항상 organization (매장 단위) 범위.
   * 'global' / 'service' 금지 — HUB 직접 노출은 Workspace B/C 가공 후 별도 단계.
   * DB CHECK 제약: visibility_scope = 'organization'
   */
  @Column({ type: 'varchar', length: 30, default: 'organization' })
  visibility_scope: 'organization';

  /**
   * 수신 메타데이터 — 공급자명 / 브랜드 / 수신 채널 / 수신 일시 / 외부 링크 / 원본 파일명 등.
   * 자유 형식 jsonb — 권장 키:
   *   {
   *     supplierName?: string,
   *     brandName?: string,
   *     receivedChannel?: 'email' | 'kakao' | 'file' | 'cloud' | 'visit' | 'other',
   *     receivedAt?: string (ISO date),
   *     originalFileName?: string,
   *     externalLinks?: string[],
   *     marketingNotes?: string,
   *   }
   */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  source_metadata: Record<string, unknown>;

  /**
   * Workspace A → B → C 흐름 상태:
   * - 'draft'           : 등록 직후, 메타 입력 진행 중
   * - 'pending_ai'      : Workspace B (AI 작업) 진입 대기
   * - 'ai_processed'    : AI 작업 완료, Operator 검수 대기 또는 통과
   * - 'ready_curation'  : Workspace C (큐레이션) 진입 가능
   * - 'archived'        : 보류 / 폐기 / 더 이상 사용 안 함
   *
   * DB CHECK 제약: 위 5 값 중 하나.
   */
  @Column({ type: 'varchar', length: 30, default: 'draft' })
  workspace_status: 'draft' | 'pending_ai' | 'ai_processed' | 'ready_curation' | 'archived';
}
