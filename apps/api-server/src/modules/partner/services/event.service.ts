import { PartnerSocketManager } from '../websocket/socket.manager';
import { NotificationService } from './notification.service';
import { RedisService } from '../../../services/redis.service';
import { PartnerRepository } from '../repositories/partner.repository';

export class PartnerEventService {
  private socketManager: PartnerSocketManager | null = null;
  private notificationService: NotificationService;
  private redisService: RedisService;
  private partnerRepo: PartnerRepository;

  constructor() {
    this.notificationService = new NotificationService();
    this.redisService = RedisService.getInstance();
    this.partnerRepo = new PartnerRepository();
  }

  /**
   * Set socket manager instance
   */
  public setSocketManager(socketManager: PartnerSocketManager): void {
    this.socketManager = socketManager;
  }

  /**
   * Handle click event
   */
  public async handleClick(clickData: {
    partnerUserId: string;
    referralCode: string;
    sessionId: string;
    source?: string;
    device?: string;
    country?: string;
    landingUrl: string;
  }): Promise<void> {
    // Emit real-time event
    if (this.socketManager) {
      await this.socketManager.emitClick(clickData.partnerUserId, clickData);
    }

    // Update daily stats
    await this.updateDailyStats(clickData.partnerUserId, 'clicks');

    // Check for milestones
    await this.checkMilestones(clickData.partnerUserId, 'clicks');

    // Store in event stream for analytics
    await this.storeEventStream('click', clickData);
  }

  /**
   * Handle conversion event
   */
  public async handleConversion(conversionData: {
    partnerUserId: string;
    orderId: string;
    amount: number;
    conversionType: string;
    productIds?: string[];
  }): Promise<void> {
    // Emit real-time event
    if (this.socketManager) {
      await this.socketManager.emitConversion(conversionData.partnerUserId, conversionData);
    }

    // Create notification
    await this.notificationService.createNotification({
      partnerUserId: conversionData.partnerUserId,
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
    await this.updateDailyStats(conversionData.partnerUserId, 'conversions', conversionData.amount);

    // Check for milestones
    await this.checkMilestones(conversionData.partnerUserId, 'conversions');

    // Store in event stream
    await this.storeEventStream('conversion', conversionData);
  }

  /**
   * Handle commission approval event
   */
  public async handleCommissionApproved(commissionData: {
    partnerUserId: string;
    commissionId: string;
    amount: number;
    orderId?: string;
  }): Promise<void> {
    // Emit real-time event
    if (this.socketManager) {
      await this.socketManager.emitCommissionApproved(
        commissionData.partnerUserId,
        commissionData
      );
    }

    // Create notification
    await this.notificationService.createNotification({
      partnerUserId: commissionData.partnerUserId,
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
    await this.updateEarningsStats(commissionData.partnerUserId, commissionData.amount);

    // Store event
    await this.storeEventStream('commission_approved', commissionData);
  }

  /**
   * Handle payout processed event
   */
  public async handlePayoutProcessed(payoutData: {
    partnerUserId: string;
    payoutId: string;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
  }): Promise<void> {
    // Emit real-time event
    if (this.socketManager) {
      await this.socketManager.emitPayoutProcessed(payoutData.partnerUserId, payoutData);
    }

    // Create notification
    await this.notificationService.createNotification({
      partnerUserId: payoutData.partnerUserId,
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
    partnerUserId: string,
    type: 'clicks' | 'conversions',
    amount?: number
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = `stats:daily:${partnerUserId}:${today}`;

    if (type === 'clicks') {
      await (this.redisService as any).hincrby(key, 'clicks', 1);
    } else if (type === 'conversions') {
      await (this.redisService as any).hincrby(key, 'conversions', 1);
      if (amount) {
        const currentRevenue = await this.redisService.hget(key, 'revenue');
        const newRevenue = (parseFloat(currentRevenue || '0') + amount).toFixed(2);
        await this.redisService.hset(key, 'revenue', newRevenue);
      }
    }

    await this.redisService.expire(key, 86400 * 7); // Keep for 7 days
  }

  private async updateEarningsStats(partnerUserId: string, amount: number): Promise<void> {
    const key = `stats:earnings:${partnerUserId}`;
    
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
    partnerUserId: string,
    type: 'clicks' | 'conversions'
  ): Promise<void> {
    const partner = await this.partnerRepo.findPartnerUserById(partnerUserId);
    if (!partner) return;

    const milestones = {
      clicks: [100, 500, 1000, 5000, 10000, 50000, 100000],
      conversions: [10, 25, 50, 100, 250, 500, 1000]
    };

    const count = type === 'clicks' ? partner.totalClicks : partner.totalConversions;
    const relevantMilestones = milestones[type];

    for (const milestone of relevantMilestones) {
      if (count === milestone) {
        await this.notificationService.createNotification({
          partnerUserId,
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
          (this.socketManager as any).emitToPartner(partnerUserId, 'milestone', {
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

    await (this.redisService as any).lpush(streamKey, JSON.stringify(event));
    await (this.redisService as any).ltrim(streamKey, 0, 9999); // Keep last 10000 events
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
    const recentEvents = await (this.redisService as any).lrange(streamKey, 0, 19);

    // Get aggregated stats from all partners
    const stats = {
      activeUsers: activeConnections,
      todayClicks: 0,
      todayConversions: 0,
      todayRevenue: 0,
      recentEvents: recentEvents.map(e => JSON.parse(e))
    };

    // Aggregate today's stats (implement based on your needs)
    const statsKeys = await (this.redisService as any).keys(`stats:daily:*:${today}`);
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