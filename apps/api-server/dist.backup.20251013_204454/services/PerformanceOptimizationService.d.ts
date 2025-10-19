import { SelectQueryBuilder } from 'typeorm';
import { QueryBuilderWithExecute, QueryType, OptimizedResponse as ImportedOptimizedResponse, PerformanceReport as ImportedPerformanceReport, CompressionLevel } from '../types';
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
export declare class PerformanceOptimizationService {
    private redis;
    private cacheService;
    private analyticsService;
    private performanceMetrics;
    private slowQueryThreshold;
    private autoOptimizationEnabled;
    constructor();
    /**
     * 성능 모니터링 초기화
     */
    private initializePerformanceMonitoring;
    /**
     * 데이터베이스 쿼리 최적화
     */
    optimizeQuery<T>(queryBuilder: QueryBuilderWithExecute | SelectQueryBuilder<T>, queryType: QueryType, cacheKey?: string, cacheTTL?: number): Promise<T[]>;
    /**
     * 캐시된 결과 조회
     */
    private getCachedResult;
    /**
     * 쿼리 결과 캐시
     */
    private cacheResult;
    /**
     * 느린 쿼리 처리
     */
    private handleSlowQuery;
    /**
     * 쿼리 성능 메트릭 기록
     */
    private recordQueryPerformance;
    /**
     * 쿼리 에러 기록
     */
    private recordQueryError;
    /**
     * API 응답 최적화
     */
    optimizeAPIResponse<T>(data: T, compressionLevel?: CompressionLevel, includeMetadata?: boolean): Promise<ImportedOptimizedResponse>;
    /**
     * 데이터 압축
     */
    private compressData;
    /**
     * 불필요한 필드 제거
     */
    private removeUnnecessaryFields;
    /**
     * 캐시 헤더 생성
     */
    private generateCacheHeaders;
    /**
     * ETag 생성
     */
    private generateETag;
    /**
     * 성능 메트릭 수집
     */
    private collectPerformanceMetrics;
    /**
     * 캐시 히트율 계산
     */
    private calculateCacheHitRate;
    /**
     * 성능 임계값 체크
     */
    private checkPerformanceThresholds;
    /**
     * 성능 알림 생성
     */
    private createPerformanceAlert;
    /**
     * 자동 최적화 실행
     */
    private runAutoOptimization;
    /**
     * 캐시 최적화
     */
    private optimizeCache;
    /**
     * 메모리 정보 파싱
     */
    private parseMemoryInfo;
    /**
     * 데이터베이스 최적화
     */
    private optimizeDatabase;
    /**
     * 성능 통계 업데이트
     */
    private updatePerformanceStats;
    /**
     * 캐시 통계 조회
     */
    private getCacheStats;
    /**
     * Redis 정보 파싱
     */
    private parseRedisInfo;
    /**
     * 성능 리포트 생성
     */
    generatePerformanceReport(): Promise<ImportedPerformanceReport>;
    /**
     * 느린 쿼리 조회
     */
    private getSlowQueries;
    /**
     * 성능 알림 조회
     */
    private getPerformanceAlerts;
    /**
     * Query metrics 조회
     */
    private getQueryMetrics;
    /**
     * 평균 응답 시간 계산
     */
    private calculateAverageResponseTime;
    /**
     * 에러율 계산
     */
    private calculateErrorRate;
    /**
     * Cache metrics 변환
     */
    private convertToCacheMetrics;
    /**
     * 성능 개선 권장사항 생성
     */
    private generateRecommendations;
    /**
     * 성능 최적화 설정 업데이트
     */
    updateOptimizationSettings(settings: OptimizationSettings): Promise<void>;
    /**
     * 서비스 종료
     */
    shutdown(): Promise<void>;
}
interface OptimizationSettings {
    slowQueryThreshold?: number;
    autoOptimizationEnabled?: boolean;
    cacheStrategy?: 'aggressive' | 'moderate' | 'conservative';
    compressionLevel?: CompressionLevel;
}
export declare const performanceOptimizationService: PerformanceOptimizationService;
export {};
//# sourceMappingURL=PerformanceOptimizationService.d.ts.map