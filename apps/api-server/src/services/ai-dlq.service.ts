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
import { Redis } from 'ioredis';
import { AIJobData, AIJobResult } from '../types/ai-job.types.js';
import logger from '../utils/logger.js';

interface DLQEntry {
  jobId: string;
  data: AIJobData;
  error: string;
  attemptsMade: number;
  failedAt: string;
  canRetry: boolean;
}

class AIDLQService {
  private static instance: AIDLQService;
  private dlqQueue: Queue;
  private redis: Redis;

  private readonly DLQ_NAME = 'ai-generation-dlq';
  private readonly MAX_DLQ_SIZE = 10000; // Keep last 10k failed jobs

  private constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: null,
      // Phase 2.5: GRACEFUL_STARTUP - don't crash on connection failure
      lazyConnect: true,
      retryStrategy: (times) => {
        if (process.env.GRACEFUL_STARTUP !== 'false' && times > 3) {
          logger.warn('🔄 GRACEFUL_STARTUP: DLQ Redis connection retries exhausted');
          return null;
        }
        return Math.min(times * 500, 3000);
      },
    });

    // CRITICAL: Attach error handler immediately to prevent unhandled error crashes
    this.redis.on('error', (error: Error) => {
      logger.error('DLQ Redis connection error:', { error: error.message });
    });

    // Create DLQ queue (no worker attached)
    this.dlqQueue = new Queue(this.DLQ_NAME, {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: false, // Keep all completed DLQ jobs
        removeOnFail: false, // Keep all failed DLQ jobs
      },
    });

    // Periodic cleanup of old DLQ entries
    this.startPeriodicCleanup();

    logger.info('✅ AI DLQ service initialized', {
      queueName: this.DLQ_NAME,
      maxSize: this.MAX_DLQ_SIZE,
    });
  }

  static getInstance(): AIDLQService {
    if (!AIDLQService.instance) {
      AIDLQService.instance = new AIDLQService();
    }
    return AIDLQService.instance;
  }

  /**
   * Move failed job to DLQ
   */
  async moveToDLQ(
    job: Job<AIJobData>,
    error: string,
    attemptsMade: number
  ): Promise<void> {
    try {
      const dlqEntry: DLQEntry = {
        jobId: job.id!,
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

      logger.warn('Job moved to DLQ', {
        jobId: job.id,
        userId: job.data.userId,
        provider: job.data.provider,
        model: job.data.model,
        error,
        attemptsMade,
      });

    } catch (error: any) {
      logger.error('Failed to move job to DLQ', {
        jobId: job.id,
        error: error.message,
      });
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: string): boolean {
    // Timeout and rate limit errors are retryable
    if (error.includes('timeout') || error.includes('TIMEOUT')) return true;
    if (error.includes('rate limit') || error.includes('RATE_LIMIT')) return true;
    if (error.includes('503') || error.includes('unavailable')) return true;

    // Validation and auth errors are not retryable
    if (error.includes('VALIDATION_ERROR')) return false;
    if (error.includes('AUTH_ERROR')) return false;

    // Default: not retryable
    return false;
  }

  /**
   * Get DLQ entries
   */
  async getDLQEntries(limit: number = 100, offset: number = 0): Promise<DLQEntry[]> {
    try {
      const jobs = await this.dlqQueue.getJobs(['completed', 'failed'], offset, offset + limit - 1);

      return jobs.map(job => job.data as DLQEntry);

    } catch (error: any) {
      logger.error('Failed to get DLQ entries', { error: error.message });
      return [];
    }
  }

  /**
   * Retry job from DLQ
   */
  async retryFromDLQ(dlqJobId: string, mainQueue: Queue): Promise<string | null> {
    try {
      const dlqJob = await this.dlqQueue.getJob(dlqJobId);

      if (!dlqJob) {
        logger.warn('DLQ job not found', { dlqJobId });
        return null;
      }

      const entry = dlqJob.data as DLQEntry;

      if (!entry.canRetry) {
        logger.warn('DLQ job is not retryable', { dlqJobId, error: entry.error });
        return null;
      }

      // Re-enqueue to main queue
      const newJob = await mainQueue.add('generate', entry.data, {
        jobId: `retry-dlq-${entry.jobId}`,
        attempts: 3, // Give it 3 more attempts
      });

      // Remove from DLQ
      await dlqJob.remove();

      logger.info('Job retried from DLQ', {
        dlqJobId,
        newJobId: newJob.id,
        userId: entry.data.userId,
      });

      return newJob.id!;

    } catch (error: any) {
      logger.error('Failed to retry job from DLQ', {
        dlqJobId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get DLQ statistics
   */
  async getDLQStats(): Promise<{
    total: number;
    retryable: number;
    nonRetryable: number;
    byProvider: Record<string, number>;
    byErrorType: Record<string, number>;
  }> {
    try {
      const jobs = await this.dlqQueue.getJobs(['completed', 'failed'], 0, this.MAX_DLQ_SIZE);

      const stats = {
        total: jobs.length,
        retryable: 0,
        nonRetryable: 0,
        byProvider: {} as Record<string, number>,
        byErrorType: {} as Record<string, number>,
      };

      jobs.forEach(job => {
        const entry = job.data as DLQEntry;

        if (entry.canRetry) {
          stats.retryable++;
        } else {
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

    } catch (error: any) {
      logger.error('Failed to get DLQ stats', { error: error.message });
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
  private classifyError(error: string): string {
    if (error.includes('TIMEOUT') || error.includes('timeout')) return 'TIMEOUT';
    if (error.includes('RATE_LIMIT') || error.includes('rate limit')) return 'RATE_LIMIT';
    if (error.includes('VALIDATION') || error.includes('validation')) return 'VALIDATION';
    if (error.includes('AUTH') || error.includes('auth')) return 'AUTH';
    if (error.includes('503') || error.includes('unavailable')) return 'SERVICE_UNAVAILABLE';
    if (error.includes('PROVIDER') || error.includes('provider')) return 'PROVIDER_ERROR';
    return 'UNKNOWN';
  }

  /**
   * Periodic cleanup of old DLQ entries
   */
  private startPeriodicCleanup(): void {
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

          logger.info('DLQ cleanup completed', {
            removed: jobs.length,
            remaining: this.MAX_DLQ_SIZE,
          });
        }

      } catch (error: any) {
        logger.error('DLQ cleanup failed', { error: error.message });
      }
    }, 3600000); // Run every hour
  }

  /**
   * Cleanup (for graceful shutdown)
   */
  async cleanup(): Promise<void> {
    await this.dlqQueue.close();
    await this.redis.quit();
    logger.info('AI DLQ service cleaned up');
  }
}

// Phase 2.5: LAZY initialization - don't create DLQ on module import
// This prevents Redis connection attempts during startup when Redis is unavailable
let _aiDLQ: AIDLQService | null = null;

export function getAIDLQ(): AIDLQService {
  if (!_aiDLQ) {
    _aiDLQ = AIDLQService.getInstance();
  }
  return _aiDLQ;
}

// For backwards compatibility - lazy getter
export const aiDLQ = {
  get instance() {
    return getAIDLQ();
  },
  // Expose methods through lazy accessor
  moveToDLQ: (...args: Parameters<AIDLQService['moveToDLQ']>) => getAIDLQ().moveToDLQ(...args),
  getDLQEntries: (...args: Parameters<AIDLQService['getDLQEntries']>) => getAIDLQ().getDLQEntries(...args),
  retryFromDLQ: (...args: Parameters<AIDLQService['retryFromDLQ']>) => getAIDLQ().retryFromDLQ(...args),
  getDLQStats: () => getAIDLQ().getDLQStats(),
  cleanup: () => getAIDLQ().cleanup(),
};
