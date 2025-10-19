import { FundingBacking } from './FundingBacking';
import { FundingReward } from './FundingReward';
export declare class BackerReward {
    id: string;
    backingId: string;
    backing: FundingBacking;
    rewardId: string;
    reward: FundingReward;
    quantity: number;
    selectedOptions: any;
    shippingAddress: any;
    shippingRegion: string;
    totalPrice?: number;
    status: string;
    trackingNumber: string;
    shippedAt: Date;
    deliveredAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=BackerReward.d.ts.map