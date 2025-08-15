"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsController = exports.AnalyticsController = void 0;
const typeorm_1 = require("typeorm");
const connection_1 = require("../database/connection");
const AnalyticsService_1 = require("../services/AnalyticsService");
const UserSession_1 = require("../entities/UserSession");
const UserAction_1 = require("../entities/UserAction");
const SystemMetrics_1 = require("../entities/SystemMetrics");
const AnalyticsReport_1 = require("../entities/AnalyticsReport");
const Alert_1 = require("../entities/Alert");
const BetaUser_1 = require("../entities/BetaUser");
class AnalyticsController {
    constructor() {
        this.analyticsService = new AnalyticsService_1.AnalyticsService();
        this.userSessionRepo = connection_1.AppDataSource.getRepository(UserSession_1.UserSession);
        this.userActionRepo = connection_1.AppDataSource.getRepository(UserAction_1.UserAction);
        this.systemMetricsRepo = connection_1.AppDataSource.getRepository(SystemMetrics_1.SystemMetrics);
        this.analyticsReportRepo = connection_1.AppDataSource.getRepository(AnalyticsReport_1.AnalyticsReport);
        this.alertRepo = connection_1.AppDataSource.getRepository(Alert_1.Alert);
        this.betaUserRepo = connection_1.AppDataSource.getRepository(BetaUser_1.BetaUser);
    }
    // Overview Dashboard
    async getOverview(req, res) {
        try {
            const days = parseInt(req.query.days) || 7;
            const overview = await this.analyticsService.getAnalyticsOverview(days);
            res.json({
                success: true,
                data: overview
            });
        }
        catch (error) {
            console.error('Error getting analytics overview:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get analytics overview',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // User Analytics
    async getUserAnalytics(req, res) {
        try {
            const days = parseInt(req.query.days) || 7;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const [totalUsers, activeUsers, newUsers, userSessions, userActions, engagementMetrics] = await Promise.all([
                this.betaUserRepo.count(),
                this.betaUserRepo.count({
                    where: { lastActiveAt: (0, typeorm_1.MoreThan)(startDate) }
                }),
                this.betaUserRepo.count({
                    where: { createdAt: (0, typeorm_1.MoreThan)(startDate) }
                }),
                this.userSessionRepo.find({
                    where: { createdAt: (0, typeorm_1.MoreThan)(startDate) },
                    relations: ['betaUser'],
                    order: { createdAt: 'DESC' }
                }),
                this.userActionRepo.count({
                    where: { createdAt: (0, typeorm_1.MoreThan)(startDate) }
                }),
                this.analyticsService.getUserEngagementMetrics(days)
            ]);
            // User demographics
            const userTypes = await this.betaUserRepo
                .createQueryBuilder('user')
                .select('user.type', 'type')
                .addSelect('COUNT(*)', 'count')
                .groupBy('user.type')
                .getRawMany();
            const interestAreas = await this.betaUserRepo
                .createQueryBuilder('user')
                .select('user.interestArea', 'area')
                .addSelect('COUNT(*)', 'count')
                .groupBy('user.interestArea')
                .getRawMany();
            // User activity trends (daily active users)
            const dailyActiveUsers = await this.getDailyActiveUsers(days);
            // Session analysis
            const sessionAnalysis = this.analyzeUserSessions(userSessions);
            res.json({
                success: true,
                data: {
                    summary: {
                        totalUsers,
                        activeUsers,
                        newUsers,
                        totalSessions: userSessions.length,
                        totalActions: userActions,
                        retentionRate: this.calculateRetentionRate(totalUsers, activeUsers),
                        avgSessionDuration: sessionAnalysis.avgDuration,
                        avgPageViews: sessionAnalysis.avgPageViews
                    },
                    demographics: {
                        userTypes: userTypes.reduce((acc, item) => {
                            acc[item.type] = parseInt(item.count);
                            return acc;
                        }, {}),
                        interestAreas: interestAreas.reduce((acc, item) => {
                            acc[item.area] = parseInt(item.count);
                            return acc;
                        }, {})
                    },
                    engagement: engagementMetrics,
                    trends: {
                        dailyActiveUsers
                    },
                    sessions: {
                        ...sessionAnalysis,
                        recentSessions: userSessions.slice(0, 10).map((session) => {
                            var _a;
                            return ({
                                id: session.id,
                                userId: session.betaUserId,
                                userName: (_a = session.betaUser) === null || _a === void 0 ? void 0 : _a.name,
                                duration: session.durationMinutes,
                                pageViews: session.pageViews,
                                actions: session.actions,
                                deviceType: session.deviceType,
                                browser: session.browser,
                                createdAt: session.createdAt,
                                engagementScore: session.getEngagementScore()
                            });
                        })
                    }
                }
            });
        }
        catch (error) {
            console.error('Error getting user analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user analytics',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // System Performance Analytics
    async getSystemAnalytics(req, res) {
        try {
            const days = parseInt(req.query.days) || 7;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const performanceMetrics = await this.systemMetricsRepo.find({
                where: {
                    createdAt: (0, typeorm_1.MoreThan)(startDate),
                    metricType: SystemMetrics_1.MetricType.PERFORMANCE
                },
                order: { createdAt: 'ASC' }
            });
            const errorMetrics = await this.systemMetricsRepo.find({
                where: {
                    createdAt: (0, typeorm_1.MoreThan)(startDate),
                    metricType: SystemMetrics_1.MetricType.ERROR
                },
                order: { createdAt: 'ASC' }
            });
            const usageMetrics = await this.systemMetricsRepo.find({
                where: {
                    createdAt: (0, typeorm_1.MoreThan)(startDate),
                    metricType: SystemMetrics_1.MetricType.USAGE
                },
                order: { createdAt: 'ASC' }
            });
            // Performance analysis
            const performanceAnalysis = this.analyzePerformanceMetrics(performanceMetrics);
            const errorAnalysis = this.analyzeErrorMetrics(errorMetrics);
            const usageAnalysis = this.analyzeUsageMetrics(usageMetrics);
            // Endpoint performance
            const endpointPerformance = await this.getEndpointPerformance(startDate);
            res.json({
                success: true,
                data: {
                    performance: performanceAnalysis,
                    errors: errorAnalysis,
                    usage: usageAnalysis,
                    endpoints: endpointPerformance,
                    systemHealth: this.calculateSystemHealth(performanceAnalysis, errorAnalysis)
                }
            });
        }
        catch (error) {
            console.error('Error getting system analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get system analytics',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Content Usage Analytics
    async getContentAnalytics(req, res) {
        try {
            const days = parseInt(req.query.days) || 7;
            const contentMetrics = await this.analyticsService.getContentUsageMetrics(days);
            res.json({
                success: true,
                data: contentMetrics
            });
        }
        catch (error) {
            console.error('Error getting content analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get content analytics',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // User Actions Analysis
    async getUserActions(req, res) {
        try {
            const days = parseInt(req.query.days) || 7;
            const userId = req.query.userId;
            const actionType = req.query.actionType;
            const limit = parseInt(req.query.limit) || 50;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const whereClause = {
                createdAt: (0, typeorm_1.MoreThan)(startDate)
            };
            if (userId)
                whereClause.betaUserId = userId;
            if (actionType)
                whereClause.actionType = actionType;
            const [actions, actionCounts] = await Promise.all([
                this.userActionRepo.find({
                    where: whereClause,
                    relations: ['betaUser'],
                    order: { createdAt: 'DESC' },
                    take: limit
                }),
                this.userActionRepo
                    .createQueryBuilder('action')
                    .select('action.actionType', 'actionType')
                    .addSelect('action.actionCategory', 'actionCategory')
                    .addSelect('COUNT(*)', 'count')
                    .where('action.createdAt > :startDate', { startDate })
                    .groupBy('action.actionType, action.actionCategory')
                    .orderBy('count', 'DESC')
                    .getRawMany()
            ]);
            const actionsByCategory = actionCounts.reduce((acc, item) => {
                if (!acc[item.actionCategory]) {
                    acc[item.actionCategory] = [];
                }
                acc[item.actionCategory].push({
                    type: item.actionType,
                    count: parseInt(item.count)
                });
                return acc;
            }, {});
            res.json({
                success: true,
                data: {
                    actions: actions.map((action) => {
                        var _a;
                        return ({
                            id: action.id,
                            type: action.actionType,
                            category: action.actionCategory,
                            name: action.actionName,
                            userId: action.betaUserId,
                            userName: (_a = action.betaUser) === null || _a === void 0 ? void 0 : _a.name,
                            pageUrl: action.pageUrl,
                            responseTime: action.responseTime,
                            isError: action.isError,
                            errorMessage: action.errorMessage,
                            metadata: action.metadata,
                            createdAt: action.createdAt
                        });
                    }),
                    summary: {
                        totalActions: actions.length,
                        actionsByCategory,
                        mostCommonActions: actionCounts.slice(0, 10)
                    }
                }
            });
        }
        catch (error) {
            console.error('Error getting user actions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user actions',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Reports Management
    async getReports(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const type = req.query.type;
            const category = req.query.category;
            const status = req.query.status;
            const whereClause = {};
            if (type)
                whereClause.reportType = type;
            if (category)
                whereClause.reportCategory = category;
            if (status)
                whereClause.status = status;
            const [reports, total] = await this.analyticsReportRepo.findAndCount({
                where: whereClause,
                order: { createdAt: 'DESC' },
                skip: (page - 1) * limit,
                take: limit
            });
            res.json({
                success: true,
                data: {
                    reports: reports.map((report) => ({
                        id: report.id,
                        type: report.reportType,
                        category: report.reportCategory,
                        name: report.reportName,
                        description: report.description,
                        status: report.status,
                        period: report.getFormattedPeriod(),
                        generatedAt: report.generatedAt,
                        generationTimeMs: report.generationTimeMs,
                        hasData: report.hasData(),
                        dataSize: report.getDataSize(),
                        filePath: report.reportFilePath,
                        fileType: report.reportFileType,
                        fileSize: report.reportFileSize,
                        createdAt: report.createdAt
                    })),
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        }
        catch (error) {
            console.error('Error getting reports:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get reports',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async generateReport(req, res) {
        try {
            const { type, category, startDate, endDate, name } = req.body;
            if (!type || !category || !startDate || !endDate) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: type, category, startDate, endDate'
                });
                return;
            }
            const report = await this.analyticsService.generateReport(type, category, new Date(startDate), new Date(endDate));
            res.json({
                success: true,
                data: {
                    reportId: report.id,
                    status: report.status,
                    message: 'Report generation started'
                }
            });
        }
        catch (error) {
            console.error('Error generating report:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate report',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getReport(req, res) {
        try {
            const { id } = req.params;
            const report = await this.analyticsReportRepo.findOne({
                where: { id }
            });
            if (!report) {
                res.status(404).json({
                    success: false,
                    message: 'Report not found'
                });
                return;
            }
            res.json({
                success: true,
                data: {
                    id: report.id,
                    type: report.reportType,
                    category: report.reportCategory,
                    name: report.reportName,
                    description: report.description,
                    status: report.status,
                    period: report.getFormattedPeriod(),
                    summary: report.summary,
                    userMetrics: report.userMetrics,
                    systemMetrics: report.systemMetrics,
                    contentMetrics: report.contentMetrics,
                    feedbackMetrics: report.feedbackMetrics,
                    businessMetrics: report.businessMetrics,
                    generatedAt: report.generatedAt,
                    generationTimeMs: report.generationTimeMs,
                    generationError: report.generationError,
                    filePath: report.reportFilePath,
                    fileType: report.reportFileType,
                    fileSize: report.reportFileSize,
                    createdAt: report.createdAt
                }
            });
        }
        catch (error) {
            console.error('Error getting report:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get report',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Alerts Management
    async getAlerts(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const severity = req.query.severity;
            const status = req.query.status;
            const type = req.query.type;
            const whereClause = {};
            if (severity)
                whereClause.severity = severity;
            if (status)
                whereClause.status = status;
            if (type)
                whereClause.alertType = type;
            const [alerts, total] = await this.alertRepo.findAndCount({
                where: whereClause,
                order: { createdAt: 'DESC' },
                skip: (page - 1) * limit,
                take: limit
            });
            res.json({
                success: true,
                data: {
                    alerts: alerts.map((alert) => ({
                        id: alert.id,
                        type: alert.alertType,
                        severity: alert.severity,
                        status: alert.status,
                        title: alert.title,
                        message: alert.message,
                        source: alert.source,
                        component: alert.component,
                        endpoint: alert.endpoint,
                        metricName: alert.metricName,
                        currentValue: alert.currentValue,
                        thresholdValue: alert.thresholdValue,
                        formattedValue: alert.getFormattedValue(),
                        isRecurring: alert.isRecurring,
                        occurrenceCount: alert.occurrenceCount,
                        isEscalated: alert.isEscalated,
                        notificationSent: alert.notificationSent,
                        ageInHours: alert.getAgeInHours(),
                        acknowledgedAt: alert.acknowledgedAt,
                        resolvedAt: alert.resolvedAt,
                        createdAt: alert.createdAt
                    })),
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
                    },
                    summary: {
                        activeAlerts: alerts.filter((a) => a.status === Alert_1.AlertStatus.ACTIVE).length,
                        criticalAlerts: alerts.filter((a) => a.severity === Alert_1.AlertSeverity.CRITICAL).length,
                        unacknowledgedAlerts: alerts.filter((a) => a.status === Alert_1.AlertStatus.ACTIVE && !a.acknowledgedAt).length
                    }
                }
            });
        }
        catch (error) {
            console.error('Error getting alerts:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get alerts',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async acknowledgeAlert(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const { note } = req.body;
            const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'system';
            const alert = await this.alertRepo.findOne({ where: { id } });
            if (!alert) {
                res.status(404).json({
                    success: false,
                    message: 'Alert not found'
                });
                return;
            }
            alert.acknowledge(userId, note);
            await this.alertRepo.save(alert);
            res.json({
                success: true,
                data: {
                    id: alert.id,
                    status: alert.status,
                    acknowledgedAt: alert.acknowledgedAt,
                    acknowledgmentNote: alert.acknowledgmentNote
                }
            });
        }
        catch (error) {
            console.error('Error acknowledging alert:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to acknowledge alert',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async resolveAlert(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const { note, action } = req.body;
            const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'system';
            const alert = await this.alertRepo.findOne({ where: { id } });
            if (!alert) {
                res.status(404).json({
                    success: false,
                    message: 'Alert not found'
                });
                return;
            }
            alert.resolve(userId, note, action);
            await this.alertRepo.save(alert);
            res.json({
                success: true,
                data: {
                    id: alert.id,
                    status: alert.status,
                    resolvedAt: alert.resolvedAt,
                    resolutionNote: alert.resolutionNote,
                    resolutionAction: alert.resolutionAction
                }
            });
        }
        catch (error) {
            console.error('Error resolving alert:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to resolve alert',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Real-time Analytics
    async getRealTimeMetrics(req, res) {
        try {
            const now = new Date();
            const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
            const [activeSessions, recentActions, recentErrors, currentAlerts] = await Promise.all([
                this.userSessionRepo.count({
                    where: {
                        status: UserSession_1.SessionStatus.ACTIVE,
                        lastActivityAt: (0, typeorm_1.MoreThan)(lastHour)
                    }
                }),
                this.userActionRepo.count({
                    where: { createdAt: (0, typeorm_1.MoreThan)(lastHour) }
                }),
                this.userActionRepo.count({
                    where: {
                        createdAt: (0, typeorm_1.MoreThan)(lastHour),
                        isError: true
                    }
                }),
                this.alertRepo.count({
                    where: { status: Alert_1.AlertStatus.ACTIVE }
                })
            ]);
            res.json({
                success: true,
                data: {
                    activeSessions,
                    recentActions,
                    recentErrors,
                    currentAlerts,
                    timestamp: now
                }
            });
        }
        catch (error) {
            console.error('Error getting real-time metrics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get real-time metrics',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // Helper Methods
    async getDailyActiveUsers(days) {
        const result = await this.userSessionRepo
            .createQueryBuilder('session')
            .select('DATE(session.createdAt)', 'date')
            .addSelect('COUNT(DISTINCT session.betaUserId)', 'activeUsers')
            .where('session.createdAt >= DATE_SUB(NOW(), INTERVAL :days DAY)', { days })
            .groupBy('DATE(session.createdAt)')
            .orderBy('date', 'ASC')
            .getRawMany();
        return result.map((item) => parseInt(item.activeUsers));
    }
    analyzeUserSessions(sessions) {
        if (sessions.length === 0) {
            return {
                avgDuration: 0,
                avgPageViews: 0,
                avgActions: 0,
                deviceTypes: {},
                browsers: {},
                engagementDistribution: {
                    low: 0,
                    medium: 0,
                    high: 0
                }
            };
        }
        const totalDuration = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
        const totalPageViews = sessions.reduce((sum, s) => sum + s.pageViews, 0);
        const totalActions = sessions.reduce((sum, s) => sum + s.actions, 0);
        const deviceTypes = sessions.reduce((acc, s) => {
            acc[s.deviceType] = (acc[s.deviceType] || 0) + 1;
            return acc;
        }, {});
        const browsers = sessions.reduce((acc, s) => {
            const browser = s.browser || 'Unknown';
            acc[browser] = (acc[browser] || 0) + 1;
            return acc;
        }, {});
        const engagementScores = sessions.map((s) => s.getEngagementScore());
        const engagementDistribution = {
            low: engagementScores.filter((s) => s < 10).length,
            medium: engagementScores.filter((s) => s >= 10 && s < 25).length,
            high: engagementScores.filter((s) => s >= 25).length
        };
        return {
            avgDuration: Math.round(totalDuration / sessions.length),
            avgPageViews: Math.round(totalPageViews / sessions.length * 10) / 10,
            avgActions: Math.round(totalActions / sessions.length * 10) / 10,
            deviceTypes,
            browsers,
            engagementDistribution
        };
    }
    analyzePerformanceMetrics(metrics) {
        if (metrics.length === 0) {
            return {
                avgResponseTime: 0,
                maxResponseTime: 0,
                minResponseTime: 0,
                trends: []
            };
        }
        const responseTimes = metrics
            .filter((m) => m.metricCategory === 'response_time')
            .map((m) => parseFloat(m.value));
        return {
            avgResponseTime: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length,
            maxResponseTime: Math.max(...responseTimes),
            minResponseTime: Math.min(...responseTimes),
            trends: responseTimes.slice(-24) // Last 24 data points
        };
    }
    analyzeErrorMetrics(metrics) {
        if (metrics.length === 0) {
            return {
                totalErrors: 0,
                errorRate: 0,
                errorTrends: []
            };
        }
        const errorCounts = metrics
            .filter((m) => m.metricCategory === 'error_count')
            .map((m) => parseFloat(m.value));
        return {
            totalErrors: errorCounts.reduce((sum, count) => sum + count, 0),
            errorRate: errorCounts.length > 0 ? errorCounts[errorCounts.length - 1] : 0,
            errorTrends: errorCounts.slice(-24)
        };
    }
    analyzeUsageMetrics(metrics) {
        if (metrics.length === 0) {
            return {
                activeUsers: 0,
                pageViews: 0,
                usageTrends: []
            };
        }
        const activeUserMetrics = metrics.filter((m) => m.metricCategory === 'active_users');
        const pageViewMetrics = metrics.filter((m) => m.metricCategory === 'page_views');
        return {
            activeUsers: activeUserMetrics.length > 0 ? parseFloat(activeUserMetrics[activeUserMetrics.length - 1].value) : 0,
            pageViews: pageViewMetrics.reduce((sum, pv) => sum + parseFloat(pv.value), 0),
            usageTrends: activeUserMetrics.map((m) => parseFloat(m.value)).slice(-24)
        };
    }
    async getEndpointPerformance(startDate) {
        const result = await this.systemMetricsRepo
            .createQueryBuilder('metric')
            .select('metric.endpoint', 'endpoint')
            .addSelect('AVG(metric.value)', 'avgResponseTime')
            .addSelect('MAX(metric.value)', 'maxResponseTime')
            .addSelect('COUNT(*)', 'requestCount')
            .where('metric.createdAt >= :startDate', { startDate })
            .andWhere('metric.metricCategory = :category', { category: 'response_time' })
            .andWhere('metric.endpoint IS NOT NULL')
            .groupBy('metric.endpoint')
            .orderBy('avgResponseTime', 'DESC')
            .limit(10)
            .getRawMany();
        return result.map((item) => ({
            endpoint: item.endpoint,
            avgResponseTime: Math.round(parseFloat(item.avgResponseTime)),
            maxResponseTime: Math.round(parseFloat(item.maxResponseTime)),
            requestCount: parseInt(item.requestCount)
        }));
    }
    calculateRetentionRate(totalUsers, activeUsers) {
        return totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100 * 10) / 10 : 0;
    }
    calculateSystemHealth(performanceAnalysis, errorAnalysis) {
        const avgResponseTime = performanceAnalysis.avgResponseTime || 0;
        const errorRate = errorAnalysis.errorRate || 0;
        if (errorRate > 5 || avgResponseTime > 2000)
            return 'critical';
        if (errorRate > 2 || avgResponseTime > 1000)
            return 'warning';
        if (errorRate > 0.5 || avgResponseTime > 500)
            return 'good';
        return 'excellent';
    }
}
exports.AnalyticsController = AnalyticsController;
exports.analyticsController = new AnalyticsController();
//# sourceMappingURL=analyticsController.js.map