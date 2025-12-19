import { Request, Response } from 'express';
import { Repository, Between, MoreThan, LessThan, FindOperator } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { AnalyticsService } from '../services/AnalyticsService.js';
import { UserSession, SessionStatus } from '../entities/UserSession.js';
import { UserAction, ActionType } from '../entities/UserAction.js';
import { SystemMetrics, MetricType } from '../entities/SystemMetrics.js';
import { AnalyticsReport, ReportType, ReportCategory, ReportStatus } from '../entities/AnalyticsReport.js';
import { Alert, AlertStatus, AlertSeverity, AlertType } from '../entities/Alert.js';
// NOTE: BetaUser entity removed - beta feature deprecated
// import { BetaUser } from '../entities/BetaUser.js';
import type { AuthRequest } from '../types/auth.js';

export class AnalyticsController {
  private analyticsService: AnalyticsService;
  private userSessionRepo: Repository<UserSession>;
  private userActionRepo: Repository<UserAction>;
  private systemMetricsRepo: Repository<SystemMetrics>;
  private analyticsReportRepo: Repository<AnalyticsReport>;
  private alertRepo: Repository<Alert>;
  // private betaUserRepo: Repository<BetaUser>; // Removed - beta feature deprecated

  constructor() {
    this.analyticsService = new AnalyticsService();
    this.userSessionRepo = AppDataSource.getRepository(UserSession);
    this.userActionRepo = AppDataSource.getRepository(UserAction);
    this.systemMetricsRepo = AppDataSource.getRepository(SystemMetrics);
    this.analyticsReportRepo = AppDataSource.getRepository(AnalyticsReport);
    this.alertRepo = AppDataSource.getRepository(Alert);
    // this.betaUserRepo = AppDataSource.getRepository(BetaUser); // Removed - beta feature deprecated
  }

