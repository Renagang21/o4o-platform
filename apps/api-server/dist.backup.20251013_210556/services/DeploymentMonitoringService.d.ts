export declare enum DeploymentStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    SUCCESS = "success",
    FAILED = "failed",
    ROLLED_BACK = "rolled_back",
    ROLLBACK_FAILED = "rollback_failed"
}
export declare enum DeploymentEnvironment {
    DEVELOPMENT = "development",
    STAGING = "staging",
    PRODUCTION = "production"
}
export interface DeploymentInfo {
    id: string;
    version: string;
    environment: DeploymentEnvironment;
    status: DeploymentStatus;
    startTime: Date;
    endTime?: Date;
    deployedBy: string;
    commitHash: string;
    branch: string;
    buildNumber?: string;
    releaseNotes?: string;
    rollbackVersion?: string;
    healthChecks: HealthCheck[];
    metrics: DeploymentMetrics;
    rollbackInfo?: RollbackInfo;
    metadata?: Record<string, unknown>;
}
export interface HealthCheck {
    name: string;
    url?: string;
    command?: string;
    expectedResponse?: string | number | boolean | Record<string, unknown>;
    timeout: number;
    retries: number;
    interval: number;
    status: 'pending' | 'running' | 'passed' | 'failed';
    lastRun?: Date;
    lastResult?: {
        success: boolean;
        responseTime: number;
        output?: string;
        error?: string;
    };
}
export interface DeploymentMetrics {
    responseTime: {
        before: number[];
        after: number[];
        average: number;
        degradation: number;
    };
    errorRate: {
        before: number[];
        after: number[];
        average: number;
        increase: number;
    };
    throughput: {
        before: number[];
        after: number[];
        average: number;
        change: number;
    };
    memoryUsage: {
        before: number[];
        after: number[];
        average: number;
        change: number;
    };
    cpuUsage: {
        before: number[];
        after: number[];
        average: number;
        change: number;
    };
}
export interface RollbackInfo {
    id: string;
    triggeredBy: 'automatic' | 'manual';
    reason: string;
    startTime: Date;
    endTime?: Date;
    status: 'in_progress' | 'success' | 'failed';
    targetVersion: string;
    rollbackSteps: RollbackStep[];
    verificationChecks: HealthCheck[];
}
export interface RollbackStep {
    name: string;
    type: 'git_revert' | 'database_migration' | 'service_restart' | 'config_restore' | 'cache_clear' | 'script_execution';
    command?: string;
    target?: string;
    parameters?: Record<string, string | number | boolean>;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    startTime?: Date;
    endTime?: Date;
    output?: string;
    error?: string;
}
export interface DeploymentValidationRules {
    healthCheckFailures: {
        maxFailures: number;
        timeWindow: number;
    };
    performanceThresholds: {
        maxResponseTimeDegradation: number;
        maxErrorRateIncrease: number;
        maxMemoryIncrease: number;
    };
    businessMetrics: {
        minThroughputMaintenance: number;
        maxUserErrorReports: number;
    };
    timeBasedRules: {
        stabilizationPeriod: number;
        monitoringDuration: number;
    };
}
export declare class DeploymentMonitoringService {
    private systemMetricsRepo;
    private alertRepo;
    private activeDeployments;
    private deploymentHistory;
    private monitoringInterval?;
    private validationRules;
    private isEnabled;
    private autoRollbackEnabled;
    private currentVersion;
    constructor();
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    trackDeployment(deploymentInfo: Partial<DeploymentInfo>): Promise<DeploymentInfo>;
    private startDeploymentTracking;
    checkActiveDeployments(): Promise<void>;
    private monitorDeployment;
    validateDeploymentHealth(): Promise<void>;
    private createDefaultHealthChecks;
    private runHealthChecks;
    private executeHealthCheck;
    private executeHttpHealthCheck;
    private executeCommandHealthCheck;
    private compareObjects;
    private initializeMetrics;
    private collectBaselineMetrics;
    private collectDeploymentMetrics;
    private getMetricValues;
    private calculateMetricChanges;
    private calculateAverage;
    private validateDeployment;
    private validateHealthChecks;
    private validatePerformanceMetrics;
    private validateStability;
    rollbackDeployment(target: string, parameters?: Record<string, string | number | boolean>): Promise<{
        output: string;
    }>;
    private initiateAutomaticRollback;
    private executeRollback;
    private createRollbackSteps;
    private executeRollbackStep;
    private executeGitRevert;
    private executeServiceRestart;
    private executeCacheClear;
    private executeDatabaseRollback;
    private executeConfigRestore;
    private executeCustomScript;
    private verifyRollback;
    private markDeploymentSuccessful;
    private markDeploymentFailed;
    private startDeploymentMonitoring;
    private detectCurrentDeployment;
    private updateDeploymentMetrics;
    private recordDeploymentEvent;
    private createDeploymentAlert;
    private createRollbackAlert;
    getStatus(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        activeDeployments: number;
        autoRollbackEnabled: boolean;
        currentVersion: string;
        issues: string[];
    }>;
    getActiveDeployments(): Promise<DeploymentInfo[]>;
    getDeploymentHistory(limit?: number): Promise<DeploymentInfo[]>;
    getDeployment(deploymentId: string): Promise<DeploymentInfo | null>;
    enableAutoRollback(): Promise<void>;
    disableAutoRollback(): Promise<void>;
    updateValidationRules(rules: Partial<DeploymentValidationRules>): Promise<void>;
}
export declare const deploymentMonitoringService: DeploymentMonitoringService;
//# sourceMappingURL=DeploymentMonitoringService.d.ts.map