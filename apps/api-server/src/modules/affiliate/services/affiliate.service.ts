import { AffiliateRepository } from '../repositories/affiliate.repository';
import { 
  generateReferralCode, 
  generateAffiliateLink, 
  calculateCommission,
  generateSessionId,
  createTrackingCookie,
  parseTrackingCookie,
  isTrackingCookieExpired,
  sanitizeIpAddress,
  parseUserAgent
} from '../utils/affiliate.utils';
import {
  CreateAffiliateDto,
  CreateAffiliateLinkDto,
  TrackClickDto,
  TrackConversionDto,
  GetAffiliateStatsDto
} from '../dto/create-affiliate.dto';
import {
  AffiliateUserResponse,
  AffiliateLinkResponse,
  ClickTrackingResponse,
  ConversionTrackingResponse,
  AffiliateStatsResponse
} from '../dto/response.dto';
import { RedisService } from '../../../services/redis.service';

export class AffiliateService {
  private repository: AffiliateRepository;
  private redisService: RedisService;

  constructor() {
    this.repository = new AffiliateRepository();
    this.redisService = RedisService.getInstance();
  }

  /**
   * Create a new affiliate user
   */
  async createAffiliateUser(data: CreateAffiliateDto): Promise<AffiliateUserResponse> {
    // Check if user already has an affiliate account
    const existing = await this.repository.findAffiliateUserByUserId(data.userId);
    if (existing) {
      throw new Error('User already has an affiliate account');
    }

    // Generate unique referral code
    let referralCode: string;
    let attempts = 0;
    do {
      referralCode = generateReferralCode();
      const exists = await this.repository.findAffiliateUserByReferralCode(referralCode);
      if (!exists) break;
      attempts++;
    } while (attempts < 5);

    if (attempts >= 5) {
      throw new Error('Failed to generate unique referral code');
    }

    // Create affiliate user
    const affiliateUser = await this.repository.createAffiliateUser({
      userId: data.userId,
      referralCode,
      commissionRate: data.commissionRate || 10,
      websiteUrl: data.websiteUrl,
      description: data.description,
      metadata: data.metadata,
      status: 'active'
    });

    // Cache the affiliate user data
    await this.cacheAffiliateUser(affiliateUser);

    return this.formatAffiliateUserResponse(affiliateUser);
  }

  /**
   * Get affiliate user by userId or referralCode
   */
  async getAffiliateUser(userId?: string, referralCode?: string): Promise<AffiliateUserResponse | null> {
    let affiliateUser = null;

    if (userId) {
      // Try cache first
      const cached = await this.getCachedAffiliateUser(userId);
      if (cached) return cached;

      affiliateUser = await this.repository.findAffiliateUserByUserId(userId);
    } else if (referralCode) {
      // Try cache first
      const cached = await this.getCachedAffiliateUserByCode(referralCode);
      if (cached) return cached;

      affiliateUser = await this.repository.findAffiliateUserByReferralCode(referralCode);
    }

    if (!affiliateUser) {
      return null;
    }

    // Cache the result
    await this.cacheAffiliateUser(affiliateUser);

    return this.formatAffiliateUserResponse(affiliateUser);
  }

