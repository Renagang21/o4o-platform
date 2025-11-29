import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { UserSession, SessionStatus, DeviceType } from '../entities/UserSession.js';
import { UserAction, ActionType, ActionCategory } from '../entities/UserAction.js';
import { SystemMetrics, MetricType, MetricCategory } from '../entities/SystemMetrics.js';
import { AnalyticsReport, ReportType, ReportCategory, ReportStatus } from '../entities/AnalyticsReport.js';
import { Alert, AlertType, AlertSeverity, AlertStatus, AlertChannel } from '../entities/Alert.js';
// NOTE: BetaUser and BetaFeedback entities removed - beta feature deprecated
// import { BetaUser } from '../entities/BetaUser.js';
// import { BetaFeedback } from '../entities/BetaFeedback.js';
import { ContentUsageLog } from '../entities/ContentUsageLog.js';
import type { AnalyticsMetadata, MetricTags, ErrorContext } from '../types/index.js';

export interface SessionData {
  betaUserId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface ActionData {
  betaUserId: string;
  sessionId: string;
  actionType: ActionType;
  actionName: string;
  pageUrl?: string;
  targetElement?: string;
  responseTime?: number;
  metadata?: AnalyticsMetadata;
}

export interface MetricData {
  metricType: MetricType;
  metricCategory: MetricCategory;
  metricName: string;
  value: number;
  unit: string;
  source?: string;
  endpoint?: string;
  component?: string;
  tags?: MetricTags;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalSessions: number;
  avgSessionDuration: number;
  totalPageViews: number;
  totalActions: number;
  totalFeedback: number;
  totalErrors: number;
  systemUptime: number;
  avgResponseTime: number;
  errorRate: number;
  userEngagement: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

export class AnalyticsService {
  private userSessionRepo: Repository<UserSession>;
  private userActionRepo: Repository<UserAction>;
  private systemMetricsRepo: Repository<SystemMetrics>;
  private analyticsReportRepo: Repository<AnalyticsReport>;
  private alertRepo: Repository<Alert>;
  // NOTE: BetaUser and BetaFeedback repositories removed - beta feature deprecated
  // private betaUserRepo: Repository<BetaUser>;
  // private betaFeedbackRepo: Repository<BetaFeedback>;
  private contentUsageLogRepo: Repository<ContentUsageLog>;

  constructor() {
    this.userSessionRepo = AppDataSource.getRepository(UserSession);
    this.userActionRepo = AppDataSource.getRepository(UserAction);
    this.systemMetricsRepo = AppDataSource.getRepository(SystemMetrics);
    this.analyticsReportRepo = AppDataSource.getRepository(AnalyticsReport);
    this.alertRepo = AppDataSource.getRepository(Alert);
    // this.betaUserRepo = AppDataSource.getRepository(BetaUser); // Removed - beta feature deprecated
    // this.betaFeedbackRepo = AppDataSource.getRepository(BetaFeedback); // Removed - beta feature deprecated
    this.contentUsageLogRepo = AppDataSource.getRepository(ContentUsageLog);
  }

  // Session Management
  async createSession(data: SessionData): Promise<UserSession> {
    const session = new UserSession();
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
    
    session.status = SessionStatus.ACTIVE;
    session.lastActivityAt = new Date();
    
    return await this.userSessionRepo.save(session);
  }

  async updateSession(sessionId: string, activity: Partial<UserSession>): Promise<UserSession | null> {
    const session = await this.userSessionRepo.findOne({ where: { sessionId } });
    if (!session) return null;

    Object.assign(session, activity);
    session.updateActivity();
    
    return await this.userSessionRepo.save(session);
  }

  async endSession(sessionId: string): Promise<UserSession | null> {
    const session = await this.userSessionRepo.findOne({ where: { sessionId } });
    if (!session) return null;

    session.endSession();
    return await this.userSessionRepo.save(session);
  }

