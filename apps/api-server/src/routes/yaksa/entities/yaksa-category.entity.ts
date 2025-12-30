/**
 * Yaksa Category Entity
 *
 * Phase A-1: Yaksa API Implementation
 * Categories for Yaksa forum posts
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { YaksaPost } from './yaksa-post.entity.js';

export type YaksaCategoryStatus = 'active' | 'inactive';

@Entity({ name: 'yaksa_categories', schema: 'public' })
export class YaksaCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: YaksaCategoryStatus;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  @OneToMany(() => YaksaPost, (post) => post.category)
  posts?: YaksaPost[];
}
