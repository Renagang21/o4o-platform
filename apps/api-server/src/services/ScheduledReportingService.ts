import cron from 'node-cron';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { AnalyticsService } from './AnalyticsService.js';
import { AnalyticsReport, ReportType, ReportCategory } from '../entities/AnalyticsReport.js';
import { Alert, AlertStatus, AlertSeverity, AlertType } from '../entities/Alert.js';
import { UserSession, SessionStatus } from '../entities/UserSession.js';
import { SystemMetrics, MetricCategory, MetricType } from '../entities/SystemMetrics.js';
import { BetaUser } from '../entities/BetaUser.js';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface BetaProgramInsights {
  totalUsers: number;
  activeUsers: number;
  activeUsersPercentage: number;
  newUsers: number;
  newUsersPercentage: number;
  lowEngagementUsers: number;
  lowEngagementPercentage: number;
  averageEngagement: number;
  churnRate: number;
  engagementScore: number;
  retentionRate: number;
  timestamp: Date;
  [key: string]: unknown;  // Index signature for compatibility with metadata
}

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    recipients: string[];
    smtpConfig?: SmtpConfig;
  };
  slack?: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
  };
  webhook?: {
    enabled: boolean;
    url: string;
    headers?: Record<string, string>;
  };
}

export class ScheduledReportingService {
  private analyticsService: AnalyticsService;
  private analyticsReportRepo: Repository<AnalyticsReport>;
  private alertRepo: Repository<Alert>;
  private userSessionRepo: Repository<UserSession>;
  private systemMetricsRepo: Repository<SystemMetrics>;
  private betaUserRepo: Repository<BetaUser>;
  
  private isRunning: boolean = false;
  private notificationConfig: NotificationConfig;

  constructor(notificationConfig: NotificationConfig = {}) {
    this.analyticsService = new AnalyticsService();
    this.analyticsReportRepo = AppDataSource.getRepository(AnalyticsReport);
    this.alertRepo = AppDataSource.getRepository(Alert);
    this.userSessionRepo = AppDataSource.getRepository(UserSession);
    this.systemMetricsRepo = AppDataSource.getRepository(SystemMetrics);
    this.betaUserRepo = AppDataSource.getRepository(BetaUser);
    this.notificationConfig = notificationConfig;
  }

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Daily reports at 6:00 AM
    cron.schedule('0 6 * * *', async () => {
      await this.generateDailyReports();
    });

    // Weekly reports on Mondays at 7:00 AM
    cron.schedule('0 7 * * 1', async () => {
      await this.generateWeeklyReports();
    });

    // Monthly reports on the 1st at 8:00 AM
    cron.schedule('0 8 1 * *', async () => {
      await this.generateMonthlyReports();
    });

