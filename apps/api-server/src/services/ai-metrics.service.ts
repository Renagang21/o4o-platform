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

import { Queue, QueueEvents, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { aiJobQueue } from './ai-job-queue.service.js';
import { AIJobResult, ValidationResultLog } from '../types/ai-job.types.js';
import logger from '../utils/logger.js';

interface AIJobMetrics {
  // Overall statistics
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  successRate: number;
  failureRate: number;

  // Processing metrics
  averageProcessingTime: number; // milliseconds
  medianProcessingTime: number;
  p95ProcessingTime: number;

  // Retry metrics
  totalRetries: number;
  averageRetriesPerJob: number;

  // Validation metrics
  validationAttempts: number;
  validationPasses: number;
  validationFailures: number;
  validationPassRate: number;

  // Queue status
  queueStatus: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };

  // Provider breakdown
  providerStats: {
    [provider: string]: {
      count: number;
      successRate: number;
      avgDuration: number;
    };
  };

  // Sprint 4: Error classification
  errorStats: {
    byType: {
      [errorType: string]: number;
    };
    total: number;
  };

  // Redis info
  redisStats?: {
    usedMemory: string;
    connectedClients: number;
    totalKeys: number;
  };

  // Timestamp
  collectedAt: string;
}

class AIMetricsService {
  private static instance: AIMetricsService;
  private queue: Queue;
  private redis: Redis;

