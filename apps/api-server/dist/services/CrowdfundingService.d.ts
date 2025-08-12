/**
 * 크라우드펀딩 서비스
 * 제품 개발 중심의 간단한 펀딩 시스템
 * 펀딩 성공 시 일반 상품으로 자동 전환
 */
import { FundingProject } from '../entities/crowdfunding/FundingProject';
import { FundingBacking } from '../entities/crowdfunding/FundingBacking';
import { FundingReward } from '../entities/crowdfunding/FundingReward';
import { FundingUpdate } from '../entities/crowdfunding/FundingUpdate';
import { EventEmitter } from 'events';
import type { FundingStatus, FundingCategory, PaymentMethod } from '../types/crowdfunding-types';
interface CreateProjectData {
    title: string;
    description: string;
    shortDescription: string;
    category: FundingCategory;
    tags?: string[];
    targetAmount: number;
    startDate: Date;
    endDate: Date;
    estimatedDeliveryDate?: Date;
    story: string;
    risks?: string;
    mainImage?: string;
    images?: string[];
    videoUrl?: string;
    creatorDescription?: string;
}
interface CreateRewardData {
    title: string;
    description: string;
    price: number;
    earlyBirdPrice?: number;
    earlyBirdLimit?: number;
    totalQuantity?: number;
    estimatedDeliveryDate: Date;
    shippingRequired?: boolean;
    images?: string[];
    includesItems?: any[];
    maxPerBacker?: number;
    sortOrder?: number;
}
interface BackingData {
    projectId: string;
    backerId: string;
    amount: number;
    rewardIds?: string[];
    paymentMethod: PaymentMethod;
    isAnonymous?: boolean;
    displayName?: string;
    backerMessage?: string;
    isMessagePublic?: boolean;
}
interface ProjectUpdateData {
    title: string;
    content: string;
    stage?: 'idea' | 'prototype' | 'production' | 'shipping';
    progressPercentage?: number;
    images?: string[];
    isPublic?: boolean;
}
export declare class CrowdfundingService extends EventEmitter {
    private projectRepository;
    private backingRepository;
    private rewardRepository;
    private updateRepository;
    private backerRewardRepository;
    private productRepository;
    private userRepository;
    /**
     * 프로젝트 생성
     */
    createProject(creatorId: string, data: CreateProjectData): Promise<FundingProject>;
    /**
     * 리워드 생성
     */
    createReward(projectId: string, data: CreateRewardData): Promise<FundingReward>;
    /**
     * 프로젝트 승인
     */
    approveProject(projectId: string, adminId: string): Promise<FundingProject>;
    /**
     * 프로젝트 거절
     */
    rejectProject(projectId: string, adminId: string, reason: string): Promise<FundingProject>;
    /**
     * 후원하기
     */
    createBacking(data: BackingData): Promise<FundingBacking>;
    /**
     * 결제 확인
     */
    confirmPayment(backingId: string, paymentId: string): Promise<FundingBacking>;
    /**
     * 프로젝트 업데이트 작성
     */
    createProjectUpdate(projectId: string, creatorId: string, data: ProjectUpdateData): Promise<FundingUpdate>;
    /**
     * 펀딩 종료 처리
     */
    endFunding(projectId: string): Promise<FundingProject>;
    /**
     * 펀딩 성공 시 일반 상품으로 전환
     */
    private convertToProduct;
    /**
     * 환불 처리
     */
    private processRefunds;
    /**
     * 크리에이터 대시보드 데이터
     */
    getCreatorDashboard(creatorId: string): Promise<any>;
    /**
     * 후원자 대시보드 데이터
     */
    getBackerDashboard(backerId: string): Promise<any>;
    /**
     * 프로젝트 목록 조회
     */
    getProjects(filter?: {
        status?: FundingStatus;
        category?: FundingCategory;
        creatorId?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        projects: FundingProject[];
        total: number;
    }>;
    /**
     * 프로젝트 상세 조회
     */
    getProjectDetails(projectId: string): Promise<any>;
    /**
     * 슬러그 생성
     */
    private generateSlug;
    /**
     * 크론 작업: 프로젝트 상태 업데이트
     */
    updateProjectStatuses(): Promise<void>;
}
export declare const crowdfundingService: CrowdfundingService;
export {};
//# sourceMappingURL=CrowdfundingService.d.ts.map