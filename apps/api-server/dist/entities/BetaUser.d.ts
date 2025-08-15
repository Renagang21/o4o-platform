import { BetaFeedback } from './BetaFeedback';
import { FeedbackConversation } from './FeedbackConversation';
export declare enum BetaUserStatus {
    PENDING = "pending",// 등록 대기
    APPROVED = "approved",// 승인됨
    ACTIVE = "active",// 활성 사용자
    INACTIVE = "inactive",// 비활성 사용자
    SUSPENDED = "suspended"
}
export declare enum BetaUserType {
    INDIVIDUAL = "individual",// 개인 사용자
    BUSINESS = "business",// 비즈니스 사용자
    DEVELOPER = "developer",// 개발자
    PARTNER = "partner"
}
export declare enum InterestArea {
    RETAIL = "retail",// 소매업
    HEALTHCARE = "healthcare",// 헬스케어
    FOOD_SERVICE = "food_service",// 음식점
    CORPORATE = "corporate",// 기업
    EDUCATION = "education",// 교육
    GOVERNMENT = "government",// 정부/공공기관
    OTHER = "other"
}
export declare class BetaUser {
    id: string;
    email: string;
    name: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    status: BetaUserStatus;
    type: BetaUserType;
    interestArea: InterestArea;
    useCase?: string;
    expectations?: string;
    interestedFeatures?: string[];
    approvedAt?: Date;
    approvedBy?: string;
    approvalNotes?: string;
    lastActiveAt?: Date;
    feedbackCount: number;
    loginCount: number;
    firstLoginAt?: Date;
    lastLoginAt?: Date;
    metadata?: {
        referralSource?: string;
        browserInfo?: string;
        ipAddress?: string;
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        [key: string]: string | undefined;
    };
    createdAt: Date;
    updatedAt: Date;
    feedback?: BetaFeedback[];
    conversations?: FeedbackConversation[];
    canProvideFeedback(): boolean;
    approve(approvedBy: string, notes?: string): void;
    activate(): void;
    updateActivity(): void;
    recordLogin(): void;
    incrementFeedbackCount(): void;
    getEngagementLevel(): 'low' | 'medium' | 'high';
    getDaysSinceRegistration(): number;
    getDaysSinceLastActive(): number;
}
//# sourceMappingURL=BetaUser.d.ts.map