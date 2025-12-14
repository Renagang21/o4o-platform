/**
 * ForumNotificationService
 * Phase 13: Forum Notification System
 * Phase 15-B: SSE Realtime Event Emission
 *
 * Service for managing forum notifications:
 * - Comment/Reply/Mention notifications
 * - Like/Bookmark notifications
 * - Moderation (approve/reject) notifications
 * - Category activity notifications
 * - Realtime SSE event emission (Phase 15-B)
 */

import { Repository, LessThan, In } from 'typeorm';
import { notificationEventHub } from './NotificationEventHub.js';
import { AppDataSource } from '../../database/connection.js';
import {
  ForumNotification,
  ForumNotificationType,
  ForumNotificationTarget,
} from '../../entities/ForumNotification.js';
import { notificationEventHub } from './NotificationEventHub.js';

// Notification payload interface
export interface NotificationPayload {
  postId?: string;
  commentId?: string;
  organizationId?: string;
  targetType?: ForumNotificationTarget;
  metadata?: Record<string, any>;
}

// Notification result interface
export interface NotificationResult {
  notifications: ForumNotification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Options for fetching notifications
export interface GetNotificationsOptions {
  page?: number;
  limit?: number;
  type?: ForumNotificationType | ForumNotificationType[];
  isRead?: boolean;
  organizationId?: string;
}

class ForumNotificationService {
  private repository: Repository<ForumNotification>;

  constructor() {
    // Repository will be initialized when database is connected
    this.repository = null as any;
  }

  private getRepository(): Repository<ForumNotification> {
    if (!this.repository || !AppDataSource.isInitialized) {
      this.repository = AppDataSource.getRepository(ForumNotification);
    }
    return this.repository;
  }

  /**
   * Send a notification to a user
   * Phase 15-B: Also emits SSE event for realtime delivery
   */
  async sendNotification(
    userId: string,
    type: ForumNotificationType,
    payload: NotificationPayload,
    actorId?: string
  ): Promise<ForumNotification> {
    const repo = this.getRepository();

    const notification = repo.create({
      userId,
      actorId,
      type,
      postId: payload.postId,
      commentId: payload.commentId,
      organizationId: payload.organizationId,
      targetType: payload.targetType,
      metadata: payload.metadata,
      isRead: false,
    });

    // Save to database first
    const savedNotification = await repo.save(notification);

    // Phase 15-B: Emit SSE event for realtime delivery
    // This is non-blocking - if user is not connected, event is simply dropped
    try {
      notificationEventHub.emitNotification(savedNotification);
    } catch (error) {
      // Log but don't fail - SSE is enhancement, not critical path
      console.error('[SSE] Failed to emit notification event:', error);
    }

    return savedNotification;
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    options: GetNotificationsOptions = {}
  ): Promise<NotificationResult> {
    const repo = this.getRepository();
    const { page = 1, limit = 20, type, isRead, organizationId } = options;

    const where: any = { userId };

    if (type) {
      where.type = Array.isArray(type) ? In(type) : type;
    }
    if (typeof isRead === 'boolean') {
      where.isRead = isRead;
    }
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const [notifications, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['actor'],
    });

    const totalPages = Math.ceil(total / limit);

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string, organizationId?: string): Promise<number> {
    const repo = this.getRepository();
    const where: any = { userId, isRead: false };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return repo.count({ where });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<ForumNotification | null> {
    const repo = this.getRepository();

    const notification = await repo.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return null;
    }

    notification.markAsRead();
    return repo.save(notification);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, organizationId?: string): Promise<number> {
    const repo = this.getRepository();
    const where: any = { userId, isRead: false };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    const result = await repo.update(where, {
      isRead: true,
      readAt: new Date(),
    });

    return result.affected || 0;
  }

  /**
   * Delete old notifications (cleanup)
   */
  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    const repo = this.getRepository();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await repo.delete({
      createdAt: LessThan(cutoffDate),
      isRead: true,
    });

