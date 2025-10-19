import { FundingBacking } from '../../entities/crowdfunding/FundingBacking';
import type { PaymentMethod, BackingStatus } from '../../types/crowdfunding-types';
interface CreateBackingData {
    projectId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    rewards?: Array<{
        rewardId: string;
        quantity: number;
        selectedOptions?: any;
    }>;
    isAnonymous?: boolean;
    displayName?: string;
    backerMessage?: string;
    isMessagePublic?: boolean;
}
export declare class BackingService {
    private backingRepository;
    private projectRepository;
    private rewardRepository;
    private backerRewardRepository;
    private userRepository;
    private projectService;
    constructor();
    createBacking(data: CreateBackingData, backerId: string): Promise<FundingBacking>;
    updatePaymentStatus(backingId: string, paymentId: string, status: 'completed' | 'failed'): Promise<void>;
    cancelBacking(backingId: string, userId: string, reason?: string): Promise<void>;
    getUserBackings(userId: string, status?: BackingStatus): Promise<FundingBacking[]>;
    getProjectBackings(projectId: string, options?: {
        showAnonymous?: boolean;
        page?: number;
        limit?: number;
    }): Promise<{
        backings: FundingBacking[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
}
export {};
//# sourceMappingURL=BackingService.d.ts.map