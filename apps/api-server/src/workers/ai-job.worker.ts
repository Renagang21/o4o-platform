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

import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { AIJobData, AIJobResult } from '../types/ai-job.types.js';
import { aiProxyService } from '../services/ai-proxy.service.js';
import { prometheusMetrics } from '../services/prometheus-metrics.service.js';
import { aiDLQ } from '../services/ai-dlq.service.js';
import logger from '../utils/logger.js';

class AIJobWorker {
  private static instance: AIJobWorker;
  private worker: Worker;
  private redis: Redis;

  private readonly QUEUE_NAME = 'ai-generation';
  private readonly CONCURRENCY = 10; // Sprint 4: Increased from 5 to 10 for better throughput

  private constructor() {
    // Redis connection for BullMQ worker
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      // Sprint 4: Optimize Redis connection pooling
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      // Phase 2.5: GRACEFUL_STARTUP - don't crash on connection failure
      lazyConnect: true,
      retryStrategy: (times) => {
        // Stop retrying after 3 attempts in GRACEFUL_STARTUP mode
        if (process.env.GRACEFUL_STARTUP !== 'false' && times > 3) {
          logger.warn('🔄 GRACEFUL_STARTUP: Redis connection retries exhausted, worker disabled');
          return null; // Stop retrying
        }
        return Math.min(times * 500, 3000);
      },
    });

    // CRITICAL: Attach error handler immediately to prevent unhandled error crashes
    this.redis.on('error', (error: Error) => {
      logger.error('AI worker Redis connection error:', { error: error.message });
      // Don't crash - just log the error
    });

    // Create worker
    this.worker = new Worker(
      this.QUEUE_NAME,
      async (job: Job<AIJobData>) => {
        return await this.processJob(job);
      },
      {
        connection: this.redis,
        concurrency: this.CONCURRENCY,
        limiter: {
          max: 20, // Sprint 4: Increased from 10 to 20 to match higher concurrency
          duration: 1000, // Per second
        },
      }
    );

    // Worker event handlers
    this.worker.on('active', (job: Job<AIJobData>) => {
      logger.info('AI job started', {
        jobId: job.id,
        userId: job.data.userId,
        provider: job.data.provider,
        model: job.data.model,
        attempt: job.attemptsMade + 1,
      });
    });

    this.worker.on('completed', (job: Job<AIJobData>, result: AIJobResult) => {
      logger.info('AI job completed', {
        jobId: job.id,
        userId: job.data.userId,
        provider: job.data.provider,
        model: job.data.model,
        duration: result.duration,
        retryCount: result.retryCount,
        usage: result.usage,
        validationResult: result.validationResult, // Sprint 2 - P2: validation logging
      });

      // Sprint 4: Update Prometheus metrics
      prometheusMetrics.recordJobCompletion(
        job.data.provider,
        job.data.model,
        result.success ? 'success' : 'failed',
        result.duration,
        result.retryCount,
        result.usage ? {
          prompt: result.usage.promptTokens,
          completion: result.usage.completionTokens
        } : undefined
      );
    });

    this.worker.on('failed', async (job: Job<AIJobData> | undefined, error: Error) => {
      if (job) {
        logger.error('AI job failed', {
          jobId: job.id,
          userId: job.data.userId,
          provider: job.data.provider,
          model: job.data.model,
          error: error.message,
          attemptsMade: job.attemptsMade,
        });

        // Sprint 4: Move to DLQ if max retries exceeded
        // BullMQ attempts start at 1, so attemptsMade === attempts means all retries exhausted
        const maxAttempts = job.opts.attempts || 3;
        if (job.attemptsMade >= maxAttempts) {
          await aiDLQ.moveToDLQ(job, error.message, job.attemptsMade);
        }
      } else {
        logger.error('AI job failed (no job info)', { error: error.message });
      }
    });

    this.worker.on('error', (error: Error) => {
      logger.error('AI worker error', { error: error.message });
    });

    logger.info('AI job worker started', {
      queueName: this.QUEUE_NAME,
      concurrency: this.CONCURRENCY,
    });
  }

  static getInstance(): AIJobWorker {
    if (!AIJobWorker.instance) {
      AIJobWorker.instance = new AIJobWorker();
    }
    return AIJobWorker.instance;
  }

  /**
   * Process AI generation job
   */
  private async processJob(job: Job<AIJobData>): Promise<AIJobResult> {
    const startTime = Date.now();
    const data = job.data;

    try {
      // Update progress: queued → processing
      await job.updateProgress(10);
      await job.log('Starting AI generation...');

      // Update progress: calling AI service
      await job.updateProgress(30);
      await job.log(`Calling ${data.provider} API...`);

      // Call AI proxy service
      const response = await aiProxyService.generateContent(
        {
          provider: data.provider,
          model: data.model,
          systemPrompt: data.systemPrompt,
          userPrompt: data.userPrompt,
          temperature: data.temperature,
          maxTokens: data.maxTokens,
          topP: data.topP,
          topK: data.topK,
        },
        data.userId,
        data.requestId
      );

      // Update progress: processing response
      await job.updateProgress(80);
      await job.log('Processing AI response...');

      // Prepare result
      const duration = Date.now() - startTime;
      const result: AIJobResult = {
        success: true,
        provider: response.provider as any,
        model: response.model,
        usage: response.usage,
        result: response.result,
        requestId: data.requestId,
        jobId: job.id!,
        duration,
        retryCount: job.attemptsMade,
      };

      // Update progress: completed
      await job.updateProgress(100);
      await job.log('AI generation completed successfully');

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Log error
      await job.log(`Error: ${error.message}`);

      // Prepare error result
      const result: AIJobResult = {
        success: false,
        provider: data.provider,
        model: data.model,
        error: error.message,
        errorType: error.type || 'UNKNOWN_ERROR',
        requestId: data.requestId,
        jobId: job.id!,
        duration,
        retryCount: job.attemptsMade,
      };

      // Determine if retryable
      if (error.retryable === false || job.attemptsMade >= 2) {
        // Don't retry
        throw new Error(error.message);
      }

      // Retry with backoff
      const backoff = this.calculateBackoff(job.attemptsMade);
      await job.log(`Retrying in ${Math.floor(backoff / 1000)}s...`);

      throw error;
    }
  }

  /**
   * Calculate backoff with jitter
   */
  private calculateBackoff(attemptsMade: number): number {
    const BASE_DELAY = 1000;
    const MAX_DELAY = 30000;

    // Exponential backoff
    const exponential = BASE_DELAY * Math.pow(2, attemptsMade);

    // Jitter (±20%)
    const jitter = exponential * (0.8 + Math.random() * 0.4);

    return Math.min(jitter, MAX_DELAY);
  }

  /**
   * Cleanup (for graceful shutdown)
   */
  async cleanup(): Promise<void> {
    await this.worker.close();
    await this.redis.quit();
    logger.info('AI job worker cleaned up');
  }
}

// Phase 2.5: LAZY initialization - don't create worker on module import
// This prevents Redis connection attempts during startup when Redis is unavailable
let _aiJobWorker: AIJobWorker | null = null;

export function getAIJobWorker(): AIJobWorker {
  if (!_aiJobWorker) {
    _aiJobWorker = AIJobWorker.getInstance();
  }
  return _aiJobWorker;
}

// For backwards compatibility - lazy getter
export const aiJobWorker = {
  get instance() {
    return getAIJobWorker();
  }
};
