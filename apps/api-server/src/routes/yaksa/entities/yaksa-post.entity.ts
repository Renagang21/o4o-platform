/**
 * Yaksa Post Entity
 *
 * Phase A-1: Yaksa API Implementation
 * Forum posts for Yaksa pharmacist association
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { YaksaCategory } from './yaksa-category.entity.js';
import { YaksaPostLog } from './yaksa-post-log.entity.js';

export type YaksaPostStatus = 'draft' | 'published' | 'hidden' | 'deleted';

@Entity({ name: 'yaksa_posts', schema: 'public' })
export class YaksaPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  category_id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: YaksaPostStatus;

  @Column({ type: 'boolean', default: false })
  is_pinned!: boolean;

  @Column({ type: 'boolean', default: false })
  is_notice!: boolean;

  @Column({ type: 'int', default: 0 })
  view_count!: number;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  created_by_user_name?: string;

  @Column({ type: 'uuid', nullable: true })
  updated_by_user_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  updated_by_user_name?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  published_at?: Date;

  @ManyToOne(() => YaksaCategory, (category) => category.posts)
  @JoinColumn({ name: 'category_id' })
  category?: YaksaCategory;

  @OneToMany(() => YaksaPostLog, (log) => log.post)
  logs?: YaksaPostLog[];
}
