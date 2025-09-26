import { PartnerRepository } from '../repositories/partner.repository';
import { 
  generateReferralCode, 
  generatePartnerLink, 
  calculateCommission,
  generateSessionId,
  createTrackingCookie,
  parseTrackingCookie,
  isTrackingCookieExpired,
  sanitizeIpAddress,
  parseUserAgent
} from '../utils/partner.utils';
import {
  CreatePartnerDto,
  CreatePartnerLinkDto,
  TrackClickDto,
  TrackConversionDto,
  GetPartnerStatsDto
} from '../dto/create-partner.dto';
import {
  PartnerUserResponse,
  PartnerLinkResponse,
  ClickTrackingResponse,
  ConversionTrackingResponse,
  PartnerStatsResponse
} from '../dto/response.dto';
import { RedisService } from '../../../services/redis.service';

export class PartnerService {
  private repository: PartnerRepository;
  private redisService: RedisService;

  constructor() {
    this.repository = new PartnerRepository();
    this.redisService = RedisService.getInstance();
  }

  /**
   * Create a new partner user
   */
  async createPartnerUser(data: CreatePartnerDto): Promise<PartnerUserResponse> {
    // Check if user already has an partner account
    const existing = await this.repository.findPartnerUserByUserId(data.userId);
    if (existing) {
      throw new Error('User already has an partner account');
    }

    // Generate unique referral code
    let referralCode: string;
    let attempts = 0;
    do {
      referralCode = generateReferralCode();
      const exists = await this.repository.findPartnerUserByReferralCode(referralCode);
      if (!exists) break;
      attempts++;
    } while (attempts < 5);

    if (attempts >= 5) {
      throw new Error('Failed to generate unique referral code');
    }

    // Create partner user
    const partnerUser = await this.repository.createPartnerUser({
      userId: data.userId,
      referralCode,
      commissionRate: data.commissionRate || 10,
      websiteUrl: data.websiteUrl,
      description: data.description,
      metadata: data.metadata,
      status: 'active'
    });

    // Cache the partner user data
    await this.cachePartnerUser(partnerUser);

    return this.formatPartnerUserResponse(partnerUser);
  }

  /**
   * Get partner user by userId or referralCode
   */
  async getPartnerUser(userId?: string, referralCode?: string): Promise<PartnerUserResponse | null> {
    let partnerUser = null;

    if (userId) {
      // Try cache first
      const cached = await this.getCachedPartnerUser(userId);
      if (cached) return cached;

      partnerUser = await this.repository.findPartnerUserByUserId(userId);
    } else if (referralCode) {
      // Try cache first
      const cached = await this.getCachedPartnerUserByCode(referralCode);
      if (cached) return cached;

      partnerUser = await this.repository.findPartnerUserByReferralCode(referralCode);
    }

    if (!partnerUser) {
      return null;
    }

    // Cache the result
    await this.cachePartnerUser(partnerUser);

    return this.formatPartnerUserResponse(partnerUser);
  }

  /**
   * Generate partner link
   */
  async generatePartnerLink(data: CreatePartnerLinkDto): Promise<PartnerLinkResponse> {
    const partnerUser = await this.repository.findPartnerUserById(data.partnerUserId);
    if (!partnerUser) {
      throw new Error('Partner user not found');
    }

    const trackingParams = {
      source: data.source,
      medium: data.medium,
      campaign: data.campaign,
      ...data.customParams
    };

    const fullUrl = generatePartnerLink(
      data.landingUrl,
      partnerUser.referralCode,
      trackingParams
    );

    return {
      fullUrl,
      referralCode: partnerUser.referralCode,
      landingUrl: data.landingUrl,
      trackingParams,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Track click
   */
  async trackClick(data: TrackClickDto): Promise<ClickTrackingResponse> {
    // Find partner user by referral code
    const partnerUser = await this.repository.findPartnerUserByReferralCode(data.referralCode);
    if (!partnerUser || partnerUser.status !== 'active') {
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
      partnerUserId: partnerUser.id,
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

    // Update partner user stats
    await this.repository.incrementPartnerStats(partnerUser.id, 'totalClicks');

    // Cache session data for conversion tracking
    await this.cacheSessionData(data.sessionId, {
      partnerUserId: partnerUser.id,
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
      throw new Error('No partner session found for this conversion');
    }

    // Check if session is expired (30 days)
    if (isTrackingCookieExpired(sessionData.timestamp)) {
      throw new Error('Partner session has expired');
    }

    // Get partner user
    const partnerUser = await this.repository.findPartnerUserById(sessionData.partnerUserId);
    if (!partnerUser || partnerUser.status !== 'active') {
      throw new Error('Invalid or inactive partner user');
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
    const commissionAmount = calculateCommission(data.orderAmount, partnerUser.commissionRate);

    // Create conversion record
    const conversion = await this.repository.createConversion({
      partnerUserId: partnerUser.id,
      customerId: data.customerId,
      orderId: data.orderId,
      sessionId: data.sessionId,
      conversionType: data.conversionType || 'sale',
      orderAmount: data.orderAmount,
      commissionAmount,
      commissionRate: partnerUser.commissionRate,
      status: 'pending',
      ipAddress: data.ipAddress ? sanitizeIpAddress(data.ipAddress) : undefined,
      userAgent: data.userAgent,
      metadata: data.metadata
    });

    // Update partner user stats and earnings
    await Promise.all([
      this.repository.incrementPartnerStats(partnerUser.id, 'totalConversions'),
      this.repository.updatePartnerEarnings(partnerUser.id, commissionAmount, 'pending')
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
   * Get partner statistics
   */
  async getPartnerStats(params: GetPartnerStatsDto): Promise<PartnerStatsResponse> {
    const { partnerUserId, startDate, endDate, groupBy } = params;

    // Get click and conversion stats
    const [clickStats, conversionStats, dailyStats] = await Promise.all([
      this.repository.getClickStats(partnerUserId, startDate, endDate),
      this.repository.getConversionStats(partnerUserId, startDate, endDate),
      groupBy ? this.repository.getDailyStats(partnerUserId, startDate, endDate) : []
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
  private async cachePartnerUser(user: any): Promise<void> {
    const key = `partner:user:${user.userId}`;
    const codeKey = `partner:code:${user.referralCode}`;
    const ttl = 3600; // 1 hour

    await Promise.all([
      this.redisService.set(key, JSON.stringify(user), ttl),
      this.redisService.set(codeKey, JSON.stringify(user), ttl)
    ]);
  }

  private async getCachedPartnerUser(userId: string): Promise<PartnerUserResponse | null> {
    const key = `partner:user:${userId}`;
    const cached = await this.redisService.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async getCachedPartnerUserByCode(code: string): Promise<PartnerUserResponse | null> {
    const key = `partner:code:${code}`;
    const cached = await this.redisService.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async cacheSessionData(sessionId: string, data: any): Promise<void> {
    const key = `partner:session:${sessionId}`;
    const ttl = 30 * 24 * 3600; // 30 days
    await this.redisService.set(key, JSON.stringify(data), ttl);
  }

  private async getCachedSessionData(sessionId: string): Promise<any> {
    const key = `partner:session:${sessionId}`;
    const cached = await this.redisService.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async clearSessionCache(sessionId: string): Promise<void> {
    const key = `partner:session:${sessionId}`;
    await this.redisService.del(key);
  }

  private formatPartnerUserResponse(user: any): PartnerUserResponse {
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