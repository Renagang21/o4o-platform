import { User } from './User';
import { ReferralRelationship } from './ReferralRelationship';
import { AffiliateCommission } from './AffiliateCommission';
export declare class AffiliateUser {
    id: string;
    userId: string;
    user: User;
    affiliateCode: string;
    status: string;
    joinedAt: Date;
    totalClicks: number;
    totalSignups: number;
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
    paidCommission: number;
    pendingCommission: number;
    commissionRate: number;
    paymentMethod: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    createdAt: Date;
    updatedAt: Date;
    referrals: ReferralRelationship[];
    commissions: AffiliateCommission[];
}
//# sourceMappingURL=AffiliateUser.d.ts.map