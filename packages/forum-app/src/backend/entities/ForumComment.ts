import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { ForumPost } from './ForumPost.js';
import type { User } from '../../../../../apps/api-server/src/entities/User.js';

export enum CommentStatus {
  PUBLISHED = 'publish',
  PENDING = 'pending',
  DELETED = 'deleted'
}

@Entity('forum_comment')
@Index(['postId', 'status', 'createdAt'])
export class ForumComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'uuid' })
  postId!: string;

  // Note: author_id uses snake_case in DB (from migration 001)
  @Column({ name: 'author_id', type: 'uuid' })
  authorId!: string;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  @Column({ type: 'enum', enum: CommentStatus, default: CommentStatus.PUBLISHED })
  status!: CommentStatus;

  @Column({ type: 'int', default: 0 })
  likeCount!: number;

  @Column({ type: 'int', default: 0 })
  replyCount!: number;

  @Column({ type: 'boolean', default: false })
  isEdited!: boolean;

  // Note: created_at uses snake_case in DB (from migration 001)
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Note: updated_at uses snake_case in DB (from migration 001)
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne('ForumPost', { lazy: true })
  @JoinColumn({ name: 'postId' })
  post?: Promise<ForumPost>;

  @ManyToOne('User')
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @ManyToOne('ForumComment', { nullable: true, lazy: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Promise<ForumComment>;

  // Note: OneToMany relationship with replies removed to prevent circular dependency
  // Use ForumCommentRepository.find({ where: { parentId: comment.id } }) to get replies

  // Methods
  canUserView(userRole: string, userId: string): boolean {
    if (this.status === CommentStatus.DELETED) {
      return ['admin', 'manager'].includes(userRole) || userId === this.authorId;
    }
    return this.status === CommentStatus.PUBLISHED;
  }

  canUserEdit(userId: string, userRole: string): boolean {
    if (['admin', 'manager'].includes(userRole)) return true;
    if (this.authorId === userId && this.status !== CommentStatus.DELETED) {
      const hoursSinceCreation = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
      return hoursSinceCreation < 24;
    }
    return false;
  }

  incrementLike(): void {
    this.likeCount++;
  }

  decrementLike(): void {
    this.likeCount = Math.max(0, this.likeCount - 1);
  }

  incrementReplyCount(): void {
    this.replyCount++;
  }

  decrementReplyCount(): void {
    this.replyCount = Math.max(0, this.replyCount - 1);
  }

  softDelete(): void {
    this.status = CommentStatus.DELETED;
    this.content = '[댓글이 삭제되었습니다]';
  }

  extractMentions(): void {
    // 멘션 추출 로직 (간단한 구현)
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const matches = this.content.match(mentionRegex);
    // 실제 구현에서는 별도 필드에 저장
  }
}