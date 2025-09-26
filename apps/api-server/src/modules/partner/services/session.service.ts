import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection';
import { PartnerSession } from '../../../entities/partner/PartnerSession';
import { PartnerClick } from '../../../entities/partner/PartnerClick';
import { PartnerConversion } from '../../../entities/partner/PartnerConversion';
import { RedisService } from '../../../services/redis.service';
import { v4 as uuidv4 } from 'uuid';

export interface SessionData {
  sessionId: string;
  partnerUserId: string;
  referralCode: string;
  landingPage: string;
  source?: string;
  medium?: string;
  campaign?: string;
  userAgent?: string;
  ip?: string;
  country?: string;
  device?: string;
  browser?: string;
  startTime: Date;
  lastActivity: Date;
  clickCount: number;
  pageViews: string[];
  events: SessionEvent[];
}

export interface SessionEvent {
  timestamp: Date;
  type: 'pageview' | 'click' | 'scroll' | 'form_interaction' | 'video_play' | 'download' | 'custom';
  data: any;
}

export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  avgDuration: number;
  avgPageViews: number;
  bounceRate: number;
  conversionRate: number;
  topPages: Array<{ page: string; views: number }>;
  deviceBreakdown: Record<string, number>;
  browserBreakdown: Record<string, number>;
  sourceBreakdown: Record<string, number>;
}

export class SessionService {
  private sessionRepo: Repository<PartnerSession>;
  private clickRepo: Repository<PartnerClick>;
  private conversionRepo: Repository<PartnerConversion>;
  private redisService: RedisService;
  private readonly SESSION_TIMEOUT = 30 * 60; // 30 minutes
  private readonly SESSION_EXTENSION = 5 * 60; // 5 minutes

  constructor() {
    this.sessionRepo = AppDataSource.getRepository(PartnerSession);
    this.clickRepo = AppDataSource.getRepository(PartnerClick);
    this.conversionRepo = AppDataSource.getRepository(PartnerConversion);
    this.redisService = RedisService.getInstance();
  }

  /**
   * Create a new session
   */
  async createSession(data: {
    partnerUserId: string;
    referralCode: string;
    landingPage: string;
    source?: string;
    medium?: string;
    campaign?: string;
    userAgent?: string;
    ip?: string;
    country?: string;
    device?: string;
    browser?: string;
  }): Promise<SessionData> {
    const sessionId = uuidv4();
    
    const sessionData: SessionData = {
      sessionId,
      partnerUserId: data.partnerUserId,
      referralCode: data.referralCode,
      landingPage: data.landingPage,
      source: data.source,
      medium: data.medium,
      campaign: data.campaign,
      userAgent: data.userAgent,
      ip: data.ip,
      country: data.country,
      device: data.device || this.detectDevice(data.userAgent),
      browser: data.browser || this.detectBrowser(data.userAgent),
      startTime: new Date(),
      lastActivity: new Date(),
      clickCount: 1,
      pageViews: [data.landingPage],
      events: []
    };

    // Store in Redis for real-time tracking
    await this.storeSession(sessionData);

    // Store in database
    const session = this.sessionRepo.create({
      sessionId,
      partnerUserId: data.partnerUserId,
      referralCode: data.referralCode,
      landingUrl: data.landingPage,
      source: data.source,
      medium: data.medium,
      campaign: data.campaign,
      userAgent: data.userAgent,
      ipAddress: data.ip,
      geoInfo: {
        country: data.country
      },
      deviceInfo: {
        type: sessionData.device,
        browser: sessionData.browser
      },
      startedAt: sessionData.startTime,
      lastActivity: sessionData.lastActivity,
      pageCount: 1,
      events: []
    } as any);

    await this.sessionRepo.save(session);

    return sessionData;
  }

  /**
   * Track session activity
   */
  async trackActivity(sessionId: string, event: SessionEvent): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    // Update session data
    session.lastActivity = new Date();
    session.events.push(event);

