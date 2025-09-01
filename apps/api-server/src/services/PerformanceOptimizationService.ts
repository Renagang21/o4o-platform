import { Repository, SelectQueryBuilder } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { CacheService } from './CacheService';
import { AnalyticsService } from './AnalyticsService';
import Redis from 'ioredis';
import { performance } from 'perf_hooks';
import { TypeOrmDriver } from '../types/database';
import * as crypto from 'crypto';
import {
  QueryBuilderWithExecute,
  QueryType,
  PerformanceMetric as ImportedPerformanceMetric,
  OptimizedResponse as ImportedOptimizedResponse,
  CacheHeaders as ImportedCacheHeaders,
  PerformanceReport as ImportedPerformanceReport,
  SlowQueryInfo,
  PerformanceAlert,
  PerformanceAlertData,
  CompressionLevel,
  RedisInfo,
  QueryPerformanceMetrics,
  CacheMetrics,
  SystemMetrics
} from '../types';

/**
 * 성능 최적화 서비스
 * 
 * 핵심 기능:
 * - 데이터베이스 쿼리 최적화
 * - 캐시 전략 관리
 * - API 응답 최적화
 * - 리소스 사용량 모니터링
 * - 자동 성능 튜닝
 */
export class PerformanceOptimizationService {
  private redis: Redis;
  private cacheService: CacheService;
  private analyticsService: AnalyticsService;
  private performanceMetrics: Map<string, PerformanceMetric> = new Map();
  private slowQueryThreshold: number = 1000; // 1초
  private autoOptimizationEnabled: boolean = true;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 5000
    });

    this.cacheService = CacheService.getInstance();
    this.analyticsService = new AnalyticsService();
    this.initializePerformanceMonitoring();
  }

  /**
   * 성능 모니터링 초기화
   */
  private initializePerformanceMonitoring(): void {
    // 주기적으로 성능 메트릭 수집
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 30000); // 30초마다

    // 자동 최적화 실행
    setInterval(() => {
      if (this.autoOptimizationEnabled) {
        this.runAutoOptimization();
      }
    }, 300000); // 5분마다
  }

  /**
   * 데이터베이스 쿼리 최적화
   */
  async optimizeQuery<T>(
    queryBuilder: QueryBuilderWithExecute | SelectQueryBuilder<T>,
    queryType: QueryType,
    cacheKey?: string,
    cacheTTL: number = 300
  ): Promise<T[]> {
    const startTime = performance.now();
    
    try {
      // 캐시 확인 (SELECT 쿼리만)
      if (queryType === 'select' && cacheKey) {
        const cachedResult = await this.getCachedResult<T>(cacheKey);
        if (cachedResult) {
          await this.recordQueryPerformance('cache_hit', performance.now() - startTime);
          return cachedResult;
        }
      }

      // 쿼리 실행
      let result: T[];
      if ('getMany' in queryBuilder && queryBuilder.getMany) {
        result = await queryBuilder.getMany();
      } else if ('execute' in queryBuilder) {
        const execResult = await queryBuilder.execute();
        result = execResult as T[];
      } else {
        throw new Error('Invalid query builder');
      }
      const executionTime = performance.now() - startTime;

      // 느린 쿼리 감지
      if (executionTime > this.slowQueryThreshold) {
        await this.handleSlowQuery(queryBuilder, executionTime);
      }

      // 결과 캐시 (SELECT 쿼리만)
      if (queryType === 'select' && cacheKey && result) {
        await this.cacheResult(cacheKey, result as unknown[], cacheTTL);
      }

      // 성능 메트릭 기록
      await this.recordQueryPerformance(queryType, executionTime);

      return result as T[];
    } catch (error) {
      await this.recordQueryError(queryType, error as Error);
      throw error;
    }
  }

  /**
   * 캐시된 결과 조회
   */
  private async getCachedResult<T>(cacheKey: string): Promise<T[] | null> {
    try {
      const cached = await this.redis.get(`query:${cacheKey}`);
      return cached ? JSON.parse(cached) as T[] : null;
    } catch (error) {
      // Warning log removed
      return null;
    }
  }

  /**
   * 쿼리 결과 캐시
   */
  private async cacheResult(cacheKey: string, result: unknown[], ttl: number): Promise<void> {
    try {
      await this.redis.setex(
        `query:${cacheKey}`,
        ttl,
        JSON.stringify(result)
      );
    } catch (error) {
      // Warning log removed
    }
  }

  /**
   * 느린 쿼리 처리
   */
  private async handleSlowQuery<T>(queryBuilder: QueryBuilderWithExecute | SelectQueryBuilder<T>, executionTime: number): Promise<void> {
    const queryInfo: SlowQueryInfo = {
      query: ('getSql' in queryBuilder && typeof queryBuilder.getSql === 'function') ? queryBuilder.getSql() : 'Unknown',
      executionTime,
      frequency: 1,
      impact: executionTime > 5000 ? 'high' : executionTime > 2000 ? 'medium' : 'low'
    };

    // 느린 쿼리 로그 저장
    await this.redis.lpush('slow_queries', JSON.stringify(queryInfo));
    await this.redis.ltrim('slow_queries', 0, 99); // 최근 100개만 보관

    // 알림 생성
    await this.createPerformanceAlert('slow_query', {
      metric: 'query_time',
      currentValue: executionTime,
      threshold: this.slowQueryThreshold,
      details: { query: queryInfo.query }
    });

    // Warning log removed
  }

  /**
   * 쿼리 성능 메트릭 기록
   */
  private async recordQueryPerformance(queryType: string, executionTime: number): Promise<void> {
    const metric = this.performanceMetrics.get(queryType) || {
      type: queryType,
      count: 0,
      totalTime: 0,
      avgTime: 0,
      minTime: Infinity,
      maxTime: 0,
      lastUpdated: new Date()
    };

    metric.count++;
    metric.totalTime += executionTime;
    metric.avgTime = metric.totalTime / metric.count;
    metric.minTime = Math.min(metric.minTime, executionTime);
    metric.maxTime = Math.max(metric.maxTime, executionTime);
    metric.lastUpdated = new Date();

    this.performanceMetrics.set(queryType, metric);

    // Redis에 메트릭 저장
    await this.redis.hset(
      'performance_metrics',
      queryType,
      JSON.stringify(metric)
    );
  }

  /**
   * 쿼리 에러 기록
   */
  private async recordQueryError(queryType: string, error: Error): Promise<void> {
    const errorInfo = {
      type: queryType,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    await this.redis.lpush('query_errors', JSON.stringify(errorInfo));
    await this.redis.ltrim('query_errors', 0, 99);
  }

  /**
   * API 응답 최적화
   */
  async optimizeAPIResponse<T>(
    data: T,
    compressionLevel: CompressionLevel = 'medium',
    includeMetadata: boolean = false
  ): Promise<ImportedOptimizedResponse> {
    const startTime = performance.now();

    try {
      // 데이터 압축
      const compressedData = await this.compressData(data, compressionLevel);
      const dataStr = JSON.stringify(data);
      const compressedStr = JSON.stringify(compressedData);

      // 메타데이터 추가
      const metadata = includeMetadata ? {
        compressed: true,
        compressionRatio: dataStr.length / compressedStr.length,
        processingTime: performance.now() - startTime,
        timestamp: new Date().toISOString()
      } : undefined;

      return {
        data: compressedData as T,
        cached: false,
        executionTime: performance.now() - startTime,
        headers: this.generateCacheHeaders(data)
      };
    } catch (error) {
      // Error log removed
      return {
        data,
        cached: false,
        executionTime: performance.now() - startTime,
        headers: this.generateCacheHeaders(data)
      };
    }
  }

  /**
   * 데이터 압축
   */
  private async compressData<T>(data: T, level: CompressionLevel): Promise<T> {
    // 간단한 압축 로직 (실제로는 gzip 등 사용)
    if (typeof data === 'object') {
      return this.removeUnnecessaryFields(data, level);
    }
    return data;
  }

  /**
   * 불필요한 필드 제거
   */
  private removeUnnecessaryFields<T>(data: T, level: CompressionLevel): T {
    if (Array.isArray(data)) {
      return data.map((item: any) => this.removeUnnecessaryFields(item, level)) as T;
    }

    if (typeof data === 'object' && data !== null) {
      const cleaned: Record<string, unknown> = { ...data as Record<string, unknown> };

      // 레벨별 필드 제거
      if (level === 'low') {
        delete cleaned.createdAt;
        delete cleaned.updatedAt;
      } else if (level === 'medium') {
        delete cleaned.createdAt;
        delete cleaned.updatedAt;
        delete cleaned.deletedAt;
        delete cleaned.version;
      } else if (level === 'high') {
        delete cleaned.createdAt;
        delete cleaned.updatedAt;
        delete cleaned.deletedAt;
        delete cleaned.version;
        delete cleaned.metadata;
        delete cleaned.internalNotes;
      }

      return cleaned as T;
    }

    return data;
  }

  /**
   * 캐시 헤더 생성
   */
  private generateCacheHeaders<T>(data: T): ImportedCacheHeaders {
    return {
      'Cache-Control': 'public, max-age=300',
      'ETag': this.generateETag(data),
      'Last-Modified': new Date().toUTCString(),
      'Expires': new Date(Date.now() + 300000).toUTCString()
    };
  }

  /**
   * ETag 생성
   */
  private generateETag<T>(data: T): string {
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * 성능 메트릭 수집
   */
  private async collectPerformanceMetrics(): Promise<void> {
    const metrics = {
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeConnections: AppDataSource.isInitialized ? 
        ((AppDataSource.driver as TypeOrmDriver).pool?.totalCount) || 0 : 0,
      cacheHitRate: await this.calculateCacheHitRate(),
      queryMetrics: Object.fromEntries(this.performanceMetrics)
    };

    // 메트릭 저장
    await this.redis.lpush('performance_history', JSON.stringify(metrics));
    await this.redis.ltrim('performance_history', 0, 999); // 최근 1000개 보관

    // 임계값 체크
    await this.checkPerformanceThresholds(metrics);
  }

  /**
   * 캐시 히트율 계산
   */
  private async calculateCacheHitRate(): Promise<number> {
    try {
      const info = await this.redis.info('stats');
      const lines = info.split('\r\n');
      
      let keyspaceHits = 0;
      let keyspaceMisses = 0;

      for (const line of lines) {
        if (line.startsWith('keyspace_hits:')) {
          keyspaceHits = parseInt(line.split(':')[1]);
        } else if (line.startsWith('keyspace_misses:')) {
          keyspaceMisses = parseInt(line.split(':')[1]);
        }
      }

      const totalRequests = keyspaceHits + keyspaceMisses;
      return totalRequests > 0 ? (keyspaceHits / totalRequests) * 100 : 0;
    } catch (error) {
      // Warning log removed
      return 0;
    }
  }

  /**
   * 성능 임계값 체크
   */
  private async checkPerformanceThresholds(metrics: PerformanceMetrics): Promise<void> {
    const thresholds = {
      memoryUsage: 80, // 80% 메모리 사용률
      cacheHitRate: 70, // 70% 캐시 히트율
      avgQueryTime: 500, // 500ms 평균 쿼리 시간
      activeConnections: 15 // 15개 활성 연결
    };

    // 메모리 사용률 체크
    const memoryUsagePercent = (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > thresholds.memoryUsage) {
      await this.createPerformanceAlert('high_memory_usage', {
        metric: 'memory_usage',
        currentValue: memoryUsagePercent,
        threshold: thresholds.memoryUsage
      });
    }

    // 캐시 히트율 체크
    if (metrics.cacheHitRate < thresholds.cacheHitRate) {
      await this.createPerformanceAlert('low_cache_hit_rate', {
        metric: 'cache_hit_rate',
        currentValue: metrics.cacheHitRate,
        threshold: thresholds.cacheHitRate
      });
    }

    // 활성 연결 수 체크
    if (metrics.activeConnections > thresholds.activeConnections) {
      await this.createPerformanceAlert('high_db_connections', {
        metric: 'active_connections',
        currentValue: metrics.activeConnections,
        threshold: thresholds.activeConnections
      });
    }
  }

  /**
   * 성능 알림 생성
   */
  private async createPerformanceAlert(type: PerformanceAlertType, data: PerformanceAlertData): Promise<void> {
    const alert: PerformanceAlert = {
      type: type as PerformanceAlert['type'],
      severity: 'warning',
      message: `Performance issue detected: ${type}`,
      data,
      timestamp: new Date(),
    };

    await this.redis.lpush('performance_alerts', JSON.stringify(alert));
    await this.redis.ltrim('performance_alerts', 0, 99);

    // 분석 서비스로 알림 전송 (알림 기록)
    // await this.analyticsService.recordAlert(alert);
  }

  /**
   * 자동 최적화 실행
   */
  private async runAutoOptimization(): Promise<void> {
    try {
      // 캐시 최적화
      await this.optimizeCache();

      // 데이터베이스 최적화
      await this.optimizeDatabase();

      // 성능 통계 업데이트
      await this.updatePerformanceStats();

    } catch (error) {
      // Error log removed
      await this.createPerformanceAlert('auto_optimization_failed', {
        metric: 'optimization_status',
        currentValue: 0,
        threshold: 1,
        details: { error: (error as Error).message }
      });
    }
  }

  /**
   * 캐시 최적화
   */
  private async optimizeCache(): Promise<void> {
    // 만료된 캐시 정리
    const expiredKeys = await this.redis.keys('*:expired:*');
    if (expiredKeys.length > 0) {
      await this.redis.del(...expiredKeys);
    }

    // 캐시 메모리 사용량 체크
    const memoryInfo = await this.redis.info('memory');
    const memoryUsage = this.parseMemoryInfo(memoryInfo);

    if (memoryUsage.usedMemory > memoryUsage.maxMemory * 0.8) {
      // 캐시 정리 - LRU 방식
      await this.redis.config('SET', 'maxmemory-policy', 'allkeys-lru');
    }
  }

  /**
   * 메모리 정보 파싱
   */
  private parseMemoryInfo(info: string): MemoryInfo {
    const lines = info.split('\r\n');
    let usedMemory = 0;
    let maxMemory = 0;

    for (const line of lines) {
      if (line.startsWith('used_memory:')) {
        usedMemory = parseInt(line.split(':')[1]);
      } else if (line.startsWith('maxmemory:')) {
        maxMemory = parseInt(line.split(':')[1]);
      }
    }

    return { usedMemory, maxMemory };
  }

  /**
   * 데이터베이스 최적화
   */
  private async optimizeDatabase(): Promise<void> {
    if (!AppDataSource.isInitialized) return;

    try {
      // 연결 풀 상태 확인
      const pool = (AppDataSource.driver as TypeOrmDriver).pool;
      if (pool) {
        const poolStats = {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount
        };

        // 유휴 연결이 너무 많으면 정리
        if (poolStats.idleCount > 10) {
          // 일부 유휴 연결 해제
          // Note: pool.release() is not a standard method for TypeORM connection pools
          // Connection pool management is typically handled automatically by TypeORM
          // Consider using TypeORM's built-in connection pool configuration instead
        }
      }

      // 통계 업데이트 (PostgreSQL)
      await AppDataSource.query('ANALYZE');
      
    } catch (error) {
      // Warning log removed
    }
  }

  /**
   * 성능 통계 업데이트
   */
  private async updatePerformanceStats(): Promise<void> {
    const stats = {
      timestamp: new Date().toISOString(),
      queryMetrics: Object.fromEntries(this.performanceMetrics),
      cacheStats: await this.getCacheStats(),
      systemStats: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime()
      }
    };

    await this.redis.hset('performance_summary', 'latest', JSON.stringify(stats));
  }

  /**
   * 캐시 통계 조회
   */
  private async getCacheStats(): Promise<CacheMetrics> {
    try {
      const info = await this.redis.info('all');
      return this.convertToCacheMetrics(info);
    } catch (error) {
      // Warning log removed
      return {
        hits: 0,
        misses: 0,
        evictions: 0,
        hitRate: 0,
        memoryUsage: 0,
      };
    }
  }

  /**
   * Redis 정보 파싱
   */
  private parseRedisInfo(info: string): RedisInfo {
    const result: RedisInfo = {
      version: '',
      connectedClients: 0,
      usedMemory: 0,
      maxMemory: 0,
      evictedKeys: 0,
      hitRate: 0,
      commandsProcessed: 0
    };
    
    const lines = info.split('\r\n');
    let currentSection = '';
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        currentSection = line.substring(2).toLowerCase();
        continue;
      }
      
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        const numValue = isNaN(Number(value)) ? value : Number(value);
        
        // 간단한 파싱 로직
        if (key === 'redis_version') result.version = value;
        else if (key === 'connected_clients') result.connectedClients = Number(value) || 0;
        else if (key === 'used_memory') result.usedMemory = Number(value) || 0;
        else if (key === 'maxmemory') result.maxMemory = Number(value) || 0;
        else if (key === 'evicted_keys') result.evictedKeys = Number(value) || 0;
        else if (key === 'total_commands_processed') result.commandsProcessed = Number(value) || 0;
        else if (key === 'keyspace_hits' || key === 'keyspace_misses') {
          // hitRate 계산은 나중에
        }
      }
    }
    
    return result;
  }

  /**
   * 성능 리포트 생성
   */
  async generatePerformanceReport(): Promise<ImportedPerformanceReport> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24시간 전

    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const report: ImportedPerformanceReport = {
      timestamp: endTime,
      period: {
        start: startTime,
        end: endTime
      },
      metrics: {
        averageResponseTime: this.calculateAverageResponseTime(),
        totalRequests: 0,
        errorRate: this.calculateErrorRate(),
        cacheHitRate: 0,
        slowQueries: await this.getSlowQueries(),
        resourceUsage: {
          cpu: (cpuUsage.user + cpuUsage.system) / 1000000,
          memory: memoryUsage.heapUsed / memoryUsage.heapTotal * 100,
          disk: 0,
          network: { incoming: 0, outgoing: 0 },
          timestamp: new Date()
        }
      },
      recommendations: await this.generateRecommendations()
    };

    return report;
  }

  /**
   * 느린 쿼리 조회
   */
  private async getSlowQueries(): Promise<SlowQueryInfo[]> {
    try {
      const queries = await this.redis.lrange('slow_queries', 0, -1);
      return queries.map((q: any) => JSON.parse(q) as SlowQueryInfo);
    } catch (error) {
      // Warning log removed
      return [];
    }
  }

  /**
   * 성능 알림 조회
   */
  private async getPerformanceAlerts(): Promise<PerformanceAlert[]> {
    try {
      const alerts = await this.redis.lrange('performance_alerts', 0, -1);
      return alerts.map((a: any) => JSON.parse(a) as PerformanceAlert);
    } catch (error) {
      // Warning log removed
      return [];
    }
  }

  /**
   * Query metrics 조회
   */
  private async getQueryMetrics(): Promise<QueryPerformanceMetrics> {
    let totalQueries = 0;
    let totalTime = 0;
    let slowQueries = 0;

    for (const [_, metric] of this.performanceMetrics) {
      totalQueries += metric.count;
      totalTime += metric.totalTime;
      if (metric.avgTime > this.slowQueryThreshold) {
        slowQueries++;
      }
    }

    const cacheHitRate = await this.calculateCacheHitRate();
    const avgQueryTime = totalQueries > 0 ? totalTime / totalQueries : 0;

    return {
      totalQueries,
      averageExecutionTime: avgQueryTime,
      slowQueries,
      cacheHitRate,
      indexUsageRate: 0
    };
  }

  /**
   * 평균 응답 시간 계산
   */
  private calculateAverageResponseTime(): number {
    let totalTime = 0;
    let totalCount = 0;

    for (const [_, metric] of this.performanceMetrics) {
      totalTime += metric.totalTime;
      totalCount += metric.count;
    }

    return totalCount > 0 ? totalTime / totalCount : 0;
  }

  /**
   * 에러율 계산
   */
  private calculateErrorRate(): number {
    // TODO: Implement actual error rate calculation based on error logs
    return 0;
  }

  /**
   * Cache metrics 변환
   */
  private convertToCacheMetrics(redisInfoStr: string): CacheMetrics {
    const redisInfo = this.parseRedisInfo(redisInfoStr);
    const stats = redisInfo.stats || {};
    const memory = redisInfo.memory || {};
    const keyspace = redisInfo.keyspace || {};

    let totalKeys = 0;
    for (const db in keyspace) {
      totalKeys += keyspace[db].keys || 0;
    }

    const hits = 'keyspace_hits' in stats ? (stats.keyspace_hits as number) : 0;
    const misses = 'keyspace_misses' in stats ? (stats.keyspace_misses as number) : 0;
    const total = hits + misses;
    const evictions = 'evicted_keys' in stats ? (stats.evicted_keys as number) : 0;
    const memoryUsed = 'used_memory' in memory ? (memory.used_memory as number) : 0;

    return {
      hits,
      misses,
      evictions,
      hitRate: total > 0 ? (hits / total) * 100 : 0,
      memoryUsage: memoryUsed,
    };
  }

  /**
   * 성능 개선 권장사항 생성
   */
  private async generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];

    // 쿼리 성능 분석
    for (const [type, metric] of this.performanceMetrics) {
      if (metric.avgTime > 500) {
        recommendations.push(`Consider optimizing ${type} queries (avg: ${metric.avgTime}ms)`);
      }
    }

    // 캐시 히트율 분석
    const cacheHitRate = await this.calculateCacheHitRate();
    if (cacheHitRate < 70) {
      recommendations.push(`Improve cache hit rate (current: ${cacheHitRate}%)`);
    }

    // 메모리 사용량 분석
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 80) {
      recommendations.push(`High memory usage detected (${memoryUsagePercent}%)`);
    }

    return recommendations;
  }

  /**
   * 성능 최적화 설정 업데이트
   */
  async updateOptimizationSettings(settings: OptimizationSettings): Promise<void> {
    this.slowQueryThreshold = settings.slowQueryThreshold || this.slowQueryThreshold;
    this.autoOptimizationEnabled = settings.autoOptimizationEnabled !== undefined ? 
      settings.autoOptimizationEnabled : this.autoOptimizationEnabled;

    // 설정 저장
    await this.redis.hset('optimization_settings', 'current', JSON.stringify(settings));
  }

  /**
   * 서비스 종료
   */
  async shutdown(): Promise<void> {
    try {
      await this.redis.disconnect();
    } catch (error) {
      // Error log removed
    }
  }
}

// Custom type definitions (not in @o4o/types)
interface PerformanceMetric {
  type: string;
  count: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  lastUpdated: Date;
}

interface OptimizationSettings {
  slowQueryThreshold?: number;
  autoOptimizationEnabled?: boolean;
  cacheStrategy?: 'aggressive' | 'moderate' | 'conservative';
  compressionLevel?: CompressionLevel;
}

// Additional type definitions
type PerformanceAlertType = 'slow_query' | 'high_memory_usage' | 'low_cache_hit_rate' | 'high_db_connections' | 'auto_optimization_failed';

interface MemoryInfo {
  usedMemory: number;
  maxMemory: number;
}

interface PerformanceMetrics {
  timestamp: string;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeConnections: number;
  cacheHitRate: number;
  queryMetrics: Record<string, PerformanceMetric>;
}

// 싱글톤 인스턴스
export const performanceOptimizationService = new PerformanceOptimizationService();