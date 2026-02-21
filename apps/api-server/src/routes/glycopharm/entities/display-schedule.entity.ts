/**
 * Display Schedule Entity
 * 스마트 디스플레이 스케줄
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { OrganizationStore } from '../../kpa/entities/organization-store.entity.js';
import type { DisplayPlaylist } from './display-playlist.entity.js';

@Entity('glycopharm_display_schedules')
export class DisplaySchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  pharmacy_id!: string;

  @ManyToOne('OrganizationStore', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy!: OrganizationStore;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'uuid' })
  playlist_id!: string;

  @ManyToOne('DisplayPlaylist', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id' })
  playlist!: DisplayPlaylist;

  @Column({ type: 'simple-array' })
  days_of_week!: number[]; // 0-6 (일-토)

  @Column({ type: 'time' })
  start_time!: string; // HH:mm

  @Column({ type: 'time' })
  end_time!: string; // HH:mm

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'uuid', nullable: true })
  created_by?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
