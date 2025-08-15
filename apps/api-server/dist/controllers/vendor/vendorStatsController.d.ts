import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
export declare class VendorStatsController {
    getDashboardStats(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getSalesChartData(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getRecentOrders(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getTopProducts(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=vendorStatsController.d.ts.map