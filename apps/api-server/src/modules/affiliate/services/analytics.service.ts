import { Repository, Between } from 'typeorm';
import { AppDataSource } from '../../../database/connection';
import { AffiliateClick } from '../../../entities/affiliate/AffiliateClick';
import { AffiliateConversion } from '../../../entities/affiliate/AffiliateConversion';
import { AffiliateSession } from '../../../entities/affiliate/AffiliateSession';
import { AffiliateAnalyticsCache } from '../../../entities/affiliate/AffiliateAnalyticsCache';
import { RedisService } from '../../../services/redis.service';

export interface AnalyticsQuery {
  affiliateUserId?: string;
  period: 'hour' | 'day' | 'week' | 'month' | 'year' | 'custom';
  startDate?: Date;
  endDate?: Date;
  groupBy?: string;
  metrics?: string[];
}

export interface ClickAnalytics {
  total: number;
  unique: number;
  bySource: Record<string, number>;
  byDevice: Record<string, number>;
  byCountry: Record<string, number>;
  byBrowser: Record<string, number>;
  hourlyPattern: number[];
  conversionRate: number;
  trends: {
    daily: Array<{ date: string; clicks: number; uniqueClicks: number }>;
    growth: number;
  };
}

export interface PerformanceAnalytics {
  overview: {
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    totalRevenue: number;
    averageOrderValue: number;
    roi: number;
  };
  trends: {
    period: string;
    data: Array<{
      date: string;
      clicks: number;
      conversions: number;
      revenue: number;
      conversionRate: number;
    }>;
  };
  topPerformers: {
    sources: Array<{ name: string; conversions: number; revenue: number }>;
    landingPages: Array<{ url: string; conversions: number; conversionRate: number }>;
    products: Array<{ id: string; name: string; revenue: number }>;
  };
  recommendations: string[];
}

export interface FunnelAnalytics {
  stages: Array<{
    name: string;
    visitors: number;
    dropoff: number;
    conversionRate: number;
  }>;
  bottlenecks: Array<{
    stage: string;
    dropoffRate: number;
    recommendation: string;
  }>;
  averageTimeToConversion: number;
  pathAnalysis: Array<{
    path: string[];
    count: number;
    conversionRate: number;
  }>;
}

export class AdvancedAnalyticsService {
  private clickRepo: Repository<AffiliateClick>;
  private conversionRepo: Repository<AffiliateConversion>;
  private sessionRepo: Repository<AffiliateSession>;
  private cacheRepo: Repository<AffiliateAnalyticsCache>;
  private redisService: RedisService;

  constructor() {
    this.clickRepo = AppDataSource.getRepository(AffiliateClick);
    this.conversionRepo = AppDataSource.getRepository(AffiliateConversion);
    this.sessionRepo = AppDataSource.getRepository(AffiliateSession);
    this.cacheRepo = AppDataSource.getRepository(AffiliateAnalyticsCache);
    this.redisService = RedisService.getInstance();
  }

