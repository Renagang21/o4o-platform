import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection';
import { AffiliateUser } from '../../../entities/affiliate/AffiliateUser';
import { AffiliateClick } from '../../../entities/affiliate/AffiliateClick';
import { AffiliateConversion } from '../../../entities/affiliate/AffiliateConversion';
import { AffiliateAnalyticsCache } from '../../../entities/affiliate/AffiliateAnalyticsCache';
import { RedisService } from '../../../services/redis.service';
import { Logger } from '../../../utils/logger';

export interface PerformanceMetrics {
  cacheHitRate: number;
  avgResponseTime: number;
  queryOptimizations: QueryOptimization[];
  memoryUsage: MemoryStats;
  recommendedIndexes: string[];
  slowQueries: SlowQuery[];
}

export interface QueryOptimization {
  query: string;
  currentTime: number;
  optimizedTime: number;
  improvement: number;
  suggestion: string;
}

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  parameters?: any[];
}

export interface CacheStrategy {
  key: string;
  ttl: number;
  strategy: 'aggressive' | 'moderate' | 'conservative';
  preload: boolean;
}

export class PerformanceOptimizationService {
  private analyticsCache: Repository<AffiliateAnalyticsCache>;
  private redisService: RedisService;
  private logger: Logger;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private slowQueryThreshold: number = 1000; // 1 second
  private slowQueries: SlowQuery[] = [];

  constructor() {
    this.analyticsCache = AppDataSource.getRepository(AffiliateAnalyticsCache);
    this.redisService = RedisService.getInstance();
    this.logger = new Logger('PerformanceOptimization');
  }

  /**
   * Optimize database queries with intelligent caching
   */
  async optimizeQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const startTime = Date.now();

    // Check cache first
    const cached = await this.getCached<T>(key);
    if (cached !== null) {
      this.cacheHits++;
      this.trackQueryTime(key, Date.now() - startTime, true);
      return cached;
    }

    this.cacheMisses++;

    // Execute query
    const result = await queryFn();
    const queryTime = Date.now() - startTime;
    
    // Track slow queries
    this.trackQueryTime(key, queryTime, false);

    // Cache result
    await this.setCached(key, result, ttl);

