import * as crypto from 'crypto';
import { AppDataSource } from '../database/connection';
import { Repository, SelectQueryBuilder, EntityMetadata } from 'typeorm';
import { performance } from 'perf_hooks';
import Redis from 'ioredis';
import { AnalyticsService } from './AnalyticsService';
import {
  SlowQuery as ImportedSlowQuery,
  IndexInfo,
  DuplicateIndex as ImportedDuplicateIndex,
  TableStats as ImportedTableStats,
  TableSize as ImportedTableSize,
  ConnectionInfo,
  LockInfo,
  QueryPlan,
  PlanNode,
  QueryResult,
  DatabasePerformanceThresholds as ImportedPerformanceThresholds,
  ConnectionPoolStats as ImportedConnectionPoolStats,
  normalizeConnectionPoolStats,
  normalizePerformanceThresholds,
  IndexRecommendation as ImportedIndexRecommendation,
  QueryCacheEntry as ImportedQueryCacheEntry,
  QueryPattern as ImportedQueryPattern,
  QueryPerformanceMetrics
} from '../types';

/**
 * 데이터베이스 최적화 서비스
 * 
 * 핵심 기능:
 * - 쿼리 성능 분석 및 최적화
 * - 인덱스 자동 관리
 * - 연결 풀 최적화
 * - 데이터베이스 통계 수집
 * - 쿼리 플랜 분석
 */
