import { Request, Response } from 'express';
export declare class MonitoringController {
    static getMetrics(req: Request, res: Response): Promise<void>;
    static getMetricsHistory(req: Request, res: Response): Promise<void>;
    static getSummary(req: Request, res: Response): Promise<void>;
    static triggerBackup(req: Request, res: Response): Promise<void>;
    static getBackupHistory(req: Request, res: Response): Promise<void>;
    static getErrorAlerts(req: Request, res: Response): Promise<void>;
    static getSecurityEvents(req: Request, res: Response): Promise<void>;
    static getSecurityRules(req: Request, res: Response): Promise<void>;
    static updateSecurityRule(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=monitoringController.d.ts.map