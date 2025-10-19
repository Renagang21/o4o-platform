import { User } from './User';
import { CrowdfundingProject } from './CrowdfundingProject';
export type ParticipationStatus = 'joined' | 'cancelled';
export declare class CrowdfundingParticipation {
    id: string;
    projectId: string;
    project: CrowdfundingProject;
    vendorId: string;
    vendor: User;
    status: ParticipationStatus;
    joinedAt: Date;
    cancelledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=CrowdfundingParticipation.d.ts.map