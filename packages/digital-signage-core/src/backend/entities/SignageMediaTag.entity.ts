import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import type { SignageMedia } from './SignageMedia.entity.js';

/**
 * SignageMediaTag Entity
 *
 * N:M relationship table for media tagging.
 * - Normalized tag management
 * - Service-scoped tags
 * - Tag statistics tracking
 */
@Entity('signage_media_tags')
@Index(['serviceKey'])
@Index(['tagName'])
@Index(['mediaId', 'tagName'])
@Unique(['mediaId', 'tagName'])
export class SignageMediaTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ========== Scope ==========
  @Column({ type: 'varchar', length: 50 })
  @Index()
  serviceKey!: string;

  // ========== Relations ==========
  @Column({ type: 'uuid' })
  @Index()
  mediaId!: string;

  // ========== Tag Info ==========
  @Column({ type: 'varchar', length: 100 })
  tagName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tagCategory!: string | null; // e.g., 'theme', 'season', 'product-type'

  // ========== Timestamps ==========
  @CreateDateColumn()
  createdAt!: Date;

  // ========== Relations (string-based for ESM) ==========
  @ManyToOne('SignageMedia', 'mediaTags', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mediaId' })
  media!: SignageMedia;
}
