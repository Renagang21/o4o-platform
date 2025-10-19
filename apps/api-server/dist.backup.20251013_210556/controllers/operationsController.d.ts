import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth';
export declare class OperationsController {
    private operationsService;
    constructor();
    getSystemStatus(req: Request, res: Response): Promise<void>;
    getSystemHealth(req: Request, res: Response): Promise<void>;
    getServiceHealth(req: Request, res: Response): Promise<void>;
    getInfrastructureMetrics(req: Request, res: Response): Promise<void>;
    getPerformanceMetrics(req: Request, res: Response): Promise<void>;
    getAlerts(req: Request, res: Response): Promise<void>;
    acknowledgeAlert(req: AuthRequest, res: Response): Promise<void>;
    resolveAlert(req: AuthRequest, res: Response): Promise<void>;
    getAlertRules(req: Request, res: Response): Promise<void>;
    createAlertRule(req: Request, res: Response): Promise<void>;
    updateAlertRule(req: Request, res: Response): Promise<void>;
    deleteAlertRule(req: Request, res: Response): Promise<void>;
    getMonitoringConfig(req: Request, res: Response): Promise<void>;
    updateMonitoringConfig(req: Request, res: Response): Promise<void>;
    getDashboardData(req: Request, res: Response): Promise<void>;
    getStatusPageData(req: Request, res: Response): Promise<void>;
    private formatMetricsForChart;
    private calculateAverage;
    private formatConditionDescription;
    private parseTimeRange;
    private getPerformanceData;
    private getInfrastructureData;
    private calculateTrend;
    private getRecentIncidents;
}
export declare const operationsController: OperationsController;
//# sourceMappingURL=operationsController.d.ts.map