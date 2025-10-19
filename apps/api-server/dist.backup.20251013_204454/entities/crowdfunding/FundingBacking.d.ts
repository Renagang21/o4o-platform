import { User } from '../User';
import { FundingProject } from './FundingProject';
import { BackerReward } from './BackerReward';
import type { PaymentMethod, PaymentStatus, BackingStatus } from '../../types/crowdfunding-types';
export declare class FundingBacking {
    id: string;
    projectId: string;
    project: FundingProject;
    backerId: string;
    backer: User;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    paymentId: string;
    paidAt: Date;
    status: BackingStatus;
    isAnonymous: boolean;
    displayName: string;
    backerMessage: string;
    isMessagePublic: boolean;
    cancelledAt: Date;
    cancellationReason: string;
    refundedAt: Date;
    refundAmount: number;
    rewards: BackerReward[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=FundingBacking.d.ts.map