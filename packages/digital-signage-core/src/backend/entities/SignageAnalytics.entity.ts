import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * SignageAnalytics Entity
 *
 * Aggregated analytics data for signage performance.
 * - Daily/hourly aggregations
 * - Channel, playlist, media level metrics
 * - Performance tracking
 */
@Entity('signage_analytics')
@Index(['serviceKey', 'organizationId'])
@Index(['analyticsDate'])
@Index(['granularity'])
@Index(['entityType', 'entityId'])
@Unique(['serviceKey', 'organizationId', 'analyticsDate', 'granularity', 'entityType', 'entityId'])
export class SignageAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ========== Multi-tenant Scope ==========
  @Column({ type: 'varchar', length: 50 })
  @Index()
  serviceKey!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId!: string | null;

  // ========== Time Dimension ==========
  @Column({ type: 'date' })
  @Index()
  analyticsDate!: Date;

  @Column({ type: 'int', nullable: true })
  hour!: number | null; // 0-23, null for daily aggregation

  @Column({
    type: 'varchar',
    length: 20,
    default: 'daily',
  })
  granularity!: 'hourly' | 'daily' | 'weekly' | 'monthly';

  // ========== Entity Reference ==========
  @Column({
    type: 'varchar',
    length: 30,
  })
  entityType!: 'channel' | 'playlist' | 'media' | 'schedule' | 'organization';

  @Column({ type: 'uuid', nullable: true })
  entityId!: string | null; // null for org-level aggregation

  // ========== Playback Metrics ==========
  @Column({ type: 'int', default: 0 })
  totalPlays!: number;

  @Column({ type: 'int', default: 0 })
  completedPlays!: number;

  @Column({ type: 'int', default: 0 })
  totalDurationSeconds!: number;

  @Column({ type: 'int', default: 0 })
  uniqueChannels!: number;

  // ========== Device Metrics ==========
  @Column({ type: 'int', default: 0 })
  onlineDevices!: number;

  @Column({ type: 'int', default: 0 })
  offlineDevices!: number;

  @Column({ type: 'int', default: 0 })
  errorCount!: number;

  // ========== Content Metrics ==========
  @Column({ type: 'int', default: 0 })
  mediaCount!: number;

  @Column({ type: 'int', default: 0 })
  playlistCount!: number;

  // ========== Engagement Metrics ==========
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionRate!: number; // percentage

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  avgPlayDurationSeconds!: number;

  // ========== Timestamps ==========
  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt!: Date | null;

  // ========== Metadata ==========
  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;
}
