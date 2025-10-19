export interface ServiceRestartParameters {
    graceful?: boolean;
    timeout?: number;
    verifyRestart?: boolean;
    [key: string]: unknown;
}
export interface CacheClearParameters {
    cacheTypes?: string[];
    pattern?: string;
    [key: string]: unknown;
}
export interface ConnectionResetParameters {
    maxConnections?: number;
    [key: string]: unknown;
}
export interface ScaleResourceParameters {
    action?: string;
    factor?: number;
    [key: string]: unknown;
}
export interface ServiceState {
    restartCount: number;
    lastRestart: Date | null;
    [key: string]: unknown;
}
export interface HealingContext {
    serviceName?: string;
    target?: string;
    [key: string]: unknown;
}
export interface HealingAction {
    id: string;
    name: string;
    description: string;
    target: string;
    type: 'service_restart' | 'cache_clear' | 'connection_reset' | 'resource_scale' | 'memory_cleanup' | 'disk_cleanup' | 'process_kill' | 'file_cleanup' | 'config_reload';
    parameters: Record<string, unknown>;
    safetyChecks: SafetyCheck[];
    rollbackActions?: HealingAction[];
    maxRetries: number;
    timeout: number;
    cooldownPeriod: number;
    requiredPermissions: string[];
}
export interface SafetyCheck {
    type: 'pre_execution' | 'post_execution';
    name: string;
    command?: string;
    condition: string;
    failureAction: 'abort' | 'warn' | 'rollback';
}
export interface HealingAttempt {
    id: string;
    actionId: string;
    startTime: Date;
    endTime?: Date;
    status: 'in_progress' | 'success' | 'failed' | 'aborted' | 'rolled_back';
    target: string;
    safetyCheckResults: {
        check: SafetyCheck;
        passed: boolean;
        output?: string;
        error?: string;
    }[];
    executionLog: string[];
    rollbackPerformed: boolean;
    metadata?: Record<string, unknown>;
}
export interface SystemHealth {
    memory: {
        total: number;
        used: number;
        free: number;
        percentage: number;
        swapUsed: number;
    };
    cpu: {
        loadAverage: number[];
        usage: number;
        processes: number;
    };
    disk: {
        total: number;
        used: number;
        free: number;
        percentage: number;
    };
    services: {
        [serviceName: string]: {
            status: 'running' | 'stopped' | 'error' | 'unknown';
            pid?: number;
            memory?: number;
            cpu?: number;
            restartCount: number;
            lastRestart?: Date;
        };
    };
    connections: {
        database: number;
        redis: number;
        http: number;
    };
    issues: SystemIssue[];
}
export interface SystemIssue {
    type: 'memory_leak' | 'high_cpu' | 'disk_full' | 'service_down' | 'connection_leak' | 'file_handle_leak';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedComponent: string;
    detectedAt: Date;
    suggestedActions: string[];
    autoHealable: boolean;
}
export declare class SelfHealingService {
    private systemMetricsRepo;
    private alertRepo;
    private healingActions;
    private activeAttempts;
    private healingHistory;
    private monitoringInterval?;
    private isEnabled;
    private maxConcurrentHealing;
    private serviceStates;
    private lastHealthCheck;
    constructor();
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    restartService(serviceName: string, parameters?: ServiceRestartParameters): Promise<{
        output: string;
    }>;
    private createServiceRestartAction;
    clearCache(target: string, parameters?: CacheClearParameters): Promise<{
        output: string;
    }>;
    private clearMemoryCache;
    private clearRedisCache;
    private clearTempFiles;
    private clearApplicationCache;
    resetConnections(target: string, parameters?: ConnectionResetParameters): Promise<{
        output: string;
    }>;
    private resetDatabaseConnections;
    private resetRedisConnections;
    scaleResources(target: string, parameters?: ScaleResourceParameters): Promise<{
        output: string;
    }>;
    private scaleApiServer;
    private optimizeMemoryUsage;
    private scaleConnectionPools;
    checkServiceStatus(serviceName: string): Promise<string>;
    private startHealthMonitoring;
    private performHealthCheck;
    private getMemoryInfo;
    private getCpuInfo;
    private getDiskInfo;
    private getServiceInfo;
    private getConnectionInfo;
    private detectSystemIssues;
    private detectAndHealIssues;
    private healIssue;
    private cleanupLogs;
    private executeHealingAction;
    private performSafetyCheck;
    private checkServiceExists;
    private performHealingAction;
    private executeServiceRestart;
    private performRollback;
    private initializeHealingActions;
    private initializeServiceTracking;
    private recordHealthMetrics;
    getStatus(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        lastHealthCheck?: Date;
        activeAttempts: number;
        healingActions: number;
        systemHealth?: SystemHealth;
        issues: string[];
    }>;
    getSystemHealth(): Promise<SystemHealth | null>;
    getHealingHistory(limit?: number): Promise<HealingAttempt[]>;
    getActiveAttempts(): Promise<HealingAttempt[]>;
    enable(): Promise<void>;
    disable(): Promise<void>;
    forceHealing(issueType: string, component: string): Promise<{
        output: string;
    }>;
    private updateHealthMetrics;
}
export declare const selfHealingService: SelfHealingService;
//# sourceMappingURL=SelfHealingService.d.ts.map