/**
 * StorePlaylist Entity — Store 중심 Playlist 모델
 *
 * WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1
 *
 * 매장이 Hub에서 복사한 snapshot을 조합하여 재생 목록을 구성.
 * - SINGLE: 단일 동영상 반복
 * - LIST: 여러 동영상 순환 재생
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

export type PlaylistType = 'SINGLE' | 'LIST';
export type PlaylistPublishStatus = 'draft' | 'published';

@Entity('store_playlists')
@Index('IDX_store_playlists_org', ['organization_id'])
export class StorePlaylist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'LIST' })
  playlist_type: PlaylistType;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  publish_status: PlaylistPublishStatus;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'uuid', nullable: true })
  source_playlist_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ESM rule: string-based relation
  @OneToMany('StorePlaylistItem', 'playlist')
  items?: unknown[];
}