  /**
   * Generate affiliate link
   */
  async generateAffiliateLink(data: CreateAffiliateLinkDto): Promise<AffiliateLinkResponse> {
    const affiliateUser = await this.repository.findAffiliateUserById(data.affiliateUserId);
    if (!affiliateUser) {
      throw new Error('Affiliate user not found');
    }

    const trackingParams = {
      source: data.source,
      medium: data.medium,
      campaign: data.campaign,
      ...data.customParams
    };

    const fullUrl = generateAffiliateLink(
      data.landingUrl,
      affiliateUser.referralCode,
      trackingParams
    );

    return {
      fullUrl,
      referralCode: affiliateUser.referralCode,
      landingUrl: data.landingUrl,
      trackingParams,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Track click
   */
  async trackClick(data: TrackClickDto): Promise<ClickTrackingResponse> {
    // Find affiliate user by referral code
    const affiliateUser = await this.repository.findAffiliateUserByReferralCode(data.referralCode);
    if (!affiliateUser || affiliateUser.status !== 'active') {
      throw new Error('Invalid or inactive referral code');
    }

    // Check for duplicate click (same session)
    const existingClick = await this.repository.findClickBySessionId(data.sessionId);
    if (existingClick) {
      return {
        success: true,
        clickId: existingClick.id,
        sessionId: data.sessionId,
        message: 'Click already tracked for this session'
      };
    }

    // Parse user agent
    const deviceInfo = parseUserAgent(data.userAgent || '');

    // Create click record
    const click = await this.repository.createClick({
      affiliateUserId: affiliateUser.id,
      sessionId: data.sessionId,
      ipAddress: sanitizeIpAddress(data.ipAddress),
      userAgent: data.userAgent,
      referrerUrl: data.referrerUrl,
      landingUrl: data.landingUrl,
      device: data.device || deviceInfo.device,
      browser: data.browser || deviceInfo.browser,
      os: data.os || deviceInfo.os,
      country: data.country,
      city: data.city,
      metadata: data.metadata
    });

    // Update affiliate user stats
    await this.repository.incrementAffiliateStats(affiliateUser.id, 'totalClicks');

    // Cache session data for conversion tracking
    await this.cacheSessionData(data.sessionId, {
      affiliateUserId: affiliateUser.id,
      referralCode: data.referralCode,
      clickId: click.id,
      timestamp: Date.now()
    });

    return {
      success: true,
      clickId: click.id,
      sessionId: data.sessionId,
      message: 'Click tracked successfully'
    };
  }

  /**
   * Track conversion
   */
  async trackConversion(data: TrackConversionDto): Promise<ConversionTrackingResponse> {
    // Get session data from cache
    const sessionData = await this.getCachedSessionData(data.sessionId);
    if (!sessionData) {
      throw new Error('No affiliate session found for this conversion');
    }

    // Check if session is expired (30 days)
    if (isTrackingCookieExpired(sessionData.timestamp)) {
      throw new Error('Affiliate session has expired');
    }

    // Get affiliate user
    const affiliateUser = await this.repository.findAffiliateUserById(sessionData.affiliateUserId);
    if (!affiliateUser || affiliateUser.status !== 'active') {
      throw new Error('Invalid or inactive affiliate user');
    }

    // Check for duplicate conversion
    if (data.orderId) {
      const existingConversion = await this.repository.findConversionByOrderId(data.orderId);
      if (existingConversion) {
        return {
          success: false,
          conversionId: existingConversion.id,
          commissionAmount: existingConversion.commissionAmount,
          status: existingConversion.status,
          message: 'Conversion already tracked for this order'
        };
      }
    }

    // Calculate commission
    const commissionAmount = calculateCommission(data.orderAmount, affiliateUser.commissionRate);

    // Create conversion record
    const conversion = await this.repository.createConversion({
      affiliateUserId: affiliateUser.id,
      customerId: data.customerId,
      orderId: data.orderId,
      sessionId: data.sessionId,
      conversionType: data.conversionType || 'sale',
      orderAmount: data.orderAmount,
      commissionAmount,
      commissionRate: affiliateUser.commissionRate,
      status: 'pending',
      ipAddress: data.ipAddress ? sanitizeIpAddress(data.ipAddress) : undefined,
      userAgent: data.userAgent,
      metadata: data.metadata
    });

    // Update affiliate user stats and earnings
    await Promise.all([
      this.repository.incrementAffiliateStats(affiliateUser.id, 'totalConversions'),
      this.repository.updateAffiliateEarnings(affiliateUser.id, commissionAmount, 'pending')
    ]);

    // Mark click as converted if exists
    if (sessionData.clickId) {
      await this.repository.markClickAsConverted(sessionData.clickId);
    }

    // Clear session cache after successful conversion
    await this.clearSessionCache(data.sessionId);

    return {
      success: true,
      conversionId: conversion.id,
      commissionAmount,
      status: 'pending',
      message: 'Conversion tracked successfully'
    };
  }

  /**
   * Get affiliate statistics
   */
  async getAffiliateStats(params: GetAffiliateStatsDto): Promise<AffiliateStatsResponse> {
    const { affiliateUserId, startDate, endDate, groupBy } = params;

    // Get click and conversion stats
    const [clickStats, conversionStats, dailyStats] = await Promise.all([
      this.repository.getClickStats(affiliateUserId, startDate, endDate),
      this.repository.getConversionStats(affiliateUserId, startDate, endDate),
      groupBy ? this.repository.getDailyStats(affiliateUserId, startDate, endDate) : []
    ]);

    // Calculate conversion rate
    const conversionRate = clickStats.totalClicks > 0 
      ? (conversionStats.totalConversions / clickStats.totalClicks) * 100 
      : 0;

    return {
      period: {
        startDate: startDate?.toISOString() || 'all-time',
        endDate: endDate?.toISOString() || 'now'
      },
      summary: {
        totalClicks: clickStats.totalClicks,
        uniqueClicks: clickStats.uniqueClicks,
        totalConversions: conversionStats.totalConversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalRevenue: conversionStats.totalRevenue,
        totalCommission: conversionStats.totalCommission,
        pendingCommission: conversionStats.pendingCommission,
        paidCommission: conversionStats.paidCommission
      },
      daily: dailyStats
    };
  }

  // Cache helper methods
  private async cacheAffiliateUser(user: any): Promise<void> {
    const key = `affiliate:user:${user.userId}`;
    const codeKey = `affiliate:code:${user.referralCode}`;
    const ttl = 3600; // 1 hour

    await Promise.all([
      this.redisService.set(key, JSON.stringify(user), ttl),
      this.redisService.set(codeKey, JSON.stringify(user), ttl)
    ]);
  }

  private async getCachedAffiliateUser(userId: string): Promise<AffiliateUserResponse | null> {
    const key = `affiliate:user:${userId}`;
    const cached = await this.redisService.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async getCachedAffiliateUserByCode(code: string): Promise<AffiliateUserResponse | null> {
    const key = `affiliate:code:${code}`;
    const cached = await this.redisService.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async cacheSessionData(sessionId: string, data: any): Promise<void> {
    const key = `affiliate:session:${sessionId}`;
    const ttl = 30 * 24 * 3600; // 30 days
    await this.redisService.set(key, JSON.stringify(data), ttl);
  }

  private async getCachedSessionData(sessionId: string): Promise<any> {
    const key = `affiliate:session:${sessionId}`;
    const cached = await this.redisService.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async clearSessionCache(sessionId: string): Promise<void> {
    const key = `affiliate:session:${sessionId}`;
    await this.redisService.del(key);
  }

  private formatAffiliateUserResponse(user: any): AffiliateUserResponse {
    return {
      id: user.id,
      userId: user.userId,
      referralCode: user.referralCode,
      status: user.status,
      commissionRate: user.commissionRate,
      totalClicks: user.totalClicks,
      totalConversions: user.totalConversions,
      totalEarnings: user.totalEarnings,
      pendingEarnings: user.pendingEarnings,
      paidEarnings: user.paidEarnings,
      websiteUrl: user.websiteUrl,
      description: user.description,
      lastClickAt: user.lastClickAt,
      lastConversionAt: user.lastConversionAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}