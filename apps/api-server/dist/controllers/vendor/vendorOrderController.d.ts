import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
export declare class VendorOrderController {
    getOrders(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getOrder(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    updateOrderStatus(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getOrderStats(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    bulkUpdateOrderStatus(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=vendorOrderController.d.ts.map