    // Real-time monitoring every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.performRealTimeMonitoring();
    });

    // Alert escalation check every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      await this.checkAlertEscalation();
    });

    // System health check every hour
    cron.schedule('0 * * * *', async () => {
      await this.performSystemHealthCheck();
    });

    // Beta program insights every 4 hours
    cron.schedule('0 */4 * * *', async () => {
      await this.generateBetaProgramInsights();
    });

  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Note: node-cron doesn't provide a clean way to stop all tasks
    // In a production environment, you might want to keep references to tasks
  }

  // Report Generation Methods
  async generateDailyReports(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    try {
      const reports = await Promise.all([
        this.analyticsService.generateReport(
          ReportType.DAILY,
          ReportCategory.USER_ACTIVITY,
          yesterday,
          yesterday
        ),
        this.analyticsService.generateReport(
          ReportType.DAILY,
          ReportCategory.SYSTEM_PERFORMANCE,
          yesterday,
          yesterday
        ),
        this.analyticsService.generateReport(
          ReportType.DAILY,
          ReportCategory.CONTENT_USAGE,
          yesterday,
          yesterday
        )
      ]);


      // Send notifications for daily reports
      await this.sendDailyReportNotification(reports);
    } catch (error) {
      // Error log removed
      await this.sendErrorNotification('Daily Report Generation Failed', error);
    }
  }

  async generateWeeklyReports(): Promise<void> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - 1);

    try {
      const reports = await Promise.all([
        this.analyticsService.generateReport(
          ReportType.WEEKLY,
          ReportCategory.COMPREHENSIVE,
          weekStart,
          weekEnd
        ),
        this.analyticsService.generateReport(
          ReportType.WEEKLY,
          ReportCategory.FEEDBACK_ANALYSIS,
          weekStart,
          weekEnd
        ),
        this.analyticsService.generateReport(
          ReportType.WEEKLY,
          ReportCategory.BUSINESS_METRICS,
          weekStart,
          weekEnd
        )
      ]);


      // Send notifications for weekly reports
      await this.sendWeeklyReportNotification(reports);
    } catch (error) {
      // Error log removed
      await this.sendErrorNotification('Weekly Report Generation Failed', error);
    }
  }

  async generateMonthlyReports(): Promise<void> {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const monthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const monthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

    try {
      const report = await this.analyticsService.generateReport(
        ReportType.MONTHLY,
        ReportCategory.COMPREHENSIVE,
        monthStart,
        monthEnd
      );


      // Send notifications for monthly report
      await this.sendMonthlyReportNotification(report);
    } catch (error) {
      // Error log removed
      await this.sendErrorNotification('Monthly Report Generation Failed', error);
    }
  }

  // Monitoring Methods
  async performRealTimeMonitoring(): Promise<void> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Check for performance issues
      const recentMetrics = await this.systemMetricsRepo.find({
        where: {
          createdAt: MoreThanOrEqual(fiveMinutesAgo),
          metricCategory: MetricCategory.RESPONSE_TIME
        },
        order: { createdAt: 'DESC' }
      });

      // Alert if average response time > 1000ms
      if (recentMetrics.length > 0) {
        const avgResponseTime = recentMetrics.reduce((sum, m) => sum + parseFloat(m.value), 0) / recentMetrics.length;
        
        if (avgResponseTime > 1000) {
          await this.analyticsService.createAlert(
            AlertType.PERFORMANCE,
            AlertSeverity.HIGH,
            'High Average Response Time',
            `Average response time in the last 5 minutes was ${Math.round(avgResponseTime)}ms`,
            'avg_response_time',
            avgResponseTime,
            1000,
            { timeWindow: '5 minutes', sampleSize: recentMetrics.length }
          );
        }
      }

      // Check for error spikes
      const errorCount = await this.systemMetricsRepo.count({
        where: {
          createdAt: MoreThanOrEqual(fiveMinutesAgo),
          metricCategory: MetricCategory.ERROR_COUNT
        }
      });

      if (errorCount > 10) {
        await this.analyticsService.createAlert(
          AlertType.ERROR,
          AlertSeverity.CRITICAL,
          'High Error Rate',
          `${errorCount} errors occurred in the last 5 minutes`,
          'error_count',
          errorCount,
          10,
          { timeWindow: '5 minutes' }
        );
      }

      // Check for unusual user activity
      const activeSessions = await this.userSessionRepo.count({
        where: {
          status: SessionStatus.ACTIVE,
          lastActivityAt: MoreThanOrEqual(fiveMinutesAgo)
        }
      });

      // Record current metrics
      await this.analyticsService.recordUsageMetric('active_sessions', activeSessions, 'count');
      
    } catch (error) {
      // Error log removed
    }
  }

  async checkAlertEscalation(): Promise<void> {
    try {
      const activeAlerts = await this.alertRepo.find({
        where: { status: AlertStatus.ACTIVE }
      });

      for (const alert of activeAlerts) {
        if (alert.shouldEscalate(30)) { // Escalate after 30 minutes
          alert.escalate('automatic_escalation_30_minutes');
          await this.alertRepo.save(alert);
          
          // Send escalation notification
          await this.sendAlertEscalationNotification(alert);
        }
      }
    } catch (error) {
      // Error log removed
    }
  }

  async performSystemHealthCheck(): Promise<void> {
    try {
      const overview = await this.analyticsService.getAnalyticsOverview(1); // Last 24 hours
      
      // Record system health metrics
      await this.analyticsService.recordMetric({
        metricType: MetricType.SYSTEM,
        metricCategory: MetricCategory.UPTIME,
        metricName: 'System Uptime',
        value: overview.systemUptime,
        unit: '%',
        source: 'monitoring'
      });

      // Check system health and create alerts if needed
      if (overview.systemHealth === 'critical') {
        await this.analyticsService.createAlert(
          AlertType.SYSTEM,
          AlertSeverity.CRITICAL,
          'Critical System Health',
          `System health is critical. Error rate: ${overview.errorRate}%, Avg response time: ${overview.avgResponseTime}ms`,
          'system_health',
          0,
          1,
          { errorRate: overview.errorRate, avgResponseTime: overview.avgResponseTime }
        );
      } else if (overview.systemHealth === 'warning') {
        await this.analyticsService.createAlert(
          AlertType.SYSTEM,
          AlertSeverity.MEDIUM,
          'System Health Warning',
          `System health is degraded. Error rate: ${overview.errorRate}%, Avg response time: ${overview.avgResponseTime}ms`,
          'system_health',
          0,
          1,
          { errorRate: overview.errorRate, avgResponseTime: overview.avgResponseTime }
        );
      }

    } catch (error) {
      // Error log removed
    }
  }

  async generateBetaProgramInsights(): Promise<void> {
    try {
      const insights = await this.getBetaProgramInsights();
      
      // Record insights as metrics
      await this.analyticsService.recordMetric({
        metricType: MetricType.BUSINESS,
        metricCategory: MetricCategory.USER_ENGAGEMENT,
        metricName: 'Beta Program Engagement',
        value: insights.engagementScore,
        unit: 'score',
        source: 'beta_program',
        metadata: insights
      });

      // Check for concerning trends
      if (insights.churnRate > 20) {
        await this.analyticsService.createAlert(
          AlertType.BUSINESS,
          AlertSeverity.HIGH,
          'High Beta User Churn Rate',
          `Beta user churn rate is ${insights.churnRate}%, which exceeds the acceptable threshold`,
          'churn_rate',
          insights.churnRate,
          20,
          insights
        );
      }

      if (insights.lowEngagementUsers > insights.activeUsers * 0.5) {
        await this.analyticsService.createAlert(
          AlertType.BUSINESS,
          AlertSeverity.MEDIUM,
          'High Number of Low Engagement Users',
          `${insights.lowEngagementUsers} beta users have low engagement`,
          'low_engagement_users',
          insights.lowEngagementUsers,
          insights.activeUsers * 0.3,
          insights
        );
      }

    } catch (error) {
      // Error log removed
    }
  }

  // Notification Methods
  async sendDailyReportNotification(reports: AnalyticsReport[]): Promise<void> {
    const message = `Daily analytics reports have been generated:\n${reports.map((r: any) => `- ${r.reportName} (${r.status})`).join('\n')}`;
    await this.sendNotification('Daily Analytics Reports Generated', message);
  }

  async sendWeeklyReportNotification(reports: AnalyticsReport[]): Promise<void> {
    const message = `Weekly analytics reports have been generated:\n${reports.map((r: any) => `- ${r.reportName} (${r.status})`).join('\n')}`;
    await this.sendNotification('Weekly Analytics Reports Generated', message);
  }

  async sendMonthlyReportNotification(report: AnalyticsReport): Promise<void> {
    const message = `Monthly comprehensive report has been generated: ${report.reportName} (${report.status})`;
    await this.sendNotification('Monthly Analytics Report Generated', message);
  }

  async sendAlertEscalationNotification(alert: Alert): Promise<void> {
    const message = `Alert escalated: ${alert.title}\nSeverity: ${alert.severity}\nMessage: ${alert.message}\nAge: ${alert.getAgeInHours()} hours`;
    await this.sendNotification('Alert Escalated', message, true);
  }

  async sendErrorNotification(title: string, error: Error | unknown): Promise<void> {
    const message = `Error in scheduled reporting: ${title}\nError: ${error instanceof Error ? error.message : String(error)}`;
    await this.sendNotification(title, message, true);
  }

  private async sendNotification(title: string, message: string, urgent: boolean = false): Promise<void> {
    try {
      // Email notification
      if (this.notificationConfig.email?.enabled) {
        await this.sendEmailNotification(title, message, urgent);
      }

      // Slack notification
      if (this.notificationConfig.slack?.enabled) {
        await this.sendSlackNotification(title, message, urgent);
      }

      // Webhook notification
      if (this.notificationConfig.webhook?.enabled) {
        await this.sendWebhookNotification(title, message, urgent);
      }
    } catch (error) {
      // Error log removed
    }
  }

  private async sendEmailNotification(title: string, message: string, urgent: boolean): Promise<void> {
    // Implementation depends on email service (nodemailer, SendGrid, etc.)
  }

  private async sendSlackNotification(title: string, message: string, urgent: boolean): Promise<void> {
    if (!this.notificationConfig.slack?.webhookUrl) return;

    try {
      const payload = {
        channel: this.notificationConfig.slack.channel,
        username: 'Analytics Bot',
        icon_emoji: urgent ? ':warning:' : ':chart_with_upwards_trend:',
        text: `*${title}*\n${message}`
      };

      const response = await fetch(this.notificationConfig.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // Error log removed
      }
    } catch (error) {
      // Error log removed
    }
  }

  private async sendWebhookNotification(title: string, message: string, urgent: boolean): Promise<void> {
    if (!this.notificationConfig.webhook?.url) return;

    try {
      const payload = {
        title,
        message,
        urgent,
        timestamp: new Date().toISOString(),
        source: 'analytics-monitoring'
      };

      const response = await fetch(this.notificationConfig.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.notificationConfig.webhook.headers
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // Error log removed
      }
    } catch (error) {
      // Error log removed
    }
  }

  // Helper Methods
  private async getBetaProgramInsights(): Promise<BetaProgramInsights> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const [
      totalUsers,
      activeUsers,
      newUsers,
      lowEngagementUsers,
      averageEngagement
    ] = await Promise.all([
      this.betaUserRepo.count(),
      this.betaUserRepo.count({ where: { lastActiveAt: MoreThanOrEqual(threeDaysAgo) } }),
      this.betaUserRepo.count({ where: { createdAt: MoreThanOrEqual(threeDaysAgo) } }),
      this.betaUserRepo.count({ where: { feedbackCount: LessThanOrEqual(1), loginCount: LessThanOrEqual(2) } }),
      this.calculateAverageEngagement()
    ]);

    const churnRate = totalUsers > 0 ? ((totalUsers - activeUsers) / totalUsers) * 100 : 0;

    return {
      totalUsers,
      activeUsers,
      activeUsersPercentage: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100 * 10) / 10 : 0,
      newUsers,
      newUsersPercentage: totalUsers > 0 ? Math.round((newUsers / totalUsers) * 100 * 10) / 10 : 0,
      lowEngagementUsers,
      lowEngagementPercentage: activeUsers > 0 ? Math.round((lowEngagementUsers / activeUsers) * 100 * 10) / 10 : 0,
      averageEngagement,
      churnRate: Math.round(churnRate * 10) / 10,
      engagementScore: averageEngagement,
      retentionRate: Math.round((activeUsers / totalUsers) * 100 * 10) / 10,
      timestamp: new Date()
    };
  }

  private async calculateAverageEngagement(): Promise<number> {
    const users = await this.betaUserRepo.find();
    if (users.length === 0) return 0;

    const totalEngagement = users.reduce((sum, user) => {
      return sum + user.getEngagementLevel() === 'high' ? 3 : user.getEngagementLevel() === 'medium' ? 2 : 1;
    }, 0);

    return Math.round((totalEngagement / users.length) * 100) / 100;
  }

  // Public methods for manual triggering
  async generateManualReport(type: ReportType, category: ReportCategory, startDate: Date, endDate: Date): Promise<AnalyticsReport> {
    return await this.analyticsService.generateReport(type, category, startDate, endDate);
  }

  async triggerHealthCheck(): Promise<void> {
    await this.performSystemHealthCheck();
  }

  async triggerRealTimeMonitoring(): Promise<void> {
    await this.performRealTimeMonitoring();
  }

  getStatus(): { isRunning: boolean; uptime: number } {
    return {
      isRunning: this.isRunning,
      uptime: process.uptime()
    };
  }
}

// Export singleton instance
export const scheduledReportingService = new ScheduledReportingService();