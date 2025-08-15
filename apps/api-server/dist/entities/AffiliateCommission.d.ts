import { AffiliateUser } from './AffiliateUser';
import { Order } from './Order';
export declare class AffiliateCommission {
    id: string;
    affiliateUserId: string;
    affiliateUser: AffiliateUser;
    orderId: string;
    order: Order;
    orderAmount: number;
    commissionRate: number;
    commissionAmount: number;
    status: string;
    approvedAt: Date;
    approvedBy: string;
    paidAt: Date;
    paymentMethod: string;
    paymentReference: string;
    cancelledAt: Date;
    cancelledReason: string;
    adjustmentAmount: number;
    adjustmentReason: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=AffiliateCommission.d.ts.map