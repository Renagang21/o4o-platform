/**
 * NotificationService
 * Phase PD-7: Automation & Notification Foundation
 *
 * Core service for creating and managing user notifications
 */

import { AppDataSource } from '../database/connection.js';
import { Notification, NotificationType, NotificationChannel } from '../entities/Notification.js';
import { Repository } from 'typeorm';

interface CreateNotificationDTO {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  metadata?: Record<string, any>;
  channel?: NotificationChannel;
}

interface ListNotificationsOptions {
  userId: string;
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
  channel?: NotificationChannel;
}

interface ListNotificationsResult {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export class NotificationService {
  private repository: Repository<Notification>;

  constructor() {
    this.repository = AppDataSource.getRepository(Notification);
  }

  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationDTO): Promise<Notification> {
    const notification = this.repository.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata,
      channel: data.channel || 'in_app',
      isRead: false,
      createdAt: new Date(),
    });

    return await this.repository.save(notification);
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification | null> {
    const notification = await this.repository.findOne({
      where: {
        id: notificationId,
        userId: userId,
      },
    });

    if (!notification) {
      return null;
    }

    notification.markAsRead();
    return await this.repository.save(notification);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Notification)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where('userId = :userId', { userId })
      .andWhere('isRead = :isRead', { isRead: false })
      .execute();

    return result.affected || 0;
  }

  /**
   * List notifications with pagination and filtering
   */
  async listNotifications(options: ListNotificationsOptions): Promise<ListNotificationsResult> {
    const {
      userId,
      page = 1,
      limit = 20,
      isRead,
      type,
      channel,
    } = options;

    const queryBuilder = this.repository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    // Apply filters
    if (isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead });
    }

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (channel) {
      queryBuilder.andWhere('notification.channel = :channel', { channel });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const notifications = await queryBuilder.getMany();

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      notifications,
      total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string, channel?: NotificationChannel): Promise<number> {
    const queryBuilder = this.repository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.isRead = :isRead', { isRead: false });

    if (channel) {
      queryBuilder.andWhere('notification.channel = :channel', { channel });
    }

    return await queryBuilder.getCount();
  }

  /**
   * Delete old read notifications (cleanup utility)
   */
  async deleteOldReadNotifications(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('isRead = :isRead', { isRead: true })
      .andWhere('readAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get notification by ID (with ownership check)
   */
  async getNotificationById(notificationId: string, userId: string): Promise<Notification | null> {
    return await this.repository.findOne({
      where: {
        id: notificationId,
        userId: userId,
      },
    });
  }

  /**
   * Get recent notifications summary (for dashboard widgets)
   */
  async getRecentNotificationsSummary(userId: string, limit: number = 5): Promise<Notification[]> {
    return await this.repository.find({
      where: {
        userId: userId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Get notification statistics by type
   */
  async getNotificationStats(userId: string, days: number = 30): Promise<Record<string, number>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const results = await this.repository
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.createdAt >= :cutoffDate', { cutoffDate })
      .groupBy('notification.type')
      .getRawMany();

    const stats: Record<string, number> = {};
    results.forEach((row) => {
      stats[row.type] = parseInt(row.count, 10);
    });

    return stats;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
