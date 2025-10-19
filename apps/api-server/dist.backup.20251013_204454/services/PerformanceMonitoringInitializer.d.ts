/// <reference types="node" />
/**
 * 성능 모니터링 초기화 서비스
 *
 * 모든 성능 최적화 및 스케일링 서비스를 통합 관리하는 중앙 초기화 서비스
 *
 * 관리하는 서비스들:
 * - PerformanceOptimizationService: 성능 최적화
 * - AutoScalingService: 자동 스케일링
 * - CDNOptimizationService: CDN 최적화
 * - DatabaseOptimizationService: 데이터베이스 최적화
 * - AnalyticsService: 분석 서비스
 * - DeploymentMonitoringService: 배포 모니터링
 * - OperationsMonitoringService: 운영 모니터링
 */
export declare class PerformanceMonitoringInitializer {
    private redis;
    private services;
    private isInitialized;
    private healthCheckInterval?;
    private serviceStatus;
    constructor();
    /**
     * 모든 성능 모니터링 서비스 초기화
     */
    initialize(): Promise<void>;
    /**
     * Redis 연결 확인
     */
    private verifyRedisConnection;
    /**
     * 분석 서비스 초기화
     */
    private initializeAnalyticsService;
    /**
     * 성능 최적화 서비스 초기화
     */
    private initializePerformanceOptimizationService;
    /**
     * 데이터베이스 최적화 서비스 초기화
     */
    private initializeDatabaseOptimizationService;
    /**
     * CDN 최적화 서비스 초기화
     */
    private initializeCDNOptimizationService;
    /**
     * 자동 스케일링 서비스 초기화
     */
    private initializeAutoScalingService;
    /**
     * 운영 모니터링 서비스 초기화
     */
    private initializeOperationsMonitoring;
    /**
     * 배포 모니터링 서비스 초기화
     */
    private initializeDeploymentMonitoring;
    /**
     * 서비스 간 통합 설정
     */
    private configureServiceIntegration;
    /**
     * 크로스 서비스 메시징 설정
     */
    private setupCrossServiceMessaging;
    /**
     * 크로스 서비스 메시지 처리
     */
    private handleCrossServiceMessage;
    /**
     * 성능 알림 처리
     */
    private handlePerformanceAlert;
    /**
     * 스케일링 이벤트 처리
     */
    private handleScalingEvent;
    /**
     * 데이터베이스 이슈 처리
     */
    private handleDatabaseIssue;
    /**
     * CDN 이벤트 처리
     */
    private handleCDNEvent;
    /**
     * 배포 상태 처리
     */
    private handleDeploymentStatus;
    /**
     * 헬스 체크 시작
     */
    private startHealthChecking;
    /**
     * 서비스 헬스 체크 수행
     */
    private performHealthCheck;
    /**
     * 헬스 알림 전송
     */
    private sendHealthAlert;
    /**
     * 초기화 완료 기록
     */
    private recordInitializationComplete;
    /**
     * 초기화 실패 처리
     */
    private handleInitializationFailure;
    /**
     * 서비스 상태 조회
     */
    getServiceStatus(): Map<string, ServiceStatus>;
    /**
     * 특정 서비스 조회
     */
    getService(serviceName: string): MonitoringService | undefined;
    /**
     * 초기화 상태 확인
     */
    isSystemInitialized(): boolean;
    /**
     * 통합 대시보드 데이터 생성
     */
    getIntegratedDashboard(): Promise<IntegratedDashboard>;
    /**
     * 최신 헬스 체크 결과 조회
     */
    private getLatestHealthCheck;
    /**
     * 집계된 메트릭 조회
     */
    private getAggregatedMetrics;
    /**
     * 시스템 알림 조회
     */
    private getSystemAlerts;
    /**
     * 시스템 권장사항 조회
     */
    private getSystemRecommendations;
    /**
     * 시스템 종료
     */
    shutdown(): Promise<void>;
}
interface ServiceStatus {
    status: 'running' | 'warning' | 'failed';
    lastCheck: Date;
    error?: Error;
}
interface MonitoringService {
    healthCheck?: () => Promise<{
        status: string;
        message: string;
    }>;
    shutdown?: () => Promise<void>;
    [key: string]: unknown;
}
interface AggregatedMetrics {
    performance: Record<string, unknown>;
    scaling: Record<string, unknown>;
    database: Record<string, unknown>;
    cdn: Record<string, unknown>;
    system: {
        memory: NodeJS.MemoryUsage;
        cpu: NodeJS.CpuUsage;
        uptime: number;
    };
}
interface SystemAlert {
    type: string;
    severity: string;
    message: string;
    data?: unknown;
    timestamp: string;
    source: string;
}
interface HealthCheckResult {
    timestamp: string;
    overallStatus: 'healthy' | 'warning' | 'error';
    services: {
        [key: string]: {
            status: string;
            message: string;
            lastCheck: string;
        };
    };
    issues: {
        service: string;
        issue: string;
    }[];
}
interface IntegratedDashboard {
    timestamp: string;
    systemStatus: 'operational' | 'initializing' | 'error';
    services: Record<string, ServiceStatus>;
    healthCheck: HealthCheckResult | null;
    metrics: AggregatedMetrics;
    alerts: SystemAlert[];
    recommendations: string[];
}
export declare const performanceMonitoringInitializer: PerformanceMonitoringInitializer;
export {};
//# sourceMappingURL=PerformanceMonitoringInitializer.d.ts.map