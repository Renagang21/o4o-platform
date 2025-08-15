import { Alert, AlertType, AlertSeverity } from '../entities/Alert';
export interface RecoveryAction {
    id: string;
    name: string;
    description: string;
    severity: AlertSeverity;
    conditions: {
        metricThresholds?: {
            [key: string]: number;
        };
        alertTypes?: AlertType[];
        duration?: number;
        consecutiveFailures?: number;
    };
    actions: {
        immediate?: RecoveryStep[];
        fallback?: RecoveryStep[];
        escalation?: RecoveryStep[];
    };
    maxRetries: number;
    cooldownPeriod: number;
    autoExecute: boolean;
}
export interface RecoveryStep {
    type: 'restart_service' | 'clear_cache' | 'reset_connections' | 'scale_resources' | 'rollback_deployment' | 'isolate_component' | 'execute_script' | 'notify_team';
    target: string;
    parameters?: {
        [key: string]: string | number | boolean | null | string[];
    };
    timeout?: number;
    retryCount?: number;
    successCondition?: string;
}
export interface RecoveryAttempt {
    id: string;
    alertId: string;
    actionId: string;
    startTime: Date;
    endTime?: Date;
    status: 'in_progress' | 'success' | 'failed' | 'timeout';
    stepsExecuted: Array<{
        step: RecoveryStep;
        startTime: Date;
        endTime?: Date;
        status: 'success' | 'failed' | 'timeout';
        output?: string;
        error?: string;
    }>;
    result?: {
        resolved: boolean;
        improvements: string[];
        remainingIssues: string[];
    };
    metadata?: Record<string, unknown>;
}
export interface AutoRecoveryStats {
    totalAttempts: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    averageRecoveryTime: number;
    topIssues: Array<{
        issueType: string;
        count: number;
        successRate: number;
        averageTime: number;
    }>;
    serviceHealth: {
        [serviceName: string]: {
            uptime: number;
            mttr: number;
            mtbf: number;
            recoverySuccessRate: number;
        };
    };
}
export declare class AutoRecoveryService {
    private systemMetricsRepo;
    private alertRepo;
    private operationsService;
    private circuitBreaker;
    private gracefulDegradation;
    private incidentEscalation;
    private selfHealing;
    private deploymentMonitoring;
    private webhookService;
    private recoveryActions;
    private recoveryAttempts;
    private activeRecoveries;
    private recoveryHistory;
    private recoveryIntervals;
    private isEnabled;
    private maxConcurrentRecoveries;
    private globalCooldown;
    private lastGlobalRecovery;
    constructor();
    startAutoRecovery(): Promise<void>;
    stopAutoRecovery(): Promise<void>;
    handleAlert(alert: Alert): Promise<void>;
    private executeRecovery;
    private executeRecoverySteps;
    private executeRecoveryStep;
    private executeCustomScript;
    private checkSuccessCondition;
    private validateRecovery;
    private checkAlertResolution;
    private initializeRecoveryActions;
    private startRecoveryMonitoring;
    private startHealthMonitoring;
    private startDeploymentMonitoring;
    private findApplicableRecoveryAction;
    private isActionApplicable;
    private isInGlobalCooldown;
    private escalateToManualIntervention;
    private queueRecoveryAttempt;
    private monitorActiveAlerts;
    private processRecoveryQueue;
    private performHealthSelfCheck;
    private performSystemHealthCheck;
    private updateRecoveryMetrics;
    private cleanupOldAttempts;
    private getLatestMetricValue;
    private getRecentMetricsForAlert;
    private recordRecoverySuccess;
    private recordSystemHealthMetrics;
    getRecoveryStats(): Promise<AutoRecoveryStats>;
    getActiveRecoveries(): Promise<RecoveryAttempt[]>;
    getRecoveryHistory(limit?: number): Promise<RecoveryAttempt[]>;
    enableAutoRecovery(): Promise<void>;
    disableAutoRecovery(): Promise<void>;
    updateRecoveryAction(actionId: string, updates: Partial<RecoveryAction>): Promise<void>;
    addRecoveryAction(action: RecoveryAction): Promise<void>;
    removeRecoveryAction(actionId: string): Promise<void>;
    testRecoveryAction(actionId: string, alertId: string): Promise<RecoveryAttempt>;
    getStatus(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        activeRecoveries: number;
        recoveryActions: number;
        isEnabled: boolean;
        issues: string[];
    }>;
}
export declare const autoRecoveryService: AutoRecoveryService;
//# sourceMappingURL=AutoRecoveryService.d.ts.map