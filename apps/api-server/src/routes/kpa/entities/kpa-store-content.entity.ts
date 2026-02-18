/**
 * KpaStoreContent Entity — 매장 전용 콘텐츠 편집 레이어
 * WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1
 *
 * Core(o4o_asset_snapshots.content_json) 변경 없이
 * 매장이 독립적으로 콘텐츠를 편집·저장하는 Extension 테이블.
 * 렌더링 시 COALESCE(store_content, snapshot) 우선순위 적용.
 *
 * Table: kpa_store_contents
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('kpa_store_contents')
@Unique('UQ_kpa_store_contents_snap_org', ['snapshot_id', 'organization_id'])
@Index('IDX_kpa_store_contents_snap', ['snapshot_id'])
@Index('IDX_kpa_store_contents_org', ['organization_id'])
export class KpaStoreContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  snapshot_id: string;

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
}
