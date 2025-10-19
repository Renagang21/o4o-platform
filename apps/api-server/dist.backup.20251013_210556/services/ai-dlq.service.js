"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiDLQ = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
const logger_1 = __importDefault(require("../utils/logger"));
class AIDLQService {
    constructor() {
        this.DLQ_NAME = 'ai-generation-dlq';
        this.MAX_DLQ_SIZE = 10000; // Keep last 10k failed jobs
        this.redis = new ioredis_1.Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
            maxRetriesPerRequest: null,
        });
        // Create DLQ queue (no worker attached)
        this.dlqQueue = new bullmq_1.Queue(this.DLQ_NAME, {
            connection: this.redis,
            defaultJobOptions: {
                removeOnComplete: false, // Keep all completed DLQ jobs
                removeOnFail: false, // Keep all failed DLQ jobs
            },
        });
        // Periodic cleanup of old DLQ entries
        this.startPeriodicCleanup();
        logger_1.default.info('✅ AI DLQ service initialized', {
            queueName: this.DLQ_NAME,
            maxSize: this.MAX_DLQ_SIZE,
        });
    }
    static getInstance() {
        if (!AIDLQService.instance) {
            AIDLQService.instance = new AIDLQService();
        }
        return AIDLQService.instance;
    }
    /**
     * Move failed job to DLQ
     */
    async moveToDLQ(job, error, attemptsMade) {
        try {
            const dlqEntry = {
                jobId: job.id,
                data: job.data,
                error,
                attemptsMade,
                failedAt: new Date().toISOString(),
                canRetry: this.isRetryable(error),
            };
            // Add to DLQ
            await this.dlqQueue.add('failed-job', dlqEntry, {
                jobId: `dlq-${job.id}`,
            });
            logger_1.default.warn('Job moved to DLQ', {
                jobId: job.id,
                userId: job.data.userId,
                provider: job.data.provider,
                model: job.data.model,
                error,
                attemptsMade,
            });
        }
        catch (error) {
            logger_1.default.error('Failed to move job to DLQ', {
                jobId: job.id,
                error: error.message,
            });
        }
    }
    /**
     * Check if error is retryable
     */
    isRetryable(error) {
        // Timeout and rate limit errors are retryable
        if (error.includes('timeout') || error.includes('TIMEOUT'))
            return true;
        if (error.includes('rate limit') || error.includes('RATE_LIMIT'))
            return true;
        if (error.includes('503') || error.includes('unavailable'))
            return true;
        // Validation and auth errors are not retryable
        if (error.includes('VALIDATION_ERROR'))
            return false;
        if (error.includes('AUTH_ERROR'))
            return false;
        // Default: not retryable
        return false;
    }
    /**
     * Get DLQ entries
     */
    async getDLQEntries(limit = 100, offset = 0) {
        try {
            const jobs = await this.dlqQueue.getJobs(['completed', 'failed'], offset, offset + limit - 1);
            return jobs.map(job => job.data);
        }
        catch (error) {
            logger_1.default.error('Failed to get DLQ entries', { error: error.message });
            return [];
        }
    }
    /**
     * Retry job from DLQ
     */
    async retryFromDLQ(dlqJobId, mainQueue) {
        try {
            const dlqJob = await this.dlqQueue.getJob(dlqJobId);
            if (!dlqJob) {
                logger_1.default.warn('DLQ job not found', { dlqJobId });
                return null;
            }
            const entry = dlqJob.data;
            if (!entry.canRetry) {
                logger_1.default.warn('DLQ job is not retryable', { dlqJobId, error: entry.error });
                return null;
            }
            // Re-enqueue to main queue
            const newJob = await mainQueue.add('generate', entry.data, {
                jobId: `retry-dlq-${entry.jobId}`,
                attempts: 3, // Give it 3 more attempts
            });
            // Remove from DLQ
            await dlqJob.remove();
            logger_1.default.info('Job retried from DLQ', {
                dlqJobId,
                newJobId: newJob.id,
                userId: entry.data.userId,
            });
            return newJob.id;
        }
        catch (error) {
            logger_1.default.error('Failed to retry job from DLQ', {
                dlqJobId,
                error: error.message,
            });
            return null;
        }
    }
    /**
     * Get DLQ statistics
     */
    async getDLQStats() {
        try {
            const jobs = await this.dlqQueue.getJobs(['completed', 'failed'], 0, this.MAX_DLQ_SIZE);
            const stats = {
                total: jobs.length,
                retryable: 0,
                nonRetryable: 0,
                byProvider: {},
                byErrorType: {},
            };
            jobs.forEach(job => {
                const entry = job.data;
                if (entry.canRetry) {
                    stats.retryable++;
                }
                else {
                    stats.nonRetryable++;
                }
                // Count by provider
                const provider = entry.data.provider;
                stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;
                // Classify error type
                const errorType = this.classifyError(entry.error);
                stats.byErrorType[errorType] = (stats.byErrorType[errorType] || 0) + 1;
            });
            return stats;
        }
        catch (error) {
            logger_1.default.error('Failed to get DLQ stats', { error: error.message });
            return {
                total: 0,
                retryable: 0,
                nonRetryable: 0,
                byProvider: {},
                byErrorType: {},
            };
        }
    }
    /**
     * Classify error type
     */
    classifyError(error) {
        if (error.includes('TIMEOUT') || error.includes('timeout'))
            return 'TIMEOUT';
        if (error.includes('RATE_LIMIT') || error.includes('rate limit'))
            return 'RATE_LIMIT';
        if (error.includes('VALIDATION') || error.includes('validation'))
            return 'VALIDATION';
        if (error.includes('AUTH') || error.includes('auth'))
            return 'AUTH';
        if (error.includes('503') || error.includes('unavailable'))
            return 'SERVICE_UNAVAILABLE';
        if (error.includes('PROVIDER') || error.includes('provider'))
            return 'PROVIDER_ERROR';
        return 'UNKNOWN';
    }
    /**
     * Periodic cleanup of old DLQ entries
     */
    startPeriodicCleanup() {
        setInterval(async () => {
            try {
                const jobCount = await this.dlqQueue.getJobCounts('completed', 'failed');
                const total = (jobCount.completed || 0) + (jobCount.failed || 0);
                // If DLQ exceeds max size, remove oldest entries
                if (total > this.MAX_DLQ_SIZE) {
                    const jobs = await this.dlqQueue.getJobs(['completed', 'failed'], this.MAX_DLQ_SIZE, total - 1);
                    for (const job of jobs) {
                        await job.remove();
                    }
                    logger_1.default.info('DLQ cleanup completed', {
                        removed: jobs.length,
                        remaining: this.MAX_DLQ_SIZE,
                    });
                }
            }
            catch (error) {
                logger_1.default.error('DLQ cleanup failed', { error: error.message });
            }
        }, 3600000); // Run every hour
    }
    /**
     * Cleanup (for graceful shutdown)
     */
    async cleanup() {
        await this.dlqQueue.close();
        await this.redis.quit();
        logger_1.default.info('AI DLQ service cleaned up');
    }
}
exports.aiDLQ = AIDLQService.getInstance();
//# sourceMappingURL=ai-dlq.service.js.map