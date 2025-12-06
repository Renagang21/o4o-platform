/**
 * CommissionPolicy Entity
 *
 * Manages commission calculation rules with priority-based conflict resolution.
 * Supports multiple policy types: default, tier-based, product-specific, category-based, promotional.
 */
export declare enum PolicyType {
    DEFAULT = "default",// Platform-wide default
    TIER_BASED = "tier_based",// Based on partner tier
    PRODUCT_SPECIFIC = "product_specific",// Specific product override
    CATEGORY = "category",// Product category-based
    PROMOTIONAL = "promotional",// Time-limited promotion
    PARTNER_SPECIFIC = "partner_specific"
}
export declare enum PolicyStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SCHEDULED = "scheduled",// Will become active in future
    EXPIRED = "expired"
}
export declare enum CommissionType {
    PERCENTAGE = "percentage",// X% of sale price
    FIXED = "fixed",// Fixed amount per sale
    TIERED = "tiered"
}
export declare class CommissionPolicy {
    id: string;
    policyCode: string;
    name: string;
    description?: string;
    policyType: PolicyType;
    status: PolicyStatus;
    priority: number;
    partnerId?: string;
    partnerTier?: string;
    productId?: string;
    supplierId?: string;
    category?: string;
    tags?: string[];
    commissionType: CommissionType;
    commissionRate?: number;
    commissionAmount?: number;
    tieredRates?: {
        minAmount: number;
        maxAmount?: number;
        rate?: number;
        amount?: number;
    }[];
    minCommission?: number;
    maxCommission?: number;
    validFrom?: Date;
    validUntil?: Date;
    minOrderAmount?: number;
    maxOrderAmount?: number;
    requiresNewCustomer: boolean;
    excludeDiscountedItems: boolean;
    maxUsagePerPartner?: number;
    maxUsageTotal?: number;
    currentUsageCount: number;
    canStackWithOtherPolicies: boolean;
    exclusiveWith?: string[];
    metadata?: Record<string, any>;
    requiresApproval: boolean;
    createdBy?: string;
    approvedBy?: string;
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    isActive(): boolean;
    calculateCommission(orderAmount: number, quantity?: number): number;
    appliesTo(context: {
        partnerId?: string;
        partnerTier?: string;
        productId?: string;
        supplierId?: string;
        category?: string;
        tags?: string[];
        orderAmount?: number;
        isNewCustomer?: boolean;
    }): boolean;
    incrementUsage(): void;
}
//# sourceMappingURL=CommissionPolicy.d.ts.map