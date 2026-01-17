import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import type { SignagePlaylist } from './SignagePlaylist.entity.js';
import type { SignageMedia } from './SignageMedia.entity.js';

/**
 * SignagePlaylistItem Entity
 *
 * Represents an item within a playlist.
 * - Supports ordering via sortOrder
 * - Source type tracking (platform, hq, supplier, store, operator_ad)
 * - Forced content flag for HQ-mandated content
 */
@Entity('signage_playlist_items')
@Index(['playlistId', 'sortOrder'])
@Index(['mediaId'])
@Index(['sourceType'])
@Unique(['playlistId', 'sortOrder'])
export class SignagePlaylistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ========== Foreign Keys ==========
  @Column({ type: 'uuid' })
  @Index()
  playlistId!: string;

  @Column({ type: 'uuid' })
  @Index()
  mediaId!: string;

  // ========== Order ==========
  @Column({ type: 'int' })
  sortOrder!: number;

  // ========== Override Settings ==========
  @Column({ type: 'int', nullable: true })
  duration!: number | null; // seconds, null = use media/playlist default

  @Column({ type: 'varchar', length: 20, nullable: true })
  transitionType!: 'none' | 'fade' | 'slide' | null; // null = use playlist default

  // ========== Control Flags ==========
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isForced!: boolean; // HQ content, immutable by operator

  // ========== Source Tracking ==========
  @Column({
    type: 'varchar',
    length: 30,
    default: 'store',
  })
  sourceType!: 'platform' | 'hq' | 'supplier' | 'store' | 'operator_ad';

  // ========== Metadata ==========
  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  // ========== Timestamps ==========
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // ========== Relations (string-based for ESM) ==========
  @ManyToOne('SignagePlaylist', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlistId' })
  playlist!: SignagePlaylist;

  @ManyToOne('SignageMedia', 'playlistItems', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mediaId' })
  media!: SignageMedia;
}
