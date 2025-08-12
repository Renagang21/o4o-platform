"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.operationsController = exports.OperationsController = void 0;
const OperationsMonitoringService_1 = require("../services/OperationsMonitoringService");
const SystemMetrics_1 = require("../entities/SystemMetrics");
const Alert_1 = require("../entities/Alert");
class OperationsController {
    constructor() {
        this.operationsService = new OperationsMonitoringService_1.OperationsMonitoringService();
    }
    // System Status and Health Checks
    async getSystemStatus(req, res) {
        try {
            const systemStatus = await this.operationsService.getSystemStatus();
            res.json({
                success: true,
                data: systemStatus,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Failed to get system status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve system status',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getSystemHealth(req, res) {
        try {
            const systemStatus = await this.operationsService.performSystemHealthCheck();
            // Return simplified health status for external monitoring
            const healthStatus = {
                status: systemStatus.overallStatus,
                services: systemStatus.services.map((service) => ({
                    name: service.serviceName,
                    status: service.status,
                    responseTime: service.responseTime
                })),
                uptime: systemStatus.infrastructure.server.uptime,
                timestamp: systemStatus.timestamp
            };
            res.json(healthStatus);
        }
        catch (error) {
            console.error('Health check failed:', error);
            res.status(503).json({
                status: 'unhealthy',
                error: 'Health check failed',
                timestamp: new Date().toISOString()
            });
        }
    }
    async getServiceHealth(req, res) {
        try {
            const { serviceName } = req.params;
            const { hours = 24 } = req.query;
            const history = await this.operationsService.getHealthCheckHistory(serviceName, parseInt(hours));
            res.json({
                success: true,
                data: {
                    serviceName,
                    history,
                    currentStatus: history[history.length - 1] || null
                }
            });
        }
        catch (error) {
            console.error('Failed to get service health:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve service health',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Infrastructure Monitoring
    async getInfrastructureMetrics(req, res) {
        try {
            const { hours = 24 } = req.query;
            const hoursNum = parseInt(hours);
            const [cpuMetrics, memoryMetrics, diskMetrics, uptimeMetrics] = await Promise.all([
                this.operationsService.getMetricsHistory(SystemMetrics_1.MetricType.SYSTEM, SystemMetrics_1.MetricCategory.CPU_USAGE, hoursNum),
                this.operationsService.getMetricsHistory(SystemMetrics_1.MetricType.SYSTEM, SystemMetrics_1.MetricCategory.MEMORY_USAGE, hoursNum),
                this.operationsService.getMetricsHistory(SystemMetrics_1.MetricType.SYSTEM, SystemMetrics_1.MetricCategory.STORAGE_USAGE, hoursNum),
                this.operationsService.getMetricsHistory(SystemMetrics_1.MetricType.SYSTEM, SystemMetrics_1.MetricCategory.UPTIME, hoursNum)
            ]);
            res.json({
                success: true,
                data: {
                    cpu: this.formatMetricsForChart(cpuMetrics),
                    memory: this.formatMetricsForChart(memoryMetrics),
                    disk: this.formatMetricsForChart(diskMetrics),
                    uptime: this.formatMetricsForChart(uptimeMetrics),
                    timeRange: {
                        start: new Date(Date.now() - hoursNum * 60 * 60 * 1000).toISOString(),
                        end: new Date().toISOString(),
                        hours: hoursNum
                    }
                }
            });
        }
        catch (error) {
            console.error('Failed to get infrastructure metrics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve infrastructure metrics',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getPerformanceMetrics(req, res) {
        try {
            const { hours = 24 } = req.query;
            const hoursNum = parseInt(hours);
            const [responseTimeMetrics, errorRateMetrics, throughputMetrics, latencyMetrics] = await Promise.all([
                this.operationsService.getMetricsHistory(SystemMetrics_1.MetricType.PERFORMANCE, SystemMetrics_1.MetricCategory.RESPONSE_TIME, hoursNum),
                this.operationsService.getMetricsHistory(SystemMetrics_1.MetricType.ERROR, SystemMetrics_1.MetricCategory.ERROR_RATE, hoursNum),
                this.operationsService.getMetricsHistory(SystemMetrics_1.MetricType.SYSTEM, SystemMetrics_1.MetricCategory.THROUGHPUT, hoursNum),
                this.operationsService.getMetricsHistory(SystemMetrics_1.MetricType.PERFORMANCE, SystemMetrics_1.MetricCategory.API_LATENCY, hoursNum)
            ]);
            res.json({
                success: true,
                data: {
                    responseTime: this.formatMetricsForChart(responseTimeMetrics),
                    errorRate: this.formatMetricsForChart(errorRateMetrics),
                    throughput: this.formatMetricsForChart(throughputMetrics),
                    latency: this.formatMetricsForChart(latencyMetrics),
                    summary: {
                        avgResponseTime: this.calculateAverage(responseTimeMetrics),
                        avgErrorRate: this.calculateAverage(errorRateMetrics),
                        avgThroughput: this.calculateAverage(throughputMetrics),
                        avgLatency: this.calculateAverage(latencyMetrics)
                    }
                }
            });
        }
        catch (error) {
            console.error('Failed to get performance metrics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve performance metrics',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Alert Management
    async getAlerts(req, res) {
        try {
            const { status, severity, limit = 50, offset = 0 } = req.query;
            let whereConditions = {};
            if (status) {
                whereConditions.status = String(status);
            }
            if (severity) {
                whereConditions.severity = String(severity);
            }
            const alerts = await this.operationsService.getActiveAlerts();
            // Apply filters and pagination
            let filteredAlerts = alerts;
            if (status && status !== 'all') {
                filteredAlerts = filteredAlerts.filter((alert) => alert.status === status);
            }
            if (severity && severity !== 'all') {
                filteredAlerts = filteredAlerts.filter((alert) => alert.severity === severity);
            }
            const startIndex = parseInt(offset);
            const limitNum = parseInt(limit);
            const paginatedAlerts = filteredAlerts.slice(startIndex, startIndex + limitNum);
            res.json({
                success: true,
                data: {
                    alerts: paginatedAlerts.map((alert) => ({
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
                        createdAt: alert.createdAt,
                        acknowledgedAt: alert.acknowledgedAt,
                        resolvedAt: alert.resolvedAt,
                        isEscalated: alert.isEscalated,
                        occurrenceCount: alert.occurrenceCount,
                        ageInMinutes: alert.getAgeInMinutes(),
                        displayTitle: alert.getDisplayTitle(),
                        formattedValue: alert.getFormattedValue()
                    })),
                    pagination: {
                        total: filteredAlerts.length,
                        offset: startIndex,
                        limit: limitNum,
                        hasMore: startIndex + limitNum < filteredAlerts.length
                    },
                    summary: {
                        total: alerts.length,
                        active: alerts.filter((a) => a.status === Alert_1.AlertStatus.ACTIVE).length,
                        critical: alerts.filter((a) => a.severity === Alert_1.AlertSeverity.CRITICAL).length,
                        high: alerts.filter((a) => a.severity === Alert_1.AlertSeverity.HIGH).length,
                        escalated: alerts.filter((a) => a.isEscalated).length
                    }
                }
            });
        }
        catch (error) {
            console.error('Failed to get alerts:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve alerts',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async acknowledgeAlert(req, res) {
        var _a;
        try {
            const { alertId } = req.params;
            const { note } = req.body;
            const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'system';
            await this.operationsService.acknowledgeAlert(alertId, userId, note);
            res.json({
                success: true,
                message: 'Alert acknowledged successfully'
            });
        }
        catch (error) {
            console.error('Failed to acknowledge alert:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to acknowledge alert',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async resolveAlert(req, res) {
        var _a;
        try {
            const { alertId } = req.params;
            const { note, action } = req.body;
            const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'system';
            await this.operationsService.resolveAlert(alertId, userId, note, action);
            res.json({
                success: true,
                message: 'Alert resolved successfully'
            });
        }
        catch (error) {
            console.error('Failed to resolve alert:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to resolve alert',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Alert Rules Management
    async getAlertRules(req, res) {
        try {
            const rules = await this.operationsService.getAlertRules();
            res.json({
                success: true,
                data: {
                    rules: rules.map((rule) => ({
                        ...rule,
                        isActive: rule.enabled,
                        conditionDescription: this.formatConditionDescription(rule)
                    }))
                }
            });
        }
        catch (error) {
            console.error('Failed to get alert rules:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve alert rules',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async createAlertRule(req, res) {
        try {
            const rule = {
                id: req.body.id || `rule-${Date.now()}`,
                name: req.body.name,
                metricType: req.body.metricType,
                metricCategory: req.body.metricCategory,
                condition: req.body.condition,
                severity: req.body.severity,
                enabled: req.body.enabled !== false,
                channels: req.body.channels || ['dashboard'],
                escalationRules: req.body.escalationRules
            };
            await this.operationsService.addAlertRule(rule);
            res.status(201).json({
                success: true,
                data: rule,
                message: 'Alert rule created successfully'
            });
        }
        catch (error) {
            console.error('Failed to create alert rule:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create alert rule',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async updateAlertRule(req, res) {
        try {
            const { ruleId } = req.params;
            const updates = req.body;
            await this.operationsService.updateAlertRule(ruleId, updates);
            res.json({
                success: true,
                message: 'Alert rule updated successfully'
            });
        }
        catch (error) {
            console.error('Failed to update alert rule:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update alert rule',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async deleteAlertRule(req, res) {
        try {
            const { ruleId } = req.params;
            await this.operationsService.removeAlertRule(ruleId);
            res.json({
                success: true,
                message: 'Alert rule deleted successfully'
            });
        }
        catch (error) {
            console.error('Failed to delete alert rule:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete alert rule',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Monitoring Configuration
    async getMonitoringConfig(req, res) {
        try {
            const config = await this.operationsService.getMonitoringConfig();
            res.json({
                success: true,
                data: config
            });
        }
        catch (error) {
            console.error('Failed to get monitoring config:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve monitoring configuration',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async updateMonitoringConfig(req, res) {
        try {
            const updates = req.body;
            await this.operationsService.updateMonitoringConfig(updates);
            res.json({
                success: true,
                message: 'Monitoring configuration updated successfully'
            });
        }
        catch (error) {
            console.error('Failed to update monitoring config:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update monitoring configuration',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Operations Dashboard Data
    async getDashboardData(req, res) {
        try {
            const { timeRange = '24h' } = req.query;
            const hours = this.parseTimeRange(timeRange);
            const [systemStatus, alerts, performanceMetrics, infrastructureMetrics] = await Promise.all([
                this.operationsService.getSystemStatus(),
                this.operationsService.getActiveAlerts(),
                this.getPerformanceData(hours),
                this.getInfrastructureData(hours)
            ]);
            const dashboardData = {
                overview: {
                    status: systemStatus.overallStatus,
                    uptime: systemStatus.infrastructure.server.uptime,
                    services: systemStatus.services.length,
                    healthyServices: systemStatus.services.filter((s) => s.status === 'healthy').length,
                    alerts: {
                        total: alerts.length,
                        critical: alerts.filter((a) => a.severity === Alert_1.AlertSeverity.CRITICAL).length,
                        high: alerts.filter((a) => a.severity === Alert_1.AlertSeverity.HIGH && a.status === Alert_1.AlertStatus.ACTIVE).length,
                        acknowledged: alerts.filter((a) => a.status === Alert_1.AlertStatus.ACKNOWLEDGED).length
                    }
                },
                systemStatus,
                recentAlerts: alerts.slice(0, 10),
                performance: performanceMetrics,
                infrastructure: infrastructureMetrics,
                timestamp: new Date().toISOString()
            };
            res.json({
                success: true,
                data: dashboardData
            });
        }
        catch (error) {
            console.error('Failed to get dashboard data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve dashboard data',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Status Page Data (Public endpoint)
    async getStatusPageData(req, res) {
        try {
            const systemStatus = await this.operationsService.getSystemStatus();
            // Public status page with limited information
            const statusPage = {
                status: systemStatus.overallStatus,
                services: systemStatus.services.map((service) => ({
                    name: service.serviceName,
                    status: service.status,
                    responseTime: service.responseTime
                })),
                uptime: systemStatus.infrastructure.server.uptime,
                lastUpdated: systemStatus.timestamp,
                incidents: await this.getRecentIncidents()
            };
            res.json(statusPage);
        }
        catch (error) {
            console.error('Failed to get status page data:', error);
            res.status(500).json({
                status: 'error',
                message: 'Unable to retrieve system status',
                timestamp: new Date().toISOString()
            });
        }
    }
    // Utility Methods
    formatMetricsForChart(metrics) {
        return metrics.map((metric) => ({
            timestamp: metric.createdAt,
            value: parseFloat(metric.value),
            unit: metric.unit
        }));
    }
    calculateAverage(metrics) {
        if (metrics.length === 0)
            return 0;
        const sum = metrics.reduce((acc, metric) => acc + parseFloat(metric.value), 0);
        return Math.round((sum / metrics.length) * 100) / 100;
    }
    formatConditionDescription(rule) {
        return `${rule.metricCategory.replace('_', ' ')} ${rule.condition.operator} ${rule.condition.threshold} for ${rule.condition.duration} minutes`;
    }
    parseTimeRange(timeRange) {
        const timeRangeMap = {
            '1h': 1,
            '6h': 6,
            '24h': 24,
            '7d': 24 * 7,
            '30d': 24 * 30
        };
        return timeRangeMap[timeRange] || 24;
    }
    async getPerformanceData(hours) {
        const [responseTime, errorRate] = await Promise.all([
            this.operationsService.getMetricsHistory(SystemMetrics_1.MetricType.PERFORMANCE, SystemMetrics_1.MetricCategory.RESPONSE_TIME, hours),
            this.operationsService.getMetricsHistory(SystemMetrics_1.MetricType.ERROR, SystemMetrics_1.MetricCategory.ERROR_RATE, hours)
        ]);
        return {
            responseTime: {
                current: responseTime[responseTime.length - 1] ? parseFloat(responseTime[responseTime.length - 1].value) : 0,
                average: this.calculateAverage(responseTime),
                trend: this.calculateTrend(responseTime)
            },
            errorRate: {
                current: errorRate[errorRate.length - 1] ? parseFloat(errorRate[errorRate.length - 1].value) : 0,
                average: this.calculateAverage(errorRate),
                trend: this.calculateTrend(errorRate)
            }
        };
    }
    async getInfrastructureData(hours) {
        const [cpu, memory, disk] = await Promise.all([
            this.operationsService.getMetricsHistory(SystemMetrics_1.MetricType.SYSTEM, SystemMetrics_1.MetricCategory.CPU_USAGE, hours),
            this.operationsService.getMetricsHistory(SystemMetrics_1.MetricType.SYSTEM, SystemMetrics_1.MetricCategory.MEMORY_USAGE, hours),
            this.operationsService.getMetricsHistory(SystemMetrics_1.MetricType.SYSTEM, SystemMetrics_1.MetricCategory.STORAGE_USAGE, hours)
        ]);
        return {
            cpu: {
                current: cpu[cpu.length - 1] ? parseFloat(cpu[cpu.length - 1].value) : 0,
                average: this.calculateAverage(cpu),
                trend: this.calculateTrend(cpu)
            },
            memory: {
                current: memory[memory.length - 1] ? parseFloat(memory[memory.length - 1].value) : 0,
                average: this.calculateAverage(memory),
                trend: this.calculateTrend(memory)
            },
            disk: {
                current: disk[disk.length - 1] ? parseFloat(disk[disk.length - 1].value) : 0,
                average: this.calculateAverage(disk),
                trend: this.calculateTrend(disk)
            }
        };
    }
    calculateTrend(metrics) {
        if (metrics.length < 2)
            return 'stable';
        const recent = metrics.slice(-5);
        const older = metrics.slice(-10, -5);
        if (recent.length === 0 || older.length === 0)
            return 'stable';
        const recentAvg = this.calculateAverage(recent);
        const olderAvg = this.calculateAverage(older);
        const diff = recentAvg - olderAvg;
        const threshold = olderAvg * 0.1; // 10% threshold
        if (diff > threshold)
            return 'up';
        if (diff < -threshold)
            return 'down';
        return 'stable';
    }
    async getRecentIncidents() {
        const alerts = await this.operationsService.getActiveAlerts();
        const incidents = alerts
            .filter((alert) => alert.severity === Alert_1.AlertSeverity.CRITICAL)
            .slice(0, 5)
            .map((alert) => ({
            id: alert.id,
            title: alert.title,
            status: alert.status,
            startTime: alert.createdAt,
            resolvedTime: alert.resolvedAt,
            impact: 'Service disruption'
        }));
        return incidents;
    }
}
exports.OperationsController = OperationsController;
exports.operationsController = new OperationsController();
//# sourceMappingURL=operationsController.js.map