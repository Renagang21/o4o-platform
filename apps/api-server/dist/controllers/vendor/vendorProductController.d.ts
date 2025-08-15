import { Request, Response } from 'express';
import { AuthRequest } from '../../types/auth';
export declare class VendorProductController {
    getProducts(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getProduct(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    createProduct(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    updateProduct(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteProduct(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    private getProductSalesStats;
    getCategories(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=vendorProductController.d.ts.map