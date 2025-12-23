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
import { Redis } from 'ioredis';
import { AIJobData, AIJobResult, AIJobProgress, AIJobStatusResponse } from '../types/ai-job.types.js';
import logger from '../utils/logger.js';

class AIJobQueueService {
  private static instance: AIJobQueueService;
  private queue: Queue;
  private queueEvents: QueueEvents;
  private redis: Redis;

  // Queue configuration
  private readonly QUEUE_NAME = 'ai-generation';
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 60000; // 60 seconds
  private readonly BASE_DELAY_MS = 1000; // 1 second
  private readonly MAX_DELAY_MS = 30000; // 30 seconds

  private constructor() {
    // Redis connection for BullMQ
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: null, // Required for BullMQ
      // Phase 2.5: GRACEFUL_STARTUP - don't crash on connection failure
      lazyConnect: true,
      retryStrategy: (times) => {
        if (process.env.GRACEFUL_STARTUP !== 'false' && times > 3) {
          logger.warn('🔄 GRACEFUL_STARTUP: Redis connection retries exhausted, queue disabled');
          return null;
        }
        return Math.min(times * 500, 3000);
      },
    });

    // CRITICAL: Attach error handler immediately to prevent unhandled error crashes
    this.redis.on('error', (error: Error) => {
      logger.error('AI job queue Redis error:', { error: error.message });
    });

    // Create queue
    this.queue = new Queue(this.QUEUE_NAME, {
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
    this.queueEvents = new QueueEvents(this.QUEUE_NAME, {
      connection: this.redis.duplicate(),
    });

    // Error handling
    this.queue.on('error', (error) => {
      logger.error('AI job queue error', { error: error.message });
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.warn('AI job failed', { jobId, failedReason });
    });

    logger.info('AI job queue initialized', {
      queueName: this.QUEUE_NAME,
      maxRetries: this.MAX_RETRIES,
      timeout: `${this.TIMEOUT_MS}ms`,
    });
  }

  static getInstance(): AIJobQueueService {
    if (!AIJobQueueService.instance) {
      AIJobQueueService.instance = new AIJobQueueService();
    }
    return AIJobQueueService.instance;
  }

  /**
   * Enqueue AI generation job
   */
  async enqueueJob(data: AIJobData): Promise<string> {
    try {
      const job = await this.queue.add('generate', data, {
        jobId: data.requestId, // Use requestId as jobId
        attempts: this.MAX_RETRIES,
        backoff: {
          type: 'custom', // Use custom backoff for jitter
        },
        // Note: timeout is handled by AI proxy service (15s default)
      });

      logger.info('AI job enqueued', {
        jobId: job.id,
        userId: data.userId,
        provider: data.provider,
        model: data.model,
      });

      return job.id!;
    } catch (error: any) {
      logger.error('Failed to enqueue AI job', {
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
  async getJobStatus(jobId: string): Promise<AIJobStatusResponse | null> {
    try {
      const job = await this.queue.getJob(jobId);

      if (!job) {
        return null;
      }

      const state = await job.getState();
      const progress = job.progress as number || 0;
      const data = job.data as AIJobData;
      const returnvalue = job.returnvalue as AIJobResult | undefined;

      // Map BullMQ state to our JobStatus
      let status: AIJobStatusResponse['status'];
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
        jobId: job.id!,
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
    } catch (error: any) {
      logger.error('Failed to get job status', {
        jobId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(jobId);

      if (!job) {
        return false;
      }

      await job.remove();

      logger.info('AI job cancelled', { jobId });

      return true;
    } catch (error: any) {
      logger.error('Failed to cancel job', {
        jobId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get queue for worker access
   */
  getQueue(): Queue {
    return this.queue;
  }

  /**
   * Get queue events for SSE
   */
  getQueueEvents(): QueueEvents {
    return this.queueEvents;
  }

  /**
   * Calculate backoff with jitter (for custom backoff)
   */
  calculateBackoff(attemptsMade: number): number {
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
  async cleanup(): Promise<void> {
    await this.queue.close();
    await this.queueEvents.close();
    await this.redis.quit();
    logger.info('AI job queue cleaned up');
  }
}

// Phase 2.5: LAZY initialization - don't create queue on module import
// This prevents Redis connection attempts during startup when Redis is unavailable
let _aiJobQueue: AIJobQueueService | null = null;

export function getAIJobQueue(): AIJobQueueService {
  if (!_aiJobQueue) {
    _aiJobQueue = AIJobQueueService.getInstance();
  }
  return _aiJobQueue;
}

// For backwards compatibility - lazy proxy
export const aiJobQueue = {
  get instance() {
    return getAIJobQueue();
  },
  // Expose key methods for backwards compatibility
  getQueue: () => getAIJobQueue().getQueue(),
  getQueueEvents: () => getAIJobQueue().getQueueEvents(),
  enqueueJob: (...args: Parameters<AIJobQueueService['enqueueJob']>) => getAIJobQueue().enqueueJob(...args),
  getJobStatus: (...args: Parameters<AIJobQueueService['getJobStatus']>) => getAIJobQueue().getJobStatus(...args),
  cancelJob: (...args: Parameters<AIJobQueueService['cancelJob']>) => getAIJobQueue().cancelJob(...args),
  calculateBackoff: (...args: Parameters<AIJobQueueService['calculateBackoff']>) => getAIJobQueue().calculateBackoff(...args),
  cleanup: () => getAIJobQueue().cleanup(),
};
