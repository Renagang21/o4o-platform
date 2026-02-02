/**
 * ForumPostLike - 게시글 좋아요 추적
 *
 * 사용자별 좋아요 상태를 관리하여 중복 방지
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('forum_post_like')
@Unique(['postId', 'userId'])
@Index(['postId'])
@Index(['userId'])
export class ForumPostLike {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
