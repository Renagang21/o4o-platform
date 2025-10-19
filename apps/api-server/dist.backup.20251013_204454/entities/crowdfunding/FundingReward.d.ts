import { FundingProject } from './FundingProject';
import { BackerReward } from './BackerReward';
export declare class FundingReward {
    id: string;
    projectId: string;
    project: FundingProject;
    title: string;
    description: string;
    price: number;
    earlyBirdPrice: number;
    earlyBirdLimit: number;
    totalQuantity: number;
    remainingQuantity: number;
    estimatedDeliveryDate: Date;
    shippingRequired: boolean;
    shippingRegions: any[];
    images: string[];
    includesItems: any[];
    options: any[];
    isActive: boolean;
    isHidden: boolean;
    maxPerBacker: number;
    minimumBackers: number;
    sortOrder: number;
    backerRewards: BackerReward[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=FundingReward.d.ts.map