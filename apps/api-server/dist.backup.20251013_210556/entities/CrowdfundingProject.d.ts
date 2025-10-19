import { User } from './User';
import { CrowdfundingParticipation } from './CrowdfundingParticipation';
export type CrowdfundingProjectStatus = 'recruiting' | 'in_progress' | 'completed' | 'cancelled';
export declare class CrowdfundingProject {
    id: string;
    title: string;
    description: string;
    targetParticipantCount: number;
    currentParticipantCount: number;
    startDate: string;
    endDate: string;
    status: CrowdfundingProjectStatus;
    creatorId: string;
    creator: User;
    forumLink?: string;
    participations: CrowdfundingParticipation[];
    createdAt: Date;
    updatedAt: Date;
    get participationRate(): number;
    get remainingDays(): number;
    get isActive(): boolean;
    get isSuccessful(): boolean;
}
//# sourceMappingURL=CrowdfundingProject.d.ts.map