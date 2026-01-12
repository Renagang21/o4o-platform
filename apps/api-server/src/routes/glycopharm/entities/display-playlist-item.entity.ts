/**
 * Display Playlist Item Entity
 * 플레이리스트 내 미디어 아이템
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { DisplayPlaylist } from './display-playlist.entity.js';
import type { DisplayMedia } from './display-media.entity.js';

export type TransitionType = 'fade' | 'slide' | 'none';

@Entity('glycopharm_display_playlist_items')
export class DisplayPlaylistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  playlist_id!: string;

  @ManyToOne('DisplayPlaylist', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id' })
  playlist!: DisplayPlaylist;

  @Column({ type: 'uuid' })
  media_id!: string;

  @ManyToOne('DisplayMedia', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media!: DisplayMedia;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @Column({ type: 'int', nullable: true })
  play_duration?: number; // 초, null이면 전체 재생

  @Column({
    type: 'enum',
    enum: ['fade', 'slide', 'none'],
    default: 'fade',
  })
  transition_type!: TransitionType;

  @CreateDateColumn()
  created_at!: Date;
}
