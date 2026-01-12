/**
 * Yaksa Post Log Entity
 *
 * Phase A-1: Yaksa API Implementation
 * Audit log for post changes
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { YaksaPost } from './yaksa-post.entity.js';

export type YaksaPostLogAction = 'create' | 'update' | 'status_change' | 'delete';

@Entity({ name: 'yaksa_post_logs', schema: 'public' })
export class YaksaPostLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  post_id!: string;

  @Column({ type: 'varchar', length: 50 })
  action!: YaksaPostLogAction;

  @Column({ type: 'jsonb', nullable: true })
  before_data?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  after_data?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'uuid', nullable: true })
  changed_by_user_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  changed_by_user_name?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @ManyToOne('YaksaPost', 'logs')
  @JoinColumn({ name: 'post_id' })
  post?: YaksaPost;
}