    return result;
  }

  /**
   * Batch load multiple entities with optimized queries
   */
  async batchLoad<T>(
    repository: Repository<T>,
    ids: string[],
    cachePrefix: string
  ): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    const uncachedIds: string[] = [];

    // Check cache for each ID
    for (const id of ids) {
      const cached = await this.getCached<T>(`${cachePrefix}:${id}`);
      if (cached) {
        result.set(id, cached);
      } else {
        uncachedIds.push(id);
      }
    }

    // Batch load uncached items
    if (uncachedIds.length > 0) {
      const items = await repository.findByIds(uncachedIds);
      
      for (const item of items) {
        const id = (item as any).id;
        result.set(id, item);
        
        // Cache each item
        await this.setCached(`${cachePrefix}:${id}`, item, 3600);
      }
    }

    return result;
  }

  /**
   * Preload frequently accessed data
   */
  async preloadCache(): Promise<void> {
    this.logger.info('Starting cache preload...');

    try {
      // Preload top affiliates
      const topAffiliates = await AppDataSource.getRepository(AffiliateUser)
        .createQueryBuilder('user')
        .orderBy('user.totalEarnings', 'DESC')
        .limit(100)
        .getMany();

      for (const affiliate of topAffiliates) {
        await this.setCached(`affiliate:${affiliate.id}`, affiliate, 7200);
      }

      // Preload recent conversions
      const recentConversions = await AppDataSource.getRepository(AffiliateConversion)
        .createQueryBuilder('conversion')
        .where('conversion.createdAt > :date', {
          date: new Date(Date.now() - 24 * 60 * 60 * 1000)
        })
        .getMany();

      await this.setCached('conversions:recent', recentConversions, 1800);

      this.logger.info('Cache preload completed');
    } catch (error) {
      this.logger.error('Cache preload failed:', error);
    }
  }

  /**
   * Implement query result pagination with cursor
   */
  async paginateWithCursor<T>(
    repository: Repository<T>,
    cursor: string | null,
    limit: number,
    orderBy: string = 'createdAt'
  ): Promise<{ items: T[]; nextCursor: string | null }> {
    const query = repository.createQueryBuilder('entity');

    if (cursor) {
      query.where(`entity.${orderBy} < :cursor`, { cursor });
    }

    query.orderBy(`entity.${orderBy}`, 'DESC').limit(limit + 1);

    const items = await query.getMany();
    
    let nextCursor: string | null = null;
    if (items.length > limit) {
      items.pop();
      nextCursor = (items[items.length - 1] as any)[orderBy];
    }

    return { items, nextCursor };
  }

  /**
   * Optimize analytics aggregation
   */
  async optimizeAggregation(
    affiliateUserId: string,
    metric: string,
    period: 'hour' | 'day' | 'week' | 'month'
  ): Promise<any> {
    const cacheKey = `analytics:${affiliateUserId}:${metric}:${period}`;
    
    // Check if we have cached aggregation
    const cached = await this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    // Determine aggregation window
    const windowMs = this.getAggregationWindow(period);
    const startDate = new Date(Date.now() - windowMs);

    // Perform aggregation based on metric
    let result: any;
    
    switch (metric) {
      case 'clicks':
        result = await this.aggregateClicks(affiliateUserId, startDate);
        break;
      case 'conversions':
        result = await this.aggregateConversions(affiliateUserId, startDate);
        break;
      case 'revenue':
        result = await this.aggregateRevenue(affiliateUserId, startDate);
        break;
      default:
        throw new Error(`Unknown metric: ${metric}`);
    }

    // Cache with appropriate TTL
    const ttl = this.getAggregationTTL(period);
    await this.setCached(cacheKey, result, ttl);

    return result;
  }

  /**
   * Implement database connection pooling optimization
   */
  async optimizeConnectionPool(): Promise<void> {
    const dataSource = AppDataSource;
    const options = dataSource.options as any;

    // Optimize pool settings based on load
    const currentConnections = await this.getActiveConnections();
    
    if (currentConnections > options.extra.max * 0.8) {
      // Increase pool size if near limit
      options.extra.max = Math.min(options.extra.max * 1.5, 100);
      this.logger.info(`Increased connection pool to ${options.extra.max}`);
    } else if (currentConnections < options.extra.max * 0.2) {
      // Decrease pool size if underutilized
      options.extra.max = Math.max(options.extra.max * 0.7, 10);
      this.logger.info(`Decreased connection pool to ${options.extra.max}`);
    }
  }

  /**
   * Clear expired cache entries
   */
  async cleanupCache(): Promise<number> {
    const now = new Date();
    
    // Clean database cache
    const dbResult = await this.analyticsCache
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now })
      .execute();

    // Clean Redis cache (Redis handles TTL automatically)
    // But we can clean up pattern-based keys if needed
    const pattern = 'analytics:*';
    const keys = await this.redisService.keys(pattern);
    
    let redisDeleted = 0;
    for (const key of keys) {
      const ttl = await this.redisService.ttl(key);
      if (ttl === -1) { // No TTL set
        await this.redisService.del(key);
        redisDeleted++;
      }
    }

    const totalDeleted = (dbResult.affected || 0) + redisDeleted;
    this.logger.info(`Cleaned up ${totalDeleted} expired cache entries`);
    
    return totalDeleted;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const cacheHitRate = this.calculateCacheHitRate();
    const avgResponseTime = await this.calculateAvgResponseTime();
    const queryOptimizations = await this.identifyQueryOptimizations();
    const memoryUsage = this.getMemoryUsage();
    const recommendedIndexes = await this.recommendIndexes();

    return {
      cacheHitRate,
      avgResponseTime,
      queryOptimizations,
      memoryUsage,
      recommendedIndexes,
      slowQueries: this.slowQueries.slice(-10) // Last 10 slow queries
    };
  }

  /**
   * Implement intelligent cache warming
   */
  async warmCache(strategies: CacheStrategy[]): Promise<void> {
    for (const strategy of strategies) {
      if (!strategy.preload) continue;

      try {
        const data = await this.loadDataForCache(strategy.key);
        await this.setCached(strategy.key, data, strategy.ttl);
        this.logger.info(`Warmed cache for ${strategy.key}`);
      } catch (error) {
        this.logger.error(`Failed to warm cache for ${strategy.key}:`, error);
      }
    }
  }

  // Helper methods

  private async getCached<T>(key: string): Promise<T | null> {
    // Try Redis first
    const redisData = await this.redisService.get(key);
    if (redisData) {
      try {
        return JSON.parse(redisData);
      } catch {
        return redisData as any;
      }
    }

    // Try database cache
    const dbCache = await this.analyticsCache.findOne({
      where: { key }
    });

    if (dbCache && dbCache.expiresAt > new Date()) {
      return dbCache.data as T;
    }

    return null;
  }

  private async setCached<T>(key: string, data: T, ttl: number): Promise<void> {
    // Store in Redis
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    await this.redisService.set(key, serialized, ttl);

    // Store in database for persistence
    const expiresAt = new Date(Date.now() + ttl * 1000);
    
    await this.analyticsCache.upsert(
      {
        key,
        data: data as any,
        expiresAt
      },
      ['key']
    );
  }

  private trackQueryTime(query: string, duration: number, cached: boolean): void {
    if (!cached && duration > this.slowQueryThreshold) {
      this.slowQueries.push({
        query,
        duration,
        timestamp: new Date()
      });

      // Keep only last 100 slow queries
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift();
      }
    }
  }

  private calculateCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? (this.cacheHits / total) * 100 : 0;
  }

  private async calculateAvgResponseTime(): Promise<number> {
    // This would ideally track actual response times
    // For now, return a mock value
    return 45; // ms
  }

  private async identifyQueryOptimizations(): Promise<QueryOptimization[]> {
    const optimizations: QueryOptimization[] = [];

    // Analyze slow queries for optimization opportunities
    for (const slowQuery of this.slowQueries.slice(-5)) {
      if (slowQuery.query.includes('JOIN') && slowQuery.duration > 2000) {
        optimizations.push({
          query: slowQuery.query,
          currentTime: slowQuery.duration,
          optimizedTime: slowQuery.duration * 0.3,
          improvement: 70,
          suggestion: 'Consider adding indexes on JOIN columns'
        });
      }
    }

    return optimizations;
  }

  private getMemoryUsage(): MemoryStats {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss
    };
  }

  private async recommendIndexes(): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze query patterns and recommend indexes
    const queryPatterns = await this.analyzeQueryPatterns();
    
    for (const pattern of queryPatterns) {
      if (pattern.includes('WHERE') && pattern.includes('affiliateUserId')) {
        recommendations.push('CREATE INDEX idx_affiliate_user_id ON table_name(affiliateUserId)');
      }
      if (pattern.includes('ORDER BY') && pattern.includes('createdAt')) {
        recommendations.push('CREATE INDEX idx_created_at ON table_name(createdAt DESC)');
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private async analyzeQueryPatterns(): Promise<string[]> {
    // This would analyze actual query logs
    // For now, return mock patterns
    return [
      'SELECT * FROM affiliate_clicks WHERE affiliateUserId = ?',
      'SELECT * FROM affiliate_conversions ORDER BY createdAt DESC'
    ];
  }

  private getAggregationWindow(period: 'hour' | 'day' | 'week' | 'month'): number {
    const windows = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };
    return windows[period];
  }

  private getAggregationTTL(period: 'hour' | 'day' | 'week' | 'month'): number {
    const ttls = {
      hour: 300, // 5 minutes
      day: 1800, // 30 minutes
      week: 3600, // 1 hour
      month: 7200 // 2 hours
    };
    return ttls[period];
  }

  private async aggregateClicks(
    affiliateUserId: string,
    startDate: Date
  ): Promise<any> {
    return await AppDataSource.getRepository(AffiliateClick)
      .createQueryBuilder('click')
      .select('COUNT(*)', 'total')
      .addSelect('DATE(click.createdAt)', 'date')
      .where('click.affiliateUserId = :affiliateUserId', { affiliateUserId })
      .andWhere('click.createdAt >= :startDate', { startDate })
      .groupBy('DATE(click.createdAt)')
      .getRawMany();
  }

  private async aggregateConversions(
    affiliateUserId: string,
    startDate: Date
  ): Promise<any> {
    return await AppDataSource.getRepository(AffiliateConversion)
      .createQueryBuilder('conversion')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(conversion.orderAmount)', 'revenue')
      .addSelect('DATE(conversion.createdAt)', 'date')
      .where('conversion.affiliateUserId = :affiliateUserId', { affiliateUserId })
      .andWhere('conversion.createdAt >= :startDate', { startDate })
      .groupBy('DATE(conversion.createdAt)')
      .getRawMany();
  }

  private async aggregateRevenue(
    affiliateUserId: string,
    startDate: Date
  ): Promise<any> {
    return await AppDataSource.getRepository(AffiliateConversion)
      .createQueryBuilder('conversion')
      .select('SUM(conversion.commissionAmount)', 'total')
      .where('conversion.affiliateUserId = :affiliateUserId', { affiliateUserId })
      .andWhere('conversion.createdAt >= :startDate', { startDate })
      .getRawOne();
  }

  private async getActiveConnections(): Promise<number> {
    // This would check actual database connections
    // For now, return a mock value
    return 15;
  }

  private async loadDataForCache(key: string): Promise<any> {
    // Load data based on cache key pattern
    if (key.startsWith('affiliate:')) {
      const id = key.split(':')[1];
      return await AppDataSource.getRepository(AffiliateUser).findOne({
        where: { id }
      });
    }
    
    // Add more patterns as needed
    return null;
  }
}