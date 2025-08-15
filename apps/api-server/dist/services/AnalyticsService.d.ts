import { UserSession } from '../entities/UserSession';
import { UserAction, ActionType } from '../entities/UserAction';
import { SystemMetrics, MetricType, MetricCategory } from '../entities/SystemMetrics';
import { AnalyticsReport, ReportType, ReportCategory } from '../entities/AnalyticsReport';
import { Alert, AlertType, AlertSeverity } from '../entities/Alert';
import type { AnalyticsMetadata, MetricTags } from '../types';
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
export declare class AnalyticsService {
    private userSessionRepo;
    private userActionRepo;
    private systemMetricsRepo;
    private analyticsReportRepo;
    private alertRepo;
    private betaUserRepo;
    private betaFeedbackRepo;
    private contentUsageLogRepo;
    constructor();
    createSession(data: SessionData): Promise<UserSession>;
    updateSession(sessionId: string, activity: Partial<UserSession>): Promise<UserSession | null>;
    endSession(sessionId: string): Promise<UserSession | null>;
    trackAction(data: ActionData): Promise<UserAction>;
    trackPageView(betaUserId: string, sessionId: string, pageUrl: string, loadTime?: number): Promise<void>;
    trackError(betaUserId: string, sessionId: string, error: {
        message: string;
        code?: string;
        pageUrl?: string;
        stackTrace?: string;
    }): Promise<void>;
    recordMetric(data: MetricData): Promise<SystemMetrics>;
    recordPerformanceMetric(endpoint: string, responseTime: number, source?: string): Promise<void>;
    recordUsageMetric(metricName: string, value: number, unit: string, tags?: MetricTags): Promise<void>;
    getAnalyticsOverview(days?: number): Promise<AnalyticsOverview>;
    getUserEngagementMetrics(days?: number): Promise<{
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
    }>;
    getContentUsageMetrics(days?: number): Promise<{
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
    }>;
    generateReport(type: ReportType, category: ReportCategory, startDate: Date, endDate: Date): Promise<AnalyticsReport>;
    createAlert(type: AlertType, severity: AlertSeverity, title: string, message: string, metricName?: string, currentValue?: number, thresholdValue?: number, context?: Record<string, unknown>): Promise<Alert>;
    checkAlertConditions(metric: SystemMetrics): Promise<void>;
    private parseUserAgent;
    private getDeviceType;
    private getBrowser;
    private getOperatingSystem;
    private getActionCategory;
    private getAverageSessionDuration;
    private getTotalPageViews;
    private getTotalActions;
    private getTotalErrors;
    private getAverageResponseTime;
    private getErrorRate;
    private calculateUserEngagement;
    private calculateSystemHealth;
    private generateReportData;
}
//# sourceMappingURL=AnalyticsService.d.ts.map