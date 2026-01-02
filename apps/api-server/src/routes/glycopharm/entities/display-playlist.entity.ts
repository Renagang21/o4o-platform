/**
 * Display Playlist Entity
 * 스마트 디스플레이 플레이리스트
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { GlycopharmPharmacy } from './glycopharm-pharmacy.entity.js';

export type PlaylistStatus = 'draft' | 'active' | 'archived';

@Entity('glycopharm_display_playlists')
export class DisplayPlaylist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  pharmacy_id?: string;

  @ManyToOne(() => GlycopharmPharmacy, { nullable: true })
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy?: GlycopharmPharmacy;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
  })
  status!: PlaylistStatus;

  @Column({ type: 'boolean', default: false })
  is_public!: boolean;

  @Column({ type: 'int', default: 0 })
  total_duration!: number; // 초 단위

  @Column({ type: 'int', default: 0 })
  like_count!: number;

  @Column({ type: 'int', default: 0 })
  download_count!: number;

  @Column({ type: 'uuid', nullable: true })
  created_by?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
