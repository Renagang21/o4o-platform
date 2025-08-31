import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection';
import { AffiliateNotification } from '../../../entities/affiliate/AffiliateNotification';
import { RedisService } from '../../../services/redis.service';

export interface CreateNotificationDto {
  affiliateUserId: string;
  type: 'click' | 'conversion' | 'commission_approved' | 'commission_rejected' | 
        'payout_processed' | 'payout_failed' | 'milestone' | 'alert' | 'info';
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionText?: string;
}

export interface GetNotificationsDto {
  affiliateUserId?: string;
  read?: boolean;
  type?: string;
  page?: number;
  limit?: number;
}

export class NotificationService {
  private notificationRepo: Repository<AffiliateNotification>;
  private redisService: RedisService;

  constructor() {
    this.notificationRepo = AppDataSource.getRepository(AffiliateNotification);
    this.redisService = RedisService.getInstance();
  }

  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationDto): Promise<AffiliateNotification> {
    const notification = this.notificationRepo.create({
      affiliateUserId: data.affiliateUserId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
      priority: data.priority || 'low',
      actionUrl: data.actionUrl,
      actionText: data.actionText,
      read: false
    });

    const saved = await this.notificationRepo.save(notification);

    // Update unread count in cache
    await this.incrementUnreadCount(data.affiliateUserId);

    // Store in recent notifications cache
    await this.cacheRecentNotification(data.affiliateUserId, saved);

    return saved;
  }

  /**
   * Get notifications with pagination
   */
  async getNotifications(params: GetNotificationsDto): Promise<{
    items: AffiliateNotification[];
    total: number;
    unreadCount: number;
  }> {
    const { affiliateUserId, read, type, page = 1, limit = 20 } = params;

    const query = this.notificationRepo.createQueryBuilder('notification');

    if (affiliateUserId) {
      query.andWhere('notification.affiliateUserId = :affiliateUserId', { affiliateUserId });
    }

    if (read !== undefined) {
      query.andWhere('notification.read = :read', { read });
    }

    if (type) {
      query.andWhere('notification.type = :type', { type });
    }

    query.orderBy('notification.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [items, total] = await query.getManyAndCount();

    // Get unread count
    const unreadCount = affiliateUserId ? 
      await this.getUnreadCount(affiliateUserId) : 0;

    return { items, total, unreadCount };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, affiliateUserId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, affiliateUserId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await this.notificationRepo.save(notification);

      // Update unread count
      await this.decrementUnreadCount(affiliateUserId);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(affiliateUserId: string): Promise<void> {
    await this.notificationRepo
      .createQueryBuilder()
      .update(AffiliateNotification)
      .set({ read: true, readAt: new Date() })
      .where('affiliateUserId = :affiliateUserId AND read = false', { affiliateUserId })
      .execute();

    // Reset unread count
    await this.resetUnreadCount(affiliateUserId);
  }

  /**
   * Delete old notifications
   */
  async deleteOldNotifications(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.notificationRepo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate AND read = true', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(affiliateUserId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    recent: AffiliateNotification[];
  }> {
    const [total, unread] = await Promise.all([
      this.notificationRepo.count({ where: { affiliateUserId } }),
      this.getUnreadCount(affiliateUserId)
    ]);

    // Get count by type
    const typeStats = await this.notificationRepo
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('notification.affiliateUserId = :affiliateUserId', { affiliateUserId })
      .groupBy('notification.type')
      .getRawMany();

    const byType: Record<string, number> = {};
    typeStats.forEach(stat => {
      byType[stat.type] = parseInt(stat.count);
    });

    // Get recent notifications from cache or database
    const recent = await this.getRecentNotifications(affiliateUserId, 5);

    return { total, unread, byType, recent };
  }

  /**
   * Create bulk notifications (for broadcasts)
   */
  async createBulkNotifications(
    affiliateUserIds: string[],
    notification: Omit<CreateNotificationDto, 'affiliateUserId'>
  ): Promise<void> {
    const notifications = affiliateUserIds.map(affiliateUserId =>
      this.notificationRepo.create({
        affiliateUserId,
        ...notification,
        read: false
      })
    );

    await this.notificationRepo.save(notifications);

    // Update unread counts for all users
    await Promise.all(
      affiliateUserIds.map(id => this.incrementUnreadCount(id))
    );
  }

  // Cache helper methods

  private async getUnreadCount(affiliateUserId: string): Promise<number> {
    const cacheKey = `notifications:unread:${affiliateUserId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached !== null) {
      return parseInt(cached);
    }

    const count = await this.notificationRepo.count({
      where: { affiliateUserId, read: false }
    });

    await this.redisService.set(cacheKey, count.toString(), 3600); // 1 hour TTL
    return count;
  }

  private async incrementUnreadCount(affiliateUserId: string): Promise<void> {
    const cacheKey = `notifications:unread:${affiliateUserId}`;
    await this.redisService.incr(cacheKey);
  }

  private async decrementUnreadCount(affiliateUserId: string): Promise<void> {
    const cacheKey = `notifications:unread:${affiliateUserId}`;
    const current = await this.redisService.get(cacheKey);
    if (current && parseInt(current) > 0) {
      await this.redisService.decr(cacheKey);
    }
  }

  private async resetUnreadCount(affiliateUserId: string): Promise<void> {
    const cacheKey = `notifications:unread:${affiliateUserId}`;
    await this.redisService.set(cacheKey, '0', 3600);
  }

  private async cacheRecentNotification(
    affiliateUserId: string,
    notification: AffiliateNotification
  ): Promise<void> {
    const cacheKey = `notifications:recent:${affiliateUserId}`;
    
    // Add to list (newest first)
    await this.redisService.lpush(cacheKey, JSON.stringify(notification));
    
    // Keep only last 10
    await this.redisService.ltrim(cacheKey, 0, 9);
    
    // Set TTL
    await this.redisService.expire(cacheKey, 3600); // 1 hour
  }

  private async getRecentNotifications(
    affiliateUserId: string,
    limit: number = 5
  ): Promise<AffiliateNotification[]> {
    const cacheKey = `notifications:recent:${affiliateUserId}`;
    const cached = await this.redisService.lrange(cacheKey, 0, limit - 1);

    if (cached && cached.length > 0) {
      return cached.map(item => JSON.parse(item));
    }

    // Fetch from database
    const notifications = await this.notificationRepo.find({
      where: { affiliateUserId },
      order: { createdAt: 'DESC' },
      take: limit
    });

    // Cache the results
    if (notifications.length > 0) {
      await Promise.all(
        notifications.map(n => 
          this.redisService.rpush(cacheKey, JSON.stringify(n))
        )
      );
      await this.redisService.expire(cacheKey, 3600);
    }

    return notifications;
  }
}