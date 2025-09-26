import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection';
import { PartnerNotification } from '../../../entities/partner/PartnerNotification';
import { RedisService } from '../../../services/redis.service';

export interface CreateNotificationDto {
  partnerUserId: string;
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
  partnerUserId?: string;
  read?: boolean;
  type?: string;
  page?: number;
  limit?: number;
}

export class NotificationService {
  private notificationRepo: Repository<PartnerNotification>;
  private redisService: RedisService;

  constructor() {
    this.notificationRepo = AppDataSource.getRepository(PartnerNotification);
    this.redisService = RedisService.getInstance();
  }

  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationDto): Promise<PartnerNotification> {
    const notification = this.notificationRepo.create({
      partnerUserId: data.partnerUserId,
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
    await this.incrementUnreadCount(data.partnerUserId);

    // Store in recent notifications cache
    await this.cacheRecentNotification(data.partnerUserId, saved);

    return saved;
  }

  /**
   * Get notifications with pagination
   */
  async getNotifications(params: GetNotificationsDto): Promise<{
    items: PartnerNotification[];
    total: number;
    unreadCount: number;
  }> {
    const { partnerUserId, read, type, page = 1, limit = 20 } = params;

    const query = this.notificationRepo.createQueryBuilder('notification');

    if (partnerUserId) {
      query.andWhere('notification.partnerUserId = :partnerUserId', { partnerUserId });
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
    const unreadCount = partnerUserId ? 
      await this.getUnreadCount(partnerUserId) : 0;

    return { items, total, unreadCount };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, partnerUserId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, partnerUserId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await this.notificationRepo.save(notification);

      // Update unread count
      await this.decrementUnreadCount(partnerUserId);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(partnerUserId: string): Promise<void> {
    await this.notificationRepo
      .createQueryBuilder()
      .update(PartnerNotification)
      .set({ read: true, readAt: new Date() })
      .where('partnerUserId = :partnerUserId AND read = false', { partnerUserId })
      .execute();

    // Reset unread count
    await this.resetUnreadCount(partnerUserId);
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
  async getNotificationStats(partnerUserId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    recent: PartnerNotification[];
  }> {
    const [total, unread] = await Promise.all([
      this.notificationRepo.count({ where: { partnerUserId } }),
      this.getUnreadCount(partnerUserId)
    ]);

    // Get count by type
    const typeStats = await this.notificationRepo
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('notification.partnerUserId = :partnerUserId', { partnerUserId })
      .groupBy('notification.type')
      .getRawMany();

    const byType: Record<string, number> = {};
    typeStats.forEach(stat => {
      byType[stat.type] = parseInt(stat.count);
    });

    // Get recent notifications from cache or database
    const recent = await this.getRecentNotifications(partnerUserId, 5);

    return { total, unread, byType, recent };
  }

  /**
   * Create bulk notifications (for broadcasts)
   */
  async createBulkNotifications(
    partnerUserIds: string[],
    notification: Omit<CreateNotificationDto, 'partnerUserId'>
  ): Promise<void> {
    const notifications = partnerUserIds.map(partnerUserId =>
      this.notificationRepo.create({
        partnerUserId,
        ...notification,
        read: false
      })
    );

    await this.notificationRepo.save(notifications);

    // Update unread counts for all users
    await Promise.all(
      partnerUserIds.map(id => this.incrementUnreadCount(id))
    );
  }

  // Cache helper methods

  private async getUnreadCount(partnerUserId: string): Promise<number> {
    const cacheKey = `notifications:unread:${partnerUserId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached !== null) {
      return parseInt(cached);
    }

    const count = await this.notificationRepo.count({
      where: { partnerUserId, read: false }
    });

    await this.redisService.set(cacheKey, count.toString(), 3600); // 1 hour TTL
    return count;
  }

  private async incrementUnreadCount(partnerUserId: string): Promise<void> {
    const cacheKey = `notifications:unread:${partnerUserId}`;
    await this.redisService.incr(cacheKey);
  }

  private async decrementUnreadCount(partnerUserId: string): Promise<void> {
    const cacheKey = `notifications:unread:${partnerUserId}`;
    const current = await this.redisService.get(cacheKey);
    if (current && parseInt(current) > 0) {
      await (this.redisService as any).decr(cacheKey);
    }
  }

  private async resetUnreadCount(partnerUserId: string): Promise<void> {
    const cacheKey = `notifications:unread:${partnerUserId}`;
    await this.redisService.set(cacheKey, '0', 3600);
  }

  private async cacheRecentNotification(
    partnerUserId: string,
    notification: PartnerNotification
  ): Promise<void> {
    const cacheKey = `notifications:recent:${partnerUserId}`;
    
    // Add to list (newest first)
    await (this.redisService as any).lpush(cacheKey, JSON.stringify(notification));
    
    // Keep only last 10
    await (this.redisService as any).ltrim(cacheKey, 0, 9);
    
    // Set TTL
    await this.redisService.expire(cacheKey, 3600); // 1 hour
  }

  private async getRecentNotifications(
    partnerUserId: string,
    limit: number = 5
  ): Promise<PartnerNotification[]> {
    const cacheKey = `notifications:recent:${partnerUserId}`;
    const cached = await (this.redisService as any).lrange(cacheKey, 0, limit - 1);

    if (cached && cached.length > 0) {
      return cached.map(item => JSON.parse(item));
    }

    // Fetch from database
    const notifications = await this.notificationRepo.find({
      where: { partnerUserId },
      order: { createdAt: 'DESC' },
      take: limit
    });

    // Cache the results
    if (notifications.length > 0) {
      await Promise.all(
        notifications.map(n => 
          (this.redisService as any).rpush(cacheKey, JSON.stringify(n))
        )
      );
      await this.redisService.expire(cacheKey, 3600);
    }

    return notifications;
  }
}