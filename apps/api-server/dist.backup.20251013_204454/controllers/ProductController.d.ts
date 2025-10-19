import { Request, Response } from 'express';
export declare class ProductController {
    private productService;
    constructor();
    createProduct: (req: Request, res: Response) => Promise<void>;
    getProduct: (req: Request, res: Response) => Promise<void>;
    getProducts: (req: Request, res: Response) => Promise<void>;
    updateProduct: (req: Request, res: Response) => Promise<void>;
    deleteProduct: (req: Request, res: Response) => Promise<void>;
    toggleProductStatus: (req: Request, res: Response) => Promise<void>;
    updateInventory: (req: Request, res: Response) => Promise<void>;
    getAvailableProductsForSellers: (req: Request, res: Response) => Promise<void>;
    getSupplierProductStats: (req: Request, res: Response) => Promise<void>;
}
export default ProductController;
//# sourceMappingURL=ProductController.d.ts.map