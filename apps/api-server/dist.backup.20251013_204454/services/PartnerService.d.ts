import { Partner, PartnerStatus, PartnerTier } from '../entities/Partner';
import { PartnerCommission, CommissionStatus } from '../entities/PartnerCommission';
export interface CreatePartnerRequest {
    userId: string;
    businessName?: string;
    website?: string;
    socialMedia?: {
        instagram?: string;
        youtube?: string;
        blog?: string;
        tiktok?: string;
    };
    marketingChannels?: string[];
    expectedMonthlyTraffic?: number;
    targetAudience?: string;
    bio?: string;
    profileImage?: string;
}
export interface UpdatePartnerRequest extends Partial<CreatePartnerRequest> {
    status?: PartnerStatus;
    tier?: PartnerTier;
}
export interface PartnerFilters {
    status?: PartnerStatus;
    tier?: PartnerTier;
    isActive?: boolean;
    minCommissionEarned?: number;
    maxCommissionEarned?: number;
    registeredAfter?: Date;
    registeredBefore?: Date;
    search?: string;
    sortBy?: 'registeredAt' | 'totalCommissions' | 'activeCommissions' | 'businessName';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}
export interface CommissionFilters {
    partnerId?: string;
    status?: CommissionStatus;
    productId?: string;
    sellerId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    minAmount?: number;
    maxAmount?: number;
    referralCode?: string;
    sortBy?: 'createdAt' | 'commissionAmount' | 'orderAmount';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}
export interface ReferralLinkParams {
    partnerId: string;
    productId?: string;
    sellerId?: string;
    campaign?: string;
    source?: string;
    medium?: string;
    content?: string;
}
export declare class PartnerService {
    private partnerRepository;
    private commissionRepository;
    private userRepository;
    private productRepository;
    private sellerRepository;
    constructor();
    applyAsPartner(data: CreatePartnerRequest): Promise<Partner>;
    approvePartner(partnerId: string, approved: boolean, adminNotes?: string): Promise<Partner>;
    getPartner(id: string): Promise<Partner | null>;
    getPartners(filters?: PartnerFilters): Promise<{
        partners: Partner[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    updatePartner(id: string, data: UpdatePartnerRequest): Promise<Partner>;
    generateReferralLink(params: ReferralLinkParams): Promise<string>;
    trackClick(referralCode: string, trackingData: any): Promise<void>;
    getCommissions(filters?: CommissionFilters): Promise<{
        commissions: PartnerCommission[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getPartnerStats(partnerId: string, period?: 'week' | 'month' | 'quarter' | 'year'): Promise<{
        totalCommissions: number;
        pendingCommissions: number;
        confirmedCommissions: number;
        paidCommissions: number;
        totalEarnings: number;
        pendingEarnings: number;
        confirmedEarnings: number;
        paidEarnings: number;
        averageCommission: number;
        uniqueSellers: number;
        uniqueProducts: number;
        totalClicks: number;
        conversionRate: number;
        period: string;
        dateFrom: Date;
        dateTo: Date;
    }>;
    updatePartnerTiers(): Promise<void>;
    getOverallStats(): Promise<{
        partners: {
            total: number;
            active: number;
            pending: number;
            bronze: number;
            silver: number;
            gold: number;
            platinum: number;
        };
        commissions: {
            total: number;
            totalAmount: number;
            average: number;
            pending: number;
            confirmed: number;
            paid: number;
        };
    }>;
    private generateUniqueReferralCode;
    private generateReferralCode;
}
export default PartnerService;
//# sourceMappingURL=PartnerService.d.ts.map