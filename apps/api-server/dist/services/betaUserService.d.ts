import { BetaUser, BetaUserStatus, BetaUserType, InterestArea } from '../entities/BetaUser';
import { BetaFeedback, FeedbackType, FeedbackStatus, FeedbackPriority, SignageFeature } from '../entities/BetaFeedback';
export interface BetaUserRegistrationData {
    email: string;
    name: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    type: BetaUserType;
    interestArea: InterestArea;
    useCase?: string;
    expectations?: string;
    interestedFeatures?: string[];
    referralSource?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
}
export interface BetaFeedbackData {
    type: FeedbackType;
    title: string;
    description: string;
    reproductionSteps?: string;
    expectedBehavior?: string;
    actualBehavior?: string;
    feature?: SignageFeature;
    priority?: FeedbackPriority;
    contactEmail?: string;
    browserInfo?: string;
    deviceType?: string;
    screenResolution?: string;
    currentUrl?: string;
    rating?: number;
    additionalComments?: string;
    attachments?: string[];
    screenshots?: string[];
}
export interface BetaUserSearchOptions {
    query?: string;
    status?: BetaUserStatus;
    type?: BetaUserType;
    interestArea?: InterestArea;
    page?: number;
    limit?: number;
    sortBy?: 'latest' | 'name' | 'email' | 'lastActive' | 'feedbackCount';
    sortOrder?: 'ASC' | 'DESC';
    dateFrom?: Date;
    dateTo?: Date;
}
export interface BetaFeedbackSearchOptions {
    query?: string;
    type?: FeedbackType;
    status?: FeedbackStatus;
    priority?: FeedbackPriority;
    feature?: SignageFeature;
    betaUserId?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
    sortBy?: 'latest' | 'priority' | 'status' | 'type';
    sortOrder?: 'ASC' | 'DESC';
    dateFrom?: Date;
    dateTo?: Date;
}
export interface BetaAnalytics {
    userStats: {
        total: number;
        byStatus: Record<BetaUserStatus, number>;
        byType: Record<BetaUserType, number>;
        byInterestArea: Record<InterestArea, number>;
        newUsersThisWeek: number;
        activeUsersThisWeek: number;
        avgFeedbackPerUser: number;
    };
    feedbackStats: {
        total: number;
        byType: Record<FeedbackType, number>;
        byStatus: Record<FeedbackStatus, number>;
        byPriority: Record<FeedbackPriority, number>;
        byFeature: Record<SignageFeature, number>;
        newFeedbackThisWeek: number;
        avgResolutionTime: number;
        satisfactionRating: number;
    };
    engagementStats: {
        topContributors: Array<{
            betaUser: BetaUser;
            feedbackCount: number;
            lastActiveAt: Date;
        }>;
        popularFeatures: Array<{
            feature: SignageFeature;
            feedbackCount: number;
        }>;
        recentActivity: Array<{
            type: 'registration' | 'feedback' | 'login';
            betaUser: BetaUser;
            details: {
                feedbackTitle?: string;
                feedbackType?: FeedbackType;
                ipAddress?: string;
                userAgent?: string;
            };
            timestamp: Date;
        }>;
    };
}
export declare class BetaUserService {
    private betaUserRepository;
    private betaFeedbackRepository;
    private userRepository;
    constructor();
    registerBetaUser(data: BetaUserRegistrationData, metadata?: {
        browserInfo?: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<BetaUser>;
    getBetaUsers(options?: BetaUserSearchOptions): Promise<{
        users: BetaUser[];
        total: number;
        page: number;
        limit: number;
    }>;
    getBetaUserById(id: string): Promise<BetaUser | null>;
    approveBetaUser(id: string, approvedBy: string, notes?: string): Promise<BetaUser>;
    updateBetaUserStatus(id: string, status: BetaUserStatus): Promise<BetaUser>;
    recordBetaUserLogin(email: string): Promise<BetaUser | null>;
    submitFeedback(betaUserId: string, data: BetaFeedbackData): Promise<BetaFeedback>;
    getFeedback(options?: BetaFeedbackSearchOptions): Promise<{
        feedback: BetaFeedback[];
        total: number;
        page: number;
        limit: number;
    }>;
    getFeedbackById(id: string): Promise<BetaFeedback | null>;
    getBetaAnalytics(): Promise<BetaAnalytics>;
    private formatCountArray;
    getBetaUserByEmail(email: string): Promise<BetaUser | null>;
    getHighPriorityFeedback(): Promise<BetaFeedback[]>;
    getUnassignedFeedback(): Promise<BetaFeedback[]>;
    private notifyFeedbackUpdate;
    respondToFeedback(feedbackId: string, response: string, respondedBy: string): Promise<BetaFeedback>;
    updateFeedbackStatus(feedbackId: string, status: FeedbackStatus, updatedBy: string): Promise<BetaFeedback>;
    assignFeedback(feedbackId: string, assignedTo: string): Promise<BetaFeedback>;
    updateFeedbackPriority(feedbackId: string, priority: FeedbackPriority): Promise<BetaFeedback>;
}
export declare const betaUserService: BetaUserService;
//# sourceMappingURL=betaUserService.d.ts.map