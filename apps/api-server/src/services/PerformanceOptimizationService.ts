import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { CacheService } from './cacheService';
import { AnalyticsService } from './AnalyticsService';
import Redis from 'ioredis';
import { performance } from 'perf_hooks';

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

    this.cacheService = new CacheService();
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
  async optimizeQuery(
    queryBuilder: any,
    queryType: 'select' | 'update' | 'delete' | 'insert',
    cacheKey?: string,
    cacheTTL: number = 300
  ): Promise<any> {
    const startTime = performance.now();
    
    try {
      // 캐시 확인 (SELECT 쿼리만)
      if (queryType === 'select' && cacheKey) {
        const cachedResult = await this.getCachedResult(cacheKey);
        if (cachedResult) {
          await this.recordQueryPerformance('cache_hit', performance.now() - startTime);
          return cachedResult;
        }
      }

      // 쿼리 실행
      const result = await queryBuilder.getMany ? queryBuilder.getMany() : queryBuilder.execute();
      const executionTime = performance.now() - startTime;

      // 느린 쿼리 감지
      if (executionTime > this.slowQueryThreshold) {
        await this.handleSlowQuery(queryBuilder, executionTime);
      }

      // 결과 캐시 (SELECT 쿼리만)
      if (queryType === 'select' && cacheKey && result) {
        await this.cacheResult(cacheKey, result, cacheTTL);
      }

      // 성능 메트릭 기록
      await this.recordQueryPerformance(queryType, executionTime);

      return result;
    } catch (error) {
      await this.recordQueryError(queryType, error as Error);
      throw error;
    }
  }

  /**
   * 캐시된 결과 조회
   */
  private async getCachedResult(cacheKey: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(`query:${cacheKey}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to get cached query result:', error);
      return null;
    }
  }

  /**
   * 쿼리 결과 캐시
   */
  private async cacheResult(cacheKey: string, result: any, ttl: number): Promise<void> {
    try {
      await this.redis.setex(
        `query:${cacheKey}`,
        ttl,
        JSON.stringify(result)
      );
    } catch (error) {
      console.warn('Failed to cache query result:', error);
    }
  }

  /**
   * 느린 쿼리 처리
   */
  private async handleSlowQuery(queryBuilder: any, executionTime: number): Promise<void> {
    const queryInfo = {
      sql: queryBuilder.getSql ? queryBuilder.getSql() : 'Unknown',
      executionTime,
      timestamp: new Date().toISOString()
    };

    // 느린 쿼리 로그 저장
    await this.redis.lpush('slow_queries', JSON.stringify(queryInfo));
    await this.redis.ltrim('slow_queries', 0, 99); // 최근 100개만 보관

    // 알림 생성
    await this.createPerformanceAlert('slow_query', queryInfo);

    console.warn(`Slow query detected: ${executionTime}ms`, queryInfo);
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
  async optimizeAPIResponse(
    data: any,
    compressionLevel: 'low' | 'medium' | 'high' = 'medium',
    includeMetadata: boolean = false
  ): Promise<OptimizedResponse> {
    const startTime = performance.now();

    try {
      // 데이터 압축
      const compressedData = await this.compressData(data, compressionLevel);

      // 메타데이터 추가
      const metadata = includeMetadata ? {
        compressed: true,
        compressionRatio: data.length / compressedData.length,
        processingTime: performance.now() - startTime,
        timestamp: new Date().toISOString()
      } : undefined;

      return {
        data: compressedData,
        metadata,
        cacheHeaders: this.generateCacheHeaders(data)
      };
    } catch (error) {
      console.error('API response optimization failed:', error);
      return {
        data,
        metadata: includeMetadata ? {
          compressed: false,
          error: (error as Error).message,
          processingTime: performance.now() - startTime,
          timestamp: new Date().toISOString()
        } : undefined
      };
    }
  }

  /**
   * 데이터 압축
   */
  private async compressData(data: any, level: 'low' | 'medium' | 'high'): Promise<any> {
    // 간단한 압축 로직 (실제로는 gzip 등 사용)
    if (typeof data === 'object') {
      return this.removeUnnecessaryFields(data, level);
    }
    return data;
  }

  /**
   * 불필요한 필드 제거
   */
  private removeUnnecessaryFields(data: any, level: 'low' | 'medium' | 'high'): any {
    if (Array.isArray(data)) {
      return data.map(item => this.removeUnnecessaryFields(item, level));
    }

    if (typeof data === 'object' && data !== null) {
      const cleaned = { ...data };

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

      return cleaned;
    }

    return data;
  }

  /**
   * 캐시 헤더 생성
   */
  private generateCacheHeaders(data: any): CacheHeaders {
    return {
      'Cache-Control': 'public, max-age=300',
      'ETag': this.generateETag(data),
      'Last-Modified': new Date().toUTCString(),
      'Vary': 'Accept-Encoding'
    };
  }

  /**
   * ETag 생성
   */
  private generateETag(data: any): string {
    const hash = require('crypto').createHash('md5');
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
        (AppDataSource.driver as any).pool?.totalCount || 0 : 0,
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
      console.warn('Failed to calculate cache hit rate:', error);
      return 0;
    }
  }

  /**
   * 성능 임계값 체크
   */
  private async checkPerformanceThresholds(metrics: any): Promise<void> {
    const thresholds = {
      memoryUsage: 80, // 80% 메모리 사용률
      cacheHitRate: 70, // 70% 캐시 히트율
      avgQueryTime: 500, // 500ms 평균 쿼리 시간
      activeConnections: 15 // 15개 활성 연결
    };

    // 메모리 사용률 체크
    const memoryUsagePercent = (metrics.memoryUsage.used / metrics.memoryUsage.total) * 100;
    if (memoryUsagePercent > thresholds.memoryUsage) {
      await this.createPerformanceAlert('high_memory_usage', {
        current: memoryUsagePercent,
        threshold: thresholds.memoryUsage
      });
    }

    // 캐시 히트율 체크
    if (metrics.cacheHitRate < thresholds.cacheHitRate) {
      await this.createPerformanceAlert('low_cache_hit_rate', {
        current: metrics.cacheHitRate,
        threshold: thresholds.cacheHitRate
      });
    }

    // 활성 연결 수 체크
    if (metrics.activeConnections > thresholds.activeConnections) {
      await this.createPerformanceAlert('high_db_connections', {
        current: metrics.activeConnections,
        threshold: thresholds.activeConnections
      });
    }
  }

  /**
   * 성능 알림 생성
   */
  private async createPerformanceAlert(type: string, data: any): Promise<void> {
    const alert = {
      type,
      severity: 'warning',
      message: `Performance issue detected: ${type}`,
      data,
      timestamp: new Date().toISOString(),
      source: 'PerformanceOptimizationService'
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

      console.log('✅ Auto-optimization completed successfully');
    } catch (error) {
      console.error('❌ Auto-optimization failed:', error);
      await this.createPerformanceAlert('auto_optimization_failed', {
        error: (error as Error).message
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
  private parseMemoryInfo(info: string): { usedMemory: number; maxMemory: number } {
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
      const pool = (AppDataSource.driver as any).pool;
      if (pool) {
        const poolStats = {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount
        };

        // 유휴 연결이 너무 많으면 정리
        if (poolStats.idleCount > 10) {
          // 일부 유휴 연결 해제
          for (let i = 0; i < Math.floor(poolStats.idleCount / 2); i++) {
            try {
              await pool.release();
            } catch (error) {
              break;
            }
          }
        }
      }

      // 통계 업데이트 (PostgreSQL)
      await AppDataSource.query('ANALYZE');
      
      console.log('✅ Database optimization completed');
    } catch (error) {
      console.warn('Database optimization failed:', error);
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
  private async getCacheStats(): Promise<any> {
    try {
      const info = await this.redis.info('all');
      const stats = this.parseRedisInfo(info);
      return stats;
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return {};
    }
  }

  /**
   * Redis 정보 파싱
   */
  private parseRedisInfo(info: string): any {
    const stats: any = {};
    const lines = info.split('\r\n');

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        stats[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }

    return stats;
  }

  /**
   * 성능 리포트 생성
   */
  async generatePerformanceReport(): Promise<PerformanceReport> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24시간 전

    const report: PerformanceReport = {
      generatedAt: endTime.toISOString(),
      period: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      },
      queryMetrics: Object.fromEntries(this.performanceMetrics),
      cacheMetrics: await this.getCacheStats(),
      systemMetrics: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime()
      },
      slowQueries: await this.getSlowQueries(),
      alerts: await this.getPerformanceAlerts(),
      recommendations: await this.generateRecommendations()
    };

    return report;
  }

  /**
   * 느린 쿼리 조회
   */
  private async getSlowQueries(): Promise<any[]> {
    try {
      const queries = await this.redis.lrange('slow_queries', 0, -1);
      return queries.map(q => JSON.parse(q));
    } catch (error) {
      console.warn('Failed to get slow queries:', error);
      return [];
    }
  }

  /**
   * 성능 알림 조회
   */
  private async getPerformanceAlerts(): Promise<any[]> {
    try {
      const alerts = await this.redis.lrange('performance_alerts', 0, -1);
      return alerts.map(a => JSON.parse(a));
    } catch (error) {
      console.warn('Failed to get performance alerts:', error);
      return [];
    }
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
      console.log('✅ Performance optimization service shutdown completed');
    } catch (error) {
      console.error('❌ Performance optimization service shutdown failed:', error);
    }
  }
}

// 타입 정의
interface PerformanceMetric {
  type: string;
  count: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  lastUpdated: Date;
}

interface OptimizedResponse {
  data: any;
  metadata?: {
    compressed: boolean;
    compressionRatio?: number;
    processingTime: number;
    timestamp: string;
    error?: string;
  };
  cacheHeaders?: CacheHeaders;
}

interface CacheHeaders {
  'Cache-Control': string;
  'ETag': string;
  'Last-Modified': string;
  'Vary': string;
}

interface PerformanceReport {
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  queryMetrics: any;
  cacheMetrics: any;
  systemMetrics: any;
  slowQueries: any[];
  alerts: any[];
  recommendations: string[];
}

interface OptimizationSettings {
  slowQueryThreshold?: number;
  autoOptimizationEnabled?: boolean;
  cacheStrategy?: 'aggressive' | 'moderate' | 'conservative';
  compressionLevel?: 'low' | 'medium' | 'high';
}

// 싱글톤 인스턴스
export const performanceOptimizationService = new PerformanceOptimizationService();