import { DataSource } from 'typeorm';
import { CrowdfundingProject } from '../entities/CrowdfundingProject';
import { CrowdfundingParticipation } from '../entities/CrowdfundingParticipation';
export declare class CrowdfundingRepository {
    private projectRepository;
    private participationRepository;
    private userRepository;
    constructor(dataSource: DataSource);
    createProject(projectData: Partial<CrowdfundingProject>): Promise<CrowdfundingProject>;
    getProjects(options?: {
        status?: string;
        creatorId?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        projects: CrowdfundingProject[];
        total: number;
    }>;
    getProjectById(id: string, userId?: string): Promise<CrowdfundingProject | null>;
    updateProject(id: string, updateData: Partial<CrowdfundingProject>): Promise<CrowdfundingProject | null>;
    deleteProject(id: string): Promise<boolean>;
    joinProject(projectId: string, vendorId: string): Promise<CrowdfundingParticipation>;
    cancelParticipation(projectId: string, vendorId: string): Promise<CrowdfundingParticipation | null>;
    getParticipationStatus(projectId: string, vendorId: string): Promise<CrowdfundingParticipation | null>;
    private updateParticipantCount;
    getDashboardStats(): Promise<{
        totalProjects: number;
        activeProjects: number;
        completedProjects: number;
        totalParticipants: number;
        successRate: number;
    }>;
}
//# sourceMappingURL=CrowdfundingRepository.d.ts.map