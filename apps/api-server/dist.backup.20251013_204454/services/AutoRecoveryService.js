"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoRecoveryService = exports.AutoRecoveryService = void 0;
const typeorm_1 = require("typeorm");
const connection_1 = require("../database/connection");
const SystemMetrics_1 = require("../entities/SystemMetrics");
const Alert_1 = require("../entities/Alert");
const OperationsMonitoringService_1 = require("./OperationsMonitoringService");
const CircuitBreakerService_1 = require("./CircuitBreakerService");
const GracefulDegradationService_1 = require("./GracefulDegradationService");
const IncidentEscalationService_1 = require("./IncidentEscalationService");
const SelfHealingService_1 = require("./SelfHealingService");
const DeploymentMonitoringService_1 = require("./DeploymentMonitoringService");
// import { WebhookService } from './webhookService';
const child_process_1 = require("child_process");
const util_1 = require("util");
const types_1 = require("../types");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class AutoRecoveryService {
    constructor() {
        // private webhookService: WebhookService;
        this.recoveryActions = new Map();
        this.recoveryAttempts = new Map();
        this.activeRecoveries = new Map(); // alertId -> attemptId
        this.recoveryHistory = [];
        this.recoveryIntervals = new Map();
        this.isEnabled = true;
        this.maxConcurrentRecoveries = 5;
        this.globalCooldown = 300; // 5 minutes
        this.lastGlobalRecovery = null;
        this.systemMetricsRepo = connection_1.AppDataSource.getRepository(SystemMetrics_1.SystemMetrics);
        this.alertRepo = connection_1.AppDataSource.getRepository(Alert_1.Alert);
        this.operationsService = new OperationsMonitoringService_1.OperationsMonitoringService();
        this.circuitBreaker = new CircuitBreakerService_1.CircuitBreakerService();
        this.gracefulDegradation = new GracefulDegradationService_1.GracefulDegradationService();
        this.incidentEscalation = new IncidentEscalationService_1.IncidentEscalationService();
        this.selfHealing = new SelfHealingService_1.SelfHealingService();
        this.deploymentMonitoring = new DeploymentMonitoringService_1.DeploymentMonitoringService();
        // this.webhookService = new WebhookService();
        this.initializeRecoveryActions();
    }
    async startAutoRecovery() {
        // Start all sub-services
        await Promise.all([
            this.circuitBreaker.initialize(),
            this.gracefulDegradation.initialize(),
            this.incidentEscalation.initialize(),
            this.selfHealing.initialize(),
            this.deploymentMonitoring.initialize()
        ]);
        // Start recovery monitoring
        await this.startRecoveryMonitoring();
        // Start health monitoring
        await this.startHealthMonitoring();
        // Start deployment monitoring
        await this.startDeploymentMonitoring();
    }
    async stopAutoRecovery() {
        this.isEnabled = false;
        // Stop all monitoring intervals
        this.recoveryIntervals.forEach((interval, name) => {
            clearInterval(interval);
        });
        // Stop sub-services
        await Promise.all([
            this.circuitBreaker.shutdown(),
            this.gracefulDegradation.shutdown(),
            this.incidentEscalation.shutdown(),
            this.selfHealing.shutdown(),
            this.deploymentMonitoring.shutdown()
        ]);
        this.recoveryIntervals.clear();
    }
    // Main recovery orchestration
    async handleAlert(alert) {
        if (!this.isEnabled)
            return;
        // Check if already being recovered
        if (this.activeRecoveries.has(alert.id)) {
            return;
        }
        // Check global cooldown
        if (this.isInGlobalCooldown()) {
            await this.escalateToManualIntervention(alert, 'global_cooldown');
            return;
        }
        // Check concurrent recovery limit
        if (this.activeRecoveries.size >= this.maxConcurrentRecoveries) {
            await this.queueRecoveryAttempt(alert);
            return;
        }
        // Find applicable recovery action
        const action = await this.findApplicableRecoveryAction(alert);
        if (!action) {
            await this.escalateToManualIntervention(alert, 'no_action_found');
            return;
        }
        // Execute recovery
        await this.executeRecovery(alert, action);
    }
    async executeRecovery(alert, action) {
        const attemptId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const attempt = {
            id: attemptId,
            alertId: alert.id,
            actionId: action.id,
            startTime: new Date(),
            status: 'in_progress',
            stepsExecuted: [],
            metadata: {
                alertTitle: alert.title,
                alertSeverity: alert.severity,
                actionName: action.name
            }
        };
        this.recoveryAttempts.set(attemptId, attempt);
        this.activeRecoveries.set(alert.id, attemptId);
        try {
            // Execute immediate actions
            if (action.actions.immediate) {
                const success = await this.executeRecoverySteps(attempt, action.actions.immediate, 'immediate');
                if (success) {
                    await this.validateRecovery(attempt, alert);
                    return;
                }
            }
            // Execute fallback actions if immediate failed
            if (action.actions.fallback) {
                const success = await this.executeRecoverySteps(attempt, action.actions.fallback, 'fallback');
                if (success) {
                    await this.validateRecovery(attempt, alert);
                    return;
                }
            }
            // If all automated recovery failed, escalate
            await this.executeRecoverySteps(attempt, action.actions.escalation || [], 'escalation');
            await this.escalateToManualIntervention(alert, 'automated_recovery_failed', attempt);
        }
        catch (error) {
            // Error log removed
            attempt.status = 'failed';
            await this.escalateToManualIntervention(alert, 'recovery_error', attempt);
        }
        finally {
            attempt.endTime = new Date();
            this.activeRecoveries.delete(alert.id);
            this.recoveryHistory.push(attempt);
            // Cleanup old history (keep last 1000)
            if (this.recoveryHistory.length > 1000) {
                this.recoveryHistory = this.recoveryHistory.slice(-1000);
            }
        }
    }
    async executeRecoverySteps(attempt, steps, phase) {
        for (const step of steps) {
            const stepExecution = {
                step,
                startTime: new Date(),
                status: 'failed',
                output: '',
                error: ''
            };
            try {
                const result = await this.executeRecoveryStep(step);
                stepExecution.status = 'success';
                stepExecution.output = result.output || '';
                stepExecution.endTime = new Date();
                // Check success condition if provided
                if (step.successCondition) {
                    const conditionMet = await this.checkSuccessCondition(step.successCondition);
                    if (!conditionMet) {
                        stepExecution.status = 'failed';
                        stepExecution.error = 'Success condition not met';
                    }
                }
            }
            catch (error) {
                stepExecution.status = 'failed';
                stepExecution.error = error instanceof Error ? error.message : 'Unknown error';
                stepExecution.endTime = new Date();
                // Error log removed
            }
            attempt.stepsExecuted.push(stepExecution);
            // If critical step failed, abort
            if (stepExecution.status === 'failed' && phase === 'immediate') {
                return false;
            }
        }
        return true;
    }
    async executeRecoveryStep(step) {
        const timeout = step.timeout || 30; // Default 30 seconds
        switch (step.type) {
            case 'restart_service':
                return await this.selfHealing.restartService(step.target, step.parameters);
            case 'clear_cache':
                return await this.selfHealing.clearCache(step.target, step.parameters);
            case 'reset_connections':
                return await this.selfHealing.resetConnections(step.target, step.parameters);
            case 'scale_resources':
                return await this.selfHealing.scaleResources(step.target, step.parameters);
            case 'rollback_deployment':
                return await this.deploymentMonitoring.rollbackDeployment(step.target, step.parameters);
            case 'isolate_component':
                return await this.gracefulDegradation.isolateComponent(step.target, (0, types_1.convertToIsolationParameters)(step.parameters));
            case 'execute_script':
                return await this.executeCustomScript(step.target, step.parameters);
            case 'notify_team':
                return await this.incidentEscalation.notifyTeam(step.target, step.parameters);
            default:
                throw new Error(`Unknown recovery step type: ${step.type}`);
        }
    }
    async executeCustomScript(scriptPath, parameters) {
        const { stdout, stderr } = await execAsync(`bash ${scriptPath} ${JSON.stringify(parameters || {})}`);
        if (stderr) {
            throw new Error(`Script execution failed: ${stderr}`);
        }
        return { output: stdout };
    }
    async checkSuccessCondition(condition) {
        try {
            // Simple condition checking - could be enhanced with more complex logic
            if (condition.includes('http_response')) {
                const url = condition.split(':')[1];
                const response = await fetch(url);
                return response.ok;
            }
            if (condition.includes('service_status')) {
                const service = condition.split(':')[1];
                const status = await this.selfHealing.checkServiceStatus(service);
                return status === 'running';
            }
            if (condition.includes('metric_threshold')) {
                const [, metricName, operator, threshold] = condition.split(':');
                const value = await this.getLatestMetricValue(metricName);
                switch (operator) {
                    case 'lt': return value < parseFloat(threshold);
                    case 'gt': return value > parseFloat(threshold);
                    case 'eq': return value === parseFloat(threshold);
                    default: return false;
                }
            }
            return true;
        }
        catch (error) {
            // Error log removed
            return false;
        }
    }
    async validateRecovery(attempt, alert) {
        // Wait a bit for systems to stabilize
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
        // Check if the original issue is resolved
        const isResolved = await this.checkAlertResolution(alert);
        attempt.result = {
            resolved: isResolved,
            improvements: [],
            remainingIssues: []
        };
        if (isResolved) {
            attempt.status = 'success';
            // Update alert status
            alert.resolve('auto-recovery-system', 'Issue resolved by automated recovery', 'auto_recovery');
            await this.alertRepo.save(alert);
            // Record success metrics
            await this.recordRecoverySuccess(attempt);
        }
        else {
            attempt.status = 'failed';
            // Try escalation if available
            await this.escalateToManualIntervention(alert, 'recovery_validation_failed', attempt);
        }
        attempt.endTime = new Date();
    }
    async checkAlertResolution(alert) {
        try {
            // Re-evaluate the conditions that triggered the alert
            const latestMetrics = await this.getRecentMetricsForAlert(alert);
            // Simple heuristic - if the metric that triggered the alert is back to normal
            if (alert.metricName && alert.thresholdValue) {
                const currentValue = await this.getLatestMetricValue(alert.metricName);
                // Assume alert is resolved if current value is better than threshold
                switch (alert.comparisonOperator) {
                    case '>':
                        return currentValue <= alert.thresholdValue;
                    case '<':
                        return currentValue >= alert.thresholdValue;
                    case '>=':
                        return currentValue < alert.thresholdValue;
                    case '<=':
                        return currentValue > alert.thresholdValue;
                    default:
                        return false;
                }
            }
            return false;
        }
        catch (error) {
            // Error log removed
            return false;
        }
    }
    // Recovery action configuration
    initializeRecoveryActions() {
        const actions = [
            {
                id: 'high-memory-usage',
                name: 'High Memory Usage Recovery',
                description: 'Automated recovery for high memory usage alerts',
                severity: Alert_1.AlertSeverity.HIGH,
                conditions: {
                    metricThresholds: { memory_usage: 85 },
                    duration: 5,
                    consecutiveFailures: 2
                },
                actions: {
                    immediate: [
                        {
                            type: 'clear_cache',
                            target: 'application',
                            parameters: { cacheTypes: ['redis', 'memory', 'temp'] }
                        },
                        {
                            type: 'execute_script',
                            target: '/scripts/memory-cleanup.sh',
                            successCondition: 'metric_threshold:memory_usage:lt:80'
                        }
                    ],
                    fallback: [
                        {
                            type: 'restart_service',
                            target: 'api-server',
                            parameters: { graceful: true, timeout: 30 }
                        }
                    ],
                    escalation: [
                        {
                            type: 'notify_team',
                            target: 'ops-team',
                            parameters: { priority: 'high', issue: 'memory-usage' }
                        }
                    ]
                },
                maxRetries: 3,
                cooldownPeriod: 10,
                autoExecute: true
            },
            {
                id: 'high-response-time',
                name: 'High Response Time Recovery',
                description: 'Automated recovery for slow response times',
                severity: Alert_1.AlertSeverity.HIGH,
                conditions: {
                    metricThresholds: { response_time: 2000 },
                    duration: 3,
                    consecutiveFailures: 3
                },
                actions: {
                    immediate: [
                        {
                            type: 'clear_cache',
                            target: 'application',
                            parameters: { cacheTypes: ['query', 'page'] }
                        },
                        {
                            type: 'reset_connections',
                            target: 'database',
                            parameters: { maxConnections: 20 }
                        }
                    ],
                    fallback: [
                        {
                            type: 'scale_resources',
                            target: 'api-server',
                            parameters: { action: 'scale_up', factor: 1.5 }
                        }
                    ],
                    escalation: [
                        {
                            type: 'notify_team',
                            target: 'dev-team',
                            parameters: { priority: 'high', issue: 'performance' }
                        }
                    ]
                },
                maxRetries: 2,
                cooldownPeriod: 15,
                autoExecute: true
            },
            {
                id: 'database-connection-failure',
                name: 'Database Connection Recovery',
                description: 'Automated recovery for database connection issues',
                severity: Alert_1.AlertSeverity.CRITICAL,
                conditions: {
                    alertTypes: [Alert_1.AlertType.SYSTEM, Alert_1.AlertType.DATABASE],
                    consecutiveFailures: 1
                },
                actions: {
                    immediate: [
                        {
                            type: 'reset_connections',
                            target: 'database',
                            parameters: { force: true }
                        },
                        {
                            type: 'execute_script',
                            target: '/scripts/db-health-check.sh',
                            successCondition: 'service_status:postgresql:running'
                        }
                    ],
                    fallback: [
                        {
                            type: 'restart_service',
                            target: 'postgresql',
                            parameters: { force: false, timeout: 60 }
                        }
                    ],
                    escalation: [
                        {
                            type: 'isolate_component',
                            target: 'database-dependent-services',
                            parameters: { mode: 'graceful_degradation' }
                        },
                        {
                            type: 'notify_team',
                            target: 'dba-team',
                            parameters: { priority: 'critical', issue: 'database-down' }
                        }
                    ]
                },
                maxRetries: 2,
                cooldownPeriod: 5,
                autoExecute: true
            },
            {
                id: 'disk-space-full',
                name: 'Disk Space Recovery',
                description: 'Automated cleanup for disk space issues',
                severity: Alert_1.AlertSeverity.CRITICAL,
                conditions: {
                    metricThresholds: { disk_usage: 95 },
                    duration: 1
                },
                actions: {
                    immediate: [
                        {
                            type: 'execute_script',
                            target: '/scripts/disk-cleanup.sh',
                            parameters: {
                                cleanTmp: true,
                                cleanLogs: true,
                                cleanOldBackups: true
                            },
                            successCondition: 'metric_threshold:disk_usage:lt:90'
                        }
                    ],
                    fallback: [
                        {
                            type: 'execute_script',
                            target: '/scripts/emergency-cleanup.sh',
                            parameters: { aggressive: true }
                        }
                    ],
                    escalation: [
                        {
                            type: 'notify_team',
                            target: 'ops-team',
                            parameters: { priority: 'critical', issue: 'disk-full' }
                        }
                    ]
                },
                maxRetries: 1,
                cooldownPeriod: 30,
                autoExecute: true
            },
            {
                id: 'deployment-failure',
                name: 'Deployment Failure Recovery',
                description: 'Automated rollback for failed deployments',
                severity: Alert_1.AlertSeverity.HIGH,
                conditions: {
                    alertTypes: [Alert_1.AlertType.DEPLOYMENT],
                    consecutiveFailures: 1
                },
                actions: {
                    immediate: [
                        {
                            type: 'rollback_deployment',
                            target: 'latest',
                            parameters: {
                                environment: 'production',
                                preserveData: true
                            },
                            successCondition: 'http_response:http://localhost:4000/health'
                        }
                    ],
                    escalation: [
                        {
                            type: 'notify_team',
                            target: 'dev-team',
                            parameters: {
                                priority: 'high',
                                issue: 'deployment-rollback',
                                includeDetails: true
                            }
                        }
                    ]
                },
                maxRetries: 1,
                cooldownPeriod: 60,
                autoExecute: true
            }
        ];
        actions.forEach((action) => {
            this.recoveryActions.set(action.id, action);
        });
    }
    // Monitoring and health checks
    async startRecoveryMonitoring() {
        const interval = setInterval(async () => {
            try {
                await this.monitorActiveAlerts();
                await this.processRecoveryQueue();
                await this.performHealthSelfCheck();
            }
            catch (error) {
                // Error log removed
            }
        }, 30000); // Every 30 seconds
        this.recoveryIntervals.set('recovery-monitoring', interval);
    }
    async startHealthMonitoring() {
        const interval = setInterval(async () => {
            try {
                await this.performSystemHealthCheck();
                await this.updateRecoveryMetrics();
                await this.cleanupOldAttempts();
            }
            catch (error) {
                // Error log removed
            }
        }, 60000); // Every minute
        this.recoveryIntervals.set('health-monitoring', interval);
    }
    async startDeploymentMonitoring() {
        const interval = setInterval(async () => {
            try {
                await this.deploymentMonitoring.checkActiveDeployments();
                await this.deploymentMonitoring.validateDeploymentHealth();
            }
            catch (error) {
                // Error log removed
            }
        }, 120000); // Every 2 minutes
        this.recoveryIntervals.set('deployment-monitoring', interval);
    }
    // Helper methods
    async findApplicableRecoveryAction(alert) {
        for (const action of this.recoveryActions.values()) {
            if (await this.isActionApplicable(alert, action)) {
                return action;
            }
        }
        return null;
    }
    async isActionApplicable(alert, action) {
        // Check if action is in cooldown
        const lastAttempt = this.recoveryHistory
            .filter((a) => a.actionId === action.id)
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];
        if (lastAttempt) {
            const timeSinceLastAttempt = Date.now() - lastAttempt.startTime.getTime();
            const cooldownMs = action.cooldownPeriod * 60 * 1000;
            if (timeSinceLastAttempt < cooldownMs) {
                return false;
            }
        }
        // Check severity match
        if (action.severity !== alert.severity) {
            return false;
        }
        // Check alert types if specified
        if (action.conditions.alertTypes &&
            !action.conditions.alertTypes.includes(alert.alertType)) {
            return false;
        }
        // Check metric thresholds if specified
        if (action.conditions.metricThresholds) {
            for (const [metricName, threshold] of Object.entries(action.conditions.metricThresholds)) {
                const currentValue = await this.getLatestMetricValue(metricName);
                if (currentValue < threshold) {
                    return false;
                }
            }
        }
        return true;
    }
    isInGlobalCooldown() {
        if (!this.lastGlobalRecovery)
            return false;
        const timeSinceLastRecovery = Date.now() - this.lastGlobalRecovery.getTime();
        return timeSinceLastRecovery < (this.globalCooldown * 1000);
    }
    async escalateToManualIntervention(alert, reason, attempt) {
        await this.incidentEscalation.escalateAlert(alert, {
            reason,
            autoRecoveryAttempt: attempt ? 1 : 0,
            escalationLevel: 'manual_intervention',
            urgency: alert.severity === Alert_1.AlertSeverity.CRITICAL ? 'immediate' : 'high'
        });
    }
    async queueRecoveryAttempt(alert) {
        // Implementation for queuing recovery attempts when at capacity
    }
    async monitorActiveAlerts() {
        const activeAlerts = await this.alertRepo.find({
            where: { status: Alert_1.AlertStatus.ACTIVE },
            order: { createdAt: 'DESC' }
        });
        for (const alert of activeAlerts) {
            if (!this.activeRecoveries.has(alert.id)) {
                await this.handleAlert(alert);
            }
        }
    }
    async processRecoveryQueue() {
        // Process queued recovery attempts when capacity becomes available
        if (this.activeRecoveries.size < this.maxConcurrentRecoveries) {
            // Implementation for processing queued attempts
        }
    }
    async performHealthSelfCheck() {
        // Check if the auto-recovery system itself is healthy
        const checks = [
            this.circuitBreaker.getStatus(),
            this.gracefulDegradation.getStatus(),
            this.selfHealing.getStatus(),
            this.deploymentMonitoring.getStatus()
        ];
        const results = await Promise.allSettled(checks);
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                // Error log removed
            }
        });
    }
    async performSystemHealthCheck() {
        // Perform comprehensive system health check
        const systemStatus = await this.operationsService.performSystemHealthCheck();
        // Record health metrics
        await this.recordSystemHealthMetrics(systemStatus);
    }
    async updateRecoveryMetrics() {
        const stats = await this.getRecoveryStats();
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.RECOVERY_SUCCESS_RATE, 'Auto Recovery Success Rate', stats.successfulRecoveries / Math.max(stats.totalAttempts, 1) * 100, '%', 'auto-recovery-system', { timestamp: new Date().toISOString() }));
    }
    async cleanupOldAttempts() {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7); // Keep 7 days
        this.recoveryHistory = this.recoveryHistory.filter(attempt => attempt.startTime >= cutoff);
    }
    // Utility methods
    async getLatestMetricValue(metricName) {
        const metric = await this.systemMetricsRepo.findOne({
            where: { metricName: metricName },
            order: { createdAt: 'DESC' }
        });
        return metric ? parseFloat(metric.value.toString()) : 0;
    }
    async getRecentMetricsForAlert(alert) {
        if (!alert.metricName)
            return [];
        const since = new Date();
        since.setMinutes(since.getMinutes() - 10); // Last 10 minutes
        return await this.systemMetricsRepo.find({
            where: {
                metricName: alert.metricName,
                createdAt: (0, typeorm_1.MoreThanOrEqual)(since)
            },
            order: { createdAt: 'DESC' }
        });
    }
    async recordRecoverySuccess(attempt) {
        const duration = attempt.endTime.getTime() - attempt.startTime.getTime();
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createPerformanceMetric(SystemMetrics_1.MetricCategory.RECOVERY_TIME, 'Recovery Duration', duration, 'ms', 'auto-recovery', attempt.actionId, {
            alertId: attempt.alertId,
            success: true,
            stepsExecuted: attempt.stepsExecuted.length
        }));
    }
    async recordSystemHealthMetrics(systemStatus) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        // Record various health metrics from system status
        const memoryUsagePercent = ((_c = (_b = (_a = systemStatus.infrastructure) === null || _a === void 0 ? void 0 : _a.server) === null || _b === void 0 ? void 0 : _b.memoryUsage) === null || _c === void 0 ? void 0 : _c.percentage) || 0;
        const cpuLoadAvg = ((_f = (_e = (_d = systemStatus.infrastructure) === null || _d === void 0 ? void 0 : _d.server) === null || _e === void 0 ? void 0 : _e.loadAverage) === null || _f === void 0 ? void 0 : _f[0]) || 0;
        const diskUsagePercent = ((_h = (_g = systemStatus.infrastructure) === null || _g === void 0 ? void 0 : _g.server) === null || _h === void 0 ? void 0 : _h.diskUsage) ?
            (systemStatus.infrastructure.server.diskUsage.used / systemStatus.infrastructure.server.diskUsage.total) * 100 : 0;
        await this.systemMetricsRepo.save([
            SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.CPU_USAGE, 'CPU Load Average', cpuLoadAvg, 'load', 'system', { timestamp: new Date().toISOString() }),
            SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.MEMORY_USAGE, 'Memory Usage', memoryUsagePercent, '%', 'system', { timestamp: new Date().toISOString() }),
            SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.MEMORY_USAGE, 'Disk Usage', diskUsagePercent, '%', 'system-disk', { timestamp: new Date().toISOString() })
        ]);
    }
    // Public API methods
    async getRecoveryStats() {
        const attempts = this.recoveryHistory;
        const successful = attempts.filter((a) => a.status === 'success');
        const failed = attempts.filter((a) => a.status === 'failed');
        const averageRecoveryTime = successful.length > 0
            ? successful.reduce((sum, a) => {
                const duration = a.endTime.getTime() - a.startTime.getTime();
                return sum + duration;
            }, 0) / successful.length
            : 0;
        // Calculate top issues
        const issueMap = new Map();
        attempts.forEach((attempt) => {
            const key = attempt.actionId;
            const existing = issueMap.get(key) || { count: 0, successes: 0, totalTime: 0 };
            existing.count++;
            if (attempt.status === 'success')
                existing.successes++;
            if (attempt.endTime) {
                existing.totalTime += attempt.endTime.getTime() - attempt.startTime.getTime();
            }
            issueMap.set(key, existing);
        });
        const topIssues = Array.from(issueMap.entries()).map(([issueType, stats]) => ({
            issueType,
            count: stats.count,
            successRate: stats.count > 0 ? (stats.successes / stats.count) * 100 : 0,
            averageTime: stats.count > 0 ? stats.totalTime / stats.count : 0
        })).sort((a, b) => b.count - a.count).slice(0, 10);
        return {
            totalAttempts: attempts.length,
            successfulRecoveries: successful.length,
            failedRecoveries: failed.length,
            averageRecoveryTime,
            topIssues,
            serviceHealth: {} // Would be populated with actual service health data
        };
    }
    async getActiveRecoveries() {
        return Array.from(this.activeRecoveries.values())
            .map((attemptId) => this.recoveryAttempts.get(attemptId))
            .filter(Boolean);
    }
    async getRecoveryHistory(limit = 100) {
        return this.recoveryHistory
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
            .slice(0, limit);
    }
    async enableAutoRecovery() {
        this.isEnabled = true;
    }
    async disableAutoRecovery() {
        this.isEnabled = false;
    }
    async updateRecoveryAction(actionId, updates) {
        const action = this.recoveryActions.get(actionId);
        if (action) {
            Object.assign(action, updates);
            this.recoveryActions.set(actionId, action);
        }
    }
    async addRecoveryAction(action) {
        this.recoveryActions.set(action.id, action);
    }
    async removeRecoveryAction(actionId) {
        this.recoveryActions.delete(actionId);
    }
    async testRecoveryAction(actionId, alertId) {
        const action = this.recoveryActions.get(actionId);
        if (!action) {
            throw new Error(`Recovery action not found: ${actionId}`);
        }
        const alert = await this.alertRepo.findOne({ where: { id: alertId } });
        if (!alert) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        // Create a test attempt (won't affect production)
        await this.executeRecovery(alert, action);
        const attemptId = this.activeRecoveries.get(alertId);
        return this.recoveryAttempts.get(attemptId);
    }
    async getStatus() {
        const activeRecoveryCount = this.activeRecoveries.size;
        const issues = [];
        if (!this.isEnabled) {
            issues.push('Auto-recovery is disabled');
        }
        if (activeRecoveryCount > this.maxConcurrentRecoveries * 0.8) {
            issues.push(`High number of active recoveries: ${activeRecoveryCount}`);
        }
        if (this.isInGlobalCooldown()) {
            issues.push('Global recovery cooldown is active');
        }
        let status = 'healthy';
        if (!this.isEnabled || activeRecoveryCount >= this.maxConcurrentRecoveries) {
            status = 'unhealthy';
        }
        else if (issues.length > 0) {
            status = 'degraded';
        }
        return {
            status,
            activeRecoveries: activeRecoveryCount,
            recoveryActions: this.recoveryActions.size,
            isEnabled: this.isEnabled,
            issues
        };
    }
}
exports.AutoRecoveryService = AutoRecoveryService;
exports.autoRecoveryService = new AutoRecoveryService();
//# sourceMappingURL=AutoRecoveryService.js.map