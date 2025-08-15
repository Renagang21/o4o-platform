/**
 * 자동 스케일링 서비스
 *
 * 핵심 기능:
 * - 실시간 부하 모니터링
 * - 자동 수평 확장/축소
 * - 로드 밸런싱 관리
 * - 트래픽 분산
 * - 리소스 할당 최적화
 */
export declare class AutoScalingService {
    private redis;
    private analyticsService;
    private performanceService;
    private scalingRules;
    private currentInstances;
    private isScalingEnabled;
    private minInstances;
    private maxInstances;
    private cooldownPeriod;
    private lastScalingAction;
    constructor();
    /**
     * 스케일링 규칙 초기화
     */
    private initializeScalingRules;
    /**
     * 스케일링 모니터링 시작
     */
    private startScalingMonitoring;
    /**
     * 스케일링 메트릭 수집
     */
    private collectScalingMetrics;
    /**
     * 시스템 메트릭 수집
     */
    private gatherSystemMetrics;
    /**
     * CPU 사용률 계산
     */
    private calculateCpuUsagePercent;
    /**
     * 요청 처리량 조회
     */
    private getRequestRate;
    /**
     * 평균 응답 시간 조회
     */
    private getAverageResponseTime;
    /**
     * 메트릭 트렌드 분석
     */
    private analyzeMetricTrends;
    /**
     * 트렌드 계산
     */
    private calculateTrends;
    /**
     * 트렌드 방향 계산
     */
    private calculateTrendDirection;
    /**
     * 예측 기반 스케일링 결정
     */
    private makePredictiveScalingDecision;
    /**
     * 스케일링 결정 평가
     */
    private evaluateScalingDecisions;
    /**
     * 현재 메트릭 조회
     */
    private getCurrentMetrics;
    /**
     * 스케일링 규칙 평가
     */
    private evaluateScalingRule;
    /**
     * 메트릭 값 추출
     */
    private getMetricValue;
    /**
     * 스케일링 액션 실행
     */
    private executeScalingAction;
    /**
     * 스케일 업 실행
     */
    private scaleUp;
    /**
     * 스케일 다운 실행
     */
    private scaleDown;
    /**
     * 새 인스턴스 생성
     */
    private createNewInstance;
    /**
     * 인스턴스 제거
     */
    private removeInstance;
    /**
     * 새 프로세스 시작
     */
    private startNewProcess;
    /**
     * 사용 가능한 포트 찾기
     */
    private getAvailablePort;
    /**
     * 로드 밸런서에 인스턴스 등록
     */
    private registerInstanceToLoadBalancer;
    /**
     * 로드 밸런서에서 인스턴스 제거
     */
    private unregisterInstanceFromLoadBalancer;
    /**
     * 그레이스풀 셧다운
     */
    private gracefulShutdown;
    /**
     * 스케일 업 준비
     */
    private prepareForScaleUp;
    /**
     * 스케일 다운 준비
     */
    private prepareForScaleDown;
    /**
     * 제거할 인스턴스 찾기
     */
    private findInstanceToRemove;
    /**
     * 인스턴스 상태 모니터링
     */
    private monitorInstanceHealth;
    /**
     * 인스턴스 상태 확인
     */
    private checkInstanceHealth;
    /**
     * 비정상 인스턴스 처리
     */
    private handleUnhealthyInstance;
    /**
     * 인스턴스 실패 횟수 조회
     */
    private getInstanceFailureCount;
    /**
     * 로드 밸런싱 최적화
     */
    private optimizeLoadBalancing;
    /**
     * 부하 재분산
     */
    private rebalanceLoad;
    /**
     * 최적 가중치 계산
     */
    private calculateOptimalWeight;
    /**
     * 인스턴스 가중치 업데이트
     */
    private updateInstanceWeight;
    /**
     * 로드 밸런서 가중치 업데이트
     */
    private updateLoadBalancerWeights;
    /**
     * 스케일링 이벤트 기록
     */
    private recordScalingEvent;
    /**
     * 스케일링 에러 기록
     */
    private recordScalingError;
    /**
     * 스케일링 알림 전송
     */
    private sendScalingNotification;
    /**
     * 스케일링 대시보드 데이터 생성
     */
    getScalingDashboard(): Promise<ScalingDashboard>;
    /**
     * 최근 스케일링 이벤트 조회
     */
    private getRecentScalingEvents;
    /**
     * 스케일링 설정 업데이트
     */
    updateScalingConfiguration(config: ScalingConfiguration): Promise<void>;
    /**
     * 서비스 종료
     */
    shutdown(): Promise<void>;
}
interface ScalingRule {
    metric: string;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    evaluationPeriod: number;
    scaleUpCooldown: number;
    scaleDownCooldown: number;
    scaleUpStep: number;
    scaleDownStep: number;
    priority: number;
}
interface SystemMetrics {
    timestamp: string;
    cpuUsage: number;
    memoryUsage: number;
    memoryUsed: number;
    memoryTotal: number;
    activeConnections: number;
    requestRate: number;
    avgResponseTime: number;
    currentInstanceCount: number;
    maxInstanceCount: number;
    minInstanceCount: number;
}
interface ScalingAction {
    type: 'scale_up' | 'scale_down';
    rule: string;
    priority: number;
    step: number;
    reason: string;
    timestamp: string;
}
interface ScalingEvent extends ScalingAction {
    instanceCount: number;
}
interface ScalingDashboard {
    currentMetrics: SystemMetrics;
    instances: Array<{
        id: string;
        status: 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';
        healthStatus: 'healthy' | 'unhealthy' | 'unknown';
        currentLoad: number;
        port: number;
        processId: number | null;
        createdAt: string;
    }>;
    scalingRules: {
        [key: string]: ScalingRule;
    };
    recentEvents: ScalingEvent[];
    configuration: {
        minInstances: number;
        maxInstances: number;
        isEnabled: boolean;
        cooldownPeriod: number;
    };
}
interface ScalingConfiguration {
    minInstances?: number;
    maxInstances?: number;
    isEnabled?: boolean;
    cooldownPeriod?: number;
}
export declare const autoScalingService: AutoScalingService;
export {};
//# sourceMappingURL=AutoScalingService.d.ts.map