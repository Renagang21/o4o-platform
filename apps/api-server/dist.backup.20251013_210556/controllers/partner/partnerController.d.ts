import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
export declare class PartnerController {
    static getDashboardSummary(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCommissionHistory(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getPerformanceAnalytics(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static generatePartnerLink(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getPromotionalProducts(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=partnerController.d.ts.map