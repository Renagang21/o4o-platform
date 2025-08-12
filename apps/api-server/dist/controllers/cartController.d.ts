import { Response } from 'express';
import { AuthRequest } from '../types/auth';
export declare class CartController {
    private cartRepository;
    private cartItemRepository;
    private productRepository;
    private couponService;
    getCart: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    addToCart: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    updateCartItem: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    removeCartItem: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    clearCart: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    applyCoupon: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
    removeCoupon: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=cartController.d.ts.map