/**
 * KpaStoreContent Entity — 매장 전용 콘텐츠 편집 레이어
 * WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1
 * WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1
 *
 * Core(o4o_asset_snapshots.content_json) 변경 없이
 * 매장이 독립적으로 콘텐츠를 편집·저장하는 Extension 테이블.
 * 렌더링 시 COALESCE(store_content, snapshot) 우선순위 적용.
 *
 * source_type:
 *   'snapshot_edit' — 기존 스냅샷 기반 편집 (snapshot_id NOT NULL)
 *   'direct'        — 직접 생성 콘텐츠 (snapshot_id NULL, 매장 내부 전용)
 *
 * Table: kpa_store_contents
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
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
}
