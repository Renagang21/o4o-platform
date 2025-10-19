"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const connection_1 = require("../database/connection");
const UserSession_1 = require("../entities/UserSession");
const UserAction_1 = require("../entities/UserAction");
const SystemMetrics_1 = require("../entities/SystemMetrics");
const AnalyticsReport_1 = require("../entities/AnalyticsReport");
const Alert_1 = require("../entities/Alert");
const BetaUser_1 = require("../entities/BetaUser");
const BetaFeedback_1 = require("../entities/BetaFeedback");
const ContentUsageLog_1 = require("../entities/ContentUsageLog");
class AnalyticsService {
    constructor() {
        this.userSessionRepo = connection_1.AppDataSource.getRepository(UserSession_1.UserSession);
        this.userActionRepo = connection_1.AppDataSource.getRepository(UserAction_1.UserAction);
        this.systemMetricsRepo = connection_1.AppDataSource.getRepository(SystemMetrics_1.SystemMetrics);
        this.analyticsReportRepo = connection_1.AppDataSource.getRepository(AnalyticsReport_1.AnalyticsReport);
        this.alertRepo = connection_1.AppDataSource.getRepository(Alert_1.Alert);
        this.betaUserRepo = connection_1.AppDataSource.getRepository(BetaUser_1.BetaUser);
        this.betaFeedbackRepo = connection_1.AppDataSource.getRepository(BetaFeedback_1.BetaFeedback);
        this.contentUsageLogRepo = connection_1.AppDataSource.getRepository(ContentUsageLog_1.ContentUsageLog);
    }
    // Session Management
    async createSession(data) {
        const session = new UserSession_1.UserSession();
        session.betaUserId = data.betaUserId;
        session.sessionId = data.sessionId;
        session.ipAddress = data.ipAddress;
        session.userAgent = data.userAgent;
        session.referrer = data.referrer;
        session.utmSource = data.utmSource;
        session.utmMedium = data.utmMedium;
        session.utmCampaign = data.utmCampaign;
        // Parse user agent to extract device info
        const deviceInfo = this.parseUserAgent(data.userAgent);
        session.deviceType = deviceInfo.deviceType;
        session.browser = deviceInfo.browser;
        session.operatingSystem = deviceInfo.operatingSystem;
        session.status = UserSession_1.SessionStatus.ACTIVE;
        session.lastActivityAt = new Date();
        return await this.userSessionRepo.save(session);
    }
    async updateSession(sessionId, activity) {
        const session = await this.userSessionRepo.findOne({ where: { sessionId } });
        if (!session)
            return null;
        Object.assign(session, activity);
        session.updateActivity();
        return await this.userSessionRepo.save(session);
    }
    async endSession(sessionId) {
        const session = await this.userSessionRepo.findOne({ where: { sessionId } });
        if (!session)
            return null;
        session.endSession();
        return await this.userSessionRepo.save(session);
    }
    // Action Tracking
    async trackAction(data) {
        const action = new UserAction_1.UserAction();
        action.betaUserId = data.betaUserId;
        action.sessionId = data.sessionId;
        action.actionType = data.actionType;
        action.actionName = data.actionName;
        action.pageUrl = data.pageUrl;
        action.targetElement = data.targetElement;
        action.responseTime = data.responseTime;
        action.metadata = data.metadata;
        // Set action category based on type
        action.actionCategory = this.getActionCategory(data.actionType);
        const savedAction = await this.userActionRepo.save(action);
        // Update session activity
        await this.updateSession(data.sessionId, {
            lastActivityAt: new Date()
        });
        return savedAction;
    }
    async trackPageView(betaUserId, sessionId, pageUrl, loadTime) {
        await this.trackAction({
            betaUserId,
            sessionId,
            actionType: UserAction_1.ActionType.PAGE_VIEW,
            actionName: 'Page View',
            pageUrl,
            responseTime: loadTime,
            metadata: { pageUrl, loadTime }
        });
        // Update session page views count separately
        const session = await this.userSessionRepo.findOne({ where: { sessionId } });
        if (session) {
            session.pageViews = (session.pageViews || 0) + 1;
            await this.userSessionRepo.save(session);
        }
    }
    async trackError(betaUserId, sessionId, error) {
        await this.trackAction({
            betaUserId,
            sessionId,
            actionType: UserAction_1.ActionType.ERROR_ENCOUNTERED,
            actionName: 'Error Encountered',
            pageUrl: error.pageUrl,
            metadata: {
                errorMessage: error.message,
                errorCode: error.code,
                stackTrace: error.stackTrace
            }
        });
        // Update session error count separately
        const session = await this.userSessionRepo.findOne({ where: { sessionId } });
        if (session) {
            session.errorsEncountered = (session.errorsEncountered || 0) + 1;
            await this.userSessionRepo.save(session);
        }
    }
    // Metrics Collection
    async recordMetric(data) {
        const metric = new SystemMetrics_1.SystemMetrics();
        metric.metricType = data.metricType;
        metric.metricCategory = data.metricCategory;
        metric.metricName = data.metricName;
        metric.value = data.value.toString();
        metric.unit = data.unit;
        metric.source = data.source;
        metric.endpoint = data.endpoint;
        metric.component = data.component;
        metric.tags = data.tags;
        metric.metadata = data.metadata;
        const savedMetric = await this.systemMetricsRepo.save(metric);
        // Check for alert conditions
        await this.checkAlertConditions(savedMetric);
        return savedMetric;
    }
    async recordPerformanceMetric(endpoint, responseTime, source = 'api-server') {
        await this.recordMetric({
            metricType: SystemMetrics_1.MetricType.PERFORMANCE,
            metricCategory: SystemMetrics_1.MetricCategory.RESPONSE_TIME,
            metricName: 'API Response Time',
            value: responseTime,
            unit: 'ms',
            source,
            endpoint,
            metadata: { timestamp: new Date().toISOString() }
        });
    }
    async recordUsageMetric(metricName, value, unit, tags) {
        await this.recordMetric({
            metricType: SystemMetrics_1.MetricType.USAGE,
            metricCategory: SystemMetrics_1.MetricCategory.ACTIVE_USERS,
            metricName,
            value,
            unit,
            tags,
            metadata: { timestamp: new Date().toISOString() }
        });
    }
    // Analytics and Reporting
    async getAnalyticsOverview(days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const [totalUsers, activeUsers, newUsers, totalSessions, avgSessionDuration, totalPageViews, totalActions, totalFeedback, totalErrors, avgResponseTime, errorRate] = await Promise.all([
            this.betaUserRepo.count(),
            this.betaUserRepo.createQueryBuilder('user')
                .where('user.lastActiveAt >= :startDate', { startDate })
                .getCount(),
            this.betaUserRepo.createQueryBuilder('user')
                .where('user.createdAt >= :startDate', { startDate })
                .getCount(),
            this.userSessionRepo.createQueryBuilder('session')
                .where('session.createdAt >= :startDate', { startDate })
                .getCount(),
            this.getAverageSessionDuration(startDate),
            this.getTotalPageViews(startDate),
            this.getTotalActions(startDate),
            this.betaFeedbackRepo.createQueryBuilder('feedback')
                .where('feedback.createdAt >= :startDate', { startDate })
                .getCount(),
            this.getTotalErrors(startDate),
            this.getAverageResponseTime(startDate),
            this.getErrorRate(startDate)
        ]);
        const userEngagement = this.calculateUserEngagement(activeUsers, totalUsers);
        const systemHealth = this.calculateSystemHealth(avgResponseTime, errorRate);
        return {
            totalUsers,
            activeUsers,
            newUsers,
            totalSessions,
            avgSessionDuration,
            totalPageViews,
            totalActions,
            totalFeedback,
            totalErrors,
            systemUptime: 99.9, // TODO: Calculate actual uptime
            avgResponseTime,
            errorRate,
            userEngagement,
            systemHealth
        };
    }
    async getUserEngagementMetrics(days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const sessions = await this.userSessionRepo
            .createQueryBuilder('session')
            .leftJoinAndSelect('session.betaUser', 'betaUser')
            .where('session.createdAt >= :startDate', { startDate })
            .getMany();
        const engagementData = sessions.map((session) => ({
            userId: session.betaUserId,
            sessionId: session.id,
            duration: session.durationMinutes,
            pageViews: session.pageViews,
            actions: session.actions,
            feedback: session.feedbackSubmitted,
            errors: session.errorsEncountered,
            engagementScore: session.getEngagementScore()
        }));
        return {
            totalSessions: sessions.length,
            averageEngagementScore: engagementData.reduce((sum, s) => sum + s.engagementScore, 0) / engagementData.length,
            averageSessionDuration: engagementData.reduce((sum, s) => sum + s.duration, 0) / engagementData.length,
            averagePageViews: engagementData.reduce((sum, s) => sum + s.pageViews, 0) / engagementData.length,
            averageActions: engagementData.reduce((sum, s) => sum + s.actions, 0) / engagementData.length,
            topUsers: engagementData.sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 10)
        };
    }
    async getContentUsageMetrics(days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const contentLogs = await this.contentUsageLogRepo
            .createQueryBuilder('log')
            .leftJoinAndSelect('log.content', 'content')
            .leftJoinAndSelect('log.store', 'store')
            .where('log.createdAt >= :startDate', { startDate })
            .getMany();
        const contentUsage = contentLogs.reduce((acc, log) => {
            if (log.content) {
                const contentId = log.content.id;
                if (!acc[contentId]) {
                    acc[contentId] = {
                        contentId,
                        title: log.content.title,
                        type: log.content.type,
                        views: 0,
                        totalDuration: 0,
                        uniqueStores: new Set()
                    };
                }
                acc[contentId].views++;
                acc[contentId].totalDuration += log.duration || 0;
                acc[contentId].uniqueStores.add(log.storeId);
            }
            return acc;
        }, {});
        return {
            totalContentViews: contentLogs.length,
            uniqueContent: Object.keys(contentUsage).length,
            topContent: Object.values(contentUsage)
                .map((c) => ({
                ...c,
                uniqueStores: c.uniqueStores.size,
                avgDuration: c.totalDuration / c.views
            }))
                .sort((a, b) => b.views - a.views)
                .slice(0, 10)
        };
    }
    // Report Generation
    async generateReport(type, category, startDate, endDate) {
        const report = new AnalyticsReport_1.AnalyticsReport();
        report.reportType = type;
        report.reportCategory = category;
        report.reportName = `${type} ${category} Report`;
        report.reportPeriodStart = startDate;
        report.reportPeriodEnd = endDate;
        report.status = AnalyticsReport_1.ReportStatus.GENERATING;
        const savedReport = await this.analyticsReportRepo.save(report);
        try {
            const reportData = await this.generateReportData(category, startDate, endDate);
            report.summary = reportData.summary;
            report.userMetrics = reportData.userMetrics;
            report.systemMetrics = reportData.systemMetrics;
            report.contentMetrics = reportData.contentMetrics;
            report.feedbackMetrics = reportData.feedbackMetrics;
            report.businessMetrics = reportData.businessMetrics;
            report.markAsCompleted(Date.now() - savedReport.createdAt.getTime());
            await this.analyticsReportRepo.save(report);
        }
        catch (error) {
            report.markAsFailed(error instanceof Error ? error.message : 'Unknown error');
            await this.analyticsReportRepo.save(report);
        }
        return report;
    }
    // Alert Management
    async createAlert(type, severity, title, message, metricName, currentValue, thresholdValue, context) {
        const alert = new Alert_1.Alert();
        alert.alertType = type;
        alert.severity = severity;
        alert.title = title;
        alert.message = message;
        alert.metricName = metricName;
        alert.currentValue = currentValue;
        alert.thresholdValue = thresholdValue;
        alert.context = context;
        alert.status = Alert_1.AlertStatus.ACTIVE;
        alert.firstOccurrence = new Date();
        alert.lastOccurrence = new Date();
        // Set notification channels based on severity
        if (severity === Alert_1.AlertSeverity.CRITICAL) {
            alert.notificationChannels = [Alert_1.AlertChannel.EMAIL, Alert_1.AlertChannel.SLACK, Alert_1.AlertChannel.DASHBOARD];
        }
        else if (severity === Alert_1.AlertSeverity.HIGH) {
            alert.notificationChannels = [Alert_1.AlertChannel.EMAIL, Alert_1.AlertChannel.DASHBOARD];
        }
        else {
            alert.notificationChannels = [Alert_1.AlertChannel.DASHBOARD];
        }
        return await this.alertRepo.save(alert);
    }
    async checkAlertConditions(metric) {
        // Performance alerts
        if (metric.metricCategory === SystemMetrics_1.MetricCategory.RESPONSE_TIME && parseFloat(metric.value) > 1000) {
            await this.createAlert(Alert_1.AlertType.PERFORMANCE, Alert_1.AlertSeverity.HIGH, 'High Response Time', `API response time is ${metric.value}ms, which exceeds the threshold of 1000ms`, metric.metricName, parseFloat(metric.value), 1000, { endpoint: metric.endpoint, source: metric.source });
        }
        // Error rate alerts
        if (metric.metricCategory === SystemMetrics_1.MetricCategory.ERROR_RATE && parseFloat(metric.value) > 5) {
            await this.createAlert(Alert_1.AlertType.ERROR, Alert_1.AlertSeverity.CRITICAL, 'High Error Rate', `Error rate is ${metric.value}%, which exceeds the threshold of 5%`, metric.metricName, parseFloat(metric.value), 5, { source: metric.source });
        }
        // Memory usage alerts
        if (metric.metricCategory === SystemMetrics_1.MetricCategory.MEMORY_USAGE && parseFloat(metric.value) > 85) {
            await this.createAlert(Alert_1.AlertType.SYSTEM, Alert_1.AlertSeverity.HIGH, 'High Memory Usage', `Memory usage is ${metric.value}%, which exceeds the threshold of 85%`, metric.metricName, parseFloat(metric.value), 85, { component: metric.component });
        }
    }
    // Helper Methods
    parseUserAgent(userAgent) {
        const deviceType = this.getDeviceType(userAgent);
        const browser = this.getBrowser(userAgent);
        const operatingSystem = this.getOperatingSystem(userAgent);
        return { deviceType, browser, operatingSystem };
    }
    getDeviceType(userAgent) {
        if (/tablet|ipad/i.test(userAgent))
            return UserSession_1.DeviceType.TABLET;
        if (/mobile|android|iphone/i.test(userAgent))
            return UserSession_1.DeviceType.MOBILE;
        return UserSession_1.DeviceType.DESKTOP;
    }
    getBrowser(userAgent) {
        if (userAgent.includes('Chrome'))
            return 'Chrome';
        if (userAgent.includes('Firefox'))
            return 'Firefox';
        if (userAgent.includes('Safari'))
            return 'Safari';
        if (userAgent.includes('Edge'))
            return 'Edge';
        return 'Unknown';
    }
    getOperatingSystem(userAgent) {
        if (userAgent.includes('Windows'))
            return 'Windows';
        if (userAgent.includes('Mac'))
            return 'macOS';
        if (userAgent.includes('Linux'))
            return 'Linux';
        if (userAgent.includes('Android'))
            return 'Android';
        if (userAgent.includes('iOS'))
            return 'iOS';
        return 'Unknown';
    }
    getActionCategory(actionType) {
        const categoryMap = {
            [UserAction_1.ActionType.PAGE_VIEW]: UserAction_1.ActionCategory.NAVIGATION,
            [UserAction_1.ActionType.NAVIGATION]: UserAction_1.ActionCategory.NAVIGATION,
            [UserAction_1.ActionType.MENU_CLICK]: UserAction_1.ActionCategory.NAVIGATION,
            [UserAction_1.ActionType.SEARCH]: UserAction_1.ActionCategory.NAVIGATION,
            [UserAction_1.ActionType.FILTER]: UserAction_1.ActionCategory.NAVIGATION,
            [UserAction_1.ActionType.SORT]: UserAction_1.ActionCategory.NAVIGATION,
            [UserAction_1.ActionType.CONTENT_VIEW]: UserAction_1.ActionCategory.CONTENT,
            [UserAction_1.ActionType.CONTENT_PLAY]: UserAction_1.ActionCategory.CONTENT,
            [UserAction_1.ActionType.CONTENT_PAUSE]: UserAction_1.ActionCategory.CONTENT,
            [UserAction_1.ActionType.CONTENT_STOP]: UserAction_1.ActionCategory.CONTENT,
            [UserAction_1.ActionType.CONTENT_SKIP]: UserAction_1.ActionCategory.CONTENT,
            [UserAction_1.ActionType.CONTENT_DOWNLOAD]: UserAction_1.ActionCategory.CONTENT,
            [UserAction_1.ActionType.CONTENT_SHARE]: UserAction_1.ActionCategory.CONTENT,
            [UserAction_1.ActionType.SIGNAGE_CREATE]: UserAction_1.ActionCategory.SIGNAGE,
            [UserAction_1.ActionType.SIGNAGE_EDIT]: UserAction_1.ActionCategory.SIGNAGE,
            [UserAction_1.ActionType.SIGNAGE_DELETE]: UserAction_1.ActionCategory.SIGNAGE,
            [UserAction_1.ActionType.SIGNAGE_PUBLISH]: UserAction_1.ActionCategory.SIGNAGE,
            [UserAction_1.ActionType.SIGNAGE_SCHEDULE]: UserAction_1.ActionCategory.SIGNAGE,
            [UserAction_1.ActionType.PLAYLIST_CREATE]: UserAction_1.ActionCategory.SIGNAGE,
            [UserAction_1.ActionType.PLAYLIST_EDIT]: UserAction_1.ActionCategory.SIGNAGE,
            [UserAction_1.ActionType.TEMPLATE_USE]: UserAction_1.ActionCategory.SIGNAGE,
            [UserAction_1.ActionType.LOGIN]: UserAction_1.ActionCategory.USER,
            [UserAction_1.ActionType.LOGOUT]: UserAction_1.ActionCategory.USER,
            [UserAction_1.ActionType.PROFILE_UPDATE]: UserAction_1.ActionCategory.USER,
            [UserAction_1.ActionType.SETTINGS_CHANGE]: UserAction_1.ActionCategory.USER,
            [UserAction_1.ActionType.PREFERENCE_UPDATE]: UserAction_1.ActionCategory.USER,
            [UserAction_1.ActionType.FEEDBACK_SUBMIT]: UserAction_1.ActionCategory.FEEDBACK,
            [UserAction_1.ActionType.FEEDBACK_RATE]: UserAction_1.ActionCategory.FEEDBACK,
            [UserAction_1.ActionType.FEEDBACK_COMMENT]: UserAction_1.ActionCategory.FEEDBACK,
            [UserAction_1.ActionType.BUG_REPORT]: UserAction_1.ActionCategory.FEEDBACK,
            [UserAction_1.ActionType.FEATURE_REQUEST]: UserAction_1.ActionCategory.FEEDBACK,
            [UserAction_1.ActionType.ERROR_ENCOUNTERED]: UserAction_1.ActionCategory.SYSTEM,
            [UserAction_1.ActionType.API_CALL]: UserAction_1.ActionCategory.SYSTEM,
            [UserAction_1.ActionType.FORM_SUBMIT]: UserAction_1.ActionCategory.SYSTEM,
            [UserAction_1.ActionType.BUTTON_CLICK]: UserAction_1.ActionCategory.SYSTEM,
            [UserAction_1.ActionType.MODAL_OPEN]: UserAction_1.ActionCategory.SYSTEM,
            [UserAction_1.ActionType.MODAL_CLOSE]: UserAction_1.ActionCategory.SYSTEM,
            [UserAction_1.ActionType.ADMIN_LOGIN]: UserAction_1.ActionCategory.ADMIN,
            [UserAction_1.ActionType.USER_APPROVE]: UserAction_1.ActionCategory.ADMIN,
            [UserAction_1.ActionType.USER_SUSPEND]: UserAction_1.ActionCategory.ADMIN,
            [UserAction_1.ActionType.CONTENT_APPROVE]: UserAction_1.ActionCategory.ADMIN,
            [UserAction_1.ActionType.CONTENT_REJECT]: UserAction_1.ActionCategory.ADMIN,
            [UserAction_1.ActionType.ANALYTICS_VIEW]: UserAction_1.ActionCategory.ADMIN,
            [UserAction_1.ActionType.REPORT_GENERATE]: UserAction_1.ActionCategory.ADMIN
        };
        return categoryMap[actionType] || UserAction_1.ActionCategory.SYSTEM;
    }
    async getAverageSessionDuration(startDate) {
        const result = await this.userSessionRepo
            .createQueryBuilder('session')
            .select('AVG(session.durationMinutes)', 'avgDuration')
            .where('session.createdAt >= :startDate', { startDate })
            .getRawOne();
        return parseFloat(result.avgDuration) || 0;
    }
    async getTotalPageViews(startDate) {
        const result = await this.userSessionRepo
            .createQueryBuilder('session')
            .select('SUM(session.pageViews)', 'totalPageViews')
            .where('session.createdAt >= :startDate', { startDate })
            .getRawOne();
        return parseInt(result.totalPageViews) || 0;
    }
    async getTotalActions(startDate) {
        return await this.userActionRepo
            .createQueryBuilder('action')
            .where('action.createdAt >= :startDate', { startDate })
            .getCount();
    }
    async getTotalErrors(startDate) {
        return await this.userActionRepo
            .createQueryBuilder('action')
            .where('action.createdAt >= :startDate', { startDate })
            .andWhere('action.isError = :isError', { isError: true })
            .getCount();
    }
    async getAverageResponseTime(startDate) {
        const result = await this.systemMetricsRepo
            .createQueryBuilder('metric')
            .select('AVG(metric.value)', 'avgResponseTime')
            .where('metric.createdAt >= :startDate', { startDate })
            .andWhere('metric.metricCategory = :category', { category: SystemMetrics_1.MetricCategory.RESPONSE_TIME })
            .getRawOne();
        return parseFloat(result.avgResponseTime) || 0;
    }
    async getErrorRate(startDate) {
        const [totalRequests, errorRequests] = await Promise.all([
            this.userActionRepo
                .createQueryBuilder('action')
                .where('action.createdAt >= :startDate', { startDate })
                .getCount(),
            this.userActionRepo
                .createQueryBuilder('action')
                .where('action.createdAt >= :startDate', { startDate })
                .andWhere('action.isError = :isError', { isError: true })
                .getCount()
        ]);
        return totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
    }
    calculateUserEngagement(activeUsers, totalUsers) {
        return totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
    }
    calculateSystemHealth(avgResponseTime, errorRate) {
        if (errorRate > 5 || avgResponseTime > 2000)
            return 'critical';
        if (errorRate > 2 || avgResponseTime > 1000)
            return 'warning';
        if (errorRate > 0.5 || avgResponseTime > 500)
            return 'good';
        return 'excellent';
    }
    async generateReportData(category, startDate, endDate) {
        // Implementation for generating specific report data based on category
        // This would be a comprehensive method that gathers all necessary data
        return {
            summary: await this.getAnalyticsOverview(Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))),
            userMetrics: await this.getUserEngagementMetrics(Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))),
            systemMetrics: {}, // TODO: Implement system metrics gathering
            contentMetrics: await this.getContentUsageMetrics(Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))),
            feedbackMetrics: {}, // TODO: Implement feedback metrics gathering
            businessMetrics: {} // TODO: Implement business metrics gathering
        };
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=AnalyticsService.js.map