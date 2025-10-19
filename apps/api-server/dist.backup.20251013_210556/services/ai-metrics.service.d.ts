/**
 * AI Metrics Service
 * Sprint 3: Observability - AI job metrics and statistics
 *
 * Provides operational visibility into AI job processing:
 * - Total requests, success rate, failure rate
 * - Average processing time, retry counts
 * - Schema validation pass rate
 * - BullMQ queue status (waiting, active, completed, failed)
 * - Redis statistics
 */
interface AIJobMetrics {
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    successRate: number;
    failureRate: number;
    averageProcessingTime: number;
    medianProcessingTime: number;
    p95ProcessingTime: number;
    totalRetries: number;
    averageRetriesPerJob: number;
    validationAttempts: number;
    validationPasses: number;
    validationFailures: number;
    validationPassRate: number;
    queueStatus: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    };
    providerStats: {
        [provider: string]: {
            count: number;
            successRate: number;
            avgDuration: number;
        };
    };
    errorStats: {
        byType: {
            [errorType: string]: number;
        };
        total: number;
    };
    redisStats?: {
        usedMemory: string;
        connectedClients: number;
        totalKeys: number;
    };
    collectedAt: string;
}
declare class AIMetricsService {
    private static instance;
    private queue;
    private redis;
    private constructor();
    static getInstance(): AIMetricsService;
    /**
     * Collect comprehensive AI job metrics
     */
    collectMetrics(timeRangeMs?: number): Promise<AIJobMetrics>;
    /**
     * Calculate per-provider statistics
     */
    private calculateProviderStats;
    /**
     * Collect Redis statistics
     */
    private collectRedisStats;
    /**
     * Get recent job history (last N jobs)
     */
    getRecentJobs(limit?: number): Promise<any[]>;
    /**
     * Sprint 4: Classify error type
     */
    private classifyError;
    /**
     * Sprint 4: Calculate error statistics
     */
    private calculateErrorStats;
    /**
     * Cleanup (for graceful shutdown)
     */
    cleanup(): Promise<void>;
}
export declare const aiMetrics: AIMetricsService;
export {};
//# sourceMappingURL=ai-metrics.service.d.ts.map