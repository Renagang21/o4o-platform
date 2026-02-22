/**
 * StorePlaylistItem Entity — Playlist 항목
 *
 * WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1
 *
 * snapshot_id 기반 — Hub에서 복사한 asset snapshot을 참조.
 * is_forced/is_locked: 운영자 강제 콘텐츠 (매장 삭제 불가).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('store_playlist_items')
@Index('IDX_store_playlist_items_playlist_order', ['playlist_id', 'display_order'])
@Index('IDX_store_playlist_items_snapshot', ['snapshot_id'])
export class StorePlaylistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playlist_id: string;

  @Column({ type: 'uuid' })
  snapshot_id: string;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: false })
  is_forced: boolean;

  @Column({ type: 'boolean', default: false })
  is_locked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  forced_start_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  forced_end_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ESM rule: string-based relation
  @ManyToOne('StorePlaylist', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id' })
  playlist?: unknown;
}
