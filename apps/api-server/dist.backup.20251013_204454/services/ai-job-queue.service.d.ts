/**
 * AI Job Queue Service (BullMQ)
 * Sprint 2 - P2: Async Reliability with Queue
 *
 * Features:
 * - Job enqueue with priority
 * - Retry with exponential backoff (jitter)
 * - Timeout (60s default)
 * - Job status tracking
 * - SSE event emitters
 */
import { Queue, QueueEvents } from 'bullmq';
import { AIJobData, AIJobStatusResponse } from '../types/ai-job.types';
declare class AIJobQueueService {
    private static instance;
    private queue;
    private queueEvents;
    private redis;
    private readonly QUEUE_NAME;
    private readonly MAX_RETRIES;
    private readonly TIMEOUT_MS;
    private readonly BASE_DELAY_MS;
    private readonly MAX_DELAY_MS;
    private constructor();
    static getInstance(): AIJobQueueService;
    /**
     * Enqueue AI generation job
     */
    enqueueJob(data: AIJobData): Promise<string>;
    /**
     * Get job status
     */
    getJobStatus(jobId: string): Promise<AIJobStatusResponse | null>;
    /**
     * Cancel job
     */
    cancelJob(jobId: string): Promise<boolean>;
    /**
     * Get queue for worker access
     */
    getQueue(): Queue;
    /**
     * Get queue events for SSE
     */
    getQueueEvents(): QueueEvents;
    /**
     * Calculate backoff with jitter (for custom backoff)
     */
    calculateBackoff(attemptsMade: number): number;
    /**
     * Cleanup (for graceful shutdown)
     */
    cleanup(): Promise<void>;
}
export declare const aiJobQueue: AIJobQueueService;
export {};
//# sourceMappingURL=ai-job-queue.service.d.ts.map