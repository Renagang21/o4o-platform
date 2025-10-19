import { User } from './User';
import { BusinessInfo } from './BusinessInfo';
export declare enum SellerStatus {
    PENDING = "pending",
    APPROVED = "approved",
    SUSPENDED = "suspended",
    REJECTED = "rejected"
}
export declare enum SellerTier {
    BRONZE = "bronze",// 신규 판매자
    SILVER = "silver",// 일반 판매자
    GOLD = "gold",// 우수 판매자
    PLATINUM = "platinum"
}
export interface SellerMetrics {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    conversionRate: number;
    customerSatisfaction: number;
    returnRate: number;
    responseTime: number;
}
export interface SellerPolicy {
    returnPolicy?: string;
    shippingPolicy?: string;
    customerService?: string;
    termsOfService?: string;
}
export interface SellerBranding {
    storeName: string;
    storeDescription?: string;
    logo?: string;
    banner?: string;
    colors?: {
        primary?: string;
        secondary?: string;
    };
}
export declare class Seller {
    id: string;
    userId: string;
    user: User;
    businessInfo: BusinessInfo;
    status: SellerStatus;
    tier: SellerTier;
    isActive: boolean;
    branding: SellerBranding;
    storeSlug: string;
    policies?: SellerPolicy;
    metrics?: SellerMetrics;
    averageRating: number;
    totalReviews: number;
    totalRevenue: number;
    monthlyRevenue: number;
    platformCommissionRate: number;
    productCount: number;
    activeProductCount: number;
    responseTime?: number;
    customerSatisfactionRate: number;
    operatingHours?: string[];
    timezone?: string;
    shippingMethods?: string[];
    paymentMethods?: string[];
    featuredSeller: boolean;
    featuredUntil?: Date;
    specialOffers?: string[];
    socialMedia?: {
        website?: string;
        facebook?: string;
        instagram?: string;
        twitter?: string;
        youtube?: string;
    };
    marketingDescription?: string;
    allowPartners: boolean;
    partnerInviteMessage?: string;
    partnerRequirements?: string[];
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    approvedAt?: Date;
    approvedBy?: string;
    lastActiveAt?: Date;
    isApproved(): boolean;
    canSellProducts(): boolean;
    getSupplierDiscountEligibility(): number;
    getMaxProducts(): number;
    getPlatformCommissionRate(): number;
    checkTierUpgradeEligibility(): SellerTier | null;
    updateMetrics(metrics: Partial<SellerMetrics>): void;
    updateRating(newRating: number): void;
    addRevenue(amount: number): void;
    incrementProductCount(): void;
    decrementProductCount(isActive?: boolean): void;
    approve(approvedBy: string): void;
    suspend(): void;
    reject(): void;
    reactivate(): void;
    upgradeTier(newTier: SellerTier): void;
    getStoreUrl(): string;
    updateLastActive(): void;
}
//# sourceMappingURL=Seller.d.ts.map