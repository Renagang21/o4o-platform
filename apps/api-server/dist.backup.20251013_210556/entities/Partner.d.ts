import { User } from './User';
import { Seller } from './Seller';
export declare enum PartnerStatus {
    PENDING = "pending",
    ACTIVE = "active",
    SUSPENDED = "suspended",
    REJECTED = "rejected"
}
export declare enum PartnerTier {
    BRONZE = "bronze",
    SILVER = "silver",
    GOLD = "gold",
    PLATINUM = "platinum"
}
export interface PartnerMetrics {
    totalClicks: number;
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
    conversionRate: number;
    averageOrderValue: number;
    clicksThisMonth: number;
    ordersThisMonth: number;
    revenueThisMonth: number;
    commissionThisMonth: number;
}
export interface PartnerProfile {
    bio?: string;
    website?: string;
    socialMedia?: {
        youtube?: string;
        instagram?: string;
        facebook?: string;
        twitter?: string;
        tiktok?: string;
        blog?: string;
    };
    audience?: {
        size?: number;
        demographics?: string;
        interests?: string[];
    };
    marketingChannels?: string[];
}
export interface PayoutInfo {
    method: 'bank' | 'paypal' | 'crypto';
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    paypalEmail?: string;
    cryptoAddress?: string;
    currency: string;
}
export declare class Partner {
    id: string;
    userId: string;
    user: User;
    sellerId: string;
    seller: Seller;
    status: PartnerStatus;
    tier: PartnerTier;
    isActive: boolean;
    referralCode: string;
    referralLink: string;
    profile?: PartnerProfile;
    metrics?: PartnerMetrics;
    totalEarnings: number;
    availableBalance: number;
    pendingBalance: number;
    paidOut: number;
    payoutInfo?: PayoutInfo;
    minimumPayout: number;
    totalClicks: number;
    totalOrders: number;
    conversionRate: number;
    averageOrderValue: number;
    monthlyClicks: number;
    monthlyOrders: number;
    monthlyEarnings: number;
    applicationMessage?: string;
    rejectionReason?: string;
    allowedPromotionTypes?: string[];
    canUseProductImages: boolean;
    canCreateCoupons: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
    preferredLanguage?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    approvedAt?: Date;
    approvedBy?: string;
    lastActiveAt?: Date;
    lastPayoutAt?: Date;
    isApproved(): boolean;
    canPromote(): boolean;
    generateReferralLink(productId?: string, sellerId?: string): string;
    getCommissionBonus(): number;
    getPayoutFrequency(): string;
    checkTierUpgradeEligibility(): PartnerTier | null;
    recordClick(): void;
    recordOrder(orderValue: number, commission: number): void;
    private updateConversionRate;
    updateMetrics(metrics: Partial<PartnerMetrics>): void;
    processPayout(amount: number): boolean;
    confirmPendingBalance(): void;
    resetMonthlyMetrics(): void;
    approve(approvedBy: string): void;
    suspend(): void;
    reject(reason: string): void;
    reactivate(): void;
    upgradeTier(newTier: PartnerTier): void;
    updateLastActive(): void;
}
//# sourceMappingURL=Partner.d.ts.map