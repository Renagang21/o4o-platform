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
import type { SignageMediaTag } from './SignageMediaTag.entity.js';

/**
 * SignageMedia Entity
 *
 * Production-ready media entity supporting:
 * - Multiple media types (video, image, html, text, rich_text, link)
 * - Multiple source types (upload, youtube, vimeo, url, cms)
 * - Multi-tenant isolation
 * - Soft delete and versioning
 */
@Entity('signage_media')
@Index(['serviceKey', 'organizationId'])
@Index(['serviceKey', 'mediaType'])
@Index(['sourceType'])
@Index(['status'])
@Index(['category'])
export class SignageMedia {
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

  // ========== Media Type ==========
  @Column({
    type: 'varchar',
    length: 20,
  })
  @Index()
  mediaType!: 'video' | 'image' | 'html' | 'text' | 'rich_text' | 'link';

  // ========== Source ==========
  @Column({
    type: 'varchar',
    length: 20,
  })
  sourceType!: 'upload' | 'youtube' | 'vimeo' | 'url' | 'cms';

  @Column({ type: 'text' })
  sourceUrl!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  embedId!: string | null; // YouTube/Vimeo video ID

  // ========== File Metadata ==========
  @Column({ type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'int', nullable: true })
  duration!: number | null; // seconds (for video/audio)

  @Column({ type: 'varchar', length: 20, nullable: true })
  resolution!: string | null; // e.g., '1920x1080'

  @Column({ type: 'bigint', nullable: true })
  fileSize!: number | null; // bytes

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType!: string | null;

  // ========== Content (for text/rich_text) ==========
  @Column({ type: 'text', nullable: true })
  content!: string | null;

  // ========== Categorization ==========
  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  // ========== Status ==========
  // WO-O4O-SIGNAGE-APPROVAL-IMPLEMENTATION-V1: draft → pending → active → archived
  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  status!: 'draft' | 'pending' | 'active' | 'archived';

  // ========== Global Content (Sprint 2-6) ==========
  /**
   * Content source - who uploaded this media
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
   * Parent media ID - for cloned content tracking
   * Links to the original media when cloned from global content
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentMediaId!: string | null;

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

  // ========== Versioning ==========
  @VersionColumn()
  version!: number;

  // ========== Relations (string-based for ESM) ==========
  @OneToMany('SignagePlaylistItem', 'media')
  playlistItems!: SignagePlaylistItem[];

  @OneToMany('SignageMediaTag', 'media')
  mediaTags!: SignageMediaTag[];
}
