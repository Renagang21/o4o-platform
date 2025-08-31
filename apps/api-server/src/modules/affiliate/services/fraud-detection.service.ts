import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection';
import { AffiliateClick } from '../../../entities/affiliate/AffiliateClick';
import { AffiliateConversion } from '../../../entities/affiliate/AffiliateConversion';
import { AffiliateSession } from '../../../entities/affiliate/AffiliateSession';
import { RedisService } from '../../../services/redis.service';
import { NotificationService } from './notification.service';

export interface FraudIndicator {
  type: 'click_flooding' | 'rapid_conversion' | 'ip_pattern' | 'device_mismatch' | 
        'geo_anomaly' | 'conversion_pattern' | 'referrer_spam' | 'bot_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  details: any;
}

export interface FraudAnalysisResult {
  affiliateUserId: string;
  riskScore: number;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  indicators: FraudIndicator[];
  recommendation: 'allow' | 'review' | 'block';
  timestamp: Date;
}

export class FraudDetectionService {
  private clickRepo: Repository<AffiliateClick>;
  private conversionRepo: Repository<AffiliateConversion>;
  private sessionRepo: Repository<AffiliateSession>;
  private redisService: RedisService;
  private notificationService: NotificationService;

  // Fraud detection thresholds
  private readonly THRESHOLDS = {
    MAX_CLICKS_PER_MINUTE: 10,
    MAX_CLICKS_PER_IP_HOUR: 50,
    MIN_TIME_TO_CONVERSION: 30, // seconds
    MAX_CONVERSION_RATE: 50, // percentage
    SUSPICIOUS_USER_AGENTS: [
      'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python'
    ],
    BLOCKED_COUNTRIES: [], // Add countries if needed
    MAX_SAME_IP_CONVERSIONS: 3,
    SUSPICIOUS_REFERRERS: ['spam', 'bot', 'test']
  };

  constructor() {
    this.clickRepo = AppDataSource.getRepository(AffiliateClick);
    this.conversionRepo = AppDataSource.getRepository(AffiliateConversion);
    this.sessionRepo = AppDataSource.getRepository(AffiliateSession);
    this.redisService = RedisService.getInstance();
    this.notificationService = new NotificationService();
  }

  /**
   * Analyze click for fraud patterns
   */
  async analyzeClick(clickData: {
    affiliateUserId: string;
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    referrerUrl?: string;
    device?: string;
    country?: string;
  }): Promise<FraudAnalysisResult> {
    const indicators: FraudIndicator[] = [];
    let totalScore = 0;

    // Check click flooding
    const clickFloodScore = await this.checkClickFlooding(clickData.affiliateUserId, clickData.ipAddress);
    if (clickFloodScore > 0) {
      indicators.push(clickFloodScore);
      totalScore += clickFloodScore.score;
    }

    // Check IP patterns
    const ipPatternScore = await this.checkIPPatterns(clickData.ipAddress, clickData.affiliateUserId);
    if (ipPatternScore > 0) {
      indicators.push(ipPatternScore);
      totalScore += ipPatternScore.score;
    }

    // Check bot activity
    const botScore = this.checkBotActivity(clickData.userAgent);
    if (botScore > 0) {
      indicators.push(botScore);
      totalScore += botScore.score;
    }

    // Check referrer spam
    if (clickData.referrerUrl) {
      const referrerScore = this.checkReferrerSpam(clickData.referrerUrl);
      if (referrerScore > 0) {
        indicators.push(referrerScore);
        totalScore += referrerScore.score;
      }
    }

    // Check geo anomalies
    if (clickData.country) {
      const geoScore = await this.checkGeoAnomalies(clickData.affiliateUserId, clickData.country);
      if (geoScore > 0) {
        indicators.push(geoScore);
        totalScore += geoScore.score;
      }
    }

    // Determine risk level and recommendation
    const { riskLevel, recommendation } = this.calculateRiskLevel(totalScore);

    const result: FraudAnalysisResult = {
      affiliateUserId: clickData.affiliateUserId,
      riskScore: totalScore,
      riskLevel,
      indicators,
      recommendation,
      timestamp: new Date()
    };

    // Store analysis result
    await this.storeAnalysisResult(result);

    // Take action based on recommendation
    if (recommendation === 'block') {
      await this.blockAffiliate(clickData.affiliateUserId, result);
    } else if (recommendation === 'review') {
      await this.flagForReview(clickData.affiliateUserId, result);
    }

    return result;
  }

