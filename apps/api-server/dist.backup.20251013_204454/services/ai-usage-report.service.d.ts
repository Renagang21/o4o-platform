/**
 * AI Usage Report Service
 * Sprint 4: LLM token usage tracking and cost estimation
 *
 * Features:
 * - Track token usage by provider, model, user, date
 * - Generate usage reports with cost estimation
 * - Export reports in various formats
 * - Aggregate usage statistics
 */
interface UsageReport {
    startDate: string;
    endDate: string;
    totalJobs: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalEstimatedCost: number;
    byProvider: {
        [provider: string]: {
            jobs: number;
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
            estimatedCost: number;
        };
    };
    byModel: {
        [model: string]: {
            provider: string;
            jobs: number;
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
            estimatedCost: number;
        };
    };
    byUser: {
        [userId: string]: {
            jobs: number;
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
            estimatedCost: number;
        };
    };
    byDate: {
        [date: string]: {
            jobs: number;
            totalTokens: number;
            estimatedCost: number;
        };
    };
}
declare class AIUsageReportService {
    private static instance;
    private queue;
    private redis;
    private constructor();
    static getInstance(): AIUsageReportService;
    /**
     * Generate usage report for a time period
     */
    generateReport(startDate: Date, endDate: Date, options?: {
        userId?: string;
        provider?: string;
        model?: string;
        topUsersLimit?: number;
    }): Promise<UsageReport>;
    /**
     * Estimate cost based on token usage
     */
    private estimateCost;
    /**
     * Get current month report
     */
    getCurrentMonthReport(): Promise<UsageReport>;
    /**
     * Get last N days report
     */
    getLastNDaysReport(days: number): Promise<UsageReport>;
    /**
     * Export report as CSV
     */
    exportAsCSV(report: UsageReport): string;
    /**
     * Cleanup (for graceful shutdown)
     */
    cleanup(): Promise<void>;
}
export declare const aiUsageReport: AIUsageReportService;
export {};
//# sourceMappingURL=ai-usage-report.service.d.ts.map