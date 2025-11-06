import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm'
import type { Post } from './Post.js'

/**
 * PostMeta Entity
 * Normalized metadata storage for posts
 * Replaces legacy JSON columns (meta, postMeta, customFields)
 *
 * Created: 2025-11-06 (Zero-Data Fast Track)
 * Migration: 20251106_create_post_meta_table.sql
 */
@Entity('post_meta')
@Index(['post_id', 'meta_key']) // Composite index for common query pattern
@Index(['meta_key']) // Index for cross-post queries
export class PostMeta {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', nullable: false })
  post_id!: string

  @ManyToOne('Post', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: Post

  @Column({ type: 'varchar', length: 255, nullable: false })
  meta_key!: string

  @Column({ type: 'jsonb', nullable: true })
  meta_value!: unknown

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date
}
