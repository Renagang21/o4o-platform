import { Request, Response, NextFunction } from 'express';
export declare class OrderController {
    private orderService;
    constructor();
    /**
     * GET /api/orders
     * Get user's orders with filtering
     */
    getOrders: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * GET /api/orders/:id
     * Get single order by ID
     */
    getOrder: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * POST /api/orders
     * Create new order directly
     */
    createOrder: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * POST /api/orders/from-cart
     * Create order from cart
     */
    createOrderFromCart: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * PATCH /api/orders/:id/status
     * Update order status (admin only)
     */
    updateOrderStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * PATCH /api/orders/:id/payment-status
     * Update payment status (admin only)
     */
    updatePaymentStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * POST /api/orders/:id/cancel
     * Cancel order
     */
    cancelOrder: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * POST /api/orders/:id/refund
     * Request refund
     */
    requestRefund: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * POST /api/orders/:id/reorder
     * Create new order based on existing order
     */
    reorder: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * GET /api/orders/stats
     * Get order statistics
     */
    getOrderStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * GET /api/orders/:id/tracking
     * Get order tracking information
     */
    getOrderTracking: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * GET /api/orders/:id/invoice
     * Download order invoice
     */
    downloadInvoice: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=OrderController.d.ts.map