/**
 * 제휴 마케팅 (추천인) 시스템 타입 정의
 * 단계: 1단계 추천만 허용 (다단계 금지)
 */
export interface AffiliateUser {
    id: string;
    userId: string;
    referralCode: string;
    status: 'active' | 'inactive' | 'suspended';
    joinedAt: Date;
    totalClicks: number;
    totalSignups: number;
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
    paidCommission: number;
    pendingCommission: number;
    commissionRate?: number;
    paymentMethod?: 'bank' | 'point';
    bankAccount?: BankAccount;
    createdAt: Date;
    updatedAt: Date;
}
export interface BankAccount {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
}
export interface ReferralRelationship {
    id: string;
    referrerId: string;
    referredId: string;
    referralCode: string;
    signupDate: Date;
    firstOrderDate?: Date;
    status: 'pending' | 'confirmed' | 'expired';
    signupIp?: string;
    signupDevice?: string;
    signupSource?: string;
    createdAt: Date;
}
export interface ReferralClick {
    id: string;
    referralCode: string;
    affiliateUserId: string;
    clickedAt: Date;
    ip: string;
    userAgent: string;
    referer?: string;
    source?: 'kakao' | 'facebook' | 'band' | 'direct' | 'qr';
    productId?: string;
    landingPage?: string;
    converted: boolean;
    convertedUserId?: string;
    convertedAt?: Date;
}
export interface AffiliateCommission {
    id: string;
    affiliateUserId: string;
    orderId: string;
    orderAmount: number;
    commissionRate: number;
    commissionAmount: number;
    status: 'pending' | 'approved' | 'paid' | 'cancelled';
    approvedAt?: Date;
    approvedBy?: string;
    paidAt?: Date;
    paymentMethod?: 'bank' | 'point';
    paymentReference?: string;
    cancelledAt?: Date;
    cancelledReason?: string;
    adjustmentAmount?: number;
    adjustmentReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CommissionPolicy {
    id: string;
    name: string;
    description?: string;
    defaultRate: number;
    minCommission: number;
    maxCommission: number;
    categoryRates?: Record<string, number>;
    performanceBonus?: {
        threshold: number;
        bonusRate: number;
    }[];
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface AffiliateStats {
    period: 'today' | 'week' | 'month' | 'year' | 'all';
    clicks: number;
    uniqueVisitors: number;
    signups: number;
    orders: number;
    conversionRate: number;
    revenue: number;
    commission: number;
    avgOrderValue: number;
    activeAffiliates: number;
    newAffiliates: number;
    topAffiliates: {
        affiliateId: string;
        userName: string;
        revenue: number;
        commission: number;
    }[];
}
export interface CreateAffiliateRequest {
    userId: string;
    commissionRate?: number;
    paymentMethod?: 'bank' | 'point';
    bankAccount?: BankAccount;
}
export interface CreateAffiliateResponse {
    success: boolean;
    affiliate?: AffiliateUser;
    referralCode?: string;
    message?: string;
}
export interface GetAffiliateStatsRequest {
    affiliateId?: string;
    period: 'today' | 'week' | 'month' | 'year' | 'all';
    startDate?: string;
    endDate?: string;
}
export interface ProcessCommissionRequest {
    commissionIds: string[];
    action: 'approve' | 'pay' | 'cancel';
    paymentMethod?: 'bank' | 'point';
    reason?: string;
}
export interface GenerateReferralLinkRequest {
    affiliateId: string;
    productId?: string;
    source?: string;
    campaign?: string;
}
export interface GenerateReferralLinkResponse {
    longUrl: string;
    shortUrl?: string;
    qrCodeUrl?: string;
    referralCode: string;
}
export interface AdminAffiliateOverview {
    totalAffiliates: number;
    activeAffiliates: number;
    totalRevenue: number;
    totalCommission: number;
    pendingCommission: number;
    avgCommissionRate: number;
    revenueChart: {
        date: string;
        revenue: number;
        commission: number;
    }[];
    commissionStatus: {
        pending: number;
        approved: number;
        paid: number;
        cancelled: number;
    };
}
export interface UserAffiliateDashboard {
    referralCode: string;
    status: 'active' | 'inactive' | 'suspended';
    monthlyStats: {
        clicks: number;
        signups: number;
        orders: number;
        revenue: number;
        commission: number;
    };
    totalStats: {
        signups: number;
        revenue: number;
        paidCommission: number;
        pendingCommission: number;
    };
    recentActivities: {
        type: 'click' | 'signup' | 'order' | 'commission';
        description: string;
        amount?: number;
        timestamp: Date;
    }[];
    referralLinks: {
        type: 'main' | 'product';
        name: string;
        url: string;
        clicks: number;
    }[];
}
//# sourceMappingURL=affiliate.d.ts.map