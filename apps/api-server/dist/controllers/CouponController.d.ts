import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth';
export declare class CouponController {
    private couponService;
    constructor();
    /**
     * Get all coupons (Admin)
     */
    getAllCoupons: (req: Request, res: Response) => Promise<void>;
    /**
     * Get single coupon (Admin)
     */
    getCoupon: (req: Request, res: Response) => Promise<void>;
    /**
     * Create coupon (Admin)
     */
    createCoupon: (req: Request, res: Response) => Promise<void>;
    /**
     * Update coupon (Admin)
     */
    updateCoupon: (req: Request, res: Response) => Promise<void>;
    /**
     * Delete coupon (Admin)
     */
    deleteCoupon: (req: Request, res: Response) => Promise<void>;
    /**
     * Validate coupon for customer
     */
    validateCoupon: (req: AuthRequest, res: Response) => Promise<void>;
    /**
     * Get customer's available coupons
     */
    getCustomerCoupons: (req: AuthRequest, res: Response) => Promise<void>;
    /**
     * Get coupon usage history (Admin)
     */
    getCouponUsageHistory: (req: Request, res: Response) => Promise<void>;
    /**
     * Bulk generate coupons (Admin)
     */
    bulkGenerateCoupons: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=CouponController.d.ts.map