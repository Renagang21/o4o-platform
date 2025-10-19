/**
 * AI Dead Letter Queue (DLQ) Service
 * Sprint 4: Handle permanently failed jobs
 *
 * Features:
 * - Automatically move jobs that exceeded max retries to DLQ
 * - Store failed jobs for analysis
 * - Provide retry mechanism for DLQ jobs
 * - Query and export DLQ jobs
 */
import { Queue, Job } from 'bullmq';
import { AIJobData } from '../types/ai-job.types';
interface DLQEntry {
    jobId: string;
    data: AIJobData;
    error: string;
    attemptsMade: number;
    failedAt: string;
    canRetry: boolean;
}
declare class AIDLQService {
    private static instance;
    private dlqQueue;
    private redis;
    private readonly DLQ_NAME;
    private readonly MAX_DLQ_SIZE;
    private constructor();
    static getInstance(): AIDLQService;
    /**
     * Move failed job to DLQ
     */
    moveToDLQ(job: Job<AIJobData>, error: string, attemptsMade: number): Promise<void>;
    /**
     * Check if error is retryable
     */
    private isRetryable;
    /**
     * Get DLQ entries
     */
    getDLQEntries(limit?: number, offset?: number): Promise<DLQEntry[]>;
    /**
     * Retry job from DLQ
     */
    retryFromDLQ(dlqJobId: string, mainQueue: Queue): Promise<string | null>;
    /**
     * Get DLQ statistics
     */
    getDLQStats(): Promise<{
        total: number;
        retryable: number;
        nonRetryable: number;
        byProvider: Record<string, number>;
        byErrorType: Record<string, number>;
    }>;
    /**
     * Classify error type
     */
    private classifyError;
    /**
     * Periodic cleanup of old DLQ entries
     */
    private startPeriodicCleanup;
    /**
     * Cleanup (for graceful shutdown)
     */
    cleanup(): Promise<void>;
}
export declare const aiDLQ: AIDLQService;
export {};
//# sourceMappingURL=ai-dlq.service.d.ts.map