    if (event.type === 'pageview' && event.data.page) {
      session.pageViews.push(event.data.page);
    }

    // Update Redis
    await this.storeSession(session);

    // Update database periodically (every 5 events)
    if (session.events.length % 5 === 0) {
      await this.syncToDatabase(session);
    }

    // Extend session timeout
    await this.extendSession(sessionId);
  }

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return;
    }

    // Calculate duration
    const duration = Math.round(
      (new Date().getTime() - session.startTime.getTime()) / 1000
    );

    // Update database
    await this.sessionRepo.update(
      { sessionId },
      {
        lastActivity: new Date(),
        duration,
        pageCount: session.pageViews?.length || 0,
        events: session.events,
        metadata: {
          bounced: (session.pageViews?.length || 0) === 1
        }
      } as any
    );

    // Remove from Redis
    await this.removeSession(sessionId);
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const cacheKey = `session:${sessionId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to database
    const session = await this.sessionRepo.findOne({
      where: { sessionId }
    });

    if (!session) {
      return null;
    }

    const sessionData: SessionData = {
      sessionId: session.sessionId,
      partnerUserId: session.partnerUserId,
      referralCode: session.referralCode,
      landingPage: (session as any).landingPage || session.landingUrl,
      source: session.source,
      medium: session.medium,
      campaign: session.campaign,
      userAgent: session.userAgent,
      ip: (session as any).ip || session.ipAddress,
      country: (session as any).country || session.geoInfo?.country,
      device: (session as any).device || session.deviceInfo?.type,
      browser: (session as any).browser || session.deviceInfo?.browser,
      startTime: (session as any).startTime || session.startedAt,
      lastActivity: session.lastActivity || ((session as any).startTime || session.startedAt),
      clickCount: 1,
      pageViews: [(session as any).landingPage || session.landingUrl],
      events: (session.events || []) as any
    };

    // Restore to Redis
    await this.storeSession(sessionData);

    return sessionData;
  }

  /**
   * Get active sessions count
   */
  async getActiveSessions(partnerUserId?: string): Promise<number> {
    const pattern = partnerUserId ? 
      `session:*:${partnerUserId}` : 
      'session:*';
    
    const keys = await (this.redisService as any).keys(pattern);
    return keys.length;
  }

  /**
   * Get session metrics
   */
  async getSessionMetrics(
    partnerUserId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SessionMetrics> {
    const query = this.sessionRepo.createQueryBuilder('session')
      .where('session.partnerUserId = :partnerUserId', { partnerUserId })
      .andWhere('session.startTime BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      });

    const sessions = await query.getMany();

    // Calculate metrics
    const totalSessions = sessions.length;
    const activeSessions = await this.getActiveSessions(partnerUserId);
    
    const durations = sessions
      .filter(s => s.duration)
      .map(s => s.duration!);
    
    const avgDuration = durations.length > 0 ?
      durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const pageViewCounts = sessions.map(s => s.pageViews || 1);
    const avgPageViews = pageViewCounts.length > 0 ?
      pageViewCounts.reduce((a, b) => (a as any) + (b as any), 0) / pageViewCounts.length : 0;

    const bounced = sessions.filter(s => (s as any).bounced).length;
    const bounceRate = totalSessions > 0 ? (bounced / totalSessions) * 100 : 0;

    // Get conversions for the same period
    const conversions = await this.conversionRepo.count({
      where: {
        partnerUserId,
        createdAt: (query.getQueryAndParameters()[1] as any)
      }
    });

    const conversionRate = totalSessions > 0 ? 
      (conversions / totalSessions) * 100 : 0;

    // Aggregate page views
    const pageMap = new Map<string, number>();
    sessions.forEach(s => {
      if ((s as any).landingPage) {
        pageMap.set((s as any).landingPage, (pageMap.get((s as any).landingPage) || 0) + 1);
      }
    });

    const topPages = Array.from(pageMap.entries())
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Device and browser breakdown
    const deviceBreakdown: Record<string, number> = {};
    const browserBreakdown: Record<string, number> = {};
    const sourceBreakdown: Record<string, number> = {};

    sessions.forEach(s => {
      if ((s as any).device) {
        deviceBreakdown[(s as any).device] = (deviceBreakdown[(s as any).device] || 0) + 1;
      }
      if ((s as any).browser) {
        browserBreakdown[(s as any).browser] = (browserBreakdown[(s as any).browser] || 0) + 1;
      }
      if (s.source) {
        sourceBreakdown[s.source] = (sourceBreakdown[s.source] || 0) + 1;
      }
    });

    return {
      totalSessions,
      activeSessions,
      avgDuration,
      avgPageViews,
      bounceRate,
      conversionRate,
      topPages,
      deviceBreakdown,
      browserBreakdown,
      sourceBreakdown
    };
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - 30);

    // Find expired sessions in database
    const expiredSessions = await this.sessionRepo.find({
      where: {
        lastActivity: cutoffTime as any
      }
    });

    // End each expired session
    for (const session of expiredSessions) {
      await this.endSession(session.sessionId);
    }

    return expiredSessions.length;
  }

  // Helper methods

  private async storeSession(session: SessionData): Promise<void> {
    const cacheKey = `session:${session.sessionId}`;
    const indexKey = `session:${session.sessionId}:${session.partnerUserId}`;
    
    await this.redisService.set(
      cacheKey,
      JSON.stringify(session),
      this.SESSION_TIMEOUT
    );

    // Store index for partner lookup
    await this.redisService.set(indexKey, '1', this.SESSION_TIMEOUT);
  }

  private async removeSession(sessionId: string): Promise<void> {
    const cacheKey = `session:${sessionId}`;
    await this.redisService.del(cacheKey);

    // Remove index keys
    const indexKeys = await (this.redisService as any).keys(`session:${sessionId}:*`);
    if (indexKeys.length > 0) {
      await Promise.all(indexKeys.map(key => this.redisService.del(key)));
    }
  }

  private async extendSession(sessionId: string): Promise<void> {
    const cacheKey = `session:${sessionId}`;
    await this.redisService.expire(cacheKey, this.SESSION_TIMEOUT);

    // Extend index keys
    const indexKeys = await (this.redisService as any).keys(`session:${sessionId}:*`);
    await Promise.all(
      indexKeys.map(key => this.redisService.expire(key, this.SESSION_TIMEOUT))
    );
  }

  private async syncToDatabase(session: SessionData): Promise<void> {
    await this.sessionRepo.update(
      { sessionId: session.sessionId },
      {
        lastActivity: session.lastActivity,
        pageViews: (session.pageViews as any).length,
        events: session.events
      }
    );
  }

  private detectDevice(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    if (/bot/i.test(userAgent)) return 'bot';
    
    return 'desktop';
  }

  private detectBrowser(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    
    if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) return 'chrome';
    if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return 'safari';
    if (/firefox/i.test(userAgent)) return 'firefox';
    if (/edge/i.test(userAgent)) return 'edge';
    if (/bot/i.test(userAgent)) return 'bot';
    
    return 'other';
  }

  /**
   * Get real-time session feed
   */
  async getRealtimeSessionFeed(limit: number = 10): Promise<any[]> {
    const keys = await (this.redisService as any).keys('session:*');
    const sessions: SessionData[] = [];

    for (const key of keys.slice(0, limit)) {
      if (!key.includes(':')) continue;
      
      const data = await this.redisService.get(key);
      if (data) {
        sessions.push(JSON.parse(data));
      }
    }

    return sessions
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
      .slice(0, limit)
      .map(s => ({
        sessionId: s.sessionId,
        partnerUserId: s.partnerUserId,
        device: s.device,
        browser: s.browser,
        country: s.country,
        pageViews: s.pageViews.length,
        duration: Math.round(
          (new Date().getTime() - new Date(s.startTime).getTime()) / 1000
        ),
        lastActivity: s.lastActivity
      }));
  }
}