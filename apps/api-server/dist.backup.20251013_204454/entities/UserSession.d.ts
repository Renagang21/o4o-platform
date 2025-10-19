import { BetaUser } from './BetaUser';
export declare enum SessionStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    EXPIRED = "expired"
}
export declare enum DeviceType {
    DESKTOP = "desktop",
    TABLET = "tablet",
    MOBILE = "mobile",
    UNKNOWN = "unknown"
}
export declare class UserSession {
    id: string;
    betaUserId: string;
    betaUser: BetaUser;
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    deviceType: DeviceType;
    browser?: string;
    operatingSystem?: string;
    screenResolution?: string;
    status: SessionStatus;
    lastActivityAt?: Date;
    endedAt?: Date;
    durationMinutes: number;
    pageViews: number;
    actions: number;
    feedbackSubmitted: number;
    contentViewed: number;
    errorsEncountered: number;
    country?: string;
    city?: string;
    timezone?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    performanceMetrics?: {
        pageLoadTime?: number;
        apiResponseTime?: number;
        errorRate?: number;
        memoryUsage?: number;
        networkLatency?: number;
    };
    createdAt: Date;
    updatedAt: Date;
    updateActivity(): void;
    endSession(): void;
    markExpired(): void;
    incrementPageViews(): void;
    incrementActions(): void;
    incrementFeedback(): void;
    incrementContentViewed(): void;
    incrementErrors(): void;
    private calculateDuration;
    isActive(): boolean;
    getEngagementScore(): number;
}
//# sourceMappingURL=UserSession.d.ts.map