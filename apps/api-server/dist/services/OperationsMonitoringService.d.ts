import { SystemMetrics, MetricType, MetricCategory } from '../entities/SystemMetrics';
import { Alert, AlertSeverity, AlertChannel } from '../entities/Alert';
export interface HealthCheckResult {
    serviceName: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime: number;
    details: {
        uptime: number;
        memoryUsage: number;
        cpuUsage: number;
        diskUsage: number;
        activeConnections: number;
        errorCount: number;
        lastError?: string;
    };
    timestamp: Date;
}
export interface SystemStatus {
    overallStatus: 'healthy' | 'degraded' | 'down';
    services: HealthCheckResult[];
    infrastructure: {
        server: {
            uptime: number;
            loadAverage: number[];
            memoryUsage: {
                total: number;
                used: number;
                free: number;
                percentage: number;
            };
            diskUsage: {
                total: number;
                used: number;
                free: number;
                percentage: number;
            };
            networkStats: {
                bytesIn: number;
                bytesOut: number;
                packetsIn: number;
                packetsOut: number;
            };
        };
        database: {
            status: 'connected' | 'disconnected' | 'degraded';
            connectionCount: number;
            queryTime: number;
            lockCount: number;
        };
        applications: {
            apiServer: HealthCheckResult;
            webApp: HealthCheckResult;
            adminDashboard: HealthCheckResult;
        };
    };
    alerts: {
        active: number;
        critical: number;
        warning: number;
        resolved: number;
    };
    timestamp: Date;
}
export interface AlertRule {
    id: string;
    name: string;
    metricType: MetricType;
    metricCategory: MetricCategory;
    condition: {
        operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
        threshold: number;
        duration: number;
    };
    severity: AlertSeverity;
    enabled: boolean;
    channels: AlertChannel[];
    escalationRules?: {
        escalateAfter: number;
        escalateToChannels: AlertChannel[];
    };
}
export interface MonitoringConfig {
    healthCheckInterval: number;
    metricCollectionInterval: number;
    alertCheckInterval: number;
    uptimeCheckInterval: number;
    retention: {
        metrics: number;
        alerts: number;
        logs: number;
    };
    thresholds: {
        responseTime: number;
        errorRate: number;
        memoryUsage: number;
        cpuUsage: number;
        diskUsage: number;
    };
    notifications: {
        email: {
            enabled: boolean;
            recipients: string[];
            smtpConfig: {
                host: string;
                port: number;
                secure: boolean;
                auth: {
                    user: string;
                    pass: string;
                };
            };
        };
        slack: {
            enabled: boolean;
            webhookUrl: string;
            channel: string;
        };
        webhook: {
            enabled: boolean;
            urls: string[];
        };
    };
}
export declare class OperationsMonitoringService {
    private systemMetricsRepo;
    private alertRepo;
    private analyticsService;
    private webhookService;
    private config;
    private monitoringIntervals;
    private healthCheckHistory;
    private alertRules;
    constructor();
    private loadConfig;
    private initializeAlertRules;
    startMonitoring(): Promise<void>;
    stopMonitoring(): Promise<void>;
    private startHealthChecks;
    performSystemHealthCheck(): Promise<SystemStatus>;
    private checkApiServerHealth;
    private checkWebAppHealth;
    private checkAdminDashboardHealth;
    private checkDatabaseHealth;
    private getInfrastructureMetrics;
    private getActiveAlertCounts;
    private determineOverallStatus;
    private startMetricCollection;
    private collectSystemMetrics;
    private collectDatabaseMetrics;
    private startAlertMonitoring;
    private checkAlertConditions;
    private evaluateCondition;
    private createOrUpdateAlert;
    private processEscalations;
    private sendAlertNotifications;
    private sendEmailNotification;
    private sendSlackNotification;
    private sendWebhookNotification;
    private sendEscalationNotifications;
    private getDiskUsage;
    private getDiskUsageInfo;
    private getActiveConnections;
    private getDatabaseConnections;
    private getDatabaseStatus;
    private getAverageQueryTime;
    private getDatabaseLocks;
    private startCleanupProcesses;
    private cleanupOldData;
    private startUptimeMonitoring;
    private recordUptimeMetrics;
    getSystemStatus(): Promise<SystemStatus>;
    getHealthCheckHistory(serviceName: string, hours?: number): Promise<HealthCheckResult[]>;
    getActiveAlerts(): Promise<Alert[]>;
    acknowledgeAlert(alertId: string, userId: string, note?: string): Promise<void>;
    resolveAlert(alertId: string, userId: string, note?: string, action?: string): Promise<void>;
    getMetricsHistory(metricType: MetricType, metricCategory: MetricCategory, hours?: number): Promise<SystemMetrics[]>;
    updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void>;
    addAlertRule(rule: AlertRule): Promise<void>;
    removeAlertRule(ruleId: string): Promise<void>;
    getAlertRules(): Promise<AlertRule[]>;
    getMonitoringConfig(): Promise<MonitoringConfig>;
    updateMonitoringConfig(updates: Partial<MonitoringConfig>): Promise<void>;
    private processHealthCheckResults;
}
//# sourceMappingURL=OperationsMonitoringService.d.ts.map