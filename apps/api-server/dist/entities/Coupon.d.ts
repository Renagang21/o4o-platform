export declare enum CouponDiscountType {
    PERCENT = "percent",
    PERCENTAGE = "percentage",
    FIXED_CART = "fixed_cart",
    FIXED_PRODUCT = "fixed_product"
}
export declare enum CouponStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    EXPIRED = "expired"
}
export declare class Coupon {
    id: string;
    code: string;
    description?: string;
    discountType: CouponDiscountType;
    discountValue: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    validFrom?: Date;
    validUntil?: Date;
    usageLimitPerCoupon: number;
    usageLimitPerCustomer: number;
    usedCount: number;
    status: CouponStatus;
    productIds?: string[];
    categoryIds?: string[];
    excludeProductIds?: string[];
    customerIds?: string[];
    customerGroups?: string[];
    freeShipping: boolean;
    excludeSaleItems: boolean;
    individualUseOnly: boolean;
    createdAt: Date;
    updatedAt: Date;
    usages?: CouponUsage[];
    get isActive(): boolean;
    get usageLimit(): number;
    get usageCount(): number;
    get minimumAmount(): number;
    get maximumDiscount(): number;
    isValid(): boolean;
    canBeUsedByCustomer(customerId: string, usageCount?: number): boolean;
    calculateDiscount(subtotal: number, productTotal?: number): number;
}
export declare class CouponUsage {
    id: string;
    couponId: string;
    customerId: string;
    orderId?: string;
    discountAmount: number;
    usedAt: Date;
    customerEmail?: string;
    customerName?: string;
    coupon?: Coupon;
}
//# sourceMappingURL=Coupon.d.ts.map