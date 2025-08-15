import { Request, Response } from 'express';
export declare class OrdersController {
    private orderRepository;
    private orderItemRepository;
    private cartRepository;
    private cartItemRepository;
    private productRepository;
    getOrders: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    createOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    cancelOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=ordersController.d.ts.map