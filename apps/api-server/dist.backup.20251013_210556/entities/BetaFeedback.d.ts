import { BetaUser } from './BetaUser';
import { User } from './User';
import { FeedbackConversation } from './FeedbackConversation';
export declare enum FeedbackType {
    BUG_REPORT = "bug_report",// 버그 신고
    FEATURE_REQUEST = "feature_request",// 기능 요청
    GENERAL_FEEDBACK = "general_feedback",// 일반 피드백
    USABILITY = "usability",// 사용성 피드백
    PERFORMANCE = "performance",// 성능 피드백
    SUGGESTION = "suggestion",// 제안사항
    COMPLAINT = "complaint"
}
export declare enum FeedbackStatus {
    PENDING = "pending",// 대기 중
    REVIEWED = "reviewed",// 검토됨
    IN_PROGRESS = "in_progress",// 진행 중
    RESOLVED = "resolved",// 해결됨
    REJECTED = "rejected",// 거절됨
    ARCHIVED = "archived"
}
export declare enum FeedbackPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum SignageFeature {
    CONTENT_MANAGEMENT = "content_management",
    PLAYLIST_MANAGEMENT = "playlist_management",
    SCHEDULING = "scheduling",
    TEMPLATES = "templates",
    ANALYTICS = "analytics",
    STORE_MANAGEMENT = "store_management",
    USER_INTERFACE = "user_interface",
    MOBILE_APP = "mobile_app",
    API = "api",
    INTEGRATION = "integration"
}
export declare class BetaFeedback {
    id: string;
    type: FeedbackType;
    title: string;
    description: string;
    reproductionSteps?: string;
    expectedBehavior?: string;
    actualBehavior?: string;
    feature?: SignageFeature;
    status: FeedbackStatus;
    priority: FeedbackPriority;
    betaUserId: string;
    contactEmail?: string;
    browserInfo?: string;
    deviceType?: string;
    screenResolution?: string;
    currentUrl?: string;
    appVersion?: string;
    attachments?: string[];
    screenshots?: string[];
    adminResponse?: string;
    assignedTo?: string;
    responseAt?: Date;
    respondedBy?: string;
    resolvedAt?: Date;
    resolvedBy?: string;
    rating?: number;
    additionalComments?: string;
    tags?: string[];
    internalNotes?: string;
    metadata?: {
        relatedFeedbackIds?: string[];
        duplicateOf?: string;
        estimatedEffort?: number;
        businessImpact?: string;
        [key: string]: string | number | string[] | undefined;
    };
    hasActiveConversation: boolean;
    needsImmediateAttention: boolean;
    lastViewedAt?: Date;
    lastViewedBy?: string;
    viewCount: number;
    lastNotificationSent?: Date;
    isLive: boolean;
    createdAt: Date;
    updatedAt: Date;
    betaUser?: BetaUser;
    assignee?: User;
    responder?: User;
    resolver?: User;
    conversations: FeedbackConversation[];
    canBeResponded(): boolean;
    canBeResolved(): boolean;
    assignTo(userId: string): void;
    respond(response: string, respondedBy: string): void;
    markInProgress(): void;
    resolve(resolvedBy: string): void;
    reject(rejectedBy: string, reason?: string): void;
    archive(): void;
    addTag(tag: string): void;
    removeTag(tag: string): void;
    getDaysOpen(): number;
    getBusinessImpactScore(): number;
    markAsViewed(viewedBy: string): void;
    startLiveSupport(): void;
    endLiveSupport(): void;
    updateNotificationSent(): void;
    needsAttention(): boolean;
    getMinutesSinceLastView(): number;
    shouldNotify(): boolean;
}
//# sourceMappingURL=BetaFeedback.d.ts.map