export type CrowdfundingProjectStatus = 'recruiting' | 'in_progress' | 'completed' | 'cancelled';
export type ParticipationStatus = 'joined' | 'cancelled';
export interface CrowdfundingProject {
    id: string;
    title: string;
    description: string;
    targetParticipantCount: number;
    currentParticipantCount: number;
    startDate: string;
    endDate: string;
    status: CrowdfundingProjectStatus;
    creatorId: string;
    creatorName?: string;
    forumLink?: string;
    createdAt: string;
    updatedAt: string;
}
export interface CrowdfundingProjectFormData {
    title: string;
    description: string;
    targetParticipantCount: number;
    startDate: string;
    endDate: string;
    forumLink?: string;
}
export interface CrowdfundingParticipation {
    id: string;
    projectId: string;
    vendorId: string;
    vendorName?: string;
    status: ParticipationStatus;
    joinedAt: string;
    cancelledAt?: string;
}
export interface CrowdfundingProjectDetail extends CrowdfundingProject {
    participants: CrowdfundingParticipation[];
    participationStatus?: ParticipationStatus;
}
export interface ParticipationRequest {
    projectId: string;
}
export interface ParticipationResponse {
    success: boolean;
    message: string;
    participation?: CrowdfundingParticipation;
}
export interface CrowdfundingProjectStats {
    projectId: string;
    participationRate: number;
    remainingDays: number;
    isActive: boolean;
    isSuccessful: boolean;
}
export interface CrowdfundingProjectsResponse {
    success: boolean;
    data: CrowdfundingProject[];
    total?: number;
    page?: number;
    limit?: number;
}
export interface CrowdfundingProjectDetailResponse {
    success: boolean;
    data: CrowdfundingProjectDetail;
}
export interface CrowdfundingProjectsQuery {
    status?: CrowdfundingProjectStatus;
    creatorId?: string;
    search?: string;
    page?: number;
    limit?: number;
}
export interface CrowdfundingDashboardStats {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalParticipants: number;
    successRate: number;
}
//# sourceMappingURL=crowdfunding.d.ts.map