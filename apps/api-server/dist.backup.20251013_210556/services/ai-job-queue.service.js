"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiJobQueue = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
const logger_1 = __importDefault(require("../utils/logger"));
class AIJobQueueService {
    constructor() {
        // Queue configuration
        this.QUEUE_NAME = 'ai-generation';
        this.MAX_RETRIES = 3;
        this.TIMEOUT_MS = 60000; // 60 seconds
        this.BASE_DELAY_MS = 1000; // 1 second
        this.MAX_DELAY_MS = 30000; // 30 seconds
        // Redis connection for BullMQ
        this.redis = new ioredis_1.Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
            maxRetriesPerRequest: null, // Required for BullMQ
        });
        // Create queue
        this.queue = new bullmq_1.Queue(this.QUEUE_NAME, {
            connection: this.redis,
            defaultJobOptions: {
                attempts: this.MAX_RETRIES,
                backoff: {
                    type: 'exponential',
                    delay: this.BASE_DELAY_MS,
                },
                removeOnComplete: {
                    age: 3600, // Keep completed jobs for 1 hour
                    count: 1000,
                },
                removeOnFail: {
                    age: 86400, // Keep failed jobs for 24 hours
                    count: 1000,
                },
                // Note: timeout is handled by AI proxy service (15s default)
            },
        });
        // Queue events for monitoring
        this.queueEvents = new bullmq_1.QueueEvents(this.QUEUE_NAME, {
            connection: this.redis.duplicate(),
        });
        // Error handling
        this.queue.on('error', (error) => {
            logger_1.default.error('AI job queue error', { error: error.message });
        });
        this.queueEvents.on('failed', ({ jobId, failedReason }) => {
            logger_1.default.warn('AI job failed', { jobId, failedReason });
        });
        logger_1.default.info('AI job queue initialized', {
            queueName: this.QUEUE_NAME,
            maxRetries: this.MAX_RETRIES,
            timeout: `${this.TIMEOUT_MS}ms`,
        });
    }
    static getInstance() {
        if (!AIJobQueueService.instance) {
            AIJobQueueService.instance = new AIJobQueueService();
        }
        return AIJobQueueService.instance;
    }
    /**
     * Enqueue AI generation job
     */
    async enqueueJob(data) {
        try {
            const job = await this.queue.add('generate', data, {
                jobId: data.requestId, // Use requestId as jobId
                attempts: this.MAX_RETRIES,
                backoff: {
                    type: 'custom', // Use custom backoff for jitter
                },
                // Note: timeout is handled by AI proxy service (15s default)
            });
            logger_1.default.info('AI job enqueued', {
                jobId: job.id,
                userId: data.userId,
                provider: data.provider,
                model: data.model,
            });
            return job.id;
        }
        catch (error) {
            logger_1.default.error('Failed to enqueue AI job', {
                error: error.message,
                userId: data.userId,
                provider: data.provider,
            });
            throw new Error('Failed to enqueue job');
        }
    }
    /**
     * Get job status
     */
    async getJobStatus(jobId) {
        try {
            const job = await this.queue.getJob(jobId);
            if (!job) {
                return null;
            }
            const state = await job.getState();
            const progress = job.progress || 0;
            const data = job.data;
            const returnvalue = job.returnvalue;
            // Map BullMQ state to our JobStatus
            let status;
            switch (state) {
                case 'waiting':
                case 'delayed':
                    status = 'queued';
                    break;
                case 'active':
                    status = 'processing';
                    break;
                case 'completed':
                    status = 'completed';
                    break;
                case 'failed':
                    status = 'failed';
                    break;
                default:
                    status = 'queued';
            }
            return {
                jobId: job.id,
                status,
                progress,
                data,
                result: returnvalue,
                createdAt: new Date(job.timestamp).toISOString(),
                startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : undefined,
                completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined,
                failedReason: job.failedReason,
                attemptsMade: job.attemptsMade,
            };
        }
        catch (error) {
            logger_1.default.error('Failed to get job status', {
                jobId,
                error: error.message,
            });
            return null;
        }
    }
    /**
     * Cancel job
     */
    async cancelJob(jobId) {
        try {
            const job = await this.queue.getJob(jobId);
            if (!job) {
                return false;
            }
            await job.remove();
            logger_1.default.info('AI job cancelled', { jobId });
            return true;
        }
        catch (error) {
            logger_1.default.error('Failed to cancel job', {
                jobId,
                error: error.message,
            });
            return false;
        }
    }
    /**
     * Get queue for worker access
     */
    getQueue() {
        return this.queue;
    }
    /**
     * Get queue events for SSE
     */
    getQueueEvents() {
        return this.queueEvents;
    }
    /**
     * Calculate backoff with jitter (for custom backoff)
     */
    calculateBackoff(attemptsMade) {
        // Exponential backoff: baseDelay * (2 ^ attemptsMade)
        const exponential = this.BASE_DELAY_MS * Math.pow(2, attemptsMade);
        // Add jitter (±20%)
        const jitter = exponential * (0.8 + Math.random() * 0.4);
        // Cap at max delay
        return Math.min(jitter, this.MAX_DELAY_MS);
    }
    /**
     * Cleanup (for graceful shutdown)
     */
    async cleanup() {
        await this.queue.close();
        await this.queueEvents.close();
        await this.redis.quit();
        logger_1.default.info('AI job queue cleaned up');
    }
}
exports.aiJobQueue = AIJobQueueService.getInstance();
//# sourceMappingURL=ai-job-queue.service.js.map