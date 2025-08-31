import { AffiliateSocketManager } from '../websocket/socket.manager';
import { NotificationService } from './notification.service';
import { RedisService } from '../../../services/redis.service';
import { AffiliateRepository } from '../repositories/affiliate.repository';

export class AffiliateEventService {
  private socketManager: AffiliateSocketManager | null = null;
  private notificationService: NotificationService;
  private redisService: RedisService;
  private affiliateRepo: AffiliateRepository;

  constructor() {
    this.notificationService = new NotificationService();
    this.redisService = RedisService.getInstance();
    this.affiliateRepo = new AffiliateRepository();
  }

  /**
   * Set socket manager instance
   */
  public setSocketManager(socketManager: AffiliateSocketManager): void {
    this.socketManager = socketManager;
  }

  /**
   * Handle click event
   */
  public async handleClick(clickData: {
    affiliateUserId: string;
    referralCode: string;
    sessionId: string;
    source?: string;
    device?: string;
    country?: string;
    landingUrl: string;
  }): Promise<void> {
    // Emit real-time event
    if (this.socketManager) {
      await this.socketManager.emitClick(clickData.affiliateUserId, clickData);
    }

    // Update daily stats
    await this.updateDailyStats(clickData.affiliateUserId, 'clicks');

    // Check for milestones
    await this.checkMilestones(clickData.affiliateUserId, 'clicks');

    // Store in event stream for analytics
    await this.storeEventStream('click', clickData);
  }

  /**
   * Handle conversion event
   */
  public async handleConversion(conversionData: {
    affiliateUserId: string;
    orderId: string;
    amount: number;
    conversionType: string;
    productIds?: string[];
  }): Promise<void> {
    // Emit real-time event
    if (this.socketManager) {
      await this.socketManager.emitConversion(conversionData.affiliateUserId, conversionData);
    }

    // Create notification
    await this.notificationService.createNotification({
      affiliateUserId: conversionData.affiliateUserId,
      type: 'conversion',
      title: 'New Conversion!',
      message: `You've earned a new conversion worth $${conversionData.amount.toFixed(2)}`,
      data: {
        amount: conversionData.amount,
        orderId: conversionData.orderId
      },
      priority: 'high'
    });

    // Update daily stats
    await this.updateDailyStats(conversionData.affiliateUserId, 'conversions', conversionData.amount);

    // Check for milestones
    await this.checkMilestones(conversionData.affiliateUserId, 'conversions');

    // Store in event stream
    await this.storeEventStream('conversion', conversionData);
  }

  /**
   * Handle commission approval event
   */
  public async handleCommissionApproved(commissionData: {
    affiliateUserId: string;
    commissionId: string;
    amount: number;
    orderId?: string;
  }): Promise<void> {
    // Emit real-time event
    if (this.socketManager) {
      await this.socketManager.emitCommissionApproved(
        commissionData.affiliateUserId,
        commissionData
      );
    }

    // Create notification
    await this.notificationService.createNotification({
      affiliateUserId: commissionData.affiliateUserId,
      type: 'commission_approved',
      title: 'Commission Approved!',
      message: `Your commission of $${commissionData.amount.toFixed(2)} has been approved`,
      data: {
        amount: commissionData.amount,
        commissionId: commissionData.commissionId,
        orderId: commissionData.orderId
      },
      priority: 'high',
      actionUrl: `/commissions/${commissionData.commissionId}`,
      actionText: 'View Details'
    });

    // Update stats
    await this.updateEarningsStats(commissionData.affiliateUserId, commissionData.amount);

    // Store event
    await this.storeEventStream('commission_approved', commissionData);
  }

  /**
   * Handle payout processed event
   */
  public async handlePayoutProcessed(payoutData: {
    affiliateUserId: string;
    payoutId: string;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
  }): Promise<void> {
    // Emit real-time event
    if (this.socketManager) {
      await this.socketManager.emitPayoutProcessed(payoutData.affiliateUserId, payoutData);
    }

    // Create notification
    await this.notificationService.createNotification({
      affiliateUserId: payoutData.affiliateUserId,
      type: 'payout_processed',
      title: 'Payout Processed!',
      message: `Your payout of $${payoutData.amount.toFixed(2)} has been processed`,
      data: {
        amount: payoutData.amount,
        payoutId: payoutData.payoutId
      },
      priority: 'urgent',
      actionUrl: `/payouts/${payoutData.payoutId}`,
      actionText: 'View Payout'
    });

    // Store event
    await this.storeEventStream('payout_processed', payoutData);
  }

  /**
   * Broadcast system alert
   */
  public async broadcastSystemAlert(alert: {
    type: 'maintenance' | 'update' | 'warning' | 'info';
    message: string;
    duration?: number;
  }): Promise<void> {
    if (this.socketManager) {
      this.socketManager.broadcastToAdmin('system:alert', alert);
    }

    // Store alert in Redis for new connections
    await this.redisService.set(
      'system:alert:current',
      JSON.stringify(alert),
      alert.duration || 3600
    );
  }

