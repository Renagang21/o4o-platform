import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
  VersionColumn,
} from 'typeorm';
import type { SignagePlaylistItem } from './SignagePlaylistItem.entity.js';

/**
 * SignagePlaylist Entity
 *
 * Production-ready playlist entity with:
 * - Multi-tenant isolation (serviceKey + organizationId)
 * - Soft delete support
 * - Optimistic locking (version)
 * - Social features (sharing, likes)
 */
@Entity('signage_playlists')
@Index(['serviceKey', 'organizationId'])
@Index(['serviceKey', 'status'])
@Index(['isPublic'])
export class SignagePlaylist {
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

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ========== Status ==========
  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  @Index()
  status!: 'active' | 'inactive' | 'draft';

  // ========== Playback Settings ==========
  @Column({ type: 'boolean', default: true })
  loopEnabled!: boolean;

  @Column({ type: 'int', default: 10 })
  defaultItemDuration!: number; // seconds

  @Column({
    type: 'varchar',
    length: 20,
    default: 'fade',
  })
  transitionType!: 'none' | 'fade' | 'slide';

  @Column({ type: 'int', default: 500 })
  transitionDuration!: number; // milliseconds

  // ========== Computed Fields (updated via trigger/service) ==========
  @Column({ type: 'int', default: 0 })
  totalDuration!: number; // total seconds

  @Column({ type: 'int', default: 0 })
  itemCount!: number;

  // ========== Global Content (Sprint 2-6) ==========
  /**
   * Content source - who created this playlist
   * - hq: HQ operator (본부 운영자)
   * - supplier: Supplier (공급자)
   * - community: Community shared (커뮤니티 공유)
   * - store: Store (개별 매장)
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'store',
  })
  @Index()
  source!: 'hq' | 'supplier' | 'community' | 'store';

  /**
   * Content scope - visibility/distribution level
   * - global: Available to all stores in the service
   * - store: Store-specific content
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'store',
  })
  @Index()
  scope!: 'global' | 'store';

  /**
   * Parent playlist ID - for cloned content tracking
   * Links to the original playlist when cloned from global content
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentPlaylistId!: string | null;

  // ========== Social Features ==========
  @Column({ type: 'boolean', default: false })
  isPublic!: boolean;

  @Column({ type: 'int', default: 0 })
  likeCount!: number;

  @Column({ type: 'int', default: 0 })
  downloadCount!: number;

  // ========== Ownership ==========
  @Column({ type: 'uuid', nullable: true })
  createdByUserId!: string | null;

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

  // ========== Versioning (Optimistic Lock) ==========
  @VersionColumn()
  version!: number;

  // ========== Relations (string-based for ESM) ==========
  @OneToMany('SignagePlaylistItem', 'playlist')
  items!: SignagePlaylistItem[];
}