  // Overview Dashboard
  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const overview = await this.analyticsService.getAnalyticsOverview(days);
      
      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to get analytics overview',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // User Analytics
  async getUserAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        totalUsers,
        activeUsers,
        newUsers,
        userSessions,
        userActions,
        engagementMetrics
      ] = await Promise.all([
        // this.betaUserRepo.count(), // Removed - beta feature deprecated
        Promise.resolve(0),
        // this.betaUserRepo.count({ where: { lastActiveAt: MoreThan(startDate) } }), // Removed
        Promise.resolve(0),
        // this.betaUserRepo.count({ where: { createdAt: MoreThan(startDate) } }), // Removed
        Promise.resolve(0),
        this.userSessionRepo.find({
          where: { createdAt: MoreThan(startDate) },
          // relations: ['betaUser'], // Removed - beta feature deprecated
          order: { createdAt: 'DESC' }
        }),
        this.userActionRepo.count({
          where: { createdAt: MoreThan(startDate) }
        }),
        this.analyticsService.getUserEngagementMetrics(days)
      ]);

      // User demographics
      // NOTE: BetaUser queries removed - beta feature deprecated
      const userTypes: any[] = []; // await this.betaUserRepo.createQueryBuilder...
      const interestAreas: any[] = []; // await this.betaUserRepo.createQueryBuilder...

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
            }, {} as Record<string, number>),
            interestAreas: interestAreas.reduce((acc, item) => {
              acc[item.area] = parseInt(item.count);
              return acc;
            }, {} as Record<string, number>)
          },
          engagement: engagementMetrics,
          trends: {
            dailyActiveUsers
          },
          sessions: {
            ...sessionAnalysis,
            recentSessions: userSessions.slice(0, 10).map((session: any) => ({
              id: session.id,
              userId: session.betaUserId,
              userName: session.betaUser?.name,
              duration: session.durationMinutes,
              pageViews: session.pageViews,
              actions: session.actions,
              deviceType: session.deviceType,
              browser: session.browser,
              createdAt: session.createdAt,
              engagementScore: session.getEngagementScore()
            }))
          }
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to get user analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // System Performance Analytics
  async getSystemAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const performanceMetrics = await this.systemMetricsRepo.find({
        where: {
          createdAt: MoreThan(startDate),
          metricType: MetricType.PERFORMANCE
        },
        order: { createdAt: 'ASC' }
      });

      const errorMetrics = await this.systemMetricsRepo.find({
        where: {
          createdAt: MoreThan(startDate),
          metricType: MetricType.ERROR
        },
        order: { createdAt: 'ASC' }
      });

      const usageMetrics = await this.systemMetricsRepo.find({
        where: {
          createdAt: MoreThan(startDate),
          metricType: MetricType.USAGE
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
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to get system analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Content Usage Analytics
  async getContentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const contentMetrics = await this.analyticsService.getContentUsageMetrics(days);

      res.json({
        success: true,
        data: contentMetrics
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to get content analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // User Actions Analysis
  async getUserActions(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const userId = req.query.userId as string;
      const actionType = req.query.actionType as ActionType;
      const limit = parseInt(req.query.limit as string) || 50;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      interface ActionWhereClause {
        createdAt: FindOperator<Date>;
        betaUserId?: string;
        actionType?: ActionType;
      }
      
      const whereClause: ActionWhereClause = {
        createdAt: MoreThan(startDate)
      };

      if (userId) whereClause.betaUserId = userId;
      if (actionType) whereClause.actionType = actionType;

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
      }, {} as Record<string, Array<{ type: string; count: number }>>);

      res.json({
        success: true,
        data: {
          actions: actions.map((action: any) => ({
            id: action.id,
            type: action.actionType,
            category: action.actionCategory,
            name: action.actionName,
            userId: action.betaUserId,
            userName: action.betaUser?.name,
            pageUrl: action.pageUrl,
            responseTime: action.responseTime,
            isError: action.isError,
            errorMessage: action.errorMessage,
            metadata: action.metadata,
            createdAt: action.createdAt
          })),
          summary: {
            totalActions: actions.length,
            actionsByCategory,
            mostCommonActions: actionCounts.slice(0, 10)
          }
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to get user actions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Reports Management
  async getReports(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as ReportType;
      const category = req.query.category as ReportCategory;
      const status = req.query.status as ReportStatus;

      interface ReportWhereClause {
        reportType?: ReportType;
        reportCategory?: ReportCategory;
        status?: ReportStatus;
      }
      
      const whereClause: ReportWhereClause = {};
      if (type) whereClause.reportType = type;
      if (category) whereClause.reportCategory = category;
      if (status) whereClause.status = status;

      const [reports, total] = await this.analyticsReportRepo.findAndCount({
        where: whereClause,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit
      });

      res.json({
        success: true,
        data: {
          reports: reports.map((report: any) => ({
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
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to get reports',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { type, category, startDate, endDate, name } = req.body;

      if (!type || !category || !startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: type, category, startDate, endDate'
        });
        return;
      }

      const report = await this.analyticsService.generateReport(
        type as ReportType,
        category as ReportCategory,
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        data: {
          reportId: report.id,
          status: report.status,
          message: 'Report generation started'
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to generate report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getReport(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to get report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Alerts Management
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const severity = req.query.severity as AlertSeverity;
      const status = req.query.status as AlertStatus;
      const type = req.query.type as AlertType;

      interface AlertWhereClause {
        severity?: AlertSeverity;
        status?: AlertStatus;
        alertType?: AlertType;
      }
      
      const whereClause: AlertWhereClause = {};
      if (severity) whereClause.severity = severity;
      if (status) whereClause.status = status;
      if (type) whereClause.alertType = type;

      const [alerts, total] = await this.alertRepo.findAndCount({
        where: whereClause,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit
      });

      res.json({
        success: true,
        data: {
          alerts: alerts.map((alert: any) => ({
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
            activeAlerts: alerts.filter((a: any) => a.status === AlertStatus.ACTIVE).length,
            criticalAlerts: alerts.filter((a: any) => a.severity === AlertSeverity.CRITICAL).length,
            unacknowledgedAlerts: alerts.filter((a: any) => a.status === AlertStatus.ACTIVE && !a.acknowledgedAt).length
          }
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to get alerts',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const userId = (req as AuthRequest).user?.id || 'system';

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
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to acknowledge alert',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async resolveAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { note, action } = req.body;
      const userId = (req as AuthRequest).user?.id || 'system';

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
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to resolve alert',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Real-time Analytics
  async getRealTimeMetrics(req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

      const [
        activeSessions,
        recentActions,
        recentErrors,
        currentAlerts
      ] = await Promise.all([
        this.userSessionRepo.count({
          where: {
            status: SessionStatus.ACTIVE,
            lastActivityAt: MoreThan(lastHour)
          }
        }),
        this.userActionRepo.count({
          where: { createdAt: MoreThan(lastHour) }
        }),
        this.userActionRepo.count({
          where: {
            createdAt: MoreThan(lastHour),
            isError: true
          }
        }),
        this.alertRepo.count({
          where: { status: AlertStatus.ACTIVE }
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
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        message: 'Failed to get real-time metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Helper Methods
  private async getDailyActiveUsers(days: number): Promise<number[]> {
    const result = await this.userSessionRepo
      .createQueryBuilder('session')
      .select('DATE(session.createdAt)', 'date')
      .addSelect('COUNT(DISTINCT session.betaUserId)', 'activeUsers')
      .where('session.createdAt >= DATE_SUB(NOW(), INTERVAL :days DAY)', { days })
      .groupBy('DATE(session.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((item: any) => parseInt(item.activeUsers));
  }

  private analyzeUserSessions(sessions: UserSession[]): {
    avgDuration: number;
    avgPageViews: number;
    avgActions: number;
    deviceTypes: Record<string, number>;
    browsers: Record<string, number>;
    engagementDistribution: {
      low: number;
      medium: number;
      high: number;
    };
  } {
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
    }, {} as Record<string, number>);

    const browsers = sessions.reduce((acc, s) => {
      const browser = s.browser || 'Unknown';
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const engagementScores = sessions.map((s: any) => s.getEngagementScore());
    const engagementDistribution = {
      low: engagementScores.filter((s: any) => s < 10).length,
      medium: engagementScores.filter((s: any) => s >= 10 && s < 25).length,
      high: engagementScores.filter((s: any) => s >= 25).length
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

  private analyzePerformanceMetrics(metrics: SystemMetrics[]): {
    avgResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    trends: number[];
  } {
    if (metrics.length === 0) {
      return {
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        trends: []
      };
    }

    const responseTimes = metrics
      .filter((m: any) => m.metricCategory === 'response_time')
      .map((m: any) => parseFloat(m.value));

    return {
      avgResponseTime: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      trends: responseTimes.slice(-24) // Last 24 data points
    };
  }

  private analyzeErrorMetrics(metrics: SystemMetrics[]): {
    totalErrors: number;
    errorRate: number;
    errorTrends: number[];
  } {
    if (metrics.length === 0) {
      return {
        totalErrors: 0,
        errorRate: 0,
        errorTrends: []
      };
    }

    const errorCounts = metrics
      .filter((m: any) => m.metricCategory === 'error_count')
      .map((m: any) => parseFloat(m.value));

    return {
      totalErrors: errorCounts.reduce((sum, count) => sum + count, 0),
      errorRate: errorCounts.length > 0 ? errorCounts[errorCounts.length - 1] : 0,
      errorTrends: errorCounts.slice(-24)
    };
  }

  private analyzeUsageMetrics(metrics: SystemMetrics[]): {
    activeUsers: number;
    pageViews: number;
    usageTrends: number[];
  } {
    if (metrics.length === 0) {
      return {
        activeUsers: 0,
        pageViews: 0,
        usageTrends: []
      };
    }

    const activeUserMetrics = metrics.filter((m: any) => m.metricCategory === 'active_users');
    const pageViewMetrics = metrics.filter((m: any) => m.metricCategory === 'page_views');

    return {
      activeUsers: activeUserMetrics.length > 0 ? parseFloat(activeUserMetrics[activeUserMetrics.length - 1].value) : 0,
      pageViews: pageViewMetrics.reduce((sum, pv) => sum + parseFloat(pv.value), 0),
      usageTrends: activeUserMetrics.map((m: any) => parseFloat(m.value)).slice(-24)
    };
  }

  private async getEndpointPerformance(startDate: Date): Promise<Array<{
    endpoint: string;
    avgResponseTime: number;
    maxResponseTime: number;
    requestCount: number;
  }>> {
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

    return result.map((item: any) => ({
      endpoint: item.endpoint,
      avgResponseTime: Math.round(parseFloat(item.avgResponseTime)),
      maxResponseTime: Math.round(parseFloat(item.maxResponseTime)),
      requestCount: parseInt(item.requestCount)
    }));
  }

  private calculateRetentionRate(totalUsers: number, activeUsers: number): number {
    return totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100 * 10) / 10 : 0;
  }

  private calculateSystemHealth(
    performanceAnalysis: { avgResponseTime: number },
    errorAnalysis: { errorRate: number }
  ): string {
    const avgResponseTime = performanceAnalysis.avgResponseTime || 0;
    const errorRate = errorAnalysis.errorRate || 0;

    if (errorRate > 5 || avgResponseTime > 2000) return 'critical';
    if (errorRate > 2 || avgResponseTime > 1000) return 'warning';
    if (errorRate > 0.5 || avgResponseTime > 500) return 'good';
    return 'excellent';
  }
}

export const analyticsController = new AnalyticsController();