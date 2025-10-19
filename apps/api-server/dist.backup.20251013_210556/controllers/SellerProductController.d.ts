import { Request, Response } from 'express';
export declare class SellerProductController {
    private sellerProductService;
    constructor();
    addProductToSeller: (req: Request, res: Response) => Promise<void>;
    bulkAddProducts: (req: Request, res: Response) => Promise<void>;
    updateSellerProduct: (req: Request, res: Response) => Promise<void>;
    removeProductFromSeller: (req: Request, res: Response) => Promise<void>;
    getSellerProducts: (req: Request, res: Response) => Promise<void>;
    getAvailableProducts: (req: Request, res: Response) => Promise<void>;
    analyzeProfitability: (req: Request, res: Response) => Promise<void>;
    syncInventory: (req: Request, res: Response) => Promise<void>;
    getSellerProductStats: (req: Request, res: Response) => Promise<void>;
    getSellerProductPerformance: (req: Request, res: Response) => Promise<void>;
    getMyProducts: (req: Request, res: Response) => Promise<void>;
    getSellerProductDashboard: (req: Request, res: Response) => Promise<void>;
}
export default SellerProductController;
//# sourceMappingURL=SellerProductController.d.ts.map