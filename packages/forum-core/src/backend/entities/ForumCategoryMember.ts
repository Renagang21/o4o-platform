/**
 * ForumCategoryMember - 포럼 카테고리 멤버십
 *
 * WO-KPA-A-FORUM-MEMBERSHIP-TABLE-AND-JOIN-API-V1
 * 폐쇄형 포럼(forumType='closed')의 회원 관리를 위한 junction 테이블
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import type { ForumCategory } from './ForumCategory.js';

@Entity('forum_category_members')
@Unique(['forumCategoryId', 'userId'])
@Index(['forumCategoryId', 'role'])
export class ForumCategoryMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'forum_category_id', type: 'uuid' })
  forumCategoryId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'role', type: 'varchar', length: 20, default: 'member' })
  role!: string; // 'owner' | 'member'

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // ESM Entity Rules: string-based relation
  @ManyToOne('ForumCategory')
  @JoinColumn({ name: 'forum_category_id' })
  forumCategory?: ForumCategory;

  @ManyToOne('User')
  @JoinColumn({ name: 'user_id' })
  user?: any;
}