  /**
   * Generate click analytics
   */
  async generateClickAnalytics(query: AnalyticsQuery): Promise<ClickAnalytics> {
    const cacheKey = this.generateCacheKey('clicks', query);
    
    // Check cache
    const cached = await this.getCachedAnalytics(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getPeriodDates(query);

    // Get click data
    const clicks = await this.getClicksData(query.affiliateUserId, startDate, endDate);

    // Analyze data
    const analytics: ClickAnalytics = {
      total: clicks.length,
      unique: this.countUnique(clicks, 'sessionId'),
      bySource: this.groupBy(clicks, 'metadata.source'),
      byDevice: this.groupBy(clicks, 'device'),
      byCountry: this.groupBy(clicks, 'country'),
      byBrowser: this.groupBy(clicks, 'browser'),
      hourlyPattern: this.analyzeHourlyPattern(clicks),
      conversionRate: await this.calculateConversionRate(query.affiliateUserId, startDate, endDate),
      trends: await this.analyzeTrends(clicks, startDate, endDate)
    };

    // Cache results
    await this.cacheAnalytics(cacheKey, analytics, 'clicks', query.affiliateUserId);

    return analytics;
  }

  /**
   * Generate performance analytics
   */
  async generatePerformanceAnalytics(query: AnalyticsQuery): Promise<PerformanceAnalytics> {
    const cacheKey = this.generateCacheKey('performance', query);
    
    const cached = await this.getCachedAnalytics(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getPeriodDates(query);

    // Get data
    const [clicks, conversions] = await Promise.all([
      this.getClicksData(query.affiliateUserId, startDate, endDate),
      this.getConversionsData(query.affiliateUserId, startDate, endDate)
    ]);

    // Calculate overview metrics
    const totalRevenue = conversions.reduce((sum, c) => sum + Number(c.orderAmount), 0);
    const conversionRate = clicks.length > 0 ? (conversions.length / clicks.length) * 100 : 0;

    const analytics: PerformanceAnalytics = {
      overview: {
        totalClicks: clicks.length,
        totalConversions: conversions.length,
        conversionRate,
        totalRevenue,
        averageOrderValue: conversions.length > 0 ? totalRevenue / conversions.length : 0,
        roi: this.calculateROI(totalRevenue, conversions)
      },
      trends: await this.analyzePerformanceTrends(clicks, conversions, startDate, endDate),
      topPerformers: await this.analyzeTopPerformers(conversions),
      recommendations: await this.generateRecommendations(clicks, conversions)
    };

    await this.cacheAnalytics(cacheKey, analytics, 'performance', query.affiliateUserId);

    return analytics;
  }

  /**
   * Generate funnel analytics
   */
  async generateFunnelAnalytics(query: AnalyticsQuery): Promise<FunnelAnalytics> {
    const cacheKey = this.generateCacheKey('funnel', query);
    
    const cached = await this.getCachedAnalytics(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getPeriodDates(query);

    // Get session data
    const sessions = await this.getSessionsData(query.affiliateUserId, startDate, endDate);

    // Analyze funnel stages
    const stages = this.analyzeFunnelStages(sessions);
    const bottlenecks = this.identifyBottlenecks(stages);
    const pathAnalysis = this.analyzeConversionPaths(sessions);

    const analytics: FunnelAnalytics = {
      stages,
      bottlenecks,
      averageTimeToConversion: this.calculateAverageTimeToConversion(sessions),
      pathAnalysis
    };

    await this.cacheAnalytics(cacheKey, analytics, 'funnel', query.affiliateUserId);

    return analytics;
  }

  /**
   * Get real-time analytics
   */
  async getRealtimeAnalytics(affiliateUserId?: string): Promise<any> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    // Get real-time data from Redis
    const realtimeKey = affiliateUserId ? 
      `realtime:stats:${affiliateUserId}` : 
      'realtime:stats:global';

    const stats = await this.redisService.hgetall(realtimeKey);

    // Get recent events
    const eventStreamKey = `events:stream:${now.toISOString().split('T')[0]}`;
    const recentEvents = await (this.redisService as any).lrange(eventStreamKey, 0, 49);

    // Get active sessions
    const activeSessions = await this.sessionRepo.count({
      where: {
        ...(affiliateUserId && { affiliateUserId }),
        lastActivity: Between(oneHourAgo, now)
      }
    });

    return {
      currentStats: {
        activeSessions,
        clicksLastHour: parseInt(stats?.clicksLastHour || '0'),
        conversionsLastHour: parseInt(stats?.conversionsLastHour || '0'),
        revenueLastHour: parseFloat(stats?.revenueLastHour || '0')
      },
      recentEvents: recentEvents.map(e => JSON.parse(e)),
      trends: {
        clickTrend: this.calculateTrend(stats?.clicksLastHour, stats?.clicksPreviousHour),
        conversionTrend: this.calculateTrend(stats?.conversionsLastHour, stats?.conversionsPreviousHour),
        revenueTrend: this.calculateTrend(stats?.revenueLastHour, stats?.revenuePreviousHour)
      }
    };
  }

  /**
   * Generate predictive analytics
   */
  async generatePredictiveAnalytics(affiliateUserId: string): Promise<any> {
    // Get historical data for prediction
    const historicalData = await this.getHistoricalData(affiliateUserId, 90); // Last 90 days

    // Simple linear regression for revenue prediction
    const revenuePrediction = this.predictRevenue(historicalData);

    // Conversion rate trend prediction
    const conversionTrend = this.predictConversionTrend(historicalData);

    // Identify optimization opportunities
    const opportunities = await this.identifyOptimizationOpportunities(affiliateUserId);

    return {
      predictions: {
        nextMonthRevenue: revenuePrediction.predicted,
        confidence: revenuePrediction.confidence,
        conversionRateTrend: conversionTrend
      },
      opportunities,
      riskFactors: this.identifyRiskFactors(historicalData)
    };
  }

  // Helper methods

  private getPeriodDates(query: AnalyticsQuery): { startDate: Date; endDate: Date } {
    if (query.startDate && query.endDate) {
      return { startDate: query.startDate, endDate: query.endDate };
    }

    const now = new Date();
    let startDate: Date;

    switch (query.period) {
      case 'hour':
        startDate = new Date(now.getTime() - 3600000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 86400000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 86400000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 86400000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 86400000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 86400000);
    }

    return { startDate, endDate: now };
  }

  private async getClicksData(
    affiliateUserId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AffiliateClick[]> {
    const query = this.clickRepo.createQueryBuilder('click');

    if (affiliateUserId) {
      query.andWhere('click.affiliateUserId = :affiliateUserId', { affiliateUserId });
    }

    if (startDate && endDate) {
      query.andWhere('click.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    return await query.getMany();
  }

  private async getConversionsData(
    affiliateUserId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AffiliateConversion[]> {
    const query = this.conversionRepo.createQueryBuilder('conversion');

    if (affiliateUserId) {
      query.andWhere('conversion.affiliateUserId = :affiliateUserId', { affiliateUserId });
    }

    if (startDate && endDate) {
      query.andWhere('conversion.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    return await query.getMany();
  }

  private async getSessionsData(
    affiliateUserId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AffiliateSession[]> {
    const query = this.sessionRepo.createQueryBuilder('session');

    if (affiliateUserId) {
      query.andWhere('session.affiliateUserId = :affiliateUserId', { affiliateUserId });
    }

    if (startDate && endDate) {
      query.andWhere('session.startedAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    return await query.getMany();
  }

  private countUnique(items: any[], field: string): number {
    const unique = new Set(items.map(item => this.getNestedValue(item, field)));
    return unique.size;
  }

  private groupBy(items: any[], field: string): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    items.forEach(item => {
      const value = this.getNestedValue(item, field) || 'unknown';
      grouped[value] = (grouped[value] || 0) + 1;
    });

    return grouped;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private analyzeHourlyPattern(clicks: AffiliateClick[]): number[] {
    const pattern = new Array(24).fill(0);
    
    clicks.forEach(click => {
      const hour = new Date(click.createdAt).getHours();
      pattern[hour]++;
    });

    return pattern;
  }

  private async calculateConversionRate(
    affiliateUserId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const [clicks, conversions] = await Promise.all([
      this.getClicksData(affiliateUserId, startDate, endDate),
      this.getConversionsData(affiliateUserId, startDate, endDate)
    ]);

    return clicks.length > 0 ? (conversions.length / clicks.length) * 100 : 0;
  }

  private async analyzeTrends(
    clicks: AffiliateClick[],
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const dailyData: Record<string, { clicks: number; uniqueClicks: Set<string> }> = {};

    clicks.forEach(click => {
      const date = new Date(click.createdAt).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { clicks: 0, uniqueClicks: new Set() };
      }
      dailyData[date].clicks++;
      dailyData[date].uniqueClicks.add(click.sessionId);
    });

    const daily = Object.entries(dailyData).map(([date, data]) => ({
      date,
      clicks: data.clicks,
      uniqueClicks: data.uniqueClicks.size
    }));

    // Calculate growth
    const firstWeek = clicks.filter(c => 
      new Date(c.createdAt) <= new Date(startDate.getTime() + 7 * 86400000)
    ).length;
    
    const lastWeek = clicks.filter(c => 
      new Date(c.createdAt) >= new Date(endDate.getTime() - 7 * 86400000)
    ).length;

    const growth = firstWeek > 0 ? ((lastWeek - firstWeek) / firstWeek) * 100 : 0;

    return { daily, growth };
  }

  private calculateROI(revenue: number, conversions: AffiliateConversion[]): number {
    const totalCommission = conversions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
    return totalCommission > 0 ? ((revenue - totalCommission) / totalCommission) * 100 : 0;
  }

  private async analyzePerformanceTrends(
    clicks: AffiliateClick[],
    conversions: AffiliateConversion[],
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const period = this.determinePeriodGranularity(startDate, endDate);
    const data: Record<string, any> = {};

    // Initialize data structure
    clicks.forEach(click => {
      const key = this.getDateKey(click.createdAt, period);
      if (!data[key]) {
        data[key] = { clicks: 0, conversions: 0, revenue: 0 };
      }
      data[key].clicks++;
    });

    conversions.forEach(conversion => {
      const key = this.getDateKey(conversion.createdAt, period);
      if (!data[key]) {
        data[key] = { clicks: 0, conversions: 0, revenue: 0 };
      }
      data[key].conversions++;
      data[key].revenue += Number(conversion.orderAmount);
    });

    return {
      period,
      data: Object.entries(data).map(([date, metrics]) => ({
        date,
        ...metrics,
        conversionRate: metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0
      }))
    };
  }

  private determinePeriodGranularity(startDate: Date, endDate: Date): string {
    const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000);
    
    if (diffDays <= 1) return 'hour';
    if (diffDays <= 7) return 'day';
    if (diffDays <= 30) return 'day';
    if (diffDays <= 90) return 'week';
    return 'month';
  }

  private getDateKey(date: Date, period: string): string {
    const d = new Date(date);
    
    switch (period) {
      case 'hour':
        return d.toISOString().slice(0, 13);
      case 'day':
        return d.toISOString().slice(0, 10);
      case 'week':
        const week = Math.floor(d.getDate() / 7);
        return `${d.getFullYear()}-W${week}`;
      case 'month':
        return d.toISOString().slice(0, 7);
      default:
        return d.toISOString().slice(0, 10);
    }
  }

  private async analyzeTopPerformers(conversions: AffiliateConversion[]): Promise<any> {
    // Analyze by source
    const sources: Record<string, { conversions: number; revenue: number }> = {};
    
    conversions.forEach(conv => {
      const source = conv.metadata?.source || 'direct';
      if (!sources[source]) {
        sources[source] = { conversions: 0, revenue: 0 };
      }
      sources[source].conversions++;
      sources[source].revenue += Number(conv.orderAmount);
    });

    const topSources = Object.entries(sources)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      sources: topSources,
      landingPages: [], // Implement based on your needs
      products: [] // Implement based on your needs
    };
  }

  private async generateRecommendations(
    clicks: AffiliateClick[],
    conversions: AffiliateConversion[]
  ): Promise<string[]> {
    const recommendations: string[] = [];
    const conversionRate = clicks.length > 0 ? (conversions.length / clicks.length) * 100 : 0;

    if (conversionRate < 1) {
      recommendations.push('Low conversion rate detected. Consider optimizing landing pages or targeting.');
    }

    // Analyze device performance
    const deviceConversions = this.groupBy(conversions, 'metadata.device');
    const deviceClicks = this.groupBy(clicks, 'device');
    
    Object.keys(deviceClicks).forEach(device => {
      const deviceCR = (deviceConversions[device] || 0) / deviceClicks[device] * 100;
      if (deviceCR < conversionRate * 0.5) {
        recommendations.push(`${device} has low conversion rate. Consider device-specific optimizations.`);
      }
    });

    // Analyze time patterns
    const hourlyPattern = this.analyzeHourlyPattern(clicks);
    const peakHour = hourlyPattern.indexOf(Math.max(...hourlyPattern));
    recommendations.push(`Peak traffic at ${peakHour}:00. Consider scheduling content during this time.`);

    return recommendations;
  }

  private analyzeFunnelStages(sessions: AffiliateSession[]): any[] {
    const stages = [
      { name: 'Landing', visitors: sessions.length, dropoff: 0, conversionRate: 100 },
      { name: 'Engaged', visitors: 0, dropoff: 0, conversionRate: 0 },
      { name: 'Intent', visitors: 0, dropoff: 0, conversionRate: 0 },
      { name: 'Converted', visitors: 0, dropoff: 0, conversionRate: 0 }
    ];

    sessions.forEach(session => {
      if (session.pageCount > 1) stages[1].visitors++;
      if (session.duration > 60) stages[2].visitors++;
      if (session.converted) stages[3].visitors++;
    });

    // Calculate dropoff and conversion rates
    for (let i = 1; i < stages.length; i++) {
      const prevStage = stages[i - 1];
      const currStage = stages[i];
      
      currStage.dropoff = prevStage.visitors - currStage.visitors;
      currStage.conversionRate = prevStage.visitors > 0 ? 
        (currStage.visitors / prevStage.visitors) * 100 : 0;
    }

    return stages;
  }

  private identifyBottlenecks(stages: any[]): any[] {
    const bottlenecks: any[] = [];

    stages.forEach((stage, index) => {
      if (index > 0 && stage.conversionRate < 50) {
        bottlenecks.push({
          stage: stage.name,
          dropoffRate: 100 - stage.conversionRate,
          recommendation: this.getBottleneckRecommendation(stage.name, stage.conversionRate)
        });
      }
    });

    return bottlenecks;
  }

  private getBottleneckRecommendation(stage: string, conversionRate: number): string {
    const recommendations: Record<string, string> = {
      'Engaged': 'Improve content relevance and page load speed',
      'Intent': 'Add clearer CTAs and value propositions',
      'Converted': 'Simplify checkout process and add trust signals'
    };

    return recommendations[stage] || 'Analyze user behavior for insights';
  }

  private analyzeConversionPaths(sessions: AffiliateSession[]): any[] {
    const paths: Record<string, { count: number; conversions: number }> = {};

    sessions.forEach(session => {
      if (session.pageViews && session.pageViews.length > 0) {
        const pathKey = session.pageViews.map(pv => pv.url).join(' -> ');
        if (!paths[pathKey]) {
          paths[pathKey] = { count: 0, conversions: 0 };
        }
        paths[pathKey].count++;
        if (session.converted) {
          paths[pathKey].conversions++;
        }
      }
    });

    return Object.entries(paths)
      .map(([path, data]) => ({
        path: path.split(' -> '),
        count: data.count,
        conversionRate: data.count > 0 ? (data.conversions / data.count) * 100 : 0
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 10);
  }

  private calculateAverageTimeToConversion(sessions: AffiliateSession[]): number {
    const convertedSessions = sessions.filter(s => s.converted);
    
    if (convertedSessions.length === 0) return 0;

    const totalTime = convertedSessions.reduce((sum, session) => {
      const conversionTime = session.convertedAt ? 
        new Date(session.convertedAt).getTime() - new Date(session.startedAt).getTime() : 0;
      return sum + conversionTime;
    }, 0);

    return totalTime / convertedSessions.length / 1000; // Return in seconds
  }

  private calculateTrend(current: string | undefined, previous: string | undefined): number {
    const curr = parseFloat(current || '0');
    const prev = parseFloat(previous || '0');
    
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  }

  private async getHistoricalData(affiliateUserId: string, days: number): Promise<any> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 86400000);

    const [clicks, conversions] = await Promise.all([
      this.getClicksData(affiliateUserId, startDate, endDate),
      this.getConversionsData(affiliateUserId, startDate, endDate)
    ]);

    // Group by day
    const dailyData: Record<string, any> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 86400000).toISOString().split('T')[0];
      dailyData[date] = { clicks: 0, conversions: 0, revenue: 0 };
    }

    clicks.forEach(click => {
      const date = new Date(click.createdAt).toISOString().split('T')[0];
      if (dailyData[date]) dailyData[date].clicks++;
    });

    conversions.forEach(conv => {
      const date = new Date(conv.createdAt).toISOString().split('T')[0];
      if (dailyData[date]) {
        dailyData[date].conversions++;
        dailyData[date].revenue += Number(conv.orderAmount);
      }
    });

    return Object.entries(dailyData).map(([date, data]) => ({ date, ...data }));
  }

  private predictRevenue(historicalData: any[]): { predicted: number; confidence: number } {
    // Simple linear regression
    const n = historicalData.length;
    if (n < 7) return { predicted: 0, confidence: 0 };

    const revenues = historicalData.map(d => d.revenue);
    const indices = historicalData.map((_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = revenues.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * revenues[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next 30 days
    const predicted = slope * (n + 30) + intercept;

    // Calculate confidence based on variance
    const variance = revenues.reduce((sum, y, i) => {
      const predictedY = slope * i + intercept;
      return sum + Math.pow(y - predictedY, 2);
    }, 0) / n;

    const confidence = Math.max(0, 100 - (variance / (sumY / n)) * 100);

    return { predicted: Math.max(0, predicted), confidence };
  }

  private predictConversionTrend(historicalData: any[]): string {
    const recentData = historicalData.slice(-14); // Last 2 weeks
    const olderData = historicalData.slice(-28, -14); // Previous 2 weeks

    const recentCR = this.averageConversionRate(recentData);
    const olderCR = this.averageConversionRate(olderData);

    if (recentCR > olderCR * 1.1) return 'improving';
    if (recentCR < olderCR * 0.9) return 'declining';
    return 'stable';
  }

  private averageConversionRate(data: any[]): number {
    const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0);
    const totalConversions = data.reduce((sum, d) => sum + d.conversions, 0);
    
    return totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  }

  private async identifyOptimizationOpportunities(affiliateUserId: string): Promise<string[]> {
    const opportunities: string[] = [];

    // Analyze recent performance
    const recentData = await this.getHistoricalData(affiliateUserId, 7);
    const avgConversionRate = this.averageConversionRate(recentData);

    if (avgConversionRate < 2) {
      opportunities.push('Conversion rate below industry average. Consider A/B testing landing pages.');
    }

    // Analyze traffic sources
    const clicks = await this.getClicksData(affiliateUserId, 
      new Date(Date.now() - 7 * 86400000), new Date());
    
    const sourcePerformance = this.groupBy(clicks, 'metadata.source');
    const topSource = Object.entries(sourcePerformance)
      .sort(([, a], [, b]) => b - a)[0];

    if (topSource && topSource[1] > clicks.length * 0.5) {
      opportunities.push(`Over-reliance on ${topSource[0]}. Diversify traffic sources.`);
    }

    return opportunities;
  }

  private identifyRiskFactors(historicalData: any[]): string[] {
    const risks: string[] = [];

    // Check for declining trends
    const trend = this.predictConversionTrend(historicalData);
    if (trend === 'declining') {
      risks.push('Conversion rate is declining. Review recent changes.');
    }

    // Check for volatility
    const revenues = historicalData.map(d => d.revenue);
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const variance = revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / revenues.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > avgRevenue * 0.5) {
      risks.push('High revenue volatility detected. Consider stabilizing traffic sources.');
    }

    return risks;
  }

  // Cache management

  private generateCacheKey(type: string, query: AnalyticsQuery): string {
    const parts = [
      type,
      query.affiliateUserId || 'global',
      query.period,
      query.startDate?.toISOString() || '',
      query.endDate?.toISOString() || '',
      query.groupBy || ''
    ];
    
    return parts.join(':');
  }

  private async getCachedAnalytics(cacheKey: string): Promise<any | null> {
    // Try Redis first
    const redisData = await this.redisService.get(`analytics:${cacheKey}`);
    if (redisData) {
      return JSON.parse(redisData);
    }

    // Try database cache
    const dbCache = await this.cacheRepo.findOne({
      where: { cacheKey },
      order: { createdAt: 'DESC' }
    });

    if (dbCache && dbCache.expiresAt > new Date()) {
      // Store in Redis for faster access
      await this.redisService.set(
        `analytics:${cacheKey}`,
        JSON.stringify(dbCache.data),
        300 // 5 minutes
      );
      return dbCache.data;
    }

    return null;
  }

  private async cacheAnalytics(
    cacheKey: string,
    data: any,
    type: string,
    affiliateId?: string
  ): Promise<void> {
    // Store in Redis
    await this.redisService.set(
      `analytics:${cacheKey}`,
      JSON.stringify(data),
      300 // 5 minutes for Redis
    );

    // Store in database for longer persistence
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await this.cacheRepo.save({
      cacheKey,
      data,
      type: type as any,
      affiliateId,
      expiresAt,
      metadata: { version: 1 }
    });

    // Clean old cache entries
    await this.cleanOldCache();
  }

  private async cleanOldCache(): Promise<void> {
    const cutoff = new Date();
    await this.cacheRepo
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :cutoff', { cutoff })
      .execute();
  }
}