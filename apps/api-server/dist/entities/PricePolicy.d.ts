import { Product } from './Product';
import { User } from './User';
export declare enum PricePolicyType {
    ROLE_BASED = "role_based",// 역할별 가격
    VOLUME_DISCOUNT = "volume_discount",// 수량 할인
    SEASONAL = "seasonal",// 시즌 할인
    PROMOTION = "promotion",// 프로모션 할인
    CUSTOMER_SPECIFIC = "customer_specific",// 고객별 특가
    REGION_BASED = "region_based"
}
export declare enum DiscountType {
    PERCENTAGE = "percentage",// 퍼센트 할인
    FIXED_AMOUNT = "fixed_amount",// 고정 금액 할인
    FIXED_PRICE = "fixed_price"
}
export declare enum UserRole {
    CUSTOMER = "customer",
    BUSINESS = "business",
    AFFILIATE = "affiliate",
    VIP = "vip",
    WHOLESALE = "wholesale",
    DISTRIBUTOR = "distributor"
}
export declare class PricePolicy {
    id: string;
    name: string;
    description?: string;
    type: PricePolicyType;
    productId?: string;
    product?: Product;
    productCategories?: string[];
    productTags?: string[];
    targetRole?: UserRole;
    targetUserId?: string;
    targetUser?: User;
    minQuantity?: number;
    maxQuantity?: number;
    minOrderAmount?: number;
    maxOrderAmount?: number;
    discountType: DiscountType;
    discountValue: number;
    maxDiscountAmount?: number;
    minFinalPrice?: number;
    startDate?: Date;
    endDate?: Date;
    activeDays?: number[];
    startTime?: string;
    endTime?: string;
    targetRegions?: string[];
    targetCities?: string[];
    priority: number;
    isActive: boolean;
    isExclusive: boolean;
    maxUsageCount?: number;
    maxUsagePerUser?: number;
    currentUsageCount: number;
    createdBy: string;
    creator: User;
    metadata?: {
        campaignId?: string;
        source?: string;
        adminNotes?: string;
    };
    createdAt: Date;
    updatedAt: Date;
    isValid(date?: Date): boolean;
    canApplyToUser(userRole: string, userId?: string): boolean;
    canApplyToProduct(productId: string, categories?: string[], tags?: string[]): boolean;
    canApplyToQuantity(quantity: number): boolean;
    canApplyToOrderAmount(orderAmount: number): boolean;
    calculateDiscountedPrice(originalPrice: number, quantity?: number): number;
    getDiscountAmount(originalPrice: number, quantity?: number): number;
    incrementUsage(): void;
}
//# sourceMappingURL=PricePolicy.d.ts.map