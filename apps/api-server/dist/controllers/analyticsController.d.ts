import { Request, Response } from 'express';
export declare class AnalyticsController {
    private analyticsService;
    private userSessionRepo;
    private userActionRepo;
    private systemMetricsRepo;
    private analyticsReportRepo;
    private alertRepo;
    private betaUserRepo;
    constructor();
    getOverview(req: Request, res: Response): Promise<void>;
    getUserAnalytics(req: Request, res: Response): Promise<void>;
    getSystemAnalytics(req: Request, res: Response): Promise<void>;
    getContentAnalytics(req: Request, res: Response): Promise<void>;
    getUserActions(req: Request, res: Response): Promise<void>;
    getReports(req: Request, res: Response): Promise<void>;
    generateReport(req: Request, res: Response): Promise<void>;
    getReport(req: Request, res: Response): Promise<void>;
    getAlerts(req: Request, res: Response): Promise<void>;
    acknowledgeAlert(req: Request, res: Response): Promise<void>;
    resolveAlert(req: Request, res: Response): Promise<void>;
    getRealTimeMetrics(req: Request, res: Response): Promise<void>;
    private getDailyActiveUsers;
    private analyzeUserSessions;
    private analyzePerformanceMetrics;
    private analyzeErrorMetrics;
    private analyzeUsageMetrics;
    private getEndpointPerformance;
    private calculateRetentionRate;
    private calculateSystemHealth;
}
export declare const analyticsController: AnalyticsController;
//# sourceMappingURL=analyticsController.d.ts.map