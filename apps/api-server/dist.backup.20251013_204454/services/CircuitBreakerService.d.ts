export declare enum CircuitState {
    CLOSED = "closed",
    OPEN = "open",
    HALF_OPEN = "half_open"
}
export interface CircuitBreakerConfig {
    failureThreshold: number;
    recoveryTimeout: number;
    successThreshold: number;
    requestVolumeThreshold: number;
    errorThreshold: number;
    slowCallThreshold: number;
    slowCallRateThreshold: number;
    maxRetries: number;
}
export interface CircuitBreakerStats {
    circuitId: string;
    serviceName: string;
    state: CircuitState;
    failureCount: number;
    successCount: number;
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    lastFailureTime?: Date;
    lastSuccessTime?: Date;
    stateChangeTime: Date;
    timeInCurrentState: number;
}
export interface ServiceCall {
    circuitId: string;
    startTime: Date;
    endTime?: Date;
    success: boolean;
    responseTime: number;
    error?: string;
    metadata?: Record<string, unknown>;
}
declare class CircuitBreaker {
    readonly id: string;
    readonly serviceName: string;
    readonly config: CircuitBreakerConfig;
    private state;
    private failureCount;
    private successCount;
    private totalRequests;
    private lastFailureTime?;
    private lastSuccessTime?;
    private stateChangeTime;
    private requestWindow;
    private halfOpenTests;
    constructor(id: string, serviceName: string, config: CircuitBreakerConfig);
    execute<T>(operation: () => Promise<T>): Promise<T>;
    private executeWithTimeout;
    private onSuccess;
    private onFailure;
    private shouldTrip;
    private shouldAttemptReset;
    private trip;
    private reset;
    private recordCall;
    private getRecentRequests;
    private getSlowCallRate;
    getStats(): CircuitBreakerStats;
    reset_manual(): void;
    force_open(): void;
}
export declare class CircuitBreakerService {
    private systemMetricsRepo;
    private alertRepo;
    private circuits;
    private monitoringInterval?;
    private defaultConfig;
    constructor();
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    createCircuit(id: string, serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker;
    getCircuit(id: string): CircuitBreaker | undefined;
    getOrCreateCircuit(id: string, serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker;
    removeCircuit(id: string): boolean;
    executeWithCircuitBreaker<T>(circuitId: string, serviceName: string, operation: () => Promise<T>, config?: Partial<CircuitBreakerConfig>): Promise<T>;
    executeDatabaseOperation<T>(operation: () => Promise<T>): Promise<T>;
    executeExternalApiCall<T>(apiName: string, operation: () => Promise<T>): Promise<T>;
    executeInternalService<T>(serviceName: string, operation: () => Promise<T>): Promise<T>;
    private startMonitoring;
    private collectCircuitMetrics;
    private checkCircuitHealth;
    private createCircuitAlert;
    private cleanupOldData;
    private createDefaultCircuits;
    getAllCircuits(): CircuitBreakerStats[];
    getCircuitStats(circuitId: string): CircuitBreakerStats | null;
    resetCircuit(circuitId: string): Promise<boolean>;
    resetAllCircuits(): Promise<number>;
    forceOpenCircuit(circuitId: string): Promise<boolean>;
    getStatus(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        circuitCount: number;
        openCircuits: number;
        halfOpenCircuits: number;
        issues: string[];
    }>;
    withFallback<T>(circuitId: string, serviceName: string, primaryOperation: () => Promise<T>, fallbackOperation: () => Promise<T>): Promise<T>;
    withRetry<T>(circuitId: string, serviceName: string, operation: () => Promise<T>, maxRetries?: number, backoffMs?: number): Promise<T>;
}
export declare const circuitBreakerService: CircuitBreakerService;
export {};
//# sourceMappingURL=CircuitBreakerService.d.ts.map