import { AnalyticsReport, ReportType, ReportCategory } from '../entities/AnalyticsReport';
import { Alert } from '../entities/Alert';
export interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
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
export declare class ScheduledReportingService {
    private analyticsService;
    private analyticsReportRepo;
    private alertRepo;
    private userSessionRepo;
    private systemMetricsRepo;
    private betaUserRepo;
    private isRunning;
    private notificationConfig;
    constructor(notificationConfig?: NotificationConfig);
    start(): void;
    stop(): void;
    generateDailyReports(): Promise<void>;
    generateWeeklyReports(): Promise<void>;
    generateMonthlyReports(): Promise<void>;
    performRealTimeMonitoring(): Promise<void>;
    checkAlertEscalation(): Promise<void>;
    performSystemHealthCheck(): Promise<void>;
    generateBetaProgramInsights(): Promise<void>;
    sendDailyReportNotification(reports: AnalyticsReport[]): Promise<void>;
    sendWeeklyReportNotification(reports: AnalyticsReport[]): Promise<void>;
    sendMonthlyReportNotification(report: AnalyticsReport): Promise<void>;
    sendAlertEscalationNotification(alert: Alert): Promise<void>;
    sendErrorNotification(title: string, error: Error | unknown): Promise<void>;
    private sendNotification;
    private sendEmailNotification;
    private sendSlackNotification;
    private sendWebhookNotification;
    private getBetaProgramInsights;
    private calculateAverageEngagement;
    generateManualReport(type: ReportType, category: ReportCategory, startDate: Date, endDate: Date): Promise<AnalyticsReport>;
    triggerHealthCheck(): Promise<void>;
    triggerRealTimeMonitoring(): Promise<void>;
    getStatus(): {
        isRunning: boolean;
        uptime: number;
    };
}
export declare const scheduledReportingService: ScheduledReportingService;
//# sourceMappingURL=ScheduledReportingService.d.ts.map