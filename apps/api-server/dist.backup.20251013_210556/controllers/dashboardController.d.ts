import { Request, Response } from 'express';
export declare class DashboardController {
    static getUserStats(req: Request, res: Response): Promise<void>;
    static getEcommerceStats(req: Request, res: Response): Promise<void>;
    static getNotifications(req: Request, res: Response): Promise<void>;
    static getActivities(req: Request, res: Response): Promise<void>;
    static getSystemHealth(req: Request, res: Response): Promise<void>;
    static getContentStats(req: Request, res: Response): Promise<void>;
    static getDashboardOverview(req: Request, res: Response): Promise<void>;
    private static getUserStatsData;
    private static getEcommerceStatsData;
    private static getContentStatsData;
}
//# sourceMappingURL=dashboardController.d.ts.map