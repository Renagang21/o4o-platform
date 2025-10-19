import { Request, Response } from 'express';
export declare class AdminStatsController {
    /**
     * Get platform statistics
     * GET /api/v1/admin/platform-stats
     */
    getPlatformStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get revenue summary
     * GET /api/v1/admin/revenue-summary
     */
    getRevenueSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get pending settlements
     * GET /api/v1/admin/pending-settlements
     */
    getPendingSettlements(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Process settlement
     * POST /api/v1/admin/process-settlement/:id
     */
    processSettlement(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private generateDailyRevenue;
    private generateMonthlyRevenue;
    private generateAlerts;
}
declare const _default: AdminStatsController;
export default _default;
//# sourceMappingURL=adminStatsController.d.ts.map