  // Action Tracking
  async trackAction(data: ActionData): Promise<UserAction> {
    const action = new UserAction();
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

  async trackPageView(betaUserId: string, sessionId: string, pageUrl: string, loadTime?: number): Promise<void> {
    await this.trackAction({
      betaUserId,
      sessionId,
      actionType: ActionType.PAGE_VIEW,
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

  async trackError(betaUserId: string, sessionId: string, error: {
    message: string;
    code?: string;
    pageUrl?: string;
    stackTrace?: string;
  }): Promise<void> {
    await this.trackAction({
      betaUserId,
      sessionId,
      actionType: ActionType.ERROR_ENCOUNTERED,
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
  async recordMetric(data: MetricData): Promise<SystemMetrics> {
    const metric = new SystemMetrics();
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

  async recordPerformanceMetric(endpoint: string, responseTime: number, source: string = 'api-server'): Promise<void> {
    await this.recordMetric({
      metricType: MetricType.PERFORMANCE,
      metricCategory: MetricCategory.RESPONSE_TIME,
      metricName: 'API Response Time',
      value: responseTime,
      unit: 'ms',
      source,
      endpoint,
      metadata: { timestamp: new Date().toISOString() }
    });
  }

  async recordUsageMetric(metricName: string, value: number, unit: string, tags?: MetricTags): Promise<void> {
    await this.recordMetric({
      metricType: MetricType.USAGE,
      metricCategory: MetricCategory.ACTIVE_USERS,
      metricName,
      value,
      unit,
      tags,
      metadata: { timestamp: new Date().toISOString() }
    });
  }

  // Analytics and Reporting
  async getAnalyticsOverview(days: number = 7): Promise<AnalyticsOverview> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalSessions,
      avgSessionDuration,
      totalPageViews,
      totalActions,
      totalFeedback,
      totalErrors,
      avgResponseTime,
      errorRate
    ] = await Promise.all([
      // NOTE: BetaUser statistics removed - beta feature deprecated
      Promise.resolve(0), // this.betaUserRepo.count(),
      Promise.resolve(0), // this.betaUserRepo.createQueryBuilder...
      Promise.resolve(0), // this.betaUserRepo.createQueryBuilder...
      this.userSessionRepo.createQueryBuilder('session')
        .where('session.createdAt >= :startDate', { startDate })
        .getCount(),
      this.getAverageSessionDuration(startDate),
      this.getTotalPageViews(startDate),
      this.getTotalActions(startDate),
      Promise.resolve(0), // this.betaFeedbackRepo.createQueryBuilder...
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

  async getUserEngagementMetrics(days: number = 7): Promise<{
    totalSessions: number;
    averageEngagementScore: number;
    averageSessionDuration: number;
    averagePageViews: number;
    averageActions: number;
    topUsers: Array<{
      userId: string;
      sessionId: string;
      duration: number;
      pageViews: number;
      actions: number;
      feedback: number;
      errors: number;
      engagementScore: number;
    }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await this.userSessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.betaUser', 'betaUser')
      .where('session.createdAt >= :startDate', { startDate })
      .getMany();

    const engagementData = sessions.map((session: any) => ({
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

  async getContentUsageMetrics(days: number = 7): Promise<{
    totalContentViews: number;
    uniqueContent: number;
    topContent: Array<{
      contentId: string;
      title: string;
      type: string;
      views: number;
      totalDuration: number;
      uniqueStores: number;
      avgDuration: number;
    }>;
  }> {
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
    }, {} as Record<string, {
      contentId: string;
      title: string;
      type: string;
      views: number;
      totalDuration: number;
      uniqueStores: Set<string>;
    }>);

    return {
      totalContentViews: contentLogs.length,
      uniqueContent: Object.keys(contentUsage).length,
      topContent: Object.values(contentUsage)
        .map((c: any) => ({
          ...c,
          uniqueStores: c.uniqueStores.size,
          avgDuration: c.totalDuration / c.views
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10)
    };
  }

  // Report Generation
  async generateReport(type: ReportType, category: ReportCategory, startDate: Date, endDate: Date): Promise<AnalyticsReport> {
    const report = new AnalyticsReport();
    report.reportType = type;
    report.reportCategory = category;
    report.reportName = `${type} ${category} Report`;
    report.reportPeriodStart = startDate;
    report.reportPeriodEnd = endDate;
    report.status = ReportStatus.GENERATING;

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
      
    } catch (error) {
      report.markAsFailed(error instanceof Error ? error.message : 'Unknown error');
      await this.analyticsReportRepo.save(report);
    }

    return report;
  }

  // Alert Management
  async createAlert(
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    message: string,
    metricName?: string,
    currentValue?: number,
    thresholdValue?: number,
    context?: Record<string, unknown>
  ): Promise<Alert> {
    const alert = new Alert();
    alert.alertType = type;
    alert.severity = severity;
    alert.title = title;
    alert.message = message;
    alert.metricName = metricName;
    alert.currentValue = currentValue;
    alert.thresholdValue = thresholdValue;
    alert.context = context;
    alert.status = AlertStatus.ACTIVE;
    alert.firstOccurrence = new Date();
    alert.lastOccurrence = new Date();
    
    // Set notification channels based on severity
    if (severity === AlertSeverity.CRITICAL) {
      alert.notificationChannels = [AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.DASHBOARD];
    } else if (severity === AlertSeverity.HIGH) {
      alert.notificationChannels = [AlertChannel.EMAIL, AlertChannel.DASHBOARD];
    } else {
      alert.notificationChannels = [AlertChannel.DASHBOARD];
    }

    return await this.alertRepo.save(alert);
  }

  async checkAlertConditions(metric: SystemMetrics): Promise<void> {
    // Performance alerts
    if (metric.metricCategory === MetricCategory.RESPONSE_TIME && parseFloat(metric.value) > 1000) {
      await this.createAlert(
        AlertType.PERFORMANCE,
        AlertSeverity.HIGH,
        'High Response Time',
        `API response time is ${metric.value}ms, which exceeds the threshold of 1000ms`,
        metric.metricName,
        parseFloat(metric.value),
        1000,
        { endpoint: metric.endpoint, source: metric.source } as Record<string, unknown>
      );
    }

    // Error rate alerts
    if (metric.metricCategory === MetricCategory.ERROR_RATE && parseFloat(metric.value) > 5) {
      await this.createAlert(
        AlertType.ERROR,
        AlertSeverity.CRITICAL,
        'High Error Rate',
        `Error rate is ${metric.value}%, which exceeds the threshold of 5%`,
        metric.metricName,
        parseFloat(metric.value),
        5,
        { source: metric.source } as Record<string, unknown>
      );
    }

    // Memory usage alerts
    if (metric.metricCategory === MetricCategory.MEMORY_USAGE && parseFloat(metric.value) > 85) {
      await this.createAlert(
        AlertType.SYSTEM,
        AlertSeverity.HIGH,
        'High Memory Usage',
        `Memory usage is ${metric.value}%, which exceeds the threshold of 85%`,
        metric.metricName,
        parseFloat(metric.value),
        85,
        { component: metric.component } as Record<string, unknown>
      );
    }
  }

  // Helper Methods
  private parseUserAgent(userAgent: string): { deviceType: DeviceType; browser?: string; operatingSystem?: string } {
    const deviceType = this.getDeviceType(userAgent);
    const browser = this.getBrowser(userAgent);
    const operatingSystem = this.getOperatingSystem(userAgent);
    
    return { deviceType, browser, operatingSystem };
  }

  private getDeviceType(userAgent: string): DeviceType {
    if (/tablet|ipad/i.test(userAgent)) return DeviceType.TABLET;
    if (/mobile|android|iphone/i.test(userAgent)) return DeviceType.MOBILE;
    return DeviceType.DESKTOP;
  }

  private getBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getOperatingSystem(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private getActionCategory(actionType: ActionType): ActionCategory {
    const categoryMap: Record<ActionType, ActionCategory> = {
      [ActionType.PAGE_VIEW]: ActionCategory.NAVIGATION,
      [ActionType.NAVIGATION]: ActionCategory.NAVIGATION,
      [ActionType.MENU_CLICK]: ActionCategory.NAVIGATION,
      [ActionType.SEARCH]: ActionCategory.NAVIGATION,
      [ActionType.FILTER]: ActionCategory.NAVIGATION,
      [ActionType.SORT]: ActionCategory.NAVIGATION,
      
      [ActionType.CONTENT_VIEW]: ActionCategory.CONTENT,
      [ActionType.CONTENT_PLAY]: ActionCategory.CONTENT,
      [ActionType.CONTENT_PAUSE]: ActionCategory.CONTENT,
      [ActionType.CONTENT_STOP]: ActionCategory.CONTENT,
      [ActionType.CONTENT_SKIP]: ActionCategory.CONTENT,
      [ActionType.CONTENT_DOWNLOAD]: ActionCategory.CONTENT,
      [ActionType.CONTENT_SHARE]: ActionCategory.CONTENT,
      
      [ActionType.SIGNAGE_CREATE]: ActionCategory.SIGNAGE,
      [ActionType.SIGNAGE_EDIT]: ActionCategory.SIGNAGE,
      [ActionType.SIGNAGE_DELETE]: ActionCategory.SIGNAGE,
      [ActionType.SIGNAGE_PUBLISH]: ActionCategory.SIGNAGE,
      [ActionType.SIGNAGE_SCHEDULE]: ActionCategory.SIGNAGE,
      [ActionType.PLAYLIST_CREATE]: ActionCategory.SIGNAGE,
      [ActionType.PLAYLIST_EDIT]: ActionCategory.SIGNAGE,
      [ActionType.TEMPLATE_USE]: ActionCategory.SIGNAGE,
      
      [ActionType.LOGIN]: ActionCategory.USER,
      [ActionType.LOGOUT]: ActionCategory.USER,
      [ActionType.PROFILE_UPDATE]: ActionCategory.USER,
      [ActionType.SETTINGS_CHANGE]: ActionCategory.USER,
      [ActionType.PREFERENCE_UPDATE]: ActionCategory.USER,
      
      [ActionType.FEEDBACK_SUBMIT]: ActionCategory.FEEDBACK,
      [ActionType.FEEDBACK_RATE]: ActionCategory.FEEDBACK,
      [ActionType.FEEDBACK_COMMENT]: ActionCategory.FEEDBACK,
      [ActionType.BUG_REPORT]: ActionCategory.FEEDBACK,
      [ActionType.FEATURE_REQUEST]: ActionCategory.FEEDBACK,
      
      [ActionType.ERROR_ENCOUNTERED]: ActionCategory.SYSTEM,
      [ActionType.API_CALL]: ActionCategory.SYSTEM,
      [ActionType.FORM_SUBMIT]: ActionCategory.SYSTEM,
      [ActionType.BUTTON_CLICK]: ActionCategory.SYSTEM,
      [ActionType.MODAL_OPEN]: ActionCategory.SYSTEM,
      [ActionType.MODAL_CLOSE]: ActionCategory.SYSTEM,
      
      [ActionType.ADMIN_LOGIN]: ActionCategory.ADMIN,
      [ActionType.USER_APPROVE]: ActionCategory.ADMIN,
      [ActionType.USER_SUSPEND]: ActionCategory.ADMIN,
      [ActionType.CONTENT_APPROVE]: ActionCategory.ADMIN,
      [ActionType.CONTENT_REJECT]: ActionCategory.ADMIN,
      [ActionType.ANALYTICS_VIEW]: ActionCategory.ADMIN,
      [ActionType.REPORT_GENERATE]: ActionCategory.ADMIN
    };
    
    return categoryMap[actionType] || ActionCategory.SYSTEM;
  }

  private async getAverageSessionDuration(startDate: Date): Promise<number> {
    const result = await this.userSessionRepo
      .createQueryBuilder('session')
      .select('AVG(session.durationMinutes)', 'avgDuration')
      .where('session.createdAt >= :startDate', { startDate })
      .getRawOne();
    
    return parseFloat(result.avgDuration) || 0;
  }

  private async getTotalPageViews(startDate: Date): Promise<number> {
    const result = await this.userSessionRepo
      .createQueryBuilder('session')
      .select('SUM(session.pageViews)', 'totalPageViews')
      .where('session.createdAt >= :startDate', { startDate })
      .getRawOne();
    
    return parseInt(result.totalPageViews) || 0;
  }

  private async getTotalActions(startDate: Date): Promise<number> {
    return await this.userActionRepo
      .createQueryBuilder('action')
      .where('action.createdAt >= :startDate', { startDate })
      .getCount();
  }

  private async getTotalErrors(startDate: Date): Promise<number> {
    return await this.userActionRepo
      .createQueryBuilder('action')
      .where('action.createdAt >= :startDate', { startDate })
      .andWhere('action.isError = :isError', { isError: true })
      .getCount();
  }

  private async getAverageResponseTime(startDate: Date): Promise<number> {
    const result = await this.systemMetricsRepo
      .createQueryBuilder('metric')
      .select('AVG(metric.value)', 'avgResponseTime')
      .where('metric.createdAt >= :startDate', { startDate })
      .andWhere('metric.metricCategory = :category', { category: MetricCategory.RESPONSE_TIME })
      .getRawOne();
    
    return parseFloat(result.avgResponseTime) || 0;
  }

  private async getErrorRate(startDate: Date): Promise<number> {
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

  private calculateUserEngagement(activeUsers: number, totalUsers: number): number {
    return totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  }

  private calculateSystemHealth(avgResponseTime: number, errorRate: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (errorRate > 5 || avgResponseTime > 2000) return 'critical';
    if (errorRate > 2 || avgResponseTime > 1000) return 'warning';
    if (errorRate > 0.5 || avgResponseTime > 500) return 'good';
    return 'excellent';
  }

  private async generateReportData(category: ReportCategory, startDate: Date, endDate: Date): Promise<{
    summary: AnalyticsOverview & Record<string, number>;
    userMetrics: Awaited<ReturnType<typeof this.getUserEngagementMetrics>>;
    systemMetrics: Record<string, unknown>;
    contentMetrics: Awaited<ReturnType<typeof this.getContentUsageMetrics>>;
    feedbackMetrics: Record<string, unknown>;
    businessMetrics: Record<string, unknown>;
  }> {
    // Implementation for generating specific report data based on category
    // This would be a comprehensive method that gathers all necessary data
    return {
      summary: await this.getAnalyticsOverview(Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) as AnalyticsOverview & Record<string, number>,
      userMetrics: await this.getUserEngagementMetrics(Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))),
      systemMetrics: {}, // TODO: Implement system metrics gathering
      contentMetrics: await this.getContentUsageMetrics(Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))),
      feedbackMetrics: {}, // TODO: Implement feedback metrics gathering
      businessMetrics: {} // TODO: Implement business metrics gathering
    };
  }
}