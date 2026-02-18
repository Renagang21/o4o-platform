/**
 * KpaStoreAssetControl Entity — KPA-a Store 자산 운영 제어
 * WO-KPA-A-ASSET-CONTROL-EXTENSION-V1
 *
 * Core(o4o_asset_snapshots) 변경 없이 KPA 전용 publish 상태 관리.
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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
