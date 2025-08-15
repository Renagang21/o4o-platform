"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationsMonitoringService = void 0;
const typeorm_1 = require("typeorm");
const connection_1 = require("../database/connection");
const SystemMetrics_1 = require("../entities/SystemMetrics");
const Alert_1 = require("../entities/Alert");
const AnalyticsService_1 = require("./AnalyticsService");
const child_process_1 = require("child_process");
const util_1 = require("util");
const os = __importStar(require("os"));
const webhookService_1 = require("./webhookService");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class OperationsMonitoringService {
    constructor() {
        this.monitoringIntervals = new Map();
        this.healthCheckHistory = new Map();
        this.alertRules = new Map();
        this.systemMetricsRepo = connection_1.AppDataSource.getRepository(SystemMetrics_1.SystemMetrics);
        this.alertRepo = connection_1.AppDataSource.getRepository(Alert_1.Alert);
        this.analyticsService = new AnalyticsService_1.AnalyticsService();
        this.webhookService = new webhookService_1.WebhookService();
        this.config = this.loadConfig();
        this.initializeAlertRules();
    }
    loadConfig() {
        var _a, _b;
        return {
            healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30'),
            metricCollectionInterval: parseInt(process.env.METRIC_COLLECTION_INTERVAL || '60'),
            alertCheckInterval: parseInt(process.env.ALERT_CHECK_INTERVAL || '30'),
            uptimeCheckInterval: parseInt(process.env.UPTIME_CHECK_INTERVAL || '300'),
            retention: {
                metrics: parseInt(process.env.METRICS_RETENTION_DAYS || '30'),
                alerts: parseInt(process.env.ALERTS_RETENTION_DAYS || '90'),
                logs: parseInt(process.env.LOGS_RETENTION_DAYS || '7')
            },
            thresholds: {
                responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '1000'),
                errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || '5'),
                memoryUsage: parseFloat(process.env.MEMORY_USAGE_THRESHOLD || '85'),
                cpuUsage: parseFloat(process.env.CPU_USAGE_THRESHOLD || '80'),
                diskUsage: parseFloat(process.env.DISK_USAGE_THRESHOLD || '90')
            },
            notifications: {
                email: {
                    enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
                    recipients: ((_a = process.env.EMAIL_RECIPIENTS) === null || _a === void 0 ? void 0 : _a.split(',')) || [],
                    smtpConfig: {
                        host: process.env.SMTP_HOST,
                        port: parseInt(process.env.SMTP_PORT || '587'),
                        secure: process.env.SMTP_SECURE === 'true',
                        auth: {
                            user: process.env.SMTP_USER,
                            pass: process.env.SMTP_PASS
                        }
                    }
                },
                slack: {
                    enabled: process.env.SLACK_NOTIFICATIONS_ENABLED === 'true',
                    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
                    channel: process.env.SLACK_CHANNEL || '#alerts'
                },
                webhook: {
                    enabled: process.env.WEBHOOK_NOTIFICATIONS_ENABLED === 'true',
                    urls: ((_b = process.env.WEBHOOK_URLS) === null || _b === void 0 ? void 0 : _b.split(',')) || []
                }
            }
        };
    }
    initializeAlertRules() {
        const defaultRules = [
            {
                id: 'high-response-time',
                name: 'High Response Time',
                metricType: SystemMetrics_1.MetricType.PERFORMANCE,
                metricCategory: SystemMetrics_1.MetricCategory.RESPONSE_TIME,
                condition: {
                    operator: '>',
                    threshold: this.config.thresholds.responseTime,
                    duration: 5
                },
                severity: Alert_1.AlertSeverity.HIGH,
                enabled: true,
                channels: [Alert_1.AlertChannel.DASHBOARD, Alert_1.AlertChannel.EMAIL],
                escalationRules: {
                    escalateAfter: 15,
                    escalateToChannels: [Alert_1.AlertChannel.SLACK]
                }
            },
            {
                id: 'high-error-rate',
                name: 'High Error Rate',
                metricType: SystemMetrics_1.MetricType.ERROR,
                metricCategory: SystemMetrics_1.MetricCategory.ERROR_RATE,
                condition: {
                    operator: '>',
                    threshold: this.config.thresholds.errorRate,
                    duration: 3
                },
                severity: Alert_1.AlertSeverity.CRITICAL,
                enabled: true,
                channels: [Alert_1.AlertChannel.DASHBOARD, Alert_1.AlertChannel.EMAIL, Alert_1.AlertChannel.SLACK]
            },
            {
                id: 'high-memory-usage',
                name: 'High Memory Usage',
                metricType: SystemMetrics_1.MetricType.SYSTEM,
                metricCategory: SystemMetrics_1.MetricCategory.MEMORY_USAGE,
                condition: {
                    operator: '>',
                    threshold: this.config.thresholds.memoryUsage,
                    duration: 10
                },
                severity: Alert_1.AlertSeverity.HIGH,
                enabled: true,
                channels: [Alert_1.AlertChannel.DASHBOARD, Alert_1.AlertChannel.EMAIL]
            },
            {
                id: 'high-cpu-usage',
                name: 'High CPU Usage',
                metricType: SystemMetrics_1.MetricType.SYSTEM,
                metricCategory: SystemMetrics_1.MetricCategory.CPU_USAGE,
                condition: {
                    operator: '>',
                    threshold: this.config.thresholds.cpuUsage,
                    duration: 15
                },
                severity: Alert_1.AlertSeverity.HIGH,
                enabled: true,
                channels: [Alert_1.AlertChannel.DASHBOARD, Alert_1.AlertChannel.EMAIL]
            },
            {
                id: 'high-disk-usage',
                name: 'High Disk Usage',
                metricType: SystemMetrics_1.MetricType.SYSTEM,
                metricCategory: SystemMetrics_1.MetricCategory.STORAGE_USAGE,
                condition: {
                    operator: '>',
                    threshold: this.config.thresholds.diskUsage,
                    duration: 30
                },
                severity: Alert_1.AlertSeverity.CRITICAL,
                enabled: true,
                channels: [Alert_1.AlertChannel.DASHBOARD, Alert_1.AlertChannel.EMAIL, Alert_1.AlertChannel.SLACK]
            }
        ];
        defaultRules.forEach((rule) => {
            this.alertRules.set(rule.id, rule);
        });
    }
    // Start all monitoring processes
    async startMonitoring() {
        // Start health checks
        await this.startHealthChecks();
        // Start metric collection
        await this.startMetricCollection();
        // Start alert monitoring
        await this.startAlertMonitoring();
        // Start uptime monitoring
        await this.startUptimeMonitoring();
        // Start cleanup processes
        await this.startCleanupProcesses();
    }
    // Stop all monitoring processes
    async stopMonitoring() {
        this.monitoringIntervals.forEach((interval, name) => {
            clearInterval(interval);
        });
        this.monitoringIntervals.clear();
    }
    // Health Check System
    async startHealthChecks() {
        const interval = setInterval(async () => {
            try {
                const systemStatus = await this.performSystemHealthCheck();
                await this.processHealthCheckResults(systemStatus);
            }
            catch (error) {
                console.error('Health check failed:', error);
            }
        }, this.config.healthCheckInterval * 1000);
        this.monitoringIntervals.set('health-check', interval);
    }
    async performSystemHealthCheck() {
        const timestamp = new Date();
        // Check individual services
        const services = await Promise.all([
            this.checkApiServerHealth(),
            this.checkWebAppHealth(),
            this.checkAdminDashboardHealth(),
            this.checkDatabaseHealth()
        ]);
        // Get infrastructure metrics
        const infrastructure = await this.getInfrastructureMetrics();
        // Get active alerts
        const alerts = await this.getActiveAlertCounts();
        // Determine overall status
        const overallStatus = this.determineOverallStatus(services, infrastructure);
        return {
            overallStatus,
            services,
            infrastructure,
            alerts,
            timestamp
        };
    }
    async checkApiServerHealth() {
        const start = Date.now();
        let status = 'healthy';
        let errorCount = 0;
        let lastError;
        try {
            // Check if API server is responding
            const response = await fetch(`${process.env.API_URL || 'http://localhost:4000'}/health`);
            if (!response.ok) {
                status = 'unhealthy';
                lastError = `HTTP ${response.status}: ${response.statusText}`;
            }
        }
        catch (error) {
            status = 'unhealthy';
            lastError = error instanceof Error ? error.message : 'Unknown error';
            errorCount = 1;
        }
        const responseTime = Date.now() - start;
        const memoryUsage = process.memoryUsage().rss / 1024 / 1024; // MB
        const cpuUsage = process.cpuUsage();
        const uptime = process.uptime();
        return {
            serviceName: 'API Server',
            status,
            responseTime,
            details: {
                uptime,
                memoryUsage,
                cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
                diskUsage: await this.getDiskUsage(),
                activeConnections: await this.getActiveConnections(),
                errorCount,
                lastError
            },
            timestamp: new Date()
        };
    }
    async checkWebAppHealth() {
        const start = Date.now();
        let status = 'healthy';
        let errorCount = 0;
        let lastError;
        try {
            // Check if web app is accessible
            const response = await fetch(`${process.env.WEB_URL || 'http://localhost:3000'}`);
            if (!response.ok) {
                status = 'unhealthy';
                lastError = `HTTP ${response.status}: ${response.statusText}`;
            }
        }
        catch (error) {
            status = 'unhealthy';
            lastError = error instanceof Error ? error.message : 'Unknown error';
            errorCount = 1;
        }
        const responseTime = Date.now() - start;
        return {
            serviceName: 'Web App',
            status,
            responseTime,
            details: {
                uptime: process.uptime(),
                memoryUsage: 0, // Web app metrics would be collected separately
                cpuUsage: 0,
                diskUsage: 0,
                activeConnections: 0,
                errorCount,
                lastError
            },
            timestamp: new Date()
        };
    }
    async checkAdminDashboardHealth() {
        const start = Date.now();
        let status = 'healthy';
        let errorCount = 0;
        let lastError;
        try {
            // Check if admin dashboard is accessible
            const response = await fetch(`${process.env.ADMIN_URL || 'http://localhost:3001'}`);
            if (!response.ok) {
                status = 'unhealthy';
                lastError = `HTTP ${response.status}: ${response.statusText}`;
            }
        }
        catch (error) {
            status = 'unhealthy';
            lastError = error instanceof Error ? error.message : 'Unknown error';
            errorCount = 1;
        }
        const responseTime = Date.now() - start;
        return {
            serviceName: 'Admin Dashboard',
            status,
            responseTime,
            details: {
                uptime: process.uptime(),
                memoryUsage: 0,
                cpuUsage: 0,
                diskUsage: 0,
                activeConnections: 0,
                errorCount,
                lastError
            },
            timestamp: new Date()
        };
    }
    async checkDatabaseHealth() {
        const start = Date.now();
        let status = 'healthy';
        let errorCount = 0;
        let lastError;
        try {
            // Test database connection
            await connection_1.AppDataSource.query('SELECT 1');
            // Check for long-running queries
            const longQueries = await connection_1.AppDataSource.query(`
        SELECT count(*) as count 
        FROM pg_stat_activity 
        WHERE state = 'active' AND query_start < now() - interval '5 minutes'
      `);
            if (longQueries[0].count > 0) {
                status = 'degraded';
                lastError = `${longQueries[0].count} long-running queries detected`;
            }
        }
        catch (error) {
            status = 'unhealthy';
            lastError = error instanceof Error ? error.message : 'Unknown error';
            errorCount = 1;
        }
        const responseTime = Date.now() - start;
        return {
            serviceName: 'Database',
            status,
            responseTime,
            details: {
                uptime: 0, // Would need to query database uptime
                memoryUsage: 0,
                cpuUsage: 0,
                diskUsage: 0,
                activeConnections: await this.getDatabaseConnections(),
                errorCount,
                lastError
            },
            timestamp: new Date()
        };
    }
    async getInfrastructureMetrics() {
        const memInfo = os.totalmem();
        const freeMemInfo = os.freemem();
        const loadAvg = os.loadavg();
        const diskUsage = await this.getDiskUsageInfo();
        return {
            server: {
                uptime: os.uptime(),
                loadAverage: loadAvg,
                memoryUsage: {
                    total: memInfo,
                    used: memInfo - freeMemInfo,
                    free: freeMemInfo,
                    percentage: ((memInfo - freeMemInfo) / memInfo) * 100
                },
                diskUsage,
                networkStats: {
                    bytesIn: 0, // Would need to implement network stats collection
                    bytesOut: 0,
                    packetsIn: 0,
                    packetsOut: 0
                }
            },
            database: {
                status: await this.getDatabaseStatus(),
                connectionCount: await this.getDatabaseConnections(),
                queryTime: await this.getAverageQueryTime(),
                lockCount: await this.getDatabaseLocks()
            },
            applications: {
                apiServer: await this.checkApiServerHealth(),
                webApp: await this.checkWebAppHealth(),
                adminDashboard: await this.checkAdminDashboardHealth()
            }
        };
    }
    async getActiveAlertCounts() {
        const [active, critical, warning, resolved] = await Promise.all([
            this.alertRepo.count({ where: { status: Alert_1.AlertStatus.ACTIVE } }),
            this.alertRepo.count({ where: { status: Alert_1.AlertStatus.ACTIVE, severity: Alert_1.AlertSeverity.CRITICAL } }),
            this.alertRepo.count({ where: { status: Alert_1.AlertStatus.ACTIVE, severity: Alert_1.AlertSeverity.HIGH } }),
            this.alertRepo.count({ where: { status: Alert_1.AlertStatus.RESOLVED } })
        ]);
        return { active, critical, warning, resolved };
    }
    determineOverallStatus(services, infrastructure) {
        const unhealthyServices = services.filter((s) => s.status === 'unhealthy');
        const degradedServices = services.filter((s) => s.status === 'degraded');
        if (unhealthyServices.length > 0) {
            return 'down';
        }
        if (degradedServices.length > 0 ||
            infrastructure.server.memoryUsage.percentage > 85 ||
            infrastructure.server.loadAverage[0] > os.cpus().length * 0.8) {
            return 'degraded';
        }
        return 'healthy';
    }
    // Metric Collection System
    async startMetricCollection() {
        const interval = setInterval(async () => {
            try {
                await this.collectSystemMetrics();
            }
            catch (error) {
                console.error('Metric collection failed:', error);
            }
        }, this.config.metricCollectionInterval * 1000);
        this.monitoringIntervals.set('metric-collection', interval);
    }
    async collectSystemMetrics() {
        const timestamp = new Date();
        // Collect memory metrics
        const memInfo = process.memoryUsage();
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.MEMORY_USAGE, 'Process Memory Usage', memInfo.rss / 1024 / 1024, 'MB', 'api-server', { timestamp: timestamp.toISOString() }));
        // Collect CPU metrics
        const cpuUsage = process.cpuUsage();
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.CPU_USAGE, 'Process CPU Usage', (cpuUsage.user + cpuUsage.system) / 1000000, 'seconds', 'api-server', { timestamp: timestamp.toISOString() }));
        // Collect disk usage
        const diskUsage = await this.getDiskUsage();
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.STORAGE_USAGE, 'Disk Usage', diskUsage, '%', 'server', { timestamp: timestamp.toISOString() }));
        // Collect system uptime
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.UPTIME, 'System Uptime', process.uptime(), 'seconds', 'api-server', { timestamp: timestamp.toISOString() }));
        // Collect database metrics
        await this.collectDatabaseMetrics();
    }
    async collectDatabaseMetrics() {
        try {
            const start = Date.now();
            await connection_1.AppDataSource.query('SELECT 1');
            const queryTime = Date.now() - start;
            await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createPerformanceMetric(SystemMetrics_1.MetricCategory.DATABASE_QUERY_TIME, 'Database Query Time', queryTime, 'ms', 'database', 'health-check', { timestamp: new Date().toISOString() }));
            const connectionCount = await this.getDatabaseConnections();
            await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.CONCURRENT_USERS, 'Database Connections', connectionCount, 'count', 'database', { timestamp: new Date().toISOString() }));
        }
        catch (error) {
            console.error('Database metrics collection failed:', error);
        }
    }
    // Alert Monitoring System
    async startAlertMonitoring() {
        const interval = setInterval(async () => {
            try {
                await this.checkAlertConditions();
                await this.processEscalations();
            }
            catch (error) {
                console.error('Alert monitoring failed:', error);
            }
        }, this.config.alertCheckInterval * 1000);
        this.monitoringIntervals.set('alert-monitoring', interval);
    }
    async checkAlertConditions() {
        for (const [ruleId, rule] of this.alertRules) {
            if (!rule.enabled)
                continue;
            const recentMetrics = await this.systemMetricsRepo.find({
                where: {
                    metricType: rule.metricType,
                    metricCategory: rule.metricCategory,
                    createdAt: (0, typeorm_1.MoreThanOrEqual)(new Date(Date.now() - rule.condition.duration * 60 * 1000))
                },
                order: { createdAt: 'DESC' }
            });
            if (recentMetrics.length === 0)
                continue;
            const avgValue = recentMetrics.reduce((sum, m) => sum + parseFloat(m.value.toString()), 0) / recentMetrics.length;
            const isConditionMet = this.evaluateCondition(avgValue, rule.condition);
            if (isConditionMet) {
                await this.createOrUpdateAlert(rule, avgValue, recentMetrics[0]);
            }
        }
    }
    evaluateCondition(value, condition) {
        switch (condition.operator) {
            case '>': return value > condition.threshold;
            case '<': return value < condition.threshold;
            case '>=': return value >= condition.threshold;
            case '<=': return value <= condition.threshold;
            case '=': return value === condition.threshold;
            case '!=': return value !== condition.threshold;
            default: return false;
        }
    }
    async createOrUpdateAlert(rule, value, metric) {
        // Check if similar alert already exists
        const existingAlert = await this.alertRepo.findOne({
            where: {
                alertType: rule.metricType === SystemMetrics_1.MetricType.PERFORMANCE ? Alert_1.AlertType.PERFORMANCE : Alert_1.AlertType.SYSTEM,
                metricName: rule.name,
                status: Alert_1.AlertStatus.ACTIVE
            }
        });
        if (existingAlert) {
            // Update existing alert
            existingAlert.recordOccurrence();
            existingAlert.currentValue = value;
            existingAlert.lastOccurrence = new Date();
            await this.alertRepo.save(existingAlert);
        }
        else {
            // Create new alert
            const alert = Alert_1.Alert.createPerformanceAlert(rule.name, `${rule.name}: ${value}${metric.unit} ${rule.condition.operator} ${rule.condition.threshold}${metric.unit}`, rule.severity, rule.name, value, rule.condition.threshold, rule.condition.operator, metric.unit || '', metric.source, metric.endpoint, {
                ruleId: rule.id,
                metricId: metric.id,
                timestamp: new Date().toISOString()
            });
            alert.notificationChannels = rule.channels;
            const savedAlert = await this.alertRepo.save(alert);
            // Send notifications
            await this.sendAlertNotifications(savedAlert);
        }
    }
    async processEscalations() {
        const escalationCandidates = await this.alertRepo.find({
            where: {
                status: Alert_1.AlertStatus.ACTIVE,
                isEscalated: false,
                severity: (0, typeorm_1.In)([Alert_1.AlertSeverity.HIGH, Alert_1.AlertSeverity.CRITICAL])
            }
        });
        for (const alert of escalationCandidates) {
            if (alert.shouldEscalate(30)) { // 30 minutes default
                alert.escalate('automatic-escalation');
                await this.alertRepo.save(alert);
                await this.sendEscalationNotifications(alert);
            }
        }
    }
    // Notification System
    async sendAlertNotifications(alert) {
        if (!alert.notificationChannels)
            return;
        const promises = alert.notificationChannels.map((channel) => {
            switch (channel) {
                case Alert_1.AlertChannel.EMAIL:
                    return this.sendEmailNotification(alert);
                case Alert_1.AlertChannel.SLACK:
                    return this.sendSlackNotification(alert);
                case Alert_1.AlertChannel.WEBHOOK:
                    return this.sendWebhookNotification(alert);
                default:
                    return Promise.resolve();
            }
        });
        try {
            await Promise.all(promises);
            alert.markNotificationSent();
            await this.alertRepo.save(alert);
        }
        catch (error) {
            console.error('Failed to send alert notifications:', error);
            alert.incrementNotificationRetries();
            await this.alertRepo.save(alert);
        }
    }
    async sendEmailNotification(alert) {
        if (!this.config.notifications.email.enabled)
            return;
        const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
        const body = `
      Alert: ${alert.title}
      Severity: ${alert.severity}
      Message: ${alert.message}
      Source: ${alert.source}
      Time: ${alert.createdAt.toISOString()}
      
      Current Value: ${alert.getFormattedValue()}
      Threshold: ${alert.thresholdValue}
      
      Details: ${JSON.stringify(alert.metadata, null, 2)}
    `;
        // Implementation would use nodemailer or similar
    }
    async sendSlackNotification(alert) {
        if (!this.config.notifications.slack.enabled)
            return;
        const message = {
            channel: this.config.notifications.slack.channel,
            text: `🚨 *${alert.title}*`,
            attachments: [
                {
                    color: alert.severity === Alert_1.AlertSeverity.CRITICAL ? 'danger' : 'warning',
                    fields: [
                        {
                            title: 'Severity',
                            value: alert.severity.toUpperCase(),
                            short: true
                        },
                        {
                            title: 'Source',
                            value: alert.source || 'Unknown',
                            short: true
                        },
                        {
                            title: 'Current Value',
                            value: alert.getFormattedValue(),
                            short: true
                        },
                        {
                            title: 'Threshold',
                            value: `${alert.thresholdValue} ${alert.unit}`,
                            short: true
                        },
                        {
                            title: 'Message',
                            value: alert.message,
                            short: false
                        }
                    ],
                    ts: Math.floor(alert.createdAt.getTime() / 1000)
                }
            ]
        };
        // Implementation would use Slack webhook
    }
    async sendWebhookNotification(alert) {
        if (!this.config.notifications.webhook.enabled)
            return;
        const payload = {
            alert: {
                id: alert.id,
                type: alert.alertType,
                severity: alert.severity,
                status: alert.status,
                title: alert.title,
                message: alert.message,
                source: alert.source,
                currentValue: alert.currentValue,
                thresholdValue: alert.thresholdValue,
                unit: alert.unit,
                timestamp: alert.createdAt.toISOString()
            },
            context: alert.context,
            metadata: alert.metadata
        };
        await Promise.all(this.config.notifications.webhook.urls.map((url) => this.webhookService.sendWebhook(url, payload)));
    }
    async sendEscalationNotifications(alert) {
        await this.sendAlertNotifications(alert);
    }
    // Utility Methods
    async getDiskUsage() {
        try {
            const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5}' | sed 's/%//'");
            return parseFloat(stdout.trim());
        }
        catch (error) {
            return 0;
        }
    }
    async getDiskUsageInfo() {
        try {
            const { stdout } = await execAsync("df -B1 / | tail -1");
            const parts = stdout.trim().split(/\s+/);
            const total = parseInt(parts[1]);
            const used = parseInt(parts[2]);
            const free = parseInt(parts[3]);
            return {
                total,
                used,
                free,
                percentage: (used / total) * 100
            };
        }
        catch (error) {
            return { total: 0, used: 0, free: 0, percentage: 0 };
        }
    }
    async getActiveConnections() {
        try {
            const { stdout } = await execAsync("netstat -an | grep :4000 | wc -l");
            return parseInt(stdout.trim());
        }
        catch (error) {
            return 0;
        }
    }
    async getDatabaseConnections() {
        try {
            const result = await connection_1.AppDataSource.query('SELECT count(*) FROM pg_stat_activity');
            return parseInt(result[0].count);
        }
        catch (error) {
            return 0;
        }
    }
    async getDatabaseStatus() {
        try {
            await connection_1.AppDataSource.query('SELECT 1');
            return 'connected';
        }
        catch (error) {
            return 'disconnected';
        }
    }
    async getAverageQueryTime() {
        var _a;
        try {
            const result = await connection_1.AppDataSource.query(`
        SELECT avg(mean_time) as avg_time 
        FROM pg_stat_statements 
        WHERE calls > 0
      `);
            return parseFloat(((_a = result[0]) === null || _a === void 0 ? void 0 : _a.avg_time) || 0);
        }
        catch (error) {
            return 0;
        }
    }
    async getDatabaseLocks() {
        try {
            const result = await connection_1.AppDataSource.query('SELECT count(*) FROM pg_locks');
            return parseInt(result[0].count);
        }
        catch (error) {
            return 0;
        }
    }
    // Cleanup and Maintenance
    async startCleanupProcesses() {
        // Clean up old metrics daily
        const cleanup = setInterval(async () => {
            try {
                await this.cleanupOldData();
            }
            catch (error) {
                console.error('Cleanup process failed:', error);
            }
        }, 24 * 60 * 60 * 1000); // 24 hours
        this.monitoringIntervals.set('cleanup', cleanup);
    }
    async cleanupOldData() {
        const metricsRetentionDate = new Date();
        metricsRetentionDate.setDate(metricsRetentionDate.getDate() - this.config.retention.metrics);
        const alertsRetentionDate = new Date();
        alertsRetentionDate.setDate(alertsRetentionDate.getDate() - this.config.retention.alerts);
        // Clean up old metrics
        await this.systemMetricsRepo.delete({
            createdAt: (0, typeorm_1.LessThan)(metricsRetentionDate)
        });
        // Clean up old resolved alerts
        await this.alertRepo.delete({
            status: Alert_1.AlertStatus.RESOLVED,
            resolvedAt: (0, typeorm_1.LessThan)(alertsRetentionDate)
        });
    }
    async startUptimeMonitoring() {
        const interval = setInterval(async () => {
            try {
                await this.recordUptimeMetrics();
            }
            catch (error) {
                console.error('Uptime monitoring failed:', error);
            }
        }, this.config.uptimeCheckInterval * 1000);
        this.monitoringIntervals.set('uptime-monitoring', interval);
    }
    async recordUptimeMetrics() {
        const uptime = process.uptime();
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.UPTIME, 'Process Uptime', uptime, 'seconds', 'api-server', { timestamp: new Date().toISOString() }));
    }
    // Public API Methods
    async getSystemStatus() {
        return await this.performSystemHealthCheck();
    }
    async getHealthCheckHistory(serviceName, hours = 24) {
        return this.healthCheckHistory.get(serviceName) || [];
    }
    async getActiveAlerts() {
        return await this.alertRepo.find({
            where: { status: Alert_1.AlertStatus.ACTIVE },
            order: { createdAt: 'DESC' }
        });
    }
    async acknowledgeAlert(alertId, userId, note) {
        const alert = await this.alertRepo.findOne({ where: { id: alertId } });
        if (alert) {
            alert.acknowledge(userId, note);
            await this.alertRepo.save(alert);
        }
    }
    async resolveAlert(alertId, userId, note, action) {
        const alert = await this.alertRepo.findOne({ where: { id: alertId } });
        if (alert) {
            alert.resolve(userId, note, action);
            await this.alertRepo.save(alert);
        }
    }
    async getMetricsHistory(metricType, metricCategory, hours = 24) {
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - hours);
        return await this.systemMetricsRepo.find({
            where: {
                metricType,
                metricCategory,
                createdAt: (0, typeorm_1.MoreThanOrEqual)(startDate)
            },
            order: { createdAt: 'ASC' }
        });
    }
    async updateAlertRule(ruleId, updates) {
        const rule = this.alertRules.get(ruleId);
        if (rule) {
            Object.assign(rule, updates);
            this.alertRules.set(ruleId, rule);
        }
    }
    async addAlertRule(rule) {
        this.alertRules.set(rule.id, rule);
    }
    async removeAlertRule(ruleId) {
        this.alertRules.delete(ruleId);
    }
    async getAlertRules() {
        return Array.from(this.alertRules.values());
    }
    async getMonitoringConfig() {
        return this.config;
    }
    async updateMonitoringConfig(updates) {
        this.config = { ...this.config, ...updates };
        // Restart monitoring with new config
        await this.stopMonitoring();
        await this.startMonitoring();
    }
    async processHealthCheckResults(systemStatus) {
        // Store health check results in history
        systemStatus.services.forEach((service) => {
            if (!this.healthCheckHistory.has(service.serviceName)) {
                this.healthCheckHistory.set(service.serviceName, []);
            }
            const history = this.healthCheckHistory.get(service.serviceName);
            history.push(service);
            // Keep only last 24 hours
            const cutoff = new Date();
            cutoff.setHours(cutoff.getHours() - 24);
            this.healthCheckHistory.set(service.serviceName, history.filter((h) => h.timestamp >= cutoff));
        });
        // Record metrics for each service
        for (const service of systemStatus.services) {
            await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createPerformanceMetric(SystemMetrics_1.MetricCategory.RESPONSE_TIME, `${service.serviceName} Response Time`, service.responseTime, 'ms', service.serviceName.toLowerCase().replace(' ', '-'), '/health', {
                status: service.status,
                timestamp: service.timestamp.toISOString()
            }));
        }
    }
}
exports.OperationsMonitoringService = OperationsMonitoringService;
//# sourceMappingURL=OperationsMonitoringService.js.map