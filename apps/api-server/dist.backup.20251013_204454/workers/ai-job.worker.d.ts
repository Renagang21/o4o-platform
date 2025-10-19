/**
 * AI Job Worker (BullMQ)
 * Sprint 2 - P2: Async Job Processing
 *
 * Features:
 * - Process AI generation jobs from queue
 * - Call AI proxy service
 * - Report progress updates
 * - Handle retries and errors
 */
declare class AIJobWorker {
    private static instance;
    private worker;
    private redis;
    private readonly QUEUE_NAME;
    private readonly CONCURRENCY;
    private constructor();
    static getInstance(): AIJobWorker;
    /**
     * Process AI generation job
     */
    private processJob;
    /**
     * Calculate backoff with jitter
     */
    private calculateBackoff;
    /**
     * Cleanup (for graceful shutdown)
     */
    cleanup(): Promise<void>;
}
export declare const aiJobWorker: AIJobWorker;
export {};
//# sourceMappingURL=ai-job.worker.d.ts.map