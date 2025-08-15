export declare enum ReportType {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    CUSTOM = "custom"
}
export declare enum ReportCategory {
    USER_ACTIVITY = "user_activity",
    SYSTEM_PERFORMANCE = "system_performance",
    CONTENT_USAGE = "content_usage",
    FEEDBACK_ANALYSIS = "feedback_analysis",
    ERROR_ANALYSIS = "error_analysis",
    BUSINESS_METRICS = "business_metrics",
    COMPREHENSIVE = "comprehensive"
}
export declare enum ReportStatus {
    PENDING = "pending",
    GENERATING = "generating",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare class AnalyticsReport {
    id: string;
    reportType: ReportType;
    reportCategory: ReportCategory;
    reportName: string;
    description?: string;
    status: ReportStatus;
    reportPeriodStart: Date;
    reportPeriodEnd: Date;
    generatedBy?: string;
    generatedAt?: Date;
    generationTimeMs?: number;
    generationError?: string;
    summary?: {
        totalUsers?: number;
        activeUsers?: number;
        newUsers?: number;
        totalSessions?: number;
        avgSessionDuration?: number;
        totalPageViews?: number;
        totalActions?: number;
        totalFeedback?: number;
        totalErrors?: number;
        systemUptime?: number;
        avgResponseTime?: number;
        [key: string]: number | undefined;
    };
    userMetrics?: {
        demographics?: {
            userTypes?: Record<string, number>;
            interestAreas?: Record<string, number>;
            countries?: Record<string, number>;
            devices?: Record<string, number>;
        };
        engagement?: {
            dailyActiveUsers?: number[];
            sessionDurations?: number[];
            pageViewsPerSession?: number[];
            actionsPerSession?: number[];
            returnUsers?: number;
            churnRate?: number;
        };
        behavior?: {
            topPages?: Array<{
                page: string;
                views: number;
            }>;
            topFeatures?: Array<{
                feature: string;
                usage: number;
            }>;
            userJourney?: Array<{
                step: string;
                count: number;
                dropoffRate?: number;
            }>;
        };
    };
    systemMetrics?: {
        performance?: {
            avgResponseTime?: number;
            avgLoadTime?: number;
            errorRate?: number;
            uptime?: number;
            throughput?: number;
        };
        resources?: {
            cpuUsage?: number[];
            memoryUsage?: number[];
            storageUsage?: number;
            networkLatency?: number;
        };
        errors?: {
            errorsByType?: Record<string, number>;
            errorsByEndpoint?: Record<string, number>;
            errorTrends?: number[];
            criticalErrors?: number;
        };
    };
    contentMetrics?: {
        usage?: {
            totalContentViews?: number;
            topContent?: Array<{
                title: string;
                views: number;
                duration: number;
            }>;
            contentByType?: Record<string, number>;
            engagementRate?: number;
        };
        signage?: {
            signageCreated?: number;
            playlistsCreated?: number;
            templatesUsed?: Record<string, number>;
            schedulesCreated?: number;
        };
        performance?: {
            avgLoadTime?: number;
            playbackSuccess?: number;
            errorRate?: number;
        };
    };
    feedbackMetrics?: {
        overview?: {
            totalFeedback?: number;
            avgRating?: number;
            responseRate?: number;
            sentimentScore?: number;
        };
        categories?: {
            bugReports?: number;
            featureRequests?: number;
            generalFeedback?: number;
            complaints?: number;
        };
        trends?: {
            feedbackOverTime?: number[];
            ratingTrends?: number[];
            categoryTrends?: Record<string, number[]>;
        };
        insights?: {
            commonIssues?: Array<{
                issue: string;
                count: number;
            }>;
            requestedFeatures?: Array<{
                feature: string;
                count: number;
            }>;
            userSatisfaction?: number;
        };
    };
    businessMetrics?: {
        conversion?: {
            signupRate?: number;
            activationRate?: number;
            retentionRate?: number;
            churnRate?: number;
        };
        growth?: {
            userGrowth?: number[];
            usageGrowth?: number[];
            engagementGrowth?: number[];
        };
        roi?: {
            userAcquisitionCost?: number;
            lifetimeValue?: number;
            returnOnInvestment?: number;
        };
    };
    reportFilePath?: string;
    reportFileType?: string;
    reportFileSize?: number;
    createdAt: Date;
    updatedAt: Date;
    static createDailyReport(category: ReportCategory, date: Date, name?: string): Partial<AnalyticsReport>;
    static createWeeklyReport(category: ReportCategory, weekStart: Date, name?: string): Partial<AnalyticsReport>;
    static createMonthlyReport(category: ReportCategory, month: Date, name?: string): Partial<AnalyticsReport>;
    static createCustomReport(category: ReportCategory, startDate: Date, endDate: Date, name: string): Partial<AnalyticsReport>;
    markAsGenerating(): void;
    markAsCompleted(generationTimeMs: number, filePath?: string, fileType?: string, fileSize?: number): void;
    markAsFailed(error: string): void;
    isCompleted(): boolean;
    isFailed(): boolean;
    isPending(): boolean;
    isGenerating(): boolean;
    getDurationDays(): number;
    getFormattedPeriod(): string;
    getCategoryDisplayName(): string;
    getTypeDisplayName(): string;
    hasData(): boolean;
    getDataSize(): number;
}
//# sourceMappingURL=AnalyticsReport.d.ts.map