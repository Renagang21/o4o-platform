import { ConnectionPoolStats as ImportedConnectionPoolStats, QueryPerformanceMetrics } from '../types';
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
export declare class DatabaseOptimizationService {
    private redis;
    private analyticsService;
    private queryCache;
    private performanceThresholds;
    private indexRecommendations;
    private connectionPoolStats;
    constructor();
    /**
     * 성능 임계값 초기화
     */
    private initializeThresholds;
    /**
     * 최적화 작업 시작
     */
    private startOptimizationTasks;
    /**
     * 쿼리 성능 분석
     */
    analyzeQueryPerformance(): Promise<void>;
    /**
     * 느린 쿼리 조회
     */
    private getSlowQueries;
    /**
     * 느린 쿼리 개별 분석
     */
    private analyzeSlowQuery;
    /**
     * 쿼리 실행 계획 조회
     */
    private getQueryExecutionPlan;
    /**
     * 인덱스 제안 생성
     */
    private generateIndexSuggestions;
    /**
     * 쿼리 최적화 제안 생성
     */
    private generateQueryOptimizations;
    /**
     * 쿼리 패턴 분석
     */
    private analyzeQueryPatterns;
    /**
     * 쿼리 패턴 식별
     */
    private identifyQueryPatterns;
    /**
     * 캐시 히트율 분석
     */
    private analyzeCacheHitRates;
    /**
     * 인덱스 사용량 분석
     */
    analyzeIndexUsage(): Promise<void>;
    /**
     * 사용되지 않는 인덱스 찾기
     */
    private findUnusedIndexes;
    /**
     * 중복 인덱스 찾기
     */
    private findDuplicateIndexes;
    /**
     * 인덱스 사용 통계 조회
     */
    private getIndexUsageStats;
    /**
     * 인덱스 권장사항 생성
     */
    private generateIndexRecommendations;
    /**
     * 연결 풀 모니터링
     */
    private monitorConnectionPool;
    /**
     * 데이터베이스 통계 수집
     */
    private collectDatabaseStats;
    /**
     * 테이블 크기 조회
     */
    private getTableSizes;
    /**
     * 데이터베이스 크기 조회
     */
    private getDatabaseSize;
    /**
     * 활성 연결 조회
     */
    private getActiveConnections;
    /**
     * 락 통계 조회
     */
    private getLockStats;
    /**
     * 자동 최적화 실행
     */
    private runAutoOptimization;
    /**
     * 테이블 통계 업데이트
     */
    private updateTableStatistics;
    /**
     * 유지보수 작업 실행
     */
    private runMaintenanceTasks;
    /**
     * 오래된 데이터 정리
     */
    private cleanupOldData;
    /**
     * 연결 풀 최적화
     */
    private optimizeConnectionPool;
    /**
     * 자동 인덱스 최적화 적용
     */
    private applyAutoIndexOptimizations;
    /**
     * 성능 알림 생성
     */
    private createPerformanceAlert;
    /**
     * 데이터베이스 성능 대시보드 데이터 생성
     */
    getDatabaseDashboard(): Promise<DatabaseDashboard>;
    /**
     * 쿼리 성능 통계 조회
     */
    private getQueryPerformanceStats;
    /**
     * 인덱스 분석 결과 조회
     */
    private getIndexAnalysisResults;
    /**
     * 테이블 통계 결과 조회
     */
    private getTableStatsResults;
    /**
     * 최근 알림 조회
     */
    private getRecentAlerts;
    /**
     * 최적화 권장사항 조회
     */
    private getOptimizationRecommendations;
    private generateQueryHash;
    private containsSeqScan;
    private containsSort;
    private extractTableFromPlan;
    private extractColumnsFromWhere;
    private extractColumnsFromOrderBy;
    private estimateIndexImprovement;
    private optimizeJoins;
    private optimizeSubqueries;
    private classifyQueryPattern;
    private generatePatternOptimization;
    /**
     * 서비스 종료
     */
    shutdown(): Promise<void>;
}
type ConnectionPoolStats = ImportedConnectionPoolStats;
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
export declare const databaseOptimizationService: DatabaseOptimizationService;
export {};
//# sourceMappingURL=DatabaseOptimizationService.d.ts.map