import { Request, Response } from 'express';
import { OperationsMonitoringService, SystemStatus, HealthCheckResult, AlertRule } from '../services/OperationsMonitoringService.js';
import { MetricType, MetricCategory, SystemMetrics } from '../entities/SystemMetrics.js';
import { AlertSeverity, AlertStatus } from '../entities/Alert.js';
import { AuthRequest } from '../types/auth.js';

export class OperationsController {
  private operationsService: OperationsMonitoringService;

  constructor() {
    this.operationsService = new OperationsMonitoringService();
  }

  // System Status and Health Checks
  async getSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      const systemStatus = await this.operationsService.getSystemStatus();
      
      res.json({
        success: true,
        data: systemStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const systemStatus = await this.operationsService.performSystemHealthCheck();
      
      // Return simplified health status for external monitoring
      const healthStatus = {
        status: systemStatus.overallStatus,
        services: systemStatus.services.map((service: any) => ({
          name: service.serviceName,
          status: service.status,
          responseTime: service.responseTime
        })),
        uptime: systemStatus.infrastructure.server.uptime,
        timestamp: systemStatus.timestamp
      };

      res.json(healthStatus);
    } catch (error) {
      // Error log removed
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  async getServiceHealth(req: Request, res: Response): Promise<void> {
    try {
      const { serviceName } = req.params;
      const { hours = 24 } = req.query;
      
      const history = await this.operationsService.getHealthCheckHistory(
        serviceName,
        parseInt(hours as string)
      );

      res.json({
        success: true,
        data: {
          serviceName,
          history,
          currentStatus: history[history.length - 1] || null
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve service health',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Infrastructure Monitoring
  async getInfrastructureMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { hours = 24 } = req.query;
      const hoursNum = parseInt(hours as string);

      const [
        cpuMetrics,
        memoryMetrics,
        diskMetrics,
        uptimeMetrics
      ] = await Promise.all([
        this.operationsService.getMetricsHistory(MetricType.SYSTEM, MetricCategory.CPU_USAGE, hoursNum),
        this.operationsService.getMetricsHistory(MetricType.SYSTEM, MetricCategory.MEMORY_USAGE, hoursNum),
        this.operationsService.getMetricsHistory(MetricType.SYSTEM, MetricCategory.STORAGE_USAGE, hoursNum),
        this.operationsService.getMetricsHistory(MetricType.SYSTEM, MetricCategory.UPTIME, hoursNum)
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
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve infrastructure metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { hours = 24 } = req.query;
      const hoursNum = parseInt(hours as string);

      const [
        responseTimeMetrics,
        errorRateMetrics,
        throughputMetrics,
        latencyMetrics
      ] = await Promise.all([
        this.operationsService.getMetricsHistory(MetricType.PERFORMANCE, MetricCategory.RESPONSE_TIME, hoursNum),
        this.operationsService.getMetricsHistory(MetricType.ERROR, MetricCategory.ERROR_RATE, hoursNum),
        this.operationsService.getMetricsHistory(MetricType.SYSTEM, MetricCategory.THROUGHPUT, hoursNum),
        this.operationsService.getMetricsHistory(MetricType.PERFORMANCE, MetricCategory.API_LATENCY, hoursNum)
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
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Alert Management
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { status, severity, limit = 50, offset = 0 } = req.query;
      
      interface AlertWhereConditions {
        status?: string;
        severity?: string;
      }
      let whereConditions: AlertWhereConditions = {};
      
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
        filteredAlerts = filteredAlerts.filter((alert: any) => alert.status === status);
      }
      
      if (severity && severity !== 'all') {
        filteredAlerts = filteredAlerts.filter((alert: any) => alert.severity === severity);
      }

      const startIndex = parseInt(offset as string);
      const limitNum = parseInt(limit as string);
      const paginatedAlerts = filteredAlerts.slice(startIndex, startIndex + limitNum);

      res.json({
        success: true,
        data: {
          alerts: paginatedAlerts.map((alert: any) => ({
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
            active: alerts.filter((a: any) => a.status === AlertStatus.ACTIVE).length,
            critical: alerts.filter((a: any) => a.severity === AlertSeverity.CRITICAL).length,
            high: alerts.filter((a: any) => a.severity === AlertSeverity.HIGH).length,
            escalated: alerts.filter((a: any) => a.isEscalated).length
          }
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async acknowledgeAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const { note } = req.body;
      const userId = req.user?.id || 'system';

      await this.operationsService.acknowledgeAlert(alertId, userId, note);

      res.json({
        success: true,
        message: 'Alert acknowledged successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async resolveAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const { note, action } = req.body;
      const userId = req.user?.id || 'system';

      await this.operationsService.resolveAlert(alertId, userId, note, action);

      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Alert Rules Management
  async getAlertRules(req: Request, res: Response): Promise<void> {
    try {
      const rules = await this.operationsService.getAlertRules();
      
      res.json({
        success: true,
        data: {
          rules: rules.map((rule: any) => ({
            ...rule,
            isActive: rule.enabled,
            conditionDescription: this.formatConditionDescription(rule)
          }))
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alert rules',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createAlertRule(req: Request, res: Response): Promise<void> {
    try {
      const rule: AlertRule = {
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
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to create alert rule',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateAlertRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const updates = req.body;

      await this.operationsService.updateAlertRule(ruleId, updates);

      res.json({
        success: true,
        message: 'Alert rule updated successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to update alert rule',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteAlertRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;

      await this.operationsService.removeAlertRule(ruleId);

      res.json({
        success: true,
        message: 'Alert rule deleted successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to delete alert rule',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Monitoring Configuration
  async getMonitoringConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = await this.operationsService.getMonitoringConfig();
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve monitoring configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateMonitoringConfig(req: Request, res: Response): Promise<void> {
    try {
      const updates = req.body;

      await this.operationsService.updateMonitoringConfig(updates);

      res.json({
        success: true,
        message: 'Monitoring configuration updated successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to update monitoring configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Operations Dashboard Data
  async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '24h' } = req.query;
      const hours = this.parseTimeRange(timeRange as string);

      const [
        systemStatus,
        alerts,
        performanceMetrics,
        infrastructureMetrics
      ] = await Promise.all([
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
          healthyServices: systemStatus.services.filter((s: any) => s.status === 'healthy').length,
          alerts: {
            total: alerts.length,
            critical: alerts.filter((a: any) => a.severity === AlertSeverity.CRITICAL).length,
            high: alerts.filter((a: any) => a.severity === AlertSeverity.HIGH && a.status === AlertStatus.ACTIVE).length,
            acknowledged: alerts.filter((a: any) => a.status === AlertStatus.ACKNOWLEDGED).length
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
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Status Page Data (Public endpoint)
  async getStatusPageData(req: Request, res: Response): Promise<void> {
    try {
      const systemStatus = await this.operationsService.getSystemStatus();
      
      // Public status page with limited information
      const statusPage = {
        status: systemStatus.overallStatus,
        services: systemStatus.services.map((service: any) => ({
          name: service.serviceName,
          status: service.status,
          responseTime: service.responseTime
        })),
        uptime: systemStatus.infrastructure.server.uptime,
        lastUpdated: systemStatus.timestamp,
        incidents: await this.getRecentIncidents()
      };

      res.json(statusPage);
    } catch (error) {
      // Error log removed
      res.status(500).json({
        status: 'error',
        message: 'Unable to retrieve system status',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Utility Methods
  private formatMetricsForChart(metrics: SystemMetrics[]): Array<{
    timestamp: Date;
    value: number;
    unit: string;
  }> {
    return metrics.map((metric: any) => ({
      timestamp: metric.createdAt,
      value: parseFloat(metric.value),
      unit: metric.unit
    }));
  }

  private calculateAverage(metrics: SystemMetrics[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + parseFloat(metric.value), 0);
    return Math.round((sum / metrics.length) * 100) / 100;
  }

  private formatConditionDescription(rule: AlertRule): string {
    return `${rule.metricCategory.replace('_', ' ')} ${rule.condition.operator} ${rule.condition.threshold} for ${rule.condition.duration} minutes`;
  }

  private parseTimeRange(timeRange: string): number {
    const timeRangeMap: { [key: string]: number } = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30
    };
    
    return timeRangeMap[timeRange] || 24;
  }

  private async getPerformanceData(hours: number): Promise<{
    responseTime: {
      current: number;
      average: number;
      trend: 'up' | 'down' | 'stable';
    };
    errorRate: {
      current: number;
      average: number;
      trend: 'up' | 'down' | 'stable';
    };
  }> {
    const [responseTime, errorRate] = await Promise.all([
      this.operationsService.getMetricsHistory(MetricType.PERFORMANCE, MetricCategory.RESPONSE_TIME, hours),
      this.operationsService.getMetricsHistory(MetricType.ERROR, MetricCategory.ERROR_RATE, hours)
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

  private async getInfrastructureData(hours: number): Promise<{
    cpu: {
      current: number;
      average: number;
      trend: 'up' | 'down' | 'stable';
    };
    memory: {
      current: number;
      average: number;
      trend: 'up' | 'down' | 'stable';
    };
    disk: {
      current: number;
      average: number;
      trend: 'up' | 'down' | 'stable';
    };
  }> {
    const [cpu, memory, disk] = await Promise.all([
      this.operationsService.getMetricsHistory(MetricType.SYSTEM, MetricCategory.CPU_USAGE, hours),
      this.operationsService.getMetricsHistory(MetricType.SYSTEM, MetricCategory.MEMORY_USAGE, hours),
      this.operationsService.getMetricsHistory(MetricType.SYSTEM, MetricCategory.STORAGE_USAGE, hours)
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

  private calculateTrend(metrics: SystemMetrics[]): 'up' | 'down' | 'stable' {
    if (metrics.length < 2) return 'stable';
    
    const recent = metrics.slice(-5);
    const older = metrics.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = this.calculateAverage(recent);
    const olderAvg = this.calculateAverage(older);
    
    const diff = recentAvg - olderAvg;
    const threshold = olderAvg * 0.1; // 10% threshold
    
    if (diff > threshold) return 'up';
    if (diff < -threshold) return 'down';
    return 'stable';
  }

  private async getRecentIncidents(): Promise<Array<{
    id: string;
    title: string;
    status: AlertStatus;
    startTime: Date;
    resolvedTime?: Date;
  }>> {
    const alerts = await this.operationsService.getActiveAlerts();
    const incidents = alerts
      .filter((alert: any) => alert.severity === AlertSeverity.CRITICAL)
      .slice(0, 5)
      .map((alert: any) => ({
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

export const operationsController = new OperationsController();