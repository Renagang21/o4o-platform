import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Platform-common asset snapshot entity.
 * No FK to source — snapshot is an independent copy.
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 */
@Entity({ name: 'o4o_asset_snapshots' })
export class AssetSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ name: 'source_service', type: 'varchar', length: 50 })
  sourceService!: string;

  @Column({ name: 'source_asset_id', type: 'uuid' })
  sourceAssetId!: string;

  @Column({ name: 'asset_type', type: 'varchar', length: 20 })
  @Index()
  assetType!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ name: 'content_json', type: 'jsonb', default: '{}' })
  contentJson!: Record<string, unknown>;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