  private constructor() {
    // Phase 2.5: Lazy queue access - don't create immediately
    // The queue will be accessed when methods are called
    this.queue = null as any; // Will be lazily initialized

    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      // Phase 2.5: GRACEFUL_STARTUP - don't crash on connection failure
      lazyConnect: true,
      retryStrategy: (times) => {
        if (process.env.GRACEFUL_STARTUP !== 'false' && times > 3) {
          logger.warn('🔄 GRACEFUL_STARTUP: AI metrics Redis connection retries exhausted');
          return null;
        }
        return Math.min(times * 500, 3000);
      },
    });

    // CRITICAL: Attach error handler immediately to prevent unhandled error crashes
    this.redis.on('error', (error: Error) => {
      logger.error('AI metrics Redis error:', { error: error.message });
    });
  }

  /**
   * Get queue lazily
   */
  private getQueueLazy(): Queue {
    if (!this.queue) {
      this.queue = aiJobQueue.getQueue();
    }
    return this.queue;
  }

  static getInstance(): AIMetricsService {
    if (!AIMetricsService.instance) {
      AIMetricsService.instance = new AIMetricsService();
    }
    return AIMetricsService.instance;
  }

  /**
   * Collect comprehensive AI job metrics
   */
  async collectMetrics(timeRangeMs?: number): Promise<AIJobMetrics> {
    try {
      // Get queue counts
      const queueCounts = await this.getQueueLazy().getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');

      // Get completed and failed jobs for analysis
      const completedJobs = await this.getQueueLazy().getJobs(['completed'], 0, 1000);
      const failedJobs = await this.getQueueLazy().getJobs(['failed'], 0, 1000);

      // Filter by time range if specified
      const now = Date.now();
      const filteredCompleted = timeRangeMs
        ? completedJobs.filter(job => job.finishedOn && (now - job.finishedOn) <= timeRangeMs)
        : completedJobs;

      const filteredFailed = timeRangeMs
        ? failedJobs.filter(job => job.finishedOn && (now - job.finishedOn) <= timeRangeMs)
        : failedJobs;

      // Calculate basic statistics
      const totalJobs = filteredCompleted.length + filteredFailed.length;
      const successfulJobs = filteredCompleted.length;
      const failedJobsCount = filteredFailed.length;
      const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0;
      const failureRate = totalJobs > 0 ? (failedJobsCount / totalJobs) * 100 : 0;

      // Calculate processing time metrics
      const durations = filteredCompleted
        .map(job => job.returnvalue as AIJobResult)
        .filter(result => result && result.duration)
        .map(result => result.duration);

      const averageProcessingTime = durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

      const sortedDurations = [...durations].sort((a, b) => a - b);
      const medianProcessingTime = sortedDurations.length > 0
        ? sortedDurations[Math.floor(sortedDurations.length / 2)]
        : 0;

      const p95Index = Math.floor(sortedDurations.length * 0.95);
      const p95ProcessingTime = sortedDurations.length > 0
        ? sortedDurations[p95Index] || sortedDurations[sortedDurations.length - 1]
        : 0;

      // Calculate retry metrics
      const retries = filteredCompleted
        .map(job => job.returnvalue as AIJobResult)
        .filter(result => result && result.retryCount !== undefined)
        .map(result => result.retryCount);

      const totalRetries = retries.reduce((sum, r) => sum + r, 0);
      const averageRetriesPerJob = retries.length > 0
        ? totalRetries / retries.length
        : 0;

      // Calculate validation metrics
      const validationResults = filteredCompleted
        .map(job => job.returnvalue as AIJobResult)
        .filter(result => result && result.validationResult)
        .map(result => result.validationResult as ValidationResultLog);

      const validationAttempts = validationResults.length;
      const validationPasses = validationResults.filter(v => v.valid).length;
      const validationFailures = validationResults.filter(v => !v.valid).length;
      const validationPassRate = validationAttempts > 0
        ? (validationPasses / validationAttempts) * 100
        : 0;

      // Provider breakdown
      const providerStats = this.calculateProviderStats(filteredCompleted);

      // Sprint 4: Error classification
      const errorStats = this.calculateErrorStats(filteredFailed);

      // Redis statistics
      const redisStats = await this.collectRedisStats();

      return {
        totalJobs,
        successfulJobs,
        failedJobs: failedJobsCount,
        successRate: Math.round(successRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        averageProcessingTime: Math.round(averageProcessingTime),
        medianProcessingTime: Math.round(medianProcessingTime),
        p95ProcessingTime: Math.round(p95ProcessingTime),
        totalRetries,
        averageRetriesPerJob: Math.round(averageRetriesPerJob * 100) / 100,
        validationAttempts,
        validationPasses,
        validationFailures,
        validationPassRate: Math.round(validationPassRate * 100) / 100,
        queueStatus: {
          waiting: queueCounts.waiting || 0,
          active: queueCounts.active || 0,
          completed: queueCounts.completed || 0,
          failed: queueCounts.failed || 0,
          delayed: queueCounts.delayed || 0,
        },
        providerStats,
        errorStats,
        redisStats,
        collectedAt: new Date().toISOString(),
      };

    } catch (error: any) {
      logger.error('Failed to collect AI metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate per-provider statistics
   */
  private calculateProviderStats(jobs: Job[]): AIJobMetrics['providerStats'] {
    const stats: AIJobMetrics['providerStats'] = {};

    jobs.forEach(job => {
      const result = job.returnvalue as AIJobResult;
      if (!result || !result.provider) return;

      const provider = result.provider;

      if (!stats[provider]) {
        stats[provider] = {
          count: 0,
          successRate: 0,
          avgDuration: 0,
        };
      }

      stats[provider].count++;

      if (result.success) {
        stats[provider].successRate++;
      }

      if (result.duration) {
        stats[provider].avgDuration += result.duration;
      }
    });

    // Calculate averages
    Object.keys(stats).forEach(provider => {
      const stat = stats[provider];
      stat.successRate = stat.count > 0 ? (stat.successRate / stat.count) * 100 : 0;
      stat.avgDuration = stat.count > 0 ? Math.round(stat.avgDuration / stat.count) : 0;
      stat.successRate = Math.round(stat.successRate * 100) / 100;
    });

    return stats;
  }

  /**
   * Collect Redis statistics
   */
  private async collectRedisStats(): Promise<AIJobMetrics['redisStats']> {
    try {
      const info = await this.redis.info();
      const dbSize = await this.redis.dbsize();

      // Parse Redis INFO output
      const lines = info.split('\r\n');
      const stats: any = {};

      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          stats[key] = value;
        }
      });

      return {
        usedMemory: stats.used_memory_human || 'N/A',
        connectedClients: parseInt(stats.connected_clients) || 0,
        totalKeys: dbSize,
      };

    } catch (error: any) {
      logger.warn('Failed to collect Redis stats', { error: error.message });
      return undefined;
    }
  }

  /**
   * Get recent job history (last N jobs)
   */
  async getRecentJobs(limit: number = 50): Promise<any[]> {
    try {
      const completedJobs = await this.getQueueLazy().getJobs(['completed'], 0, limit);
      const failedJobs = await this.getQueueLazy().getJobs(['failed'], 0, limit);

      const allJobs = [...completedJobs, ...failedJobs]
        .sort((a, b) => (b.finishedOn || 0) - (a.finishedOn || 0))
        .slice(0, limit);

      return allJobs.map(job => ({
        jobId: job.id,
        status: job.failedReason ? 'failed' : 'completed',
        provider: job.data.provider,
        model: job.data.model,
        userId: job.data.userId,
        duration: job.returnvalue?.duration,
        retryCount: job.attemptsMade,
        finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
        error: job.failedReason,
      }));

    } catch (error: any) {
      logger.error('Failed to get recent jobs', { error: error.message });
      throw error;
    }
  }

  /**
   * Sprint 4: Classify error type
   */
  private classifyError(error: string): string {
    if (!error) return 'UNKNOWN';

    const errorLower = error.toLowerCase();

    // Timeout errors
    if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
      return 'TIMEOUT';
    }

    // Rate limit errors
    if (errorLower.includes('rate limit') || errorLower.includes('rate_limit') ||
        errorLower.includes('too many requests') || errorLower.includes('429')) {
      return 'RATE_LIMIT';
    }

    // Validation errors
    if (errorLower.includes('validation') || errorLower.includes('invalid')) {
      return 'VALIDATION_ERROR';
    }

    // Authentication errors
    if (errorLower.includes('auth') || errorLower.includes('unauthorized') ||
        errorLower.includes('401') || errorLower.includes('403')) {
      return 'AUTH_ERROR';
    }

    // Service unavailable
    if (errorLower.includes('503') || errorLower.includes('unavailable') ||
        errorLower.includes('service down')) {
      return 'SERVICE_UNAVAILABLE';
    }

    // Provider errors
    if (errorLower.includes('provider') || errorLower.includes('api error')) {
      return 'PROVIDER_ERROR';
    }

    // Network errors
    if (errorLower.includes('network') || errorLower.includes('connection') ||
        errorLower.includes('econnrefused') || errorLower.includes('enotfound')) {
      return 'NETWORK_ERROR';
    }

    // Model errors
    if (errorLower.includes('model') || errorLower.includes('not found')) {
      return 'MODEL_ERROR';
    }

    return 'UNKNOWN';
  }

  /**
   * Sprint 4: Calculate error statistics
   */
  private calculateErrorStats(failedJobs: Job[]): AIJobMetrics['errorStats'] {
    const errorsByType: { [key: string]: number } = {};
    let totalErrors = 0;

    failedJobs.forEach(job => {
      const error = job.failedReason || 'Unknown error';
      const errorType = this.classifyError(error);

      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      totalErrors++;
    });

    return {
      byType: errorsByType,
      total: totalErrors,
    };
  }

  /**
   * Cleanup (for graceful shutdown)
   */
  async cleanup(): Promise<void> {
    await this.redis.quit();
    logger.info('AI metrics service cleaned up');
  }
}

// Phase 2.5: LAZY initialization - don't create metrics service on module import
let _aiMetrics: AIMetricsService | null = null;

export function getAIMetrics(): AIMetricsService {
  if (!_aiMetrics) {
    _aiMetrics = AIMetricsService.getInstance();
  }
  return _aiMetrics;
}

// For backwards compatibility - lazy proxy
export const aiMetrics = {
  get instance() {
    return getAIMetrics();
  },
  collectMetrics: (...args: Parameters<AIMetricsService['collectMetrics']>) => getAIMetrics().collectMetrics(...args),
  getRecentErrors: (...args: Parameters<AIMetricsService['getRecentErrors']>) => getAIMetrics().getRecentErrors(...args),
  cleanup: () => getAIMetrics().cleanup(),
};
