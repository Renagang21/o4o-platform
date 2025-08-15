"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledReportingService = exports.ScheduledReportingService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const typeorm_1 = require("typeorm");
const connection_1 = require("../database/connection");
const AnalyticsService_1 = require("./AnalyticsService");
const AnalyticsReport_1 = require("../entities/AnalyticsReport");
const Alert_1 = require("../entities/Alert");
const UserSession_1 = require("../entities/UserSession");
const SystemMetrics_1 = require("../entities/SystemMetrics");
const BetaUser_1 = require("../entities/BetaUser");
class ScheduledReportingService {
    constructor(notificationConfig = {}) {
        this.isRunning = false;
        this.analyticsService = new AnalyticsService_1.AnalyticsService();
        this.analyticsReportRepo = connection_1.AppDataSource.getRepository(AnalyticsReport_1.AnalyticsReport);
        this.alertRepo = connection_1.AppDataSource.getRepository(Alert_1.Alert);
        this.userSessionRepo = connection_1.AppDataSource.getRepository(UserSession_1.UserSession);
        this.systemMetricsRepo = connection_1.AppDataSource.getRepository(SystemMetrics_1.SystemMetrics);
        this.betaUserRepo = connection_1.AppDataSource.getRepository(BetaUser_1.BetaUser);
        this.notificationConfig = notificationConfig;
    }
    start() {
        if (this.isRunning) {
            // console.log('Scheduled reporting service is already running');
            return;
        }
        // console.log('Starting scheduled reporting service...');
        this.isRunning = true;
        // Daily reports at 6:00 AM
        node_cron_1.default.schedule('0 6 * * *', async () => {
            // console.log('Generating daily reports...');
            await this.generateDailyReports();
        });
        // Weekly reports on Mondays at 7:00 AM
        node_cron_1.default.schedule('0 7 * * 1', async () => {
            // console.log('Generating weekly reports...');
            await this.generateWeeklyReports();
        });
        // Monthly reports on the 1st at 8:00 AM
        node_cron_1.default.schedule('0 8 1 * *', async () => {
            // console.log('Generating monthly reports...');
            await this.generateMonthlyReports();
        });
        // Real-time monitoring every 5 minutes
        node_cron_1.default.schedule('*/5 * * * *', async () => {
            await this.performRealTimeMonitoring();
        });
        // Alert escalation check every 15 minutes
        node_cron_1.default.schedule('*/15 * * * *', async () => {
            await this.checkAlertEscalation();
        });
        // System health check every hour
        node_cron_1.default.schedule('0 * * * *', async () => {
            await this.performSystemHealthCheck();
        });
        // Beta program insights every 4 hours
        node_cron_1.default.schedule('0 */4 * * *', async () => {
            await this.generateBetaProgramInsights();
        });
        // console.log('Scheduled reporting service started successfully');
    }
    stop() {
        if (!this.isRunning) {
            // console.log('Scheduled reporting service is not running');
            return;
        }
        // console.log('Stopping scheduled reporting service...');
        this.isRunning = false;
        // Note: node-cron doesn't provide a clean way to stop all tasks
        // In a production environment, you might want to keep references to tasks
        // console.log('Scheduled reporting service stopped');
    }
    // Report Generation Methods
    async generateDailyReports() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        try {
            const reports = await Promise.all([
                this.analyticsService.generateReport(AnalyticsReport_1.ReportType.DAILY, AnalyticsReport_1.ReportCategory.USER_ACTIVITY, yesterday, yesterday),
                this.analyticsService.generateReport(AnalyticsReport_1.ReportType.DAILY, AnalyticsReport_1.ReportCategory.SYSTEM_PERFORMANCE, yesterday, yesterday),
                this.analyticsService.generateReport(AnalyticsReport_1.ReportType.DAILY, AnalyticsReport_1.ReportCategory.CONTENT_USAGE, yesterday, yesterday)
            ]);
            // console.log(`Generated ${reports.length} daily reports for ${yesterday.toDateString()}`);
            // Send notifications for daily reports
            await this.sendDailyReportNotification(reports);
        }
        catch (error) {
            console.error('Error generating daily reports:', error);
            await this.sendErrorNotification('Daily Report Generation Failed', error);
        }
    }
    async generateWeeklyReports() {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - 1);
        try {
            const reports = await Promise.all([
                this.analyticsService.generateReport(AnalyticsReport_1.ReportType.WEEKLY, AnalyticsReport_1.ReportCategory.COMPREHENSIVE, weekStart, weekEnd),
                this.analyticsService.generateReport(AnalyticsReport_1.ReportType.WEEKLY, AnalyticsReport_1.ReportCategory.FEEDBACK_ANALYSIS, weekStart, weekEnd),
                this.analyticsService.generateReport(AnalyticsReport_1.ReportType.WEEKLY, AnalyticsReport_1.ReportCategory.BUSINESS_METRICS, weekStart, weekEnd)
            ]);
            // console.log(`Generated ${reports.length} weekly reports for week ${weekStart.toDateString()} - ${weekEnd.toDateString()}`);
            // Send notifications for weekly reports
            await this.sendWeeklyReportNotification(reports);
        }
        catch (error) {
            console.error('Error generating weekly reports:', error);
            await this.sendErrorNotification('Weekly Report Generation Failed', error);
        }
    }
    async generateMonthlyReports() {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const monthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        const monthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
        try {
            const report = await this.analyticsService.generateReport(AnalyticsReport_1.ReportType.MONTHLY, AnalyticsReport_1.ReportCategory.COMPREHENSIVE, monthStart, monthEnd);
            // console.log(`Generated monthly report for ${monthStart.toDateString()} - ${monthEnd.toDateString()}`);
            // Send notifications for monthly report
            await this.sendMonthlyReportNotification(report);
        }
        catch (error) {
            console.error('Error generating monthly report:', error);
            await this.sendErrorNotification('Monthly Report Generation Failed', error);
        }
    }
    // Monitoring Methods
    async performRealTimeMonitoring() {
        try {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            // Check for performance issues
            const recentMetrics = await this.systemMetricsRepo.find({
                where: {
                    createdAt: (0, typeorm_1.MoreThanOrEqual)(fiveMinutesAgo),
                    metricCategory: SystemMetrics_1.MetricCategory.RESPONSE_TIME
                },
                order: { createdAt: 'DESC' }
            });
            // Alert if average response time > 1000ms
            if (recentMetrics.length > 0) {
                const avgResponseTime = recentMetrics.reduce((sum, m) => sum + parseFloat(m.value), 0) / recentMetrics.length;
                if (avgResponseTime > 1000) {
                    await this.analyticsService.createAlert(Alert_1.AlertType.PERFORMANCE, Alert_1.AlertSeverity.HIGH, 'High Average Response Time', `Average response time in the last 5 minutes was ${Math.round(avgResponseTime)}ms`, 'avg_response_time', avgResponseTime, 1000, { timeWindow: '5 minutes', sampleSize: recentMetrics.length });
                }
            }
            // Check for error spikes
            const errorCount = await this.systemMetricsRepo.count({
                where: {
                    createdAt: (0, typeorm_1.MoreThanOrEqual)(fiveMinutesAgo),
                    metricCategory: SystemMetrics_1.MetricCategory.ERROR_COUNT
                }
            });
            if (errorCount > 10) {
                await this.analyticsService.createAlert(Alert_1.AlertType.ERROR, Alert_1.AlertSeverity.CRITICAL, 'High Error Rate', `${errorCount} errors occurred in the last 5 minutes`, 'error_count', errorCount, 10, { timeWindow: '5 minutes' });
            }
            // Check for unusual user activity
            const activeSessions = await this.userSessionRepo.count({
                where: {
                    status: UserSession_1.SessionStatus.ACTIVE,
                    lastActivityAt: (0, typeorm_1.MoreThanOrEqual)(fiveMinutesAgo)
                }
            });
            // Record current metrics
            await this.analyticsService.recordUsageMetric('active_sessions', activeSessions, 'count');
        }
        catch (error) {
            console.error('Error in real-time monitoring:', error);
        }
    }
    async checkAlertEscalation() {
        try {
            const activeAlerts = await this.alertRepo.find({
                where: { status: Alert_1.AlertStatus.ACTIVE }
            });
            for (const alert of activeAlerts) {
                if (alert.shouldEscalate(30)) { // Escalate after 30 minutes
                    alert.escalate('automatic_escalation_30_minutes');
                    await this.alertRepo.save(alert);
                    // Send escalation notification
                    await this.sendAlertEscalationNotification(alert);
                }
            }
        }
        catch (error) {
            console.error('Error checking alert escalation:', error);
        }
    }
    async performSystemHealthCheck() {
        try {
            const overview = await this.analyticsService.getAnalyticsOverview(1); // Last 24 hours
            // Record system health metrics
            await this.analyticsService.recordMetric({
                metricType: SystemMetrics_1.MetricType.SYSTEM,
                metricCategory: SystemMetrics_1.MetricCategory.UPTIME,
                metricName: 'System Uptime',
                value: overview.systemUptime,
                unit: '%',
                source: 'monitoring'
            });
            // Check system health and create alerts if needed
            if (overview.systemHealth === 'critical') {
                await this.analyticsService.createAlert(Alert_1.AlertType.SYSTEM, Alert_1.AlertSeverity.CRITICAL, 'Critical System Health', `System health is critical. Error rate: ${overview.errorRate}%, Avg response time: ${overview.avgResponseTime}ms`, 'system_health', 0, 1, { errorRate: overview.errorRate, avgResponseTime: overview.avgResponseTime });
            }
            else if (overview.systemHealth === 'warning') {
                await this.analyticsService.createAlert(Alert_1.AlertType.SYSTEM, Alert_1.AlertSeverity.MEDIUM, 'System Health Warning', `System health is degraded. Error rate: ${overview.errorRate}%, Avg response time: ${overview.avgResponseTime}ms`, 'system_health', 0, 1, { errorRate: overview.errorRate, avgResponseTime: overview.avgResponseTime });
            }
            // console.log(`System health check completed. Status: ${overview.systemHealth}`);
        }
        catch (error) {
            console.error('Error in system health check:', error);
        }
    }
    async generateBetaProgramInsights() {
        try {
            const insights = await this.getBetaProgramInsights();
            // Record insights as metrics
            await this.analyticsService.recordMetric({
                metricType: SystemMetrics_1.MetricType.BUSINESS,
                metricCategory: SystemMetrics_1.MetricCategory.USER_ENGAGEMENT,
                metricName: 'Beta Program Engagement',
                value: insights.engagementScore,
                unit: 'score',
                source: 'beta_program',
                metadata: insights
            });
            // Check for concerning trends
            if (insights.churnRate > 20) {
                await this.analyticsService.createAlert(Alert_1.AlertType.BUSINESS, Alert_1.AlertSeverity.HIGH, 'High Beta User Churn Rate', `Beta user churn rate is ${insights.churnRate}%, which exceeds the acceptable threshold`, 'churn_rate', insights.churnRate, 20, insights);
            }
            if (insights.lowEngagementUsers > insights.activeUsers * 0.5) {
                await this.analyticsService.createAlert(Alert_1.AlertType.BUSINESS, Alert_1.AlertSeverity.MEDIUM, 'High Number of Low Engagement Users', `${insights.lowEngagementUsers} beta users have low engagement`, 'low_engagement_users', insights.lowEngagementUsers, insights.activeUsers * 0.3, insights);
            }
            // console.log('Beta program insights generated and analyzed');
        }
        catch (error) {
            console.error('Error generating beta program insights:', error);
        }
    }
    // Notification Methods
    async sendDailyReportNotification(reports) {
        const message = `Daily analytics reports have been generated:\n${reports.map((r) => `- ${r.reportName} (${r.status})`).join('\n')}`;
        await this.sendNotification('Daily Analytics Reports Generated', message);
    }
    async sendWeeklyReportNotification(reports) {
        const message = `Weekly analytics reports have been generated:\n${reports.map((r) => `- ${r.reportName} (${r.status})`).join('\n')}`;
        await this.sendNotification('Weekly Analytics Reports Generated', message);
    }
    async sendMonthlyReportNotification(report) {
        const message = `Monthly comprehensive report has been generated: ${report.reportName} (${report.status})`;
        await this.sendNotification('Monthly Analytics Report Generated', message);
    }
    async sendAlertEscalationNotification(alert) {
        const message = `Alert escalated: ${alert.title}\nSeverity: ${alert.severity}\nMessage: ${alert.message}\nAge: ${alert.getAgeInHours()} hours`;
        await this.sendNotification('Alert Escalated', message, true);
    }
    async sendErrorNotification(title, error) {
        const message = `Error in scheduled reporting: ${title}\nError: ${error instanceof Error ? error.message : String(error)}`;
        await this.sendNotification(title, message, true);
    }
    async sendNotification(title, message, urgent = false) {
        var _a, _b, _c;
        try {
            // Email notification
            if ((_a = this.notificationConfig.email) === null || _a === void 0 ? void 0 : _a.enabled) {
                await this.sendEmailNotification(title, message, urgent);
            }
            // Slack notification
            if ((_b = this.notificationConfig.slack) === null || _b === void 0 ? void 0 : _b.enabled) {
                await this.sendSlackNotification(title, message, urgent);
            }
            // Webhook notification
            if ((_c = this.notificationConfig.webhook) === null || _c === void 0 ? void 0 : _c.enabled) {
                await this.sendWebhookNotification(title, message, urgent);
            }
        }
        catch (error) {
            console.error('Error sending notifications:', error);
        }
    }
    async sendEmailNotification(title, message, urgent) {
        // Implementation depends on email service (nodemailer, SendGrid, etc.)
        // console.log(`EMAIL NOTIFICATION: ${title}\n${message}`);
    }
    async sendSlackNotification(title, message, urgent) {
        var _a;
        if (!((_a = this.notificationConfig.slack) === null || _a === void 0 ? void 0 : _a.webhookUrl))
            return;
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
                console.error('Failed to send Slack notification:', response.statusText);
            }
        }
        catch (error) {
            console.error('Error sending Slack notification:', error);
        }
    }
    async sendWebhookNotification(title, message, urgent) {
        var _a;
        if (!((_a = this.notificationConfig.webhook) === null || _a === void 0 ? void 0 : _a.url))
            return;
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
                console.error('Failed to send webhook notification:', response.statusText);
            }
        }
        catch (error) {
            console.error('Error sending webhook notification:', error);
        }
    }
    // Helper Methods
    async getBetaProgramInsights() {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const [totalUsers, activeUsers, newUsers, lowEngagementUsers, averageEngagement] = await Promise.all([
            this.betaUserRepo.count(),
            this.betaUserRepo.count({ where: { lastActiveAt: (0, typeorm_1.MoreThanOrEqual)(threeDaysAgo) } }),
            this.betaUserRepo.count({ where: { createdAt: (0, typeorm_1.MoreThanOrEqual)(threeDaysAgo) } }),
            this.betaUserRepo.count({ where: { feedbackCount: (0, typeorm_1.LessThanOrEqual)(1), loginCount: (0, typeorm_1.LessThanOrEqual)(2) } }),
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
    async calculateAverageEngagement() {
        const users = await this.betaUserRepo.find();
        if (users.length === 0)
            return 0;
        const totalEngagement = users.reduce((sum, user) => {
            return sum + user.getEngagementLevel() === 'high' ? 3 : user.getEngagementLevel() === 'medium' ? 2 : 1;
        }, 0);
        return Math.round((totalEngagement / users.length) * 100) / 100;
    }
    // Public methods for manual triggering
    async generateManualReport(type, category, startDate, endDate) {
        return await this.analyticsService.generateReport(type, category, startDate, endDate);
    }
    async triggerHealthCheck() {
        await this.performSystemHealthCheck();
    }
    async triggerRealTimeMonitoring() {
        await this.performRealTimeMonitoring();
    }
    getStatus() {
        return {
            isRunning: this.isRunning,
            uptime: process.uptime()
        };
    }
}
exports.ScheduledReportingService = ScheduledReportingService;
// Export singleton instance
exports.scheduledReportingService = new ScheduledReportingService();
//# sourceMappingURL=ScheduledReportingService.js.map