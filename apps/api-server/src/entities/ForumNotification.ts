/**
 * ForumNotification Entity
 * Phase 13: Forum Notification System
 *
 * Stores forum-specific notifications for users
 * - comment/reply/mention notifications
 * - moderation (approve/reject) notifications
 * - like/bookmark notifications
 * - category activity notifications
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { User } from './User.js';

// Forum notification types
export type ForumNotificationType =
  | 'comment'        // Someone commented on your post
  | 'reply'          // Someone replied to your comment
  | 'mention'        // Someone mentioned you
  | 'like'           // Someone liked your post/comment
  | 'bookmark'       // Someone bookmarked your post
  | 'approve'        // Your post was approved (yaksa moderation)
  | 'reject'         // Your post was rejected (yaksa moderation)
  | 'pending_review' // New post pending review (for moderators)
  | 'category_update'; // Updates in subscribed category

// Target type for likes
export type ForumNotificationTarget = 'post' | 'comment';

@Entity('forum_notifications')
@Index(['userId', 'isRead', 'createdAt'])
@Index(['type', 'createdAt'])
@Index(['organizationId', 'createdAt'])
export class ForumNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Recipient user
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne('User', { nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // Actor who triggered the notification
  @Column({ type: 'uuid', nullable: true })
  actorId?: string;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor?: User;

  // Notification type
  @Column({ type: 'varchar', length: 50 })
  type: ForumNotificationType;

  // Related post (if applicable)
  @Column({ type: 'uuid', nullable: true })
  postId?: string;

  // Related comment (if applicable)
  @Column({ type: 'uuid', nullable: true })
  commentId?: string;

  // Organization ID for yaksa multi-org support
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  // Target type for likes (post or comment)
  @Column({ type: 'varchar', length: 20, nullable: true })
  targetType?: ForumNotificationTarget;

  // Additional metadata (post title, comment excerpt, etc.)
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    postTitle?: string;
    postSlug?: string;
    commentExcerpt?: string;
    actorName?: string;
    actorAvatar?: string;
    categoryName?: string;
    rejectionReason?: string;
    [key: string]: any;
  };

  // Read status
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  readAt?: Date;

  // Helper method to mark as read
  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
  }

  // Generate notification message based on type
  getMessage(): string {
    const actorName = this.metadata?.actorName || '누군가';
    const postTitle = this.metadata?.postTitle || '게시글';

    switch (this.type) {
      case 'comment':
        return `${actorName}님이 "${postTitle}"에 댓글을 남겼습니다.`;
      case 'reply':
        return `${actorName}님이 회원님의 댓글에 답글을 남겼습니다.`;
      case 'mention':
        return `${actorName}님이 회원님을 언급했습니다.`;
      case 'like':
        return this.targetType === 'comment'
          ? `${actorName}님이 회원님의 댓글을 좋아합니다.`
          : `${actorName}님이 "${postTitle}"을(를) 좋아합니다.`;
      case 'bookmark':
        return `${actorName}님이 "${postTitle}"을(를) 북마크했습니다.`;
      case 'approve':
        return `"${postTitle}" 게시글이 승인되었습니다.`;
      case 'reject':
        return `"${postTitle}" 게시글이 반려되었습니다.${
          this.metadata?.rejectionReason ? ` 사유: ${this.metadata.rejectionReason}` : ''
        }`;
      case 'pending_review':
        return `새 게시글 "${postTitle}"이(가) 검토 대기 중입니다.`;
      case 'category_update':
        return `${this.metadata?.categoryName || '관심 게시판'}에 새 글이 올라왔습니다.`;
      default:
        return '새 알림이 있습니다.';
    }
  }
}
