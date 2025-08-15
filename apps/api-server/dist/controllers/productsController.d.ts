import { Response } from 'express';
import { AuthRequest } from '../types/auth';
export declare class ProductsController {
    private productRepository;
    private categoryRepository;
    getProducts: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    getProduct: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    createProduct: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    updateProduct: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    deleteProduct: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    getFeaturedProducts: (req: AuthRequest, res: Response) => Promise<void>;
}
//# sourceMappingURL=productsController.d.ts.map