export class DatabaseOptimizationService {
  private redis: Redis;
  private analyticsService: AnalyticsService;
  private queryCache: Map<string, QueryCacheEntry> = new Map();
  private performanceThresholds!: PerformanceThresholds;
  private indexRecommendations: Map<string, IndexRecommendation[]> = new Map();
  private connectionPoolStats: ConnectionPoolStats = normalizeConnectionPoolStats({
    activeConnections: 0,
    idleConnections: 0,
    totalConnections: 0,
    waitingConnections: 0,
    maxConnections: 20,
    acquiredConnections: 0,
    releasedConnections: 0
  });

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    });

    this.analyticsService = new AnalyticsService();
    
    this.initializeThresholds();
    this.startOptimizationTasks();
  }

  /**
   * 성능 임계값 초기화
   */
  private initializeThresholds(): void {
    this.performanceThresholds = normalizePerformanceThresholds({
      slowQueryThreshold: 1000, // 1초
      verySlowQueryThreshold: 5000, // 5초
      highConnectionUsage: 15, // 최대 연결의 75%
      lowCacheHitRate: 70, // 70% 이하
      longRunningTransactionThreshold: 30000, // 30초
      tableAnalyzeThreshold: 100000, // 10만 행 변경 시
      deadlockThreshold: 5 // 시간당 5개 이상
    });
  }

  /**
   * 최적화 작업 시작
   */
  private startOptimizationTasks(): void {
    // 쿼리 성능 모니터링
    setInterval(() => {
      this.analyzeQueryPerformance();
    }, 60000); // 1분마다

    // 인덱스 분석
    setInterval(() => {
      this.analyzeIndexUsage();
    }, 1800000); // 30분마다

    // 연결 풀 모니터링
    setInterval(() => {
      this.monitorConnectionPool();
    }, 30000); // 30초마다

    // 데이터베이스 통계 수집
    setInterval(() => {
      this.collectDatabaseStats();
    }, 300000); // 5분마다

    // 자동 최적화 실행
    setInterval(() => {
      this.runAutoOptimization();
    }, 3600000); // 1시간마다
  }

  /**
   * 쿼리 성능 분석
   */
  async analyzeQueryPerformance(): Promise<void> {
    if (!AppDataSource.isInitialized) return;

    try {
      // 느린 쿼리 분석
      const slowQueries = await this.getSlowQueries();
      
      for (const query of slowQueries) {
        await this.analyzeSlowQuery(query);
      }

      // 쿼리 패턴 분석
      await this.analyzeQueryPatterns();

      // 캐시 히트율 분석
      await this.analyzeCacheHitRates();


    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 느린 쿼리 조회
   */
  private async getSlowQueries(): Promise<SlowQuery[]> {
    try {
      // PostgreSQL의 pg_stat_statements 확장 사용
      const queries = await AppDataSource.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          max_time,
          min_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements
        WHERE mean_time > $1
        ORDER BY mean_time DESC
        LIMIT 20
      `, [this.performanceThresholds.slowQueryThreshold]);

      return queries.map((q: Record<string, unknown>) => ({
        query: q.query as string,
        calls: parseInt(String(q.calls)),
        totalTime: parseFloat(String(q.total_time)),
        meanTime: parseFloat(String(q.mean_time)),
        maxTime: parseFloat(String(q.max_time)),
        minTime: parseFloat(String(q.min_time)),
        rows: parseInt(String(q.rows)),
        hitPercent: parseFloat(String(q.hit_percent)) || 0
      }));

    } catch (error) {
      // Warning log removed
      return [];
    }
  }

  /**
   * 느린 쿼리 개별 분석
   */
  private async analyzeSlowQuery(query: SlowQuery): Promise<void> {
    try {
      // 쿼리 실행 계획 분석
      const executionPlan = await this.getQueryExecutionPlan(query.query);
      
      // 인덱스 권장사항 생성
      const indexSuggestions = this.generateIndexSuggestions(query, executionPlan);
      
      // 쿼리 최적화 제안 생성
      const optimizationSuggestions = this.generateQueryOptimizations(query, executionPlan);

      // 분석 결과 저장
      const analysis: QueryAnalysis = {
        query: query.query,
        performance: query,
        executionPlan,
        indexSuggestions,
        optimizationSuggestions,
        analyzedAt: new Date().toISOString()
      };

      await this.redis.hset(
        'query_analysis',
        this.generateQueryHash(query.query),
        JSON.stringify(analysis)
      );

      // 심각한 성능 문제인 경우 알림
      if (query.meanTime > this.performanceThresholds.verySlowQueryThreshold) {
        await this.createPerformanceAlert('very_slow_query', {
          query: query.query,
          meanTime: query.meanTime,
          calls: query.calls,
          rows: query.rows
        });
      }

    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 쿼리 실행 계획 조회
   */
  private async getQueryExecutionPlan(query: string): Promise<ExecutionPlan> {
    try {
      const plan = await AppDataSource.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`) as Array<{ 'QUERY PLAN': QueryPlan[] }>;
      const queryPlan = plan[0]['QUERY PLAN'][0] as QueryPlan;
      return {
        plan: queryPlan.Plan,
        totalCost: queryPlan.Plan['Total Cost'],
        actualTime: queryPlan.Plan['Actual Total Time'] || 0,
        planningTime: queryPlan['Planning Time'] || 0,
        executionTime: queryPlan['Execution Time'] || 0
      };
    } catch (error) {
      // Warning log removed
      return {
        plan: null,
        totalCost: 0,
        actualTime: 0,
        planningTime: 0,
        executionTime: 0
      };
    }
  }

  /**
   * 인덱스 제안 생성
   */
  private generateIndexSuggestions(query: SlowQuery, plan: ExecutionPlan): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];

    // Seq Scan 감지
    if (plan.plan && this.containsSeqScan(plan.plan)) {
      suggestions.push({
        type: 'missing_index',
        table: this.extractTableFromPlan(plan.plan),
        columns: this.extractColumnsFromWhere(query.query),
        reason: 'Sequential scan detected - consider adding index',
        priority: 'high',
        estimatedImprovement: this.estimateIndexImprovement(query, plan)
      });
    }

    // Sort 최적화
    if (plan.plan && this.containsSort(plan.plan)) {
      suggestions.push({
        type: 'sort_optimization',
        table: this.extractTableFromPlan(plan.plan),
        columns: this.extractColumnsFromOrderBy(query.query),
        reason: 'External sort detected - consider composite index',
        priority: 'medium',
        estimatedImprovement: 0.3
      });
    }

    return suggestions;
  }

  /**
   * 쿼리 최적화 제안 생성
   */
  private generateQueryOptimizations(query: SlowQuery, plan: ExecutionPlan): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // JOIN 최적화
    if (query.query.toUpperCase().includes('JOIN')) {
      suggestions.push({
        type: 'join_optimization',
        description: 'Consider reordering JOINs or adding WHERE conditions',
        sqlExample: this.optimizeJoins(query.query),
        estimatedImprovement: 0.4
      });
    }

    // LIMIT 최적화
    if (!query.query.toUpperCase().includes('LIMIT') && query.rows > 1000) {
      suggestions.push({
        type: 'add_limit',
        description: 'Consider adding LIMIT clause if not all rows are needed',
        sqlExample: `${query.query} LIMIT 100`,
        estimatedImprovement: 0.8
      });
    }

    // 서브쿼리 최적화
    if (query.query.includes('SELECT') && query.query.match(/SELECT.*SELECT/i)) {
      suggestions.push({
        type: 'subquery_optimization',
        description: 'Consider converting subqueries to JOINs',
        sqlExample: this.optimizeSubqueries(query.query),
        estimatedImprovement: 0.3
      });
    }

    return suggestions;
  }

  /**
   * 쿼리 패턴 분석
   */
  private async analyzeQueryPatterns(): Promise<void> {
    try {
      const patterns = await this.identifyQueryPatterns();
      
      // 패턴별 최적화 제안
      for (const pattern of patterns) {
        const optimization = this.generatePatternOptimization(pattern);
        if (optimization) {
          await this.redis.hset(
            'query_patterns',
            pattern.type,
            JSON.stringify(optimization)
          );
        }
      }

    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 쿼리 패턴 식별
   */
  private async identifyQueryPatterns(): Promise<QueryPattern[]> {
    const patterns: QueryPattern[] = [];

    try {
      // 자주 실행되는 쿼리 패턴 분석
      const frequentQueries = await AppDataSource.query(`
        SELECT 
          regexp_replace(query, '\\$[0-9]+', '?', 'g') as pattern,
          count(*) as frequency,
          avg(mean_time) as avg_time
        FROM pg_stat_statements
        WHERE calls > 10
        GROUP BY pattern
        ORDER BY frequency DESC
        LIMIT 20
      `);

      for (const q of frequentQueries) {
        patterns.push({
          type: this.classifyQueryPattern(q.pattern),
          pattern: q.pattern,
          frequency: parseInt(q.frequency),
          avgTime: parseFloat(q.avg_time)
        });
      }

    } catch (error) {
      // Warning log removed
    }

    return patterns;
  }

  /**
   * 캐시 히트율 분석
   */
  private async analyzeCacheHitRates(): Promise<void> {
    try {
      const cacheStats = await AppDataSource.query(`
        SELECT 
          schemaname,
          tablename,
          heap_blks_read,
          heap_blks_hit,
          100 * heap_blks_hit / (heap_blks_hit + heap_blks_read) as hit_rate
        FROM pg_statio_user_tables
        WHERE heap_blks_read + heap_blks_hit > 0
        ORDER BY hit_rate ASC
      `);

      for (const table of cacheStats) {
        const hitRate = parseFloat(table.hit_rate);
        if (hitRate < this.performanceThresholds.lowCacheHitRate) {
          await this.createPerformanceAlert('low_cache_hit_rate', {
            table: `${table.schemaname}.${table.tablename}`,
            hitRate
          });
        }
      }

      // 전체 캐시 히트율 저장
      await this.redis.hset('db_cache_stats', 'tables', JSON.stringify(cacheStats));

    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 인덱스 사용량 분석
   */
  async analyzeIndexUsage(): Promise<void> {
    if (!AppDataSource.isInitialized) return;

    try {
      // 사용되지 않는 인덱스 찾기
      const unusedIndexes = await this.findUnusedIndexes();
      
      // 중복 인덱스 찾기
      const duplicateIndexes = await this.findDuplicateIndexes();
      
      // 인덱스 사용 통계
      const indexStats = await this.getIndexUsageStats();

      // 권장사항 생성
      const recommendations = this.generateIndexRecommendations(
        unusedIndexes,
        duplicateIndexes,
        indexStats
      );

      // 결과 저장
      await this.redis.hset('index_analysis', 'latest', JSON.stringify({
        unusedIndexes,
        duplicateIndexes,
        indexStats,
        recommendations,
        analyzedAt: new Date().toISOString()
      }));


    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 사용되지 않는 인덱스 찾기
   */
  private async findUnusedIndexes(): Promise<UnusedIndex[]> {
    try {
      const indexes = await AppDataSource.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes
        WHERE idx_tup_read = 0 AND idx_tup_fetch = 0
        AND schemaname NOT IN ('information_schema', 'pg_catalog')
        ORDER BY pg_relation_size(indexrelid) DESC
      `);

      return indexes.map((idx: Record<string, unknown>) => ({
        schema: idx.schemaname as string,
        table: idx.tablename as string,
        index: idx.indexname as string,
        size: idx.size as string,
        tupRead: parseInt(String(idx.idx_tup_read)),
        tupFetch: parseInt(String(idx.idx_tup_fetch))
      }));

    } catch (error) {
      // Warning log removed
      return [];
    }
  }

  /**
   * 중복 인덱스 찾기
   */
  private async findDuplicateIndexes(): Promise<DuplicateIndex[]> {
    try {
      const duplicates = await AppDataSource.query(`
        SELECT 
          t.tablename,
          array_agg(t.indexname) as indexes,
          array_agg(pg_size_pretty(pg_relation_size(c.oid))) as sizes
        FROM pg_indexes t
        JOIN pg_class c ON c.relname = t.indexname
        WHERE t.schemaname = 'public'
        GROUP BY t.tablename, t.indexdef
        HAVING count(*) > 1
      `);

      return duplicates.map((dup: Record<string, unknown>) => ({
        table: dup.tablename,
        indexes: dup.indexes,
        sizes: dup.sizes
      }));

    } catch (error) {
      // Warning log removed
      return [];
    }
  }

  /**
   * 인덱스 사용 통계 조회
   */
  private async getIndexUsageStats(): Promise<IndexUsageStats[]> {
    try {
      const stats = await AppDataSource.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_scan,
          pg_size_pretty(pg_relation_size(indexrelid)) as size,
          pg_relation_size(indexrelid) as size_bytes
        FROM pg_stat_user_indexes
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        ORDER BY idx_scan DESC
      `);

      return stats.map((stat: Record<string, unknown>) => ({
        schema: stat.schemaname as string,
        table: stat.tablename as string,
        index: stat.indexname as string,
        tupRead: parseInt(String(stat.idx_tup_read)),
        tupFetch: parseInt(String(stat.idx_tup_fetch)),
        scan: parseInt(String(stat.idx_scan)),
        size: stat.size as string,
        sizeBytes: parseInt(String(stat.size_bytes))
      }));

    } catch (error) {
      // Warning log removed
      return [];
    }
  }

  /**
   * 인덱스 권장사항 생성
   */
  private generateIndexRecommendations(
    unusedIndexes: UnusedIndex[],
    duplicateIndexes: DuplicateIndex[],
    indexStats: IndexUsageStats[]
  ): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = [];

    // 사용되지 않는 인덱스 제거 권장
    for (const index of unusedIndexes) {
      recommendations.push({
        type: 'drop_unused',
        table: index.table,
        index: index.index,
        reason: 'Index is not being used and consuming space',
        action: `DROP INDEX ${index.index}`,
        priority: 'medium',
        impact: `Will free up ${index.size}`
      });
    }

    // 중복 인덱스 정리 권장
    for (const duplicate of duplicateIndexes) {
      recommendations.push({
        type: 'remove_duplicate',
        table: duplicate.table,
        index: duplicate.indexes[1], // 첫 번째 제외하고 제거
        reason: 'Duplicate index detected',
        action: `DROP INDEX ${duplicate.indexes[1]}`,
        priority: 'low',
        impact: `Will free up ${duplicate.sizes[1]}`
      });
    }

    // 효율성이 낮은 인덱스 최적화 권장
    const inefficientIndexes = indexStats.filter((stat: any) => 
      stat.scan > 0 && (stat.tupRead / stat.scan) > 1000
    );

    for (const index of inefficientIndexes) {
      recommendations.push({
        type: 'optimize_inefficient',
        table: index.table,
        index: index.index,
        reason: 'Index has low selectivity - consider adding more columns',
        action: `-- Consider creating composite index`,
        priority: 'low',
        impact: 'May improve query performance'
      });
    }

    return recommendations;
  }

  /**
   * 연결 풀 모니터링
   */
  private async monitorConnectionPool(): Promise<void> {
    if (!AppDataSource.isInitialized) return;

    try {
      const pool = (AppDataSource.driver as { pool?: {
        totalCount: number;
        idleCount: number;
        waitingCount?: number;
        max?: number;
        acquiredCount?: number;
        releasedCount?: number;
        release(): Promise<void>;
      } }).pool;
      
      if (pool) {
        this.connectionPoolStats = normalizeConnectionPoolStats({
          activeConnections: pool.totalCount - pool.idleCount,
          idleConnections: pool.idleCount,
          totalConnections: pool.totalCount,
          waitingConnections: pool.waitingCount || 0,
          maxConnections: pool.max || 20,
          acquiredConnections: pool.acquiredCount || 0,
          releasedConnections: pool.releasedCount || 0
        });

        // 연결 풀 통계 저장
        await this.redis.hset(
          'connection_pool_stats',
          'current',
          JSON.stringify({
            ...this.connectionPoolStats,
            timestamp: new Date().toISOString()
          })
        );

        // 높은 연결 사용률 감지
        const usageRate = this.connectionPoolStats.activeConnections / this.connectionPoolStats.maxConnections;
        if (usageRate > 0.8) {
          await this.createPerformanceAlert('high_connection_usage', {
            activeConnections: this.connectionPoolStats.activeConnections,
            maxConnections: this.connectionPoolStats.maxConnections,
            usageRate: Math.round(usageRate * 100)
          });
        }

        // 대기 중인 연결이 많은 경우
        if (this.connectionPoolStats.waitingConnections > 5) {
          await this.createPerformanceAlert('connection_pool_congestion', {
            waitingConnections: this.connectionPoolStats.waitingConnections
          });
        }
      }

    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 데이터베이스 통계 수집
   */
  private async collectDatabaseStats(): Promise<void> {
    if (!AppDataSource.isInitialized) return;

    try {
      // 테이블 크기 통계
      const tableSizes = await this.getTableSizes();
      
      // 데이터베이스 크기
      const dbSize = await this.getDatabaseSize();
      
      // 활성 연결 통계
      const activeConnections = await this.getActiveConnections();
      
      // 락 통계
      const lockStats = await this.getLockStats();

      const stats = {
        tableSizes,
        dbSize,
        activeConnections,
        lockStats,
        collectedAt: new Date().toISOString()
      };

      // 통계 저장
      await this.redis.hset('db_stats', 'latest', JSON.stringify(stats));
      
      // 히스토리 저장
      await this.redis.lpush('db_stats_history', JSON.stringify(stats));
      await this.redis.ltrim('db_stats_history', 0, 99);

    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 테이블 크기 조회
   */
  private async getTableSizes(): Promise<TableSize[]> {
    try {
      const sizes = await AppDataSource.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
        FROM pg_tables
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20
      `);

      return sizes.map((size: Record<string, unknown>) => ({
        schema: size.schemaname as string,
        table: size.tablename as string,
        totalSize: size.size as string,
        totalSizeBytes: parseInt(String(size.size_bytes)),
        tableSize: size.table_size as string,
        indexSize: size.index_size as string
      }));

    } catch (error) {
      // Warning log removed
      return [];
    }
  }

  /**
   * 데이터베이스 크기 조회
   */
  private async getDatabaseSize(): Promise<string> {
    try {
      const result = await AppDataSource.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      return result[0].size;
    } catch (error) {
      // Warning log removed
      return 'Unknown';
    }
  }

  /**
   * 활성 연결 조회
   */
  private async getActiveConnections(): Promise<ActiveConnection[]> {
    try {
      const connections = await AppDataSource.query(`
        SELECT 
          pid,
          usename,
          application_name,
          client_addr,
          state,
          query_start,
          state_change,
          query
        FROM pg_stat_activity
        WHERE state != 'idle'
        AND pid != pg_backend_pid()
        ORDER BY query_start
      `);

      return connections.map((conn: Record<string, unknown>) => ({
        pid: conn.pid,
        username: conn.usename,
        applicationName: conn.application_name,
        clientAddr: conn.client_addr,
        state: conn.state,
        queryStart: conn.query_start,
        stateChange: conn.state_change,
        query: conn.query
      }));

    } catch (error) {
      // Warning log removed
      return [];
    }
  }

  /**
   * 락 통계 조회
   */
  private async getLockStats(): Promise<LockStats> {
    try {
      const locks = await AppDataSource.query(`
        SELECT 
          mode,
          count(*) as count
        FROM pg_locks
        WHERE granted = true
        GROUP BY mode
        ORDER BY count DESC
      `);

      const waitingLocks = await AppDataSource.query(`
        SELECT count(*) as waiting_locks
        FROM pg_locks
        WHERE granted = false
      `);

      return {
        lockModes: locks.map((lock: Record<string, unknown>) => ({
          mode: lock.mode as string,
          count: parseInt(String(lock.count))
        })),
        waitingLocks: parseInt(String(waitingLocks[0].waiting_locks))
      };

    } catch (error) {
      // Warning log removed
      return {
        lockModes: [],
        waitingLocks: 0
      };
    }
  }

  /**
   * 자동 최적화 실행
   */
  private async runAutoOptimization(): Promise<void> {
    try {

      // 통계 업데이트
      await this.updateTableStatistics();

      // 백그라운드 작업 실행
      await this.runMaintenanceTasks();

      // 인덱스 권장사항 적용 (자동 적용 가능한 것만)
      await this.applyAutoIndexOptimizations();


    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 테이블 통계 업데이트
   */
  private async updateTableStatistics(): Promise<void> {
    try {
      // 모든 테이블의 통계 업데이트
      await AppDataSource.query('ANALYZE');
    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 유지보수 작업 실행
   */
  private async runMaintenanceTasks(): Promise<void> {
    try {
      // 불필요한 데이터 정리
      await this.cleanupOldData();
      
      // 연결 풀 최적화
      await this.optimizeConnectionPool();
      
    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 오래된 데이터 정리
   */
  private async cleanupOldData(): Promise<void> {
    const retentionDays = 90; // 90일 보관
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      // 오래된 로그 정리
      await AppDataSource.query(`
        DELETE FROM user_action 
        WHERE created_at < $1
      `, [cutoffDate]);

      // 오래된 세션 정리
      await AppDataSource.query(`
        DELETE FROM user_session 
        WHERE updated_at < $1
      `, [cutoffDate]);

    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 연결 풀 최적화
   */
  private async optimizeConnectionPool(): Promise<void> {
    try {
      const pool = (AppDataSource.driver as { pool?: {
        totalCount: number;
        idleCount: number;
        waitingCount?: number;
        max?: number;
        acquiredCount?: number;
        releasedCount?: number;
        release(): Promise<void>;
      } }).pool;
      
      if (pool) {
        // 유휴 연결이 너무 많으면 일부 해제
        if (pool.idleCount > 10) {
          for (let i = 0; i < Math.floor(pool.idleCount / 2); i++) {
            try {
              await pool.release();
            } catch (error) {
              break;
            }
          }
        }
      }

    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 자동 인덱스 최적화 적용
   */
  private async applyAutoIndexOptimizations(): Promise<void> {
    try {
      const analysisStr = await this.redis.hget('index_analysis', 'latest');
      if (!analysisStr) return;

      const analysis = JSON.parse(analysisStr);
      
      // 안전한 최적화만 자동 적용 (사용되지 않는 인덱스 제거 등)
      for (const recommendation of analysis.recommendations) {
        if (recommendation.type === 'drop_unused' && recommendation.priority === 'medium') {
          try {
            await AppDataSource.query(recommendation.action);
          } catch (error) {
            // Warning log removed
          }
        }
      }

    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 성능 알림 생성
   */
  private async createPerformanceAlert(type: string, data: Record<string, unknown>): Promise<void> {
    const alert = {
      type,
      severity: 'warning',
      message: `Database performance issue detected: ${type}`,
      data,
      timestamp: new Date().toISOString(),
      source: 'DatabaseOptimizationService'
    };

    await this.redis.lpush('db_performance_alerts', JSON.stringify(alert));
    await this.redis.ltrim('db_performance_alerts', 0, 99);

    // 분석 서비스로 알림 전송 (알림 기록)
    // await this.analyticsService.recordAlert(alert);
  }

  /**
   * 데이터베이스 성능 대시보드 데이터 생성
   */
  async getDatabaseDashboard(): Promise<DatabaseDashboard> {
    const dashboard: DatabaseDashboard = {
      connectionPool: this.connectionPoolStats,
      queryPerformance: await this.getQueryPerformanceStats(),
      indexAnalysis: await this.getIndexAnalysisResults(),
      tableStats: await this.getTableStatsResults(),
      alerts: await this.getRecentAlerts(),
      recommendations: await this.getOptimizationRecommendations()
    };

    return dashboard;
  }

  /**
   * 쿼리 성능 통계 조회
   */
  private async getQueryPerformanceStats(): Promise<QueryPerformanceMetrics> {
    try {
      const cached = await this.redis.hget('query_performance_stats', 'current');
      return cached ? JSON.parse(cached) : {
        totalQueries: 0,
        slowQueries: 0,
        averageExecutionTime: 0,
        cacheHitRate: 0,
        indexUsageRate: 0
      };
    } catch (error) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        averageExecutionTime: 0,
        cacheHitRate: 0,
        indexUsageRate: 0
      };
    }
  }

  /**
   * 인덱스 분석 결과 조회
   */
  private async getIndexAnalysisResults(): Promise<{
    unusedIndexes: UnusedIndex[];
    duplicateIndexes: DuplicateIndex[];
    indexStats: IndexUsageStats[];
    recommendations: IndexRecommendation[];
    analyzedAt: string;
  }> {
    try {
      const cached = await this.redis.hget('index_analysis', 'latest');
      return cached ? JSON.parse(cached) : {
        unusedIndexes: [],
        duplicateIndexes: [],
        indexStats: [],
        recommendations: [],
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        unusedIndexes: [],
        duplicateIndexes: [],
        indexStats: [],
        recommendations: [],
        analyzedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 테이블 통계 결과 조회
   */
  private async getTableStatsResults(): Promise<{
    tableSizes: TableSize[];
    dbSize: string;
    activeConnections: ActiveConnection[];
    lockStats: LockStats;
    collectedAt: string;
  }> {
    try {
      const cached = await this.redis.hget('db_stats', 'latest');
      return cached ? JSON.parse(cached) : {
        tableSizes: [],
        dbSize: 'Unknown',
        activeConnections: [],
        lockStats: {
          lockModes: [],
          waitingLocks: 0
        },
        collectedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        tableSizes: [],
        dbSize: 'Unknown',
        activeConnections: [],
        lockStats: {
          lockModes: [],
          waitingLocks: 0
        },
        collectedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 최근 알림 조회
   */
  private async getRecentAlerts(): Promise<Array<{
    type: string;
    severity: string;
    message: string;
    data: Record<string, unknown>;
    timestamp: string;
    source: string;
  }>> {
    try {
      const alerts = await this.redis.lrange('db_performance_alerts', 0, 9);
      return alerts.map((a: any) => JSON.parse(a));
    } catch (error) {
      return [];
    }
  }

  /**
   * 최적화 권장사항 조회
   */
  private async getOptimizationRecommendations(): Promise<IndexRecommendation[]> {
    try {
      const analysis = await this.getIndexAnalysisResults();
      return analysis.recommendations || [];
    } catch (error) {
      return [];
    }
  }

  // 유틸리티 메서드들
  private generateQueryHash(query: string): string {
    return crypto.createHash('md5').update(query).digest('hex');
  }

  private containsSeqScan(plan: PlanNode): boolean {
    if (!plan) return false;
    if (plan['Node Type'] === 'Seq Scan') return true;
    if (plan.Plans) {
      return plan.Plans.some((p: PlanNode) => this.containsSeqScan(p));
    }
    return false;
  }

  private containsSort(plan: PlanNode): boolean {
    if (!plan) return false;
    if (plan['Node Type'] === 'Sort') return true;
    if (plan.Plans) {
      return plan.Plans.some((p: PlanNode) => this.containsSort(p));
    }
    return false;
  }

  private extractTableFromPlan(plan: PlanNode): string {
    if (plan['Relation Name']) return plan['Relation Name'];
    if (plan.Plans) {
      for (const p of plan.Plans) {
        const table = this.extractTableFromPlan(p);
        if (table) return table;
      }
    }
    return 'unknown';
  }

  private extractColumnsFromWhere(query: string): string[] {
    // 간단한 WHERE 절 컬럼 추출 (실제로는 SQL 파서 사용)
    const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      const columns = whereClause.match(/\b\w+\s*=/g);
      return columns ? columns.map((c: any) => c.replace(/\s*=$/, '')) : [];
    }
    return [];
  }

  private extractColumnsFromOrderBy(query: string): string[] {
    const orderMatch = query.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
    if (orderMatch) {
      return orderMatch[1].split(',').map((c: any) => c.trim().split(' ')[0]);
    }
    return [];
  }

  private estimateIndexImprovement(query: SlowQuery, plan: ExecutionPlan): number {
    // 간단한 개선 효과 추정 (실제로는 더 정교한 계산 필요)
    return Math.min(0.8, query.meanTime / 1000 * 0.1);
  }

  private optimizeJoins(query: string): string {
    // 간단한 JOIN 최적화 제안
    return `-- ${query}\n-- Consider adding WHERE conditions to reduce result set before JOIN`;
  }

  private optimizeSubqueries(query: string): string {
    // 간단한 서브쿼리 최적화 제안
    return `-- ${query}\n-- Consider converting EXISTS/IN subqueries to JOINs`;
  }

  private classifyQueryPattern(pattern: string): string {
    if (pattern.toUpperCase().includes('SELECT') && pattern.toUpperCase().includes('WHERE')) {
      return 'select_with_where';
    } else if (pattern.toUpperCase().includes('INSERT')) {
      return 'insert';
    } else if (pattern.toUpperCase().includes('UPDATE')) {
      return 'update';
    } else if (pattern.toUpperCase().includes('DELETE')) {
      return 'delete';
    }
    return 'other';
  }

  private generatePatternOptimization(pattern: QueryPattern): {
    pattern: string;
    optimization: string;
    frequency: number;
    avgTime: number;
  } {
    return {
      pattern: pattern.pattern,
      optimization: `Consider optimizing ${pattern.type} queries`,
      frequency: pattern.frequency,
      avgTime: pattern.avgTime
    };
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

// 타입 정의
// PerformanceThresholds는 ImportedPerformanceThresholds를 그대로 사용
type PerformanceThresholds = ImportedPerformanceThresholds;

// ConnectionPoolStats는 ImportedConnectionPoolStats를 그대로 사용
type ConnectionPoolStats = ImportedConnectionPoolStats;

interface SlowQuery extends Partial<ImportedSlowQuery> {
  query: string;
  calls: number;
  totalTime: number;
  meanTime: number;
  maxTime: number;
  minTime: number;
  rows: number;
  hitPercent: number;
}

interface ExecutionPlan {
  plan: PlanNode | null;
  totalCost: number;
  actualTime: number;
  planningTime: number;
  executionTime: number;
}

interface IndexSuggestion {
  type: string;
  table: string;
  columns: string[];
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImprovement: number;
}

interface OptimizationSuggestion {
  type: string;
  description: string;
  sqlExample: string;
  estimatedImprovement: number;
}

interface QueryAnalysis {
  query: string;
  performance: SlowQuery;
  executionPlan: ExecutionPlan;
  indexSuggestions: IndexSuggestion[];
  optimizationSuggestions: OptimizationSuggestion[];
  analyzedAt: string;
}

interface QueryPattern extends Partial<ImportedQueryPattern> {
  type: string;
  pattern: string;
  frequency: number;
  avgTime: number;
}

interface UnusedIndex {
  schema: string;
  table: string;
  index: string;
  size: string;
  tupRead: number;
  tupFetch: number;
}

interface DuplicateIndex {
  table: string;
  indexes: string[];
  sizes: string[];
}

interface IndexUsageStats {
  schema: string;
  table: string;
  index: string;
  tupRead: number;
  tupFetch: number;
  scan: number;
  size: string;
  sizeBytes: number;
}

interface IndexRecommendation {
  type: string;
  table: string;
  index: string;
  reason: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
}

interface TableSize {
  schema: string;
  table: string;
  totalSize: string;
  totalSizeBytes: number;
  tableSize: string;
  indexSize: string;
}

interface ActiveConnection {
  pid: number;
  username: string;
  applicationName: string;
  clientAddr: string;
  state: string;
  queryStart: Date;
  stateChange: Date;
  query: string;
}

interface LockStats {
  lockModes: {
    mode: string;
    count: number;
  }[];
  waitingLocks: number;
}

interface DatabaseDashboard {
  connectionPool: ConnectionPoolStats;
  queryPerformance?: QueryPerformanceMetrics;
  indexAnalysis: {
    unusedIndexes: UnusedIndex[];
    duplicateIndexes: DuplicateIndex[];
    indexStats: IndexUsageStats[];
    recommendations: IndexRecommendation[];
    analyzedAt: string;
  };
  tableStats: {
    tableSizes: TableSize[];
    dbSize: string;
    activeConnections: ActiveConnection[];
    lockStats: LockStats;
    collectedAt: string;
  };
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
    data: Record<string, unknown>;
    timestamp: string;
    source: string;
  }>;
  recommendations: IndexRecommendation[];
}

interface QueryCacheEntry extends Partial<ImportedQueryCacheEntry> {
  query: string;
  result: QueryResult;
  cachedAt: Date;
  hits: number;
}

// 싱글톤 인스턴스
export const databaseOptimizationService = new DatabaseOptimizationService();