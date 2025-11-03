import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { ReferralClick, ClickStatus, ClickSource } from '../entities/ReferralClick.js';
import { Partner, PartnerStatus } from '../entities/Partner.js';
import { Product } from '../entities/Product.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

export interface RecordClickRequest {
  referralCode: string;
  productId?: string;
  referralLink?: string;
  campaign?: string;
  medium?: string;
  source?: string;
  // Request metadata
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  sessionId?: string;
  fingerprint?: string;
}

export interface ClickFilters {
  partnerId?: string;
  referralCode?: string;
  status?: ClickStatus;
  dateFrom?: Date;
  dateTo?: Date;
  hasConverted?: boolean;
  sortBy?: 'createdAt' | 'convertedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BotDetectionResult {
  isBot: boolean;
  reason?: string;
}

export interface RateLimitResult {
  isLimited: boolean;
  resetAt?: Date;
}

export class TrackingService {
  private clickRepository: Repository<ReferralClick>;
  private partnerRepository: Repository<Partner>;
  private productRepository: Repository<Product>;

  // Rate limiting configuration (in-memory cache - for production use Redis)
  private clickCache: Map<string, { count: number; firstClickAt: Date }> = new Map();
  private readonly RATE_LIMIT_WINDOW_MINUTES = 5;
  private readonly RATE_LIMIT_MAX_CLICKS = 10;

  // Bot detection patterns
  private readonly BOT_USER_AGENTS = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python-requests',
    'java/', 'go-http-client', 'axios', 'okhttp', 'httpclient'
  ];

  // Internal IP ranges (example - customize per infrastructure)
  private readonly INTERNAL_IP_PATTERNS = [
    /^127\.0\.0\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^::1$/,
    /^fc00:/
  ];

  constructor() {
    this.clickRepository = AppDataSource.getRepository(ReferralClick);
    this.partnerRepository = AppDataSource.getRepository(Partner);
    this.productRepository = AppDataSource.getRepository(Product);
  }

  /**
   * Record a referral click with full filtering pipeline
   */
  async recordClick(data: RecordClickRequest): Promise<ReferralClick> {
    try {
      // 1. Validate partner exists and is active
      const partner = await this.partnerRepository.findOne({
        where: { referralCode: data.referralCode, isActive: true, status: PartnerStatus.ACTIVE }
      });

      if (!partner) {
        throw new Error('Invalid or inactive referral code');
      }

      // 2. Validate product if provided
      if (data.productId) {
        const product = await this.productRepository.findOne({
          where: { id: data.productId }
        });

        if (!product) {
          logger.warn(`Click recorded with invalid product ID: ${data.productId}`);
        }
      }

      // 3. Hash sensitive data for privacy
      const hashedSessionId = data.sessionId ? this.hashValue(data.sessionId) : undefined;
      const hashedFingerprint = data.fingerprint ? this.hashValue(data.fingerprint) : undefined;

      // 4. Bot detection
      const botCheck = this.detectBot(data.userAgent, data.ipAddress);

      // 5. Internal traffic detection
      const isInternal = this.isInternalTraffic(data.ipAddress);

      // 6. Rate limiting check
      const rateLimitCheck = this.checkRateLimit(
        hashedSessionId || hashedFingerprint || data.ipAddress || 'unknown',
        partner.id
      );

      // 7. Duplicate detection
      const duplicateCheck = await this.checkDuplicate(
        partner.id,
        hashedSessionId,
        hashedFingerprint,
        data.productId
      );

      // 8. Determine click status
      let status = ClickStatus.VALID;
      if (duplicateCheck.isDuplicate) {
        status = ClickStatus.DUPLICATE;
      } else if (botCheck.isBot) {
        status = ClickStatus.BOT;
      } else if (isInternal) {
        status = ClickStatus.INTERNAL;
      } else if (rateLimitCheck.isLimited) {
        status = ClickStatus.RATE_LIMITED;
      }

      // 9. Parse geolocation (city-level only for privacy)
      // Note: In production, use a geolocation service (MaxMind, IP2Location, etc.)
      const geoData = await this.getGeolocation(data.ipAddress);

      // 10. Parse user agent for device/browser info
      const uaData = this.parseUserAgent(data.userAgent);

      // 11. Anonymize IP address
      const anonymizedIp = this.anonymizeIpAddress(data.ipAddress);

      // 12. Create click record
      const click = this.clickRepository.create({
        partnerId: partner.id,
        productId: data.productId,
        referralCode: data.referralCode,
        referralLink: data.referralLink,
        campaign: data.campaign,
        medium: data.medium,
        source: data.source,
        status,
        clickSource: this.determineClickSource(data.referer, data.source),
        sessionId: hashedSessionId,
        fingerprint: hashedFingerprint,
        ipAddress: anonymizedIp,
        userAgent: data.userAgent?.substring(0, 500), // Truncate
        referer: data.referer?.substring(0, 500),
        country: geoData.country,
        city: geoData.city,
        deviceType: uaData.deviceType,
        osName: uaData.osName,
        browserName: uaData.browserName,
        isDuplicate: duplicateCheck.isDuplicate,
        originalClickId: duplicateCheck.originalClickId,
        clickCount: duplicateCheck.isDuplicate ? duplicateCheck.clickCount + 1 : 1,
        isSuspiciousBot: botCheck.isBot,
        botDetectionReason: botCheck.reason,
        isRateLimited: rateLimitCheck.isLimited
      });

      const savedClick = await this.clickRepository.save(click);

      // 13. Update partner stats (only for valid clicks)
      if (status === ClickStatus.VALID) {
        partner.totalClicks = (partner.totalClicks || 0) + 1;
        partner.lastActiveAt = new Date();
        await this.partnerRepository.save(partner);
      }

      logger.info(`Click recorded: ${savedClick.id} (status: ${status}, partner: ${partner.id})`);

      return savedClick;

    } catch (error) {
      logger.error('Error recording click:', error);
      throw error;
    }
  }

  /**
   * Bot detection based on user-agent and IP patterns
   */
  private detectBot(userAgent?: string, ipAddress?: string): BotDetectionResult {
    if (!userAgent) {
      return { isBot: true, reason: 'No user agent provided' };
    }

    const uaLower = userAgent.toLowerCase();

    // Check against bot user-agent patterns
    for (const pattern of this.BOT_USER_AGENTS) {
      if (uaLower.includes(pattern)) {
        return { isBot: true, reason: `Bot user-agent detected: ${pattern}` };
      }
    }

    // Check for suspiciously short user-agent
    if (userAgent.length < 20) {
      return { isBot: true, reason: 'User-agent too short' };
    }

    // Check for missing common browser indicators
    const hasCommonBrowser = /chrome|safari|firefox|edge|opera/i.test(userAgent);
    const hasMozilla = /mozilla/i.test(userAgent);

    if (!hasCommonBrowser && !hasMozilla) {
      return { isBot: true, reason: 'No common browser signature' };
    }

    return { isBot: false };
  }

  /**
   * Check if traffic is from internal network
   */
  private isInternalTraffic(ipAddress?: string): boolean {
    if (!ipAddress) {
      return false;
    }

    for (const pattern of this.INTERNAL_IP_PATTERNS) {
      if (pattern.test(ipAddress)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Rate limiting check (in-memory cache for demo - use Redis in production)
   */
  private checkRateLimit(identifier: string, partnerId: string): RateLimitResult {
    const cacheKey = `${partnerId}:${identifier}`;
    const now = new Date();

    const cached = this.clickCache.get(cacheKey);

    if (!cached) {
      // First click from this identifier
      this.clickCache.set(cacheKey, { count: 1, firstClickAt: now });
      return { isLimited: false };
    }

    const windowMs = this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
    const windowStart = new Date(now.getTime() - windowMs);

    // Check if window has expired
    if (cached.firstClickAt < windowStart) {
      // Reset counter
      this.clickCache.set(cacheKey, { count: 1, firstClickAt: now });
      return { isLimited: false };
    }

    // Increment counter
    cached.count += 1;

    if (cached.count > this.RATE_LIMIT_MAX_CLICKS) {
      const resetAt = new Date(cached.firstClickAt.getTime() + windowMs);
      return { isLimited: true, resetAt };
    }

    return { isLimited: false };
  }

  /**
   * Check for duplicate clicks based on session/fingerprint
   */
  private async checkDuplicate(
    partnerId: string,
    sessionId?: string,
    fingerprint?: string,
    productId?: string
  ): Promise<{ isDuplicate: boolean; originalClickId?: string; clickCount: number }> {

    if (!sessionId && !fingerprint) {
      return { isDuplicate: false, clickCount: 0 };
    }

    // Look for existing click within last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const queryBuilder = this.clickRepository
      .createQueryBuilder('click')
      .where('click.partnerId = :partnerId', { partnerId })
      .andWhere('click.createdAt > :since', { since: twentyFourHoursAgo })
      .orderBy('click.createdAt', 'ASC');

    // Match on session OR fingerprint
    if (sessionId && fingerprint) {
      queryBuilder.andWhere('(click.sessionId = :sessionId OR click.fingerprint = :fingerprint)', {
        sessionId,
        fingerprint
      });
    } else if (sessionId) {
      queryBuilder.andWhere('click.sessionId = :sessionId', { sessionId });
    } else if (fingerprint) {
      queryBuilder.andWhere('click.fingerprint = :fingerprint', { fingerprint });
    }

    // Match on product if provided
    if (productId) {
      queryBuilder.andWhere('click.productId = :productId', { productId });
    }

    const existingClick = await queryBuilder.getOne();

    if (existingClick) {
      return {
        isDuplicate: true,
        originalClickId: existingClick.id,
        clickCount: existingClick.clickCount
      };
    }

    return { isDuplicate: false, clickCount: 0 };
  }

  /**
   * Hash sensitive values for privacy
   */
  private hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex').substring(0, 64);
  }

  /**
   * Anonymize IP address (last octet for IPv4, last 80 bits for IPv6)
   */
  private anonymizeIpAddress(ipAddress?: string): string | undefined {
    if (!ipAddress) {
      return undefined;
    }

    // IPv4
    if (ipAddress.includes('.')) {
      const parts = ipAddress.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
      }
    }

    // IPv6
    if (ipAddress.includes(':')) {
      const parts = ipAddress.split(':');
      if (parts.length >= 4) {
        return parts.slice(0, 4).join(':') + '::';
      }
    }

    return ipAddress;
  }

  /**
   * Get geolocation from IP (city-level only)
   * Note: In production, integrate with MaxMind GeoIP2 or similar service
   */
  private async getGeolocation(ipAddress?: string): Promise<{ country?: string; city?: string }> {
    if (!ipAddress) {
      return {};
    }

    // Placeholder - integrate with actual geolocation service
    // Example: const geo = await geoip.lookup(ipAddress);

    return {
      country: undefined, // 2-letter country code (e.g., 'KR')
      city: undefined     // City name (e.g., 'Seoul')
    };
  }

  /**
   * Parse user agent for device/browser/OS info
   */
  private parseUserAgent(userAgent?: string): {
    deviceType?: string;
    osName?: string;
    browserName?: string;
  } {
    if (!userAgent) {
      return {};
    }

    const ua = userAgent.toLowerCase();

    let deviceType: string | undefined;
    let osName: string | undefined;
    let browserName: string | undefined;

    // Device type detection
    if (/mobile|android|iphone|ipad|tablet/i.test(userAgent)) {
      if (/tablet|ipad/i.test(userAgent)) {
        deviceType = 'tablet';
      } else {
        deviceType = 'mobile';
      }
    } else {
      deviceType = 'desktop';
    }

    // OS detection
    if (ua.includes('windows')) osName = 'Windows';
    else if (ua.includes('mac os')) osName = 'macOS';
    else if (ua.includes('linux')) osName = 'Linux';
    else if (ua.includes('android')) osName = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) osName = 'iOS';

    // Browser detection
    if (ua.includes('edg/')) browserName = 'Edge';
    else if (ua.includes('chrome')) browserName = 'Chrome';
    else if (ua.includes('safari')) browserName = 'Safari';
    else if (ua.includes('firefox')) browserName = 'Firefox';
    else if (ua.includes('opera') || ua.includes('opr/')) browserName = 'Opera';

    return { deviceType, osName, browserName };
  }

  /**
   * Determine click source (web, mobile, social, etc.)
   */
  private determineClickSource(referer?: string, source?: string): ClickSource {
    if (source) {
      const sourceLower = source.toLowerCase();
      // Map to actual ClickSource enum values
      if (sourceLower.includes('instagram') || sourceLower.includes('facebook') ||
          sourceLower.includes('twitter') || sourceLower.includes('social')) {
        return ClickSource.SOCIAL;
      }
      if (sourceLower.includes('email') || sourceLower.includes('mail')) {
        return ClickSource.EMAIL;
      }
      if (sourceLower.includes('app') || sourceLower.includes('mobile-app')) {
        return ClickSource.APP;
      }
      if (sourceLower.includes('mobile')) {
        return ClickSource.MOBILE;
      }
    }

    if (referer) {
      const refLower = referer.toLowerCase();
      if (refLower.includes('instagram.com') || refLower.includes('facebook.com') ||
          refLower.includes('twitter.com') || refLower.includes('t.co')) {
        return ClickSource.SOCIAL;
      }
    }

    // Default to WEB for standard web traffic
    return ClickSource.WEB;
  }

  /**
   * Get click by ID
   */
  async getClick(id: string): Promise<ReferralClick | null> {
    try {
      return await this.clickRepository.findOne({
        where: { id },
        relations: ['partner']
      });
    } catch (error) {
      logger.error('Error fetching click:', error);
      throw error;
    }
  }

  /**
   * Get clicks with filters
   */
  async getClicks(filters: ClickFilters = {}) {
    try {
      const {
        partnerId,
        referralCode,
        status,
        dateFrom,
        dateTo,
        hasConverted,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 50
      } = filters;

      const queryBuilder = this.clickRepository
        .createQueryBuilder('click')
        .leftJoinAndSelect('click.partner', 'partner');

      if (partnerId) {
        queryBuilder.andWhere('click.partnerId = :partnerId', { partnerId });
      }

      if (referralCode) {
        queryBuilder.andWhere('click.referralCode = :referralCode', { referralCode });
      }

      if (status) {
        queryBuilder.andWhere('click.status = :status', { status });
      }

      if (dateFrom) {
        queryBuilder.andWhere('click.createdAt >= :dateFrom', { dateFrom });
      }

      if (dateTo) {
        queryBuilder.andWhere('click.createdAt <= :dateTo', { dateTo });
      }

      if (hasConverted !== undefined) {
        queryBuilder.andWhere('click.hasConverted = :hasConverted', { hasConverted });
      }

      const sortField = `click.${sortBy}`;
      queryBuilder.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');

      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [clicks, total] = await queryBuilder.getManyAndCount();

      return {
        clicks,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      logger.error('Error fetching clicks:', error);
      throw error;
    }
  }

  /**
   * Mark click as converted
   */
  async markAsConverted(clickId: string, conversionId: string): Promise<ReferralClick> {
    try {
      const click = await this.clickRepository.findOne({
        where: { id: clickId }
      });

      if (!click) {
        throw new Error('Click not found');
      }

      click.hasConverted = true;
      click.conversionId = conversionId;
      click.convertedAt = new Date();

      const updated = await this.clickRepository.save(click);

      logger.info(`Click marked as converted: ${clickId} -> conversion ${conversionId}`);

      return updated;

    } catch (error) {
      logger.error('Error marking click as converted:', error);
      throw error;
    }
  }

  /**
   * Anonymize old clicks (GDPR compliance)
   * Run this periodically (e.g., daily cron job)
   */
  async anonymizeOldClicks(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const oldClicks = await this.clickRepository
        .createQueryBuilder('click')
        .where('click.createdAt < :cutoffDate', { cutoffDate })
        .andWhere('click.anonymizedAt IS NULL')
        .getMany();

      for (const click of oldClicks) {
        click.anonymize();
      }

      await this.clickRepository.save(oldClicks);

      logger.info(`Anonymized ${oldClicks.length} clicks older than ${retentionDays} days`);

      return oldClicks.length;

    } catch (error) {
      logger.error('Error anonymizing old clicks:', error);
      throw error;
    }
  }

  /**
   * Get click stats for partner
   */
  async getClickStats(partnerId: string, dateFrom?: Date, dateTo?: Date) {
    try {
      const queryBuilder = this.clickRepository
        .createQueryBuilder('click')
        .select([
          'COUNT(*) as totalClicks',
          'COUNT(CASE WHEN click.status = :valid THEN 1 END) as validClicks',
          'COUNT(CASE WHEN click.status = :duplicate THEN 1 END) as duplicateClicks',
          'COUNT(CASE WHEN click.status = :bot THEN 1 END) as botClicks',
          'COUNT(CASE WHEN click.status = :internal THEN 1 END) as internalClicks',
          'COUNT(CASE WHEN click.status = :rateLimited THEN 1 END) as rateLimitedClicks',
          'COUNT(CASE WHEN click.hasConverted = true THEN 1 END) as convertedClicks',
          'COUNT(DISTINCT click.productId) as uniqueProducts',
          'COUNT(DISTINCT click.country) as uniqueCountries'
        ])
        .where('click.partnerId = :partnerId', { partnerId })
        .setParameters({
          valid: ClickStatus.VALID,
          duplicate: ClickStatus.DUPLICATE,
          bot: ClickStatus.BOT,
          internal: ClickStatus.INTERNAL,
          rateLimited: ClickStatus.RATE_LIMITED
        });

      if (dateFrom) {
        queryBuilder.andWhere('click.createdAt >= :dateFrom', { dateFrom });
      }

      if (dateTo) {
        queryBuilder.andWhere('click.createdAt <= :dateTo', { dateTo });
      }

      const stats = await queryBuilder.getRawOne();

      const totalClicks = parseInt(stats.totalClicks) || 0;
      const validClicks = parseInt(stats.validClicks) || 0;
      const convertedClicks = parseInt(stats.convertedClicks) || 0;

      const conversionRate = validClicks > 0 ? (convertedClicks / validClicks) * 100 : 0;

      return {
        totalClicks,
        validClicks,
        duplicateClicks: parseInt(stats.duplicateClicks) || 0,
        botClicks: parseInt(stats.botClicks) || 0,
        internalClicks: parseInt(stats.internalClicks) || 0,
        rateLimitedClicks: parseInt(stats.rateLimitedClicks) || 0,
        convertedClicks,
        uniqueProducts: parseInt(stats.uniqueProducts) || 0,
        uniqueCountries: parseInt(stats.uniqueCountries) || 0,
        conversionRate: Math.round(conversionRate * 100) / 100,
        period: { from: dateFrom, to: dateTo }
      };

    } catch (error) {
      logger.error('Error fetching click stats:', error);
      throw error;
    }
  }
}

export default TrackingService;
