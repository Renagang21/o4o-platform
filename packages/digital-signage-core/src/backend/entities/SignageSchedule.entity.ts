import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  VersionColumn,
} from 'typeorm';
import type { SignagePlaylist } from './SignagePlaylist.entity.js';

/**
 * SignageSchedule Entity
 *
 * Production-ready schedule entity for time-based playlist assignment.
 * - Day-of-week based scheduling
 * - Time range (startTime, endTime)
 * - Optional date range (validFrom, validUntil)
 * - Priority-based conflict resolution
 */
@Entity('signage_schedules')
@Index(['serviceKey', 'organizationId'])
@Index(['channelId'])
@Index(['playlistId'])
@Index(['isActive'])
@Index(['priority'])
export class SignageSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ========== Multi-tenant Scope ==========
  @Column({ type: 'varchar', length: 50 })
  @Index()
  serviceKey!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId!: string | null;

  // ========== Basic Info ==========
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  // ========== Target ==========
  @Column({ type: 'uuid', nullable: true })
  @Index()
  channelId!: string | null; // null = applies to all channels in scope

  @Column({ type: 'uuid' })
  @Index()
  playlistId!: string;

  // ========== Time Rules ==========
  @Column({ type: 'int', array: true })
  daysOfWeek!: number[]; // 0-6 (Sun-Sat)

  @Column({ type: 'time' })
  startTime!: string;

  @Column({ type: 'time' })
  endTime!: string;

  // ========== Date Range (optional) ==========
  @Column({ type: 'date', nullable: true })
  validFrom!: Date | null;

  @Column({ type: 'date', nullable: true })
  validUntil!: Date | null;

  // ========== Priority & Control ==========
  @Column({ type: 'int', default: 0 })
  priority!: number; // Higher = takes precedence

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // ========== Metadata ==========
  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  // ========== Timestamps ==========
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;

  // ========== Versioning ==========
  @VersionColumn()
  version!: number;

  // ========== Relations (string-based for ESM) ==========
  @ManyToOne('SignagePlaylist', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlistId' })
  playlist!: SignagePlaylist;
}