    return result.affected || 0;
  }

  // ============================================
  // Convenience Methods for Common Notifications
  // ============================================

  /**
   * Notify post author when someone comments
   */
  async notifyPostAuthorOnComment(
    postAuthorId: string,
    postId: string,
    commenterId: string,
    metadata: { postTitle?: string; postSlug?: string; commentExcerpt?: string; actorName?: string }
  ): Promise<ForumNotification | null> {
    // Don't notify if commenting on own post
    if (postAuthorId === commenterId) {
      return null;
    }

    return this.sendNotification(
      postAuthorId,
      'comment',
      { postId, metadata },
      commenterId
    );
  }

  /**
   * Notify comment author when someone replies
   */
  async notifyCommentAuthorOnReply(
    commentAuthorId: string,
    postId: string,
    commentId: string,
    replierId: string,
    metadata: { postTitle?: string; commentExcerpt?: string; actorName?: string }
  ): Promise<ForumNotification | null> {
    // Don't notify if replying to own comment
    if (commentAuthorId === replierId) {
      return null;
    }

    return this.sendNotification(
      commentAuthorId,
      'reply',
      { postId, commentId, metadata },
      replierId
    );
  }

  /**
   * Notify user when mentioned
   */
  async notifyUserMentioned(
    targetUserId: string,
    postId: string,
    actorId: string,
    metadata: { postTitle?: string; postSlug?: string; actorName?: string },
    commentId?: string
  ): Promise<ForumNotification | null> {
    // Don't notify if mentioning self
    if (targetUserId === actorId) {
      return null;
    }

    return this.sendNotification(
      targetUserId,
      'mention',
      { postId, commentId, metadata },
      actorId
    );
  }

  /**
   * Notify post/comment author when someone likes
   */
  async notifyOnLike(
    targetUserId: string,
    targetType: ForumNotificationTarget,
    targetId: string,
    likerId: string,
    metadata: { postTitle?: string; actorName?: string }
  ): Promise<ForumNotification | null> {
    // Don't notify if liking own content
    if (targetUserId === likerId) {
      return null;
    }

    const payload: NotificationPayload = {
      targetType,
      metadata,
    };

    if (targetType === 'post') {
      payload.postId = targetId;
    } else {
      payload.commentId = targetId;
    }

    return this.sendNotification(targetUserId, 'like', payload, likerId);
  }

  /**
   * Notify post author when someone bookmarks
   */
  async notifyOnBookmark(
    postAuthorId: string,
    postId: string,
    bookmarkerId: string,
    metadata: { postTitle?: string; actorName?: string }
  ): Promise<ForumNotification | null> {
    // Don't notify if bookmarking own post
    if (postAuthorId === bookmarkerId) {
      return null;
    }

    return this.sendNotification(
      postAuthorId,
      'bookmark',
      { postId, metadata },
      bookmarkerId
    );
  }

  // ============================================
  // Yaksa Moderation Notifications
  // ============================================

  /**
   * Notify moderators when a post needs review
   */
  async notifyModeratorsOnPendingPost(
    moderatorIds: string[],
    postId: string,
    organizationId: string,
    metadata: { postTitle?: string; authorName?: string }
  ): Promise<ForumNotification[]> {
    const notifications: ForumNotification[] = [];

    for (const moderatorId of moderatorIds) {
      const notification = await this.sendNotification(
        moderatorId,
        'pending_review',
        { postId, organizationId, metadata }
      );
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Notify post author when post is approved
   */
  async notifyPostApproved(
    postAuthorId: string,
    postId: string,
    organizationId: string,
    approverId: string,
    metadata: { postTitle?: string; postSlug?: string }
  ): Promise<ForumNotification> {
    return this.sendNotification(
      postAuthorId,
      'approve',
      { postId, organizationId, metadata },
      approverId
    );
  }

  /**
   * Notify post author when post is rejected
   */
  async notifyPostRejected(
    postAuthorId: string,
    postId: string,
    organizationId: string,
    rejecterId: string,
    metadata: { postTitle?: string; rejectionReason?: string }
  ): Promise<ForumNotification> {
    return this.sendNotification(
      postAuthorId,
      'reject',
      { postId, organizationId, metadata },
      rejecterId
    );
  }

  /**
   * Notify users subscribed to a category about new post
   */
  async notifyCategorySubscribers(
    subscriberIds: string[],
    postId: string,
    metadata: { postTitle?: string; categoryName?: string; authorName?: string },
    excludeAuthorId?: string
  ): Promise<ForumNotification[]> {
    const notifications: ForumNotification[] = [];

    for (const subscriberId of subscriberIds) {
      // Skip the post author
      if (subscriberId === excludeAuthorId) {
        continue;
      }

      const notification = await this.sendNotification(
        subscriberId,
        'category_update',
        { postId, metadata }
      );
      notifications.push(notification);
    }

    return notifications;
  }
}

// Export singleton instance
export const forumNotificationService = new ForumNotificationService();

// Also export the class for testing
export { ForumNotificationService };
