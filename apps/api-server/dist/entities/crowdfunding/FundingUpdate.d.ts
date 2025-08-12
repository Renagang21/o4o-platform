import { FundingProject } from './FundingProject';
export declare class FundingUpdate {
    id: string;
    projectId: string;
    project: FundingProject;
    title: string;
    content: string;
    isPublic: boolean;
    author: string;
    stage?: 'idea' | 'prototype' | 'production' | 'shipping';
    progressPercentage?: number;
    images?: string[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=FundingUpdate.d.ts.map