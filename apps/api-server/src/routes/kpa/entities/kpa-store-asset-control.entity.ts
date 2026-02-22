/**
 * KpaStoreAssetControl Entity — KPA-a Store 자산 운영 제어
 * WO-KPA-A-ASSET-CONTROL-EXTENSION-V1: publish_status 관리
 * WO-KPA-A-ASSET-CONTROL-EXTENSION-V2: channel_map, forced injection, period, locked
 * WO-O4O-SNAPSHOT-POLICY-MIGRATION-V1: snapshot_type, lifecycle_status
 *
 * Core(o4o_asset_snapshots) 변경 없이 KPA 전용 운영 제어.
 * Table: kpa_store_asset_controls
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type AssetPublishStatus = 'draft' | 'published' | 'hidden';

export type SnapshotType = 'user_copy' | 'hq_forced' | 'campaign_push' | 'template_seed';

export type LifecycleStatus = 'active' | 'expired' | 'archived';

export interface ChannelMap {
  [channelKey: string]: boolean;
}

@Entity('kpa_store_asset_controls')
@Unique('UQ_kpa_store_asset_ctrl_snap_org', ['snapshot_id', 'organization_id'])
@Index('IDX_kpa_store_asset_ctrl_org', ['organization_id'])
@Index('IDX_kpa_store_asset_ctrl_snap', ['snapshot_id'])
export class KpaStoreAssetControl {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  snapshot_id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  publish_status: AssetPublishStatus;

  // V2: Channel mapping
  @Column({ type: 'jsonb', default: '{}' })
  channel_map: ChannelMap;

  // V2: Admin forced injection
  @Column({ type: 'boolean', default: false })
  is_forced: boolean;

  @Column({ type: 'uuid', nullable: true })
  forced_by_admin_id: string | null;

  @Column({ type: 'timestamp', nullable: true })
  forced_start_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  forced_end_at: Date | null;

  // V2: Locked state (prevents store-level deletion/modification)
  @Column({ type: 'boolean', default: false })
  is_locked: boolean;

  // V3: Snapshot policy — WO-O4O-SNAPSHOT-POLICY-MIGRATION-V1
  @Column({ type: 'varchar', length: 20, default: 'user_copy' })
  snapshot_type: SnapshotType;

  @Index('IDX_kpa_store_asset_ctrl_lifecycle')
  @Column({ type: 'varchar', length: 20, default: 'active' })
  lifecycle_status: LifecycleStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
