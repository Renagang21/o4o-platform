import { Repository, MoreThanOrEqual, LessThan, Not, In } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { SystemMetrics, MetricType, MetricCategory } from '../entities/SystemMetrics';
import { Alert, AlertType, AlertSeverity, AlertStatus, AlertChannel } from '../entities/Alert';
import { AnalyticsService } from './AnalyticsService';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as fs from 'fs';
import { WebhookService } from './webhookService';

const execAsync = promisify(exec);

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
    duration: number; // minutes
  };
  severity: AlertSeverity;
  enabled: boolean;
  channels: AlertChannel[];
  escalationRules?: {
    escalateAfter: number; // minutes
    escalateToChannels: AlertChannel[];
  };
}

export interface MonitoringConfig {
  healthCheckInterval: number; // seconds
  metricCollectionInterval: number; // seconds
  alertCheckInterval: number; // seconds
  uptimeCheckInterval: number; // seconds
  retention: {
    metrics: number; // days
    alerts: number; // days
    logs: number; // days
  };
  thresholds: {
    responseTime: number; // ms
    errorRate: number; // percentage
    memoryUsage: number; // percentage
    cpuUsage: number; // percentage
    diskUsage: number; // percentage
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

export class OperationsMonitoringService {
  private systemMetricsRepo: Repository<SystemMetrics>;
  private alertRepo: Repository<Alert>;
  private analyticsService: AnalyticsService;
  private webhookService: WebhookService;
  private config: MonitoringConfig;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private healthCheckHistory: Map<string, HealthCheckResult[]> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();

  constructor() {
    this.systemMetricsRepo = AppDataSource.getRepository(SystemMetrics);
    this.alertRepo = AppDataSource.getRepository(Alert);
    this.analyticsService = new AnalyticsService();
    this.webhookService = new WebhookService();
    this.config = this.loadConfig();
    this.initializeAlertRules();
  }

  private loadConfig(): MonitoringConfig {
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
          recipients: process.env.EMAIL_RECIPIENTS?.split(',') || [],
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
          urls: process.env.WEBHOOK_URLS?.split(',') || []
        }
      }
    };
  }

  private initializeAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-response-time',
        name: 'High Response Time',
        metricType: MetricType.PERFORMANCE,
        metricCategory: MetricCategory.RESPONSE_TIME,
        condition: {
          operator: '>',
          threshold: this.config.thresholds.responseTime,
          duration: 5
        },
        severity: AlertSeverity.HIGH,
        enabled: true,
        channels: [AlertChannel.DASHBOARD, AlertChannel.EMAIL],
        escalationRules: {
          escalateAfter: 15,
          escalateToChannels: [AlertChannel.SLACK]
        }
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        metricType: MetricType.ERROR,
        metricCategory: MetricCategory.ERROR_RATE,
        condition: {
          operator: '>',
          threshold: this.config.thresholds.errorRate,
          duration: 3
        },
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [AlertChannel.DASHBOARD, AlertChannel.EMAIL, AlertChannel.SLACK]
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        metricType: MetricType.SYSTEM,
        metricCategory: MetricCategory.MEMORY_USAGE,
        condition: {
          operator: '>',
          threshold: this.config.thresholds.memoryUsage,
          duration: 10
        },
        severity: AlertSeverity.HIGH,
        enabled: true,
        channels: [AlertChannel.DASHBOARD, AlertChannel.EMAIL]
      },
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        metricType: MetricType.SYSTEM,
        metricCategory: MetricCategory.CPU_USAGE,
        condition: {
          operator: '>',
          threshold: this.config.thresholds.cpuUsage,
          duration: 15
        },
        severity: AlertSeverity.HIGH,
        enabled: true,
        channels: [AlertChannel.DASHBOARD, AlertChannel.EMAIL]
      },
      {
        id: 'high-disk-usage',
        name: 'High Disk Usage',
        metricType: MetricType.SYSTEM,
        metricCategory: MetricCategory.STORAGE_USAGE,
        condition: {
          operator: '>',
          threshold: this.config.thresholds.diskUsage,
          duration: 30
        },
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [AlertChannel.DASHBOARD, AlertChannel.EMAIL, AlertChannel.SLACK]
      }
    ];

    defaultRules.forEach((rule: any) => {
      this.alertRules.set(rule.id, rule);
    });
  }

  // Start all monitoring processes
  async startMonitoring(): Promise<void> {

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
  async stopMonitoring(): Promise<void> {

    this.monitoringIntervals.forEach((interval, name) => {
      clearInterval(interval);
    });

    this.monitoringIntervals.clear();
  }

  // Health Check System
  private async startHealthChecks(): Promise<void> {
    const interval = setInterval(async () => {
      try {
        const systemStatus = await this.performSystemHealthCheck();
        await this.processHealthCheckResults(systemStatus);
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, this.config.healthCheckInterval * 1000);

    this.monitoringIntervals.set('health-check', interval);
  }

  async performSystemHealthCheck(): Promise<SystemStatus> {
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

  private async checkApiServerHealth(): Promise<HealthCheckResult> {
    const start = Date.now();
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    let errorCount = 0;
    let lastError: string | undefined;

    try {
      // Check if API server is responding
      const response = await fetch(`${process.env.API_URL || 'http://localhost:4000'}/health`);
      if (!response.ok) {
        status = 'unhealthy';
        lastError = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
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

  private async checkWebAppHealth(): Promise<HealthCheckResult> {
    const start = Date.now();
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    let errorCount = 0;
    let lastError: string | undefined;

    try {
      // Check if web app is accessible
      const response = await fetch(`${process.env.WEB_URL || 'http://localhost:3000'}`);
      if (!response.ok) {
        status = 'unhealthy';
        lastError = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
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

  private async checkAdminDashboardHealth(): Promise<HealthCheckResult> {
    const start = Date.now();
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    let errorCount = 0;
    let lastError: string | undefined;

    try {
      // Check if admin dashboard is accessible
      const response = await fetch(`${process.env.ADMIN_URL || 'http://localhost:3001'}`);
      if (!response.ok) {
        status = 'unhealthy';
        lastError = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
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

  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const start = Date.now();
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    let errorCount = 0;
    let lastError: string | undefined;

    try {
      // Test database connection
      await AppDataSource.query('SELECT 1');
      
      // Check for long-running queries
      const longQueries = await AppDataSource.query(`
        SELECT count(*) as count 
        FROM pg_stat_activity 
        WHERE state = 'active' AND query_start < now() - interval '5 minutes'
      `);
      
      if (longQueries[0].count > 0) {
        status = 'degraded';
        lastError = `${longQueries[0].count} long-running queries detected`;
      }
    } catch (error) {
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

  private async getInfrastructureMetrics(): Promise<SystemStatus['infrastructure']> {
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

  private async getActiveAlertCounts(): Promise<SystemStatus['alerts']> {
    const [active, critical, warning, resolved] = await Promise.all([
      this.alertRepo.count({ where: { status: AlertStatus.ACTIVE } }),
      this.alertRepo.count({ where: { status: AlertStatus.ACTIVE, severity: AlertSeverity.CRITICAL } }),
      this.alertRepo.count({ where: { status: AlertStatus.ACTIVE, severity: AlertSeverity.HIGH } }),
      this.alertRepo.count({ where: { status: AlertStatus.RESOLVED } })
    ]);

    return { active, critical, warning, resolved };
  }

  private determineOverallStatus(
    services: HealthCheckResult[],
    infrastructure: SystemStatus['infrastructure']
  ): 'healthy' | 'degraded' | 'down' {
    const unhealthyServices = services.filter((s: any) => s.status === 'unhealthy');
    const degradedServices = services.filter((s: any) => s.status === 'degraded');

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
  private async startMetricCollection(): Promise<void> {
    const interval = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        console.error('Metric collection failed:', error);
      }
    }, this.config.metricCollectionInterval * 1000);

    this.monitoringIntervals.set('metric-collection', interval);
  }

  private async collectSystemMetrics(): Promise<void> {
    const timestamp = new Date();

    // Collect memory metrics
    const memInfo = process.memoryUsage();
    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.MEMORY_USAGE,
        'Process Memory Usage',
        memInfo.rss / 1024 / 1024,
        'MB',
        'api-server',
        { timestamp: timestamp.toISOString() }
      )
    );

    // Collect CPU metrics
    const cpuUsage = process.cpuUsage();
    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.CPU_USAGE,
        'Process CPU Usage',
        (cpuUsage.user + cpuUsage.system) / 1000000,
        'seconds',
        'api-server',
        { timestamp: timestamp.toISOString() }
      )
    );

    // Collect disk usage
    const diskUsage = await this.getDiskUsage();
    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.STORAGE_USAGE,
        'Disk Usage',
        diskUsage,
        '%',
        'server',
        { timestamp: timestamp.toISOString() }
      )
    );

    // Collect system uptime
    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.UPTIME,
        'System Uptime',
        process.uptime(),
        'seconds',
        'api-server',
        { timestamp: timestamp.toISOString() }
      )
    );

    // Collect database metrics
    await this.collectDatabaseMetrics();
  }

  private async collectDatabaseMetrics(): Promise<void> {
    try {
      const start = Date.now();
      await AppDataSource.query('SELECT 1');
      const queryTime = Date.now() - start;

      await this.systemMetricsRepo.save(
        SystemMetrics.createPerformanceMetric(
          MetricCategory.DATABASE_QUERY_TIME,
          'Database Query Time',
          queryTime,
          'ms',
          'database',
          'health-check',
          { timestamp: new Date().toISOString() }
        )
      );

      const connectionCount = await this.getDatabaseConnections();
      await this.systemMetricsRepo.save(
        SystemMetrics.createSystemMetric(
          MetricCategory.CONCURRENT_USERS,
          'Database Connections',
          connectionCount,
          'count',
          'database',
          { timestamp: new Date().toISOString() }
        )
      );
    } catch (error) {
      console.error('Database metrics collection failed:', error);
    }
  }

  // Alert Monitoring System
  private async startAlertMonitoring(): Promise<void> {
    const interval = setInterval(async () => {
      try {
        await this.checkAlertConditions();
        await this.processEscalations();
      } catch (error) {
        console.error('Alert monitoring failed:', error);
      }
    }, this.config.alertCheckInterval * 1000);

    this.monitoringIntervals.set('alert-monitoring', interval);
  }

  private async checkAlertConditions(): Promise<void> {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      const recentMetrics = await this.systemMetricsRepo.find({
        where: {
          metricType: rule.metricType,
          metricCategory: rule.metricCategory,
          createdAt: MoreThanOrEqual(new Date(Date.now() - rule.condition.duration * 60 * 1000))
        },
        order: { createdAt: 'DESC' }
      });

      if (recentMetrics.length === 0) continue;

      const avgValue = recentMetrics.reduce((sum, m) => sum + parseFloat(m.value.toString()), 0) / recentMetrics.length;
      const isConditionMet = this.evaluateCondition(avgValue, rule.condition);

      if (isConditionMet) {
        await this.createOrUpdateAlert(rule, avgValue, recentMetrics[0]);
      }
    }
  }

  private evaluateCondition(value: number, condition: AlertRule['condition']): boolean {
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

  private async createOrUpdateAlert(rule: AlertRule, value: number, metric: SystemMetrics): Promise<void> {
    // Check if similar alert already exists
    const existingAlert = await this.alertRepo.findOne({
      where: {
        alertType: rule.metricType === MetricType.PERFORMANCE ? AlertType.PERFORMANCE : AlertType.SYSTEM,
        metricName: rule.name,
        status: AlertStatus.ACTIVE
      }
    });

    if (existingAlert) {
      // Update existing alert
      existingAlert.recordOccurrence();
      existingAlert.currentValue = value;
      existingAlert.lastOccurrence = new Date();
      await this.alertRepo.save(existingAlert);
    } else {
      // Create new alert
      const alert = Alert.createPerformanceAlert(
        rule.name,
        `${rule.name}: ${value}${metric.unit} ${rule.condition.operator} ${rule.condition.threshold}${metric.unit}`,
        rule.severity,
        rule.name,
        value,
        rule.condition.threshold,
        rule.condition.operator,
        metric.unit || '',
        metric.source,
        metric.endpoint,
        {
          ruleId: rule.id,
          metricId: metric.id,
          timestamp: new Date().toISOString()
        }
      );

      alert.notificationChannels = rule.channels;
      const savedAlert = await this.alertRepo.save(alert);
      
      // Send notifications
      await this.sendAlertNotifications(savedAlert);
    }
  }

  private async processEscalations(): Promise<void> {
    const escalationCandidates = await this.alertRepo.find({
      where: {
        status: AlertStatus.ACTIVE,
        isEscalated: false,
        severity: In([AlertSeverity.HIGH, AlertSeverity.CRITICAL])
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
  private async sendAlertNotifications(alert: Alert): Promise<void> {
    if (!alert.notificationChannels) return;

    const promises = alert.notificationChannels.map((channel: any) => {
      switch (channel) {
        case AlertChannel.EMAIL:
          return this.sendEmailNotification(alert);
        case AlertChannel.SLACK:
          return this.sendSlackNotification(alert);
        case AlertChannel.WEBHOOK:
          return this.sendWebhookNotification(alert);
        default:
          return Promise.resolve();
      }
    });

    try {
      await Promise.all(promises);
      alert.markNotificationSent();
      await this.alertRepo.save(alert);
    } catch (error) {
      console.error('Failed to send alert notifications:', error);
      alert.incrementNotificationRetries();
      await this.alertRepo.save(alert);
    }
  }

  private async sendEmailNotification(alert: Alert): Promise<void> {
    if (!this.config.notifications.email.enabled) return;

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

  private async sendSlackNotification(alert: Alert): Promise<void> {
    if (!this.config.notifications.slack.enabled) return;

    const message = {
      channel: this.config.notifications.slack.channel,
      text: `🚨 *${alert.title}*`,
      attachments: [
        {
          color: alert.severity === AlertSeverity.CRITICAL ? 'danger' : 'warning',
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

  private async sendWebhookNotification(alert: Alert): Promise<void> {
    if (!this.config.notifications.webhook.enabled) return;

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

    await Promise.all(
      this.config.notifications.webhook.urls.map((url: any) =>
        this.webhookService.sendWebhook(url, payload)
      )
    );
  }

  private async sendEscalationNotifications(alert: Alert): Promise<void> {
    await this.sendAlertNotifications(alert);
  }

  // Utility Methods
  private async getDiskUsage(): Promise<number> {
    try {
      const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5}' | sed 's/%//'");
      return parseFloat(stdout.trim());
    } catch (error) {
      return 0;
    }
  }

  private async getDiskUsageInfo(): Promise<SystemStatus['infrastructure']['server']['diskUsage']> {
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
    } catch (error) {
      return { total: 0, used: 0, free: 0, percentage: 0 };
    }
  }

  private async getActiveConnections(): Promise<number> {
    try {
      const { stdout } = await execAsync("netstat -an | grep :4000 | wc -l");
      return parseInt(stdout.trim());
    } catch (error) {
      return 0;
    }
  }

  private async getDatabaseConnections(): Promise<number> {
    try {
      const result = await AppDataSource.query('SELECT count(*) FROM pg_stat_activity');
      return parseInt(result[0].count);
    } catch (error) {
      return 0;
    }
  }

  private async getDatabaseStatus(): Promise<'connected' | 'disconnected' | 'degraded'> {
    try {
      await AppDataSource.query('SELECT 1');
      return 'connected';
    } catch (error) {
      return 'disconnected';
    }
  }

  private async getAverageQueryTime(): Promise<number> {
    try {
      const result = await AppDataSource.query(`
        SELECT avg(mean_time) as avg_time 
        FROM pg_stat_statements 
        WHERE calls > 0
      `);
      return parseFloat(result[0]?.avg_time || 0);
    } catch (error) {
      return 0;
    }
  }

  private async getDatabaseLocks(): Promise<number> {
    try {
      const result = await AppDataSource.query('SELECT count(*) FROM pg_locks');
      return parseInt(result[0].count);
    } catch (error) {
      return 0;
    }
  }

  // Cleanup and Maintenance
  private async startCleanupProcesses(): Promise<void> {
    // Clean up old metrics daily
    const cleanup = setInterval(async () => {
      try {
        await this.cleanupOldData();
      } catch (error) {
        console.error('Cleanup process failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    this.monitoringIntervals.set('cleanup', cleanup);
  }

  private async cleanupOldData(): Promise<void> {
    const metricsRetentionDate = new Date();
    metricsRetentionDate.setDate(metricsRetentionDate.getDate() - this.config.retention.metrics);

    const alertsRetentionDate = new Date();
    alertsRetentionDate.setDate(alertsRetentionDate.getDate() - this.config.retention.alerts);

    // Clean up old metrics
    await this.systemMetricsRepo.delete({
      createdAt: LessThan(metricsRetentionDate)
    });

    // Clean up old resolved alerts
    await this.alertRepo.delete({
      status: AlertStatus.RESOLVED,
      resolvedAt: LessThan(alertsRetentionDate)
    });

  }

  private async startUptimeMonitoring(): Promise<void> {
    const interval = setInterval(async () => {
      try {
        await this.recordUptimeMetrics();
      } catch (error) {
        console.error('Uptime monitoring failed:', error);
      }
    }, this.config.uptimeCheckInterval * 1000);

    this.monitoringIntervals.set('uptime-monitoring', interval);
  }

  private async recordUptimeMetrics(): Promise<void> {
    const uptime = process.uptime();
    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.UPTIME,
        'Process Uptime',
        uptime,
        'seconds',
        'api-server',
        { timestamp: new Date().toISOString() }
      )
    );
  }

  // Public API Methods
  async getSystemStatus(): Promise<SystemStatus> {
    return await this.performSystemHealthCheck();
  }

  async getHealthCheckHistory(serviceName: string, hours: number = 24): Promise<HealthCheckResult[]> {
    return this.healthCheckHistory.get(serviceName) || [];
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return await this.alertRepo.find({
      where: { status: AlertStatus.ACTIVE },
      order: { createdAt: 'DESC' }
    });
  }

  async acknowledgeAlert(alertId: string, userId: string, note?: string): Promise<void> {
    const alert = await this.alertRepo.findOne({ where: { id: alertId } });
    if (alert) {
      alert.acknowledge(userId, note);
      await this.alertRepo.save(alert);
    }
  }

  async resolveAlert(alertId: string, userId: string, note?: string, action?: string): Promise<void> {
    const alert = await this.alertRepo.findOne({ where: { id: alertId } });
    if (alert) {
      alert.resolve(userId, note, action);
      await this.alertRepo.save(alert);
    }
  }

  async getMetricsHistory(
    metricType: MetricType,
    metricCategory: MetricCategory,
    hours: number = 24
  ): Promise<SystemMetrics[]> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    return await this.systemMetricsRepo.find({
      where: {
        metricType,
        metricCategory,
        createdAt: MoreThanOrEqual(startDate)
      },
      order: { createdAt: 'ASC' }
    });
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.alertRules.set(ruleId, rule);
    }
  }

  async addAlertRule(rule: AlertRule): Promise<void> {
    this.alertRules.set(rule.id, rule);
  }

  async removeAlertRule(ruleId: string): Promise<void> {
    this.alertRules.delete(ruleId);
  }

  async getAlertRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values());
  }

  async getMonitoringConfig(): Promise<MonitoringConfig> {
    return this.config;
  }

  async updateMonitoringConfig(updates: Partial<MonitoringConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    
    // Restart monitoring with new config
    await this.stopMonitoring();
    await this.startMonitoring();
  }

  private async processHealthCheckResults(systemStatus: SystemStatus): Promise<void> {
    // Store health check results in history
    systemStatus.services.forEach((service: any) => {
      if (!this.healthCheckHistory.has(service.serviceName)) {
        this.healthCheckHistory.set(service.serviceName, []);
      }
      
      const history = this.healthCheckHistory.get(service.serviceName)!;
      history.push(service);
      
      // Keep only last 24 hours
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 24);
      this.healthCheckHistory.set(
        service.serviceName,
        history.filter((h: any) => h.timestamp >= cutoff)
      );
    });

    // Record metrics for each service
    for (const service of systemStatus.services) {
      await this.systemMetricsRepo.save(
        SystemMetrics.createPerformanceMetric(
          MetricCategory.RESPONSE_TIME,
          `${service.serviceName} Response Time`,
          service.responseTime,
          'ms',
          service.serviceName.toLowerCase().replace(' ', '-'),
          '/health',
          {
            status: service.status,
            timestamp: service.timestamp.toISOString()
          }
        )
      );
    }
  }
}