  /**
   * Send analytics update
   */
  public async sendAnalyticsUpdate(data: {
    type: 'realtime' | 'hourly' | 'daily';
    metrics: any;
  }): Promise<void> {
    if (this.socketManager) {
      this.socketManager.sendAnalyticsUpdate(data);
    }

    // Cache analytics data
    await this.cacheAnalyticsData(data);
  }

  // Private helper methods

  private async updateDailyStats(
    affiliateUserId: string,
    type: 'clicks' | 'conversions',
    amount?: number
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = `stats:daily:${affiliateUserId}:${today}`;

    if (type === 'clicks') {
      await this.redisService.hincrby(key, 'clicks', 1);
    } else if (type === 'conversions') {
      await this.redisService.hincrby(key, 'conversions', 1);
      if (amount) {
        const currentRevenue = await this.redisService.hget(key, 'revenue');
        const newRevenue = (parseFloat(currentRevenue || '0') + amount).toFixed(2);
        await this.redisService.hset(key, 'revenue', newRevenue);
      }
    }

    await this.redisService.expire(key, 86400 * 7); // Keep for 7 days
  }

  private async updateEarningsStats(affiliateUserId: string, amount: number): Promise<void> {
    const key = `stats:earnings:${affiliateUserId}`;
    
    const currentTotal = await this.redisService.hget(key, 'total');
    const newTotal = (parseFloat(currentTotal || '0') + amount).toFixed(2);
    await this.redisService.hset(key, 'total', newTotal);

    const month = new Date().toISOString().slice(0, 7);
    const currentMonthly = await this.redisService.hget(key, `month:${month}`);
    const newMonthly = (parseFloat(currentMonthly || '0') + amount).toFixed(2);
    await this.redisService.hset(key, `month:${month}`, newMonthly);

    await this.redisService.expire(key, 86400 * 30); // Keep for 30 days
  }

  private async checkMilestones(
    affiliateUserId: string,
    type: 'clicks' | 'conversions'
  ): Promise<void> {
    const affiliate = await this.affiliateRepo.findAffiliateUserById(affiliateUserId);
    if (!affiliate) return;

    const milestones = {
      clicks: [100, 500, 1000, 5000, 10000, 50000, 100000],
      conversions: [10, 25, 50, 100, 250, 500, 1000]
    };

    const count = type === 'clicks' ? affiliate.totalClicks : affiliate.totalConversions;
    const relevantMilestones = milestones[type];

    for (const milestone of relevantMilestones) {
      if (count === milestone) {
        await this.notificationService.createNotification({
          affiliateUserId,
          type: 'milestone',
          title: `Milestone Reached! 🎉`,
          message: `Congratulations! You've reached ${milestone} ${type}!`,
          data: {
            [`${type}Count`]: milestone
          },
          priority: 'high'
        });

        // Emit milestone event
        if (this.socketManager) {
          this.socketManager.emitToAffiliate(affiliateUserId, 'milestone', {
            type,
            count: milestone
          });
        }

        break;
      }
    }
  }

  private async storeEventStream(eventType: string, data: any): Promise<void> {
    const streamKey = `events:stream:${new Date().toISOString().split('T')[0]}`;
    const event = {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    };

    await this.redisService.lpush(streamKey, JSON.stringify(event));
    await this.redisService.ltrim(streamKey, 0, 9999); // Keep last 10000 events
    await this.redisService.expire(streamKey, 86400 * 3); // Keep for 3 days
  }

  private async cacheAnalyticsData(data: any): Promise<void> {
    const cacheKey = `analytics:cache:${data.type}`;
    await this.redisService.set(
      cacheKey,
      JSON.stringify(data),
      data.type === 'realtime' ? 60 : 3600 // 1 minute for realtime, 1 hour for others
    );
  }

  /**
   * Get real-time dashboard data
   */
  public async getRealtimeDashboard(): Promise<any> {
    const activeConnections = this.socketManager ? 
      this.socketManager.getConnectedClientsCount() : 0;

    // Get today's events from stream
    const today = new Date().toISOString().split('T')[0];
    const streamKey = `events:stream:${today}`;
    const recentEvents = await this.redisService.lrange(streamKey, 0, 19);

    // Get aggregated stats from all affiliates
    const stats = {
      activeUsers: activeConnections,
      todayClicks: 0,
      todayConversions: 0,
      todayRevenue: 0,
      recentEvents: recentEvents.map(e => JSON.parse(e))
    };

    // Aggregate today's stats (implement based on your needs)
    const statsKeys = await this.redisService.keys(`stats:daily:*:${today}`);
    for (const key of statsKeys) {
      const dayStats = await this.redisService.hgetall(key);
      if (dayStats) {
        stats.todayClicks += parseInt(dayStats.clicks || '0');
        stats.todayConversions += parseInt(dayStats.conversions || '0');
        stats.todayRevenue += parseFloat(dayStats.revenue || '0');
      }
    }

    return stats;
  }
}