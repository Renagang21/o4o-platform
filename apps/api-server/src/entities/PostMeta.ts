/**
 * PostMeta Entity
 * Phase 4-1/6: Normalized post metadata storage
 * Replaces legacy JSON columns (meta, postMeta, customFields)
 *
 * Created: 2025-11-06 (Zero-Data Fast Track)
 * Migration: 20251106_create_post_meta_table.sql
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Post } from './Post.js';

@Entity('post_meta')
@Index(['post_id', 'meta_key'], { unique: true })
@Index(['tenant_id', 'post_id', 'meta_key'])
@Index(['meta_key']) // Index for cross-post queries
export class PostMeta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: false })
  post_id!: string;

  @ManyToOne('Post', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: Post;

  @Column({ type: 'varchar', length: 255, nullable: false })
  meta_key!: string;

  @Column({ type: 'jsonb', nullable: true })
  meta_value!: unknown;

  // Phase 6: Multi-tenant support
  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'Tenant identifier for multi-tenant isolation (NULL = global)'
  })
  tenant_id!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
