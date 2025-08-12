import { Coupon, CouponUsage, CouponStatus } from '../entities/Coupon';
import { Repository } from 'typeorm';
export interface CouponValidationResult {
    valid: boolean;
    message?: string;
    discount?: number;
}
export interface ApplyCouponRequest {
    code: string;
    customerId: string;
    subtotal: number;
    productIds?: string[];
    categoryIds?: string[];
}
export declare class CouponService {
    couponRepository: Repository<Coupon>;
    usageRepository: Repository<CouponUsage>;
    constructor();
    /**
     * Create a new coupon
     */
    createCoupon(data: Partial<Coupon>): Promise<Coupon>;
    /**
     * Get coupon by code
     */
    getCouponByCode(code: string): Promise<Coupon | null>;
    /**
     * Get all coupons with filters
     */
    getCoupons(filters?: {
        status?: CouponStatus;
        active?: boolean;
        page?: number;
        limit?: number;
    }): Promise<{
        coupons: Coupon[];
        total: number;
    }>;
    /**
     * Update a coupon
     */
    updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon>;
    /**
     * Delete a coupon
     */
    deleteCoupon(id: string): Promise<void>;
    /**
     * Validate coupon for customer
     */
    validateCoupon(request: ApplyCouponRequest): Promise<CouponValidationResult>;
    /**
     * Apply coupon to order
     */
    applyCoupon(couponCode: string, customerId: string, orderId: string, subtotal: number, customerEmail?: string, customerName?: string): Promise<CouponUsage>;
    /**
     * Get customer usage count for a coupon
     */
    getCustomerUsageCount(couponId: string, customerId: string): Promise<number>;
    /**
     * Get coupon usage history
     */
    getCouponUsageHistory(couponId: string): Promise<CouponUsage[]>;
    /**
     * Get customer's available coupons
     */
    getCustomerAvailableCoupons(customerId: string): Promise<Coupon[]>;
    /**
     * Generate unique coupon code
     */
    generateCouponCode(prefix?: string, length?: number): string;
    /**
     * Bulk generate coupons
     */
    bulkGenerateCoupons(template: Partial<Coupon>, count: number, prefix?: string): Promise<Coupon[]>;
}
//# sourceMappingURL=CouponService.d.ts.map