  /**
   * Analyze conversion for fraud patterns
   */
  async analyzeConversion(conversionData: {
    affiliateUserId: string;
    sessionId: string;
    orderId: string;
    amount: number;
    ipAddress?: string;
    timeFromClick?: number;
  }): Promise<FraudAnalysisResult> {
    const indicators: FraudIndicator[] = [];
    let totalScore = 0;

    // Check rapid conversion
    if (conversionData.timeFromClick) {
      const rapidScore = this.checkRapidConversion(conversionData.timeFromClick);
      if (rapidScore > 0) {
        indicators.push(rapidScore);
        totalScore += rapidScore.score;
      }
    }

    // Check conversion patterns
    const patternScore = await this.checkConversionPatterns(
      conversionData.affiliateUserId,
      conversionData.amount
    );
    if (patternScore > 0) {
      indicators.push(patternScore);
      totalScore += patternScore.score;
    }

    // Check IP-based conversions
    if (conversionData.ipAddress) {
      const ipConversionScore = await this.checkIPConversions(
        conversionData.ipAddress,
        conversionData.affiliateUserId
      );
      if (ipConversionScore > 0) {
        indicators.push(ipConversionScore);
        totalScore += ipConversionScore.score;
      }
    }

    // Check device consistency
    const deviceScore = await this.checkDeviceConsistency(conversionData.sessionId);
    if (deviceScore > 0) {
      indicators.push(deviceScore);
      totalScore += deviceScore.score;
    }

    const { riskLevel, recommendation } = this.calculateRiskLevel(totalScore);

    const result: FraudAnalysisResult = {
      affiliateUserId: conversionData.affiliateUserId,
      riskScore: totalScore,
      riskLevel,
      indicators,
      recommendation,
      timestamp: new Date()
    };

    await this.storeAnalysisResult(result);

    if (recommendation === 'block' || recommendation === 'review') {
      await this.flagConversion(conversionData.orderId, result);
    }

    return result;
  }

