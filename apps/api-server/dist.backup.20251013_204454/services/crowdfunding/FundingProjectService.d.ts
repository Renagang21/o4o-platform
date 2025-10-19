import { FundingProject } from '../../entities/crowdfunding/FundingProject';
import type { FundingProjectFormData, ProjectFilters, FundingStatus } from '../../types/crowdfunding-types';
export declare class FundingProjectService {
    private projectRepository;
    private rewardRepository;
    private userRepository;
    constructor();
    createProject(data: FundingProjectFormData, creatorId: string): Promise<FundingProject>;
    updateProject(projectId: string, data: Partial<FundingProjectFormData>, userId: string): Promise<FundingProject>;
    getProject(projectId: string): Promise<FundingProject | null>;
    getProjects(filters: ProjectFilters): Promise<{
        projects: FundingProject[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    updateProjectStatus(projectId: string, status: FundingStatus): Promise<void>;
    updateProjectStats(projectId: string, stats: Partial<{
        currentAmount: number;
        backerCount: number;
    }>): Promise<void>;
    checkAndUpdateExpiredProjects(): Promise<void>;
}
//# sourceMappingURL=FundingProjectService.d.ts.map