  /**
   * Perform comprehensive fraud analysis for an affiliate
   */
  async performComprehensiveAnalysis(affiliateUserId: string): Promise<{
    overallRisk: FraudAnalysisResult;
    historicalPatterns: any;
    recommendations: string[];
  }> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 86400000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);

    // Get recent data
    const [recentClicks, recentConversions, recentSessions] = await Promise.all([
      this.clickRepo.find({
        where: { 
          affiliateUserId,
          createdAt: Between(oneDayAgo, now)
        }
      }),
      this.conversionRepo.find({
        where: {
          affiliateUserId,
          createdAt: Between(oneWeekAgo, now)
        }
      }),
      this.sessionRepo.find({
        where: {
          affiliateUserId,
          startedAt: Between(oneDayAgo, now)
        }
      })
    ]);

    // Analyze patterns
    const patterns = {
      clickPatterns: this.analyzeClickPatterns(recentClicks),
      conversionPatterns: this.analyzeConversionPatterns(recentConversions),
      sessionPatterns: this.analyzeSessionPatterns(recentSessions),
      velocityAnalysis: await this.analyzeVelocity(affiliateUserId),
      anomalyScore: await this.calculateAnomalyScore(affiliateUserId)
    };

    // Calculate overall risk
    const indicators: FraudIndicator[] = [];
    let totalScore = 0;

    // Add pattern-based indicators
    if (patterns.clickPatterns.suspicious) {
      indicators.push({
        type: 'click_flooding',
        severity: 'high',
        score: 30,
        details: patterns.clickPatterns
      });
      totalScore += 30;
    }

    if (patterns.conversionPatterns.suspicious) {
      indicators.push({
        type: 'conversion_pattern',
        severity: 'high',
        score: 40,
        details: patterns.conversionPatterns
      });
      totalScore += 40;
    }

    if (patterns.anomalyScore > 50) {
      indicators.push({
        type: 'bot_activity',
        severity: 'critical',
        score: patterns.anomalyScore,
        details: { anomalyScore: patterns.anomalyScore }
      });
      totalScore += patterns.anomalyScore;
    }

    const { riskLevel, recommendation } = this.calculateRiskLevel(totalScore);

    const overallRisk: FraudAnalysisResult = {
      affiliateUserId,
      riskScore: totalScore,
      riskLevel,
      indicators,
      recommendation,
      timestamp: now
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(overallRisk, patterns);

    return {
      overallRisk,
      historicalPatterns: patterns,
      recommendations
    };
  }

  // Private helper methods

  private async checkClickFlooding(affiliateUserId: string, ipAddress: string): Promise<FraudIndicator> {
    const key = `fraud:clicks:${affiliateUserId}:${ipAddress}`;
    const recentClicks = await this.redisService.get(key);
    const clickCount = parseInt(recentClicks || '0');

    // Increment counter
    await this.redisService.incr(key);
    await this.redisService.expire(key, 60); // 1 minute window

    if (clickCount > this.THRESHOLDS.MAX_CLICKS_PER_MINUTE) {
      return {
        type: 'click_flooding',
        severity: 'high',
        score: 40,
        details: { clickCount, threshold: this.THRESHOLDS.MAX_CLICKS_PER_MINUTE }
      };
    }

    return null as any;
  }

  private async checkIPPatterns(ipAddress: string, affiliateUserId: string): Promise<FraudIndicator> {
    const hourKey = `fraud:ip:hour:${ipAddress}`;
    const hourlyClicks = await this.redisService.get(hourKey);
    const hourCount = parseInt(hourlyClicks || '0');

    await this.redisService.incr(hourKey);
    await this.redisService.expire(hourKey, 3600);

    if (hourCount > this.THRESHOLDS.MAX_CLICKS_PER_IP_HOUR) {
      return {
        type: 'ip_pattern',
        severity: 'medium',
        score: 25,
        details: { hourlyClicks: hourCount, threshold: this.THRESHOLDS.MAX_CLICKS_PER_IP_HOUR }
      };
    }

    // Check for multiple affiliates using same IP
    const affiliateKey = `fraud:ip:affiliates:${ipAddress}`;
    await this.redisService.sadd(affiliateKey, affiliateUserId);
    await this.redisService.expire(affiliateKey, 86400);

    const affiliateCount = await this.redisService.scard(affiliateKey);
    if (affiliateCount > 3) {
      return {
        type: 'ip_pattern',
        severity: 'high',
        score: 35,
        details: { sharedIP: true, affiliateCount }
      };
    }

    return null as any;
  }

  private checkBotActivity(userAgent: string): FraudIndicator {
    const lowerUA = userAgent.toLowerCase();
    
    for (const pattern of this.THRESHOLDS.SUSPICIOUS_USER_AGENTS) {
      if (lowerUA.includes(pattern)) {
        return {
          type: 'bot_activity',
          severity: 'high',
          score: 50,
          details: { userAgent, pattern }
        };
      }
    }

    // Check for missing or too short user agent
    if (!userAgent || userAgent.length < 20) {
      return {
        type: 'bot_activity',
        severity: 'medium',
        score: 20,
        details: { userAgent, reason: 'Invalid user agent' }
      };
    }

    return null as any;
  }

  private checkReferrerSpam(referrerUrl: string): FraudIndicator {
    const lowerRef = referrerUrl.toLowerCase();
    
    for (const spam of this.THRESHOLDS.SUSPICIOUS_REFERRERS) {
      if (lowerRef.includes(spam)) {
        return {
          type: 'referrer_spam',
          severity: 'medium',
          score: 25,
          details: { referrer: referrerUrl, pattern: spam }
        };
      }
    }

    return null as any;
  }

  private async checkGeoAnomalies(affiliateUserId: string, country: string): Promise<FraudIndicator> {
    // Check blocked countries
    if (this.THRESHOLDS.BLOCKED_COUNTRIES.includes(country)) {
      return {
        type: 'geo_anomaly',
        severity: 'critical',
        score: 60,
        details: { country, reason: 'Blocked country' }
      };
    }

    // Check for rapid country changes
    const geoKey = `fraud:geo:${affiliateUserId}`;
    const recentCountries = await this.redisService.smembers(geoKey);
    
    await this.redisService.sadd(geoKey, country);
    await this.redisService.expire(geoKey, 3600); // 1 hour

    if (recentCountries.length > 3) {
      return {
        type: 'geo_anomaly',
        severity: 'high',
        score: 40,
        details: { countries: recentCountries, reason: 'Multiple countries in short time' }
      };
    }

    return null as any;
  }

  private checkRapidConversion(timeFromClick: number): FraudIndicator {
    if (timeFromClick < this.THRESHOLDS.MIN_TIME_TO_CONVERSION) {
      return {
        type: 'rapid_conversion',
        severity: 'high',
        score: 45,
        details: { 
          timeFromClick, 
          threshold: this.THRESHOLDS.MIN_TIME_TO_CONVERSION,
          reason: 'Conversion too fast after click'
        }
      };
    }

    return null as any;
  }

  private async checkConversionPatterns(affiliateUserId: string, amount: number): Promise<FraudIndicator> {
    // Get recent conversions
    const recentConversions = await this.conversionRepo.find({
      where: {
        affiliateUserId,
        createdAt: Between(new Date(Date.now() - 86400000), new Date())
      }
    });

    // Check for identical amounts (potential testing)
    const identicalAmounts = recentConversions.filter(c => c.orderAmount === amount);
    if (identicalAmounts.length > 3) {
      return {
        type: 'conversion_pattern',
        severity: 'high',
        score: 35,
        details: { 
          identicalAmounts: identicalAmounts.length,
          amount,
          reason: 'Repeated identical order amounts'
        }
      };
    }

    // Check conversion rate
    const clicks = await this.clickRepo.count({
      where: {
        affiliateUserId,
        createdAt: Between(new Date(Date.now() - 86400000), new Date())
      }
    });

    if (clicks > 0) {
      const conversionRate = (recentConversions.length / clicks) * 100;
      if (conversionRate > this.THRESHOLDS.MAX_CONVERSION_RATE) {
        return {
          type: 'conversion_pattern',
          severity: 'medium',
          score: 30,
          details: {
            conversionRate,
            threshold: this.THRESHOLDS.MAX_CONVERSION_RATE,
            reason: 'Abnormally high conversion rate'
          }
        };
      }
    }

    return null as any;
  }

  private async checkIPConversions(ipAddress: string, affiliateUserId: string): Promise<FraudIndicator> {
    const conversions = await this.conversionRepo.count({
      where: {
        ipAddress,
        affiliateUserId,
        createdAt: Between(new Date(Date.now() - 86400000), new Date())
      }
    });

    if (conversions > this.THRESHOLDS.MAX_SAME_IP_CONVERSIONS) {
      return {
        type: 'ip_pattern',
        severity: 'high',
        score: 40,
        details: {
          conversions,
          threshold: this.THRESHOLDS.MAX_SAME_IP_CONVERSIONS,
          reason: 'Too many conversions from same IP'
        }
      };
    }

    return null as any;
  }

  private async checkDeviceConsistency(sessionId: string): Promise<FraudIndicator> {
    const session = await this.sessionRepo.findOne({ where: { sessionId } });
    
    if (!session) return null as any;

    // Check for device switching within session
    if (session.events && session.events.length > 0) {
      const devices = new Set(session.events.map((e: any) => e.data?.device).filter(Boolean));
      if (devices.size > 2) {
        return {
          type: 'device_mismatch',
          severity: 'medium',
          score: 25,
          details: {
            devices: Array.from(devices),
            reason: 'Multiple devices in single session'
          }
        };
      }
    }

    return null as any;
  }

  private calculateRiskLevel(score: number): { riskLevel: any; recommendation: any } {
    if (score >= 80) {
      return { riskLevel: 'critical', recommendation: 'block' };
    } else if (score >= 60) {
      return { riskLevel: 'high', recommendation: 'review' };
    } else if (score >= 40) {
      return { riskLevel: 'medium', recommendation: 'review' };
    } else if (score >= 20) {
      return { riskLevel: 'low', recommendation: 'allow' };
    } else {
      return { riskLevel: 'safe', recommendation: 'allow' };
    }
  }

  private async storeAnalysisResult(result: FraudAnalysisResult): Promise<void> {
    const key = `fraud:analysis:${result.affiliateUserId}`;
    await this.redisService.set(key, JSON.stringify(result), 3600);

    // Store in history
    const historyKey = `fraud:history:${result.affiliateUserId}`;
    await this.redisService.lpush(historyKey, JSON.stringify(result));
    await this.redisService.ltrim(historyKey, 0, 99); // Keep last 100
    await this.redisService.expire(historyKey, 86400 * 7); // 7 days
  }

  private async blockAffiliate(affiliateUserId: string, result: FraudAnalysisResult): Promise<void> {
    // Add to blocked list
    await this.redisService.sadd('fraud:blocked:affiliates', affiliateUserId);

    // Send notification to admin
    await this.notificationService.createNotification({
      affiliateUserId: 'admin', // Send to admin
      type: 'alert',
      title: 'Affiliate Blocked for Fraud',
      message: `Affiliate ${affiliateUserId} has been automatically blocked due to fraud detection`,
      data: result,
      priority: 'urgent'
    });

    // Log the action
    console.error(`Affiliate ${affiliateUserId} blocked for fraud:`, result);
  }

  private async flagForReview(affiliateUserId: string, result: FraudAnalysisResult): Promise<void> {
    // Add to review queue
    await this.redisService.sadd('fraud:review:queue', affiliateUserId);

    // Send notification to admin
    await this.notificationService.createNotification({
      affiliateUserId: 'admin',
      type: 'alert',
      title: 'Affiliate Flagged for Review',
      message: `Affiliate ${affiliateUserId} has been flagged for manual review`,
      data: result,
      priority: 'high'
    });
  }

  private async flagConversion(orderId: string, result: FraudAnalysisResult): Promise<void> {
    // Mark conversion for review
    await this.redisService.sadd('fraud:review:conversions', orderId);
    await this.redisService.set(`fraud:conversion:${orderId}`, JSON.stringify(result), 86400 * 7);
  }

  private analyzeClickPatterns(clicks: AffiliateClick[]): any {
    const patterns = {
      totalClicks: clicks.length,
      uniqueSessions: new Set(clicks.map(c => c.sessionId)).size,
      uniqueIPs: new Set(clicks.map(c => c.ipAddress)).size,
      suspicious: false,
      reasons: []
    };

    // Check for suspicious patterns
    if (patterns.uniqueSessions < patterns.totalClicks * 0.3) {
      patterns.suspicious = true;
      patterns.reasons.push('Low session diversity');
    }

    if (patterns.uniqueIPs < patterns.totalClicks * 0.2) {
      patterns.suspicious = true;
      patterns.reasons.push('Low IP diversity');
    }

    return patterns;
  }

  private analyzeConversionPatterns(conversions: AffiliateConversion[]): any {
    const patterns = {
      totalConversions: conversions.length,
      averageAmount: 0,
      suspicious: false,
      reasons: []
    };

    if (conversions.length > 0) {
      const amounts = conversions.map(c => Number(c.orderAmount));
      patterns.averageAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

      // Check for suspicious patterns
      const uniqueAmounts = new Set(amounts);
      if (uniqueAmounts.size < conversions.length * 0.3) {
        patterns.suspicious = true;
        patterns.reasons.push('Low amount diversity');
      }
    }

    return patterns;
  }

  private analyzeSessionPatterns(sessions: AffiliateSession[]): any {
    const patterns = {
      totalSessions: sessions.length,
      averageDuration: 0,
      averagePageViews: 0,
      conversionRate: 0
    };

    if (sessions.length > 0) {
      patterns.averageDuration = sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length;
      patterns.averagePageViews = sessions.reduce((sum, s) => sum + s.pageCount, 0) / sessions.length;
      
      const converted = sessions.filter(s => s.converted).length;
      patterns.conversionRate = (converted / sessions.length) * 100;
    }

    return patterns;
  }

  private async analyzeVelocity(affiliateUserId: string): Promise<any> {
    const intervals = [60, 300, 3600, 86400]; // 1 min, 5 min, 1 hour, 1 day
    const velocity: any = {};

    for (const interval of intervals) {
      const key = `velocity:${affiliateUserId}:${interval}`;
      const count = await this.redisService.get(key);
      velocity[`${interval}s`] = parseInt(count || '0');
    }

    return velocity;
  }

  private async calculateAnomalyScore(affiliateUserId: string): Promise<number> {
    // Simple anomaly scoring based on deviation from normal patterns
    // This is a simplified version - in production, use ML models
    
    const metrics = await this.getAffiliateMetrics(affiliateUserId);
    let score = 0;

    // Check for anomalies
    if (metrics.conversionRate > 30) score += 20;
    if (metrics.averageTimeToConvert < 60) score += 30;
    if (metrics.ipDiversity < 0.3) score += 25;
    if (metrics.deviceDiversity < 0.2) score += 25;

    return Math.min(score, 100);
  }

  private async getAffiliateMetrics(affiliateUserId: string): Promise<any> {
    // Get metrics for anomaly detection
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86400000);

    const [clicks, conversions] = await Promise.all([
      this.clickRepo.find({
        where: { affiliateUserId, createdAt: Between(dayAgo, now) }
      }),
      this.conversionRepo.find({
        where: { affiliateUserId, createdAt: Between(dayAgo, now) }
      })
    ]);

    const uniqueIPs = new Set(clicks.map(c => c.ipAddress)).size;
    const uniqueDevices = new Set(clicks.map(c => c.device)).size;

    return {
      conversionRate: clicks.length > 0 ? (conversions.length / clicks.length) * 100 : 0,
      averageTimeToConvert: 300, // Placeholder - calculate actual
      ipDiversity: clicks.length > 0 ? uniqueIPs / clicks.length : 0,
      deviceDiversity: clicks.length > 0 ? uniqueDevices / clicks.length : 0
    };
  }

  private generateRecommendations(risk: FraudAnalysisResult, patterns: any): string[] {
    const recommendations: string[] = [];

    if (risk.riskLevel === 'critical') {
      recommendations.push('Immediate suspension recommended');
      recommendations.push('Manual review of all recent transactions required');
    } else if (risk.riskLevel === 'high') {
      recommendations.push('Place affiliate under enhanced monitoring');
      recommendations.push('Require additional verification');
    }

    if (patterns.clickPatterns.suspicious) {
      recommendations.push('Investigate click sources and patterns');
    }

    if (patterns.conversionPatterns.suspicious) {
      recommendations.push('Review conversion authenticity');
    }

    if (patterns.anomalyScore > 50) {
      recommendations.push('Consider implementing stricter validation rules');
    }

    return recommendations;
  }

  /**
   * Check if an affiliate is blocked
   */
  async isAffiliateBlocked(affiliateUserId: string): Promise<boolean> {
    return await this.redisService.sismember('fraud:blocked:affiliates', affiliateUserId);
  }

  /**
   * Get fraud history for an affiliate
   */
  async getFraudHistory(affiliateUserId: string): Promise<FraudAnalysisResult[]> {
    const historyKey = `fraud:history:${affiliateUserId}`;
    const history = await this.redisService.lrange(historyKey, 0, -1);
    return history.map(h => JSON.parse(h));
  }
}