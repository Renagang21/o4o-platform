/**
 * AI Usage Report Service
 * Sprint 4: LLM token usage tracking and cost estimation
 *
 * Features:
 * - Track token usage by provider, model, user, date
 * - Generate usage reports with cost estimation
 * - Export reports in various formats
 * - Aggregate usage statistics
 */

import { Queue, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { aiJobQueue } from './ai-job-queue.service.js';
import { AIJobResult } from '../types/ai-job.types.js';
import logger from '../utils/logger.js';

// Approximate pricing per 1K tokens (as of 2024)
// Note: Update these values based on actual provider pricing
const TOKEN_PRICING: Record<string, Record<string, { prompt: number; completion: number }>> = {
  openai: {
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
  },
  anthropic: {
    'claude-3-opus': { prompt: 0.015, completion: 0.075 },
    'claude-3-sonnet': { prompt: 0.003, completion: 0.015 },
    'claude-3-haiku': { prompt: 0.00025, completion: 0.00125 },
  },
  google: {
    'gemini-pro': { prompt: 0.00025, completion: 0.0005 },
    'gemini-ultra': { prompt: 0.001, completion: 0.002 },
  },
};

interface UsageEntry {
  userId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  timestamp: string;
  jobId: string;
}

interface UsageReport {
  // Time range
  startDate: string;
  endDate: string;

  // Overall statistics
  totalJobs: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalEstimatedCost: number;

  // Breakdown by provider
  byProvider: {
    [provider: string]: {
      jobs: number;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCost: number;
    };
  };

  // Breakdown by model
  byModel: {
    [model: string]: {
      provider: string;
      jobs: number;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCost: number;
    };
  };

  // Breakdown by user (top N users)
  byUser: {
    [userId: string]: {
      jobs: number;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCost: number;
    };
  };

  // Daily breakdown
  byDate: {
    [date: string]: {
      jobs: number;
      totalTokens: number;
      estimatedCost: number;
    };
  };
}

class AIUsageReportService {
  private static instance: AIUsageReportService;
  private queue: Queue;
  private redis: Redis;

  private constructor() {
    // Phase 2.5: Lazy queue access - don't create immediately
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
          logger.warn('🔄 GRACEFUL_STARTUP: AI usage report Redis connection retries exhausted');
          return null;
        }
        return Math.min(times * 500, 3000);
      },
    });

    // CRITICAL: Attach error handler immediately to prevent unhandled error crashes
    this.redis.on('error', (error: Error) => {
      logger.error('AI usage report Redis error:', { error: error.message });
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

  static getInstance(): AIUsageReportService {
    if (!AIUsageReportService.instance) {
      AIUsageReportService.instance = new AIUsageReportService();
    }
    return AIUsageReportService.instance;
  }

  /**
   * Generate usage report for a time period
   */
  async generateReport(
    startDate: Date,
    endDate: Date,
    options?: {
      userId?: string;
      provider?: string;
      model?: string;
      topUsersLimit?: number;
    }
  ): Promise<UsageReport> {
    try {
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();

      // Get all completed jobs in time range
      const completedJobs = await this.getQueueLazy().getJobs(['completed'], 0, 10000);

      // Filter jobs by time range and optional filters
      const filteredJobs = completedJobs.filter(job => {
        if (!job.finishedOn) return false;
        if (job.finishedOn < startTime || job.finishedOn > endTime) return false;

        // Apply optional filters
        if (options?.userId && job.data.userId !== options.userId) return false;
        if (options?.provider && job.data.provider !== options.provider) return false;
        if (options?.model && job.data.model !== options.model) return false;

        return true;
      });

      // Extract usage data
      const usageEntries: UsageEntry[] = filteredJobs
        .map(job => {
          const result = job.returnvalue as AIJobResult;
          if (!result || !result.usage) return null;

          const promptTokens = result.usage.promptTokens || 0;
          const completionTokens = result.usage.completionTokens || 0;
          const totalTokens = result.usage.totalTokens || (promptTokens + completionTokens);

          const estimatedCost = this.estimateCost(
            job.data.provider,
            job.data.model,
            promptTokens,
            completionTokens
          );

          return {
            userId: job.data.userId,
            provider: job.data.provider,
            model: job.data.model,
            promptTokens,
            completionTokens,
            totalTokens,
            estimatedCost,
            timestamp: job.finishedOn ? new Date(job.finishedOn).toISOString() : '',
            jobId: job.id!,
          };
        })
        .filter(entry => entry !== null) as UsageEntry[];

      // Build report
      const report: UsageReport = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalJobs: usageEntries.length,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        totalEstimatedCost: 0,
        byProvider: {},
        byModel: {},
        byUser: {},
        byDate: {},
      };

      // Aggregate statistics
      usageEntries.forEach(entry => {
        // Overall totals
        report.totalPromptTokens += entry.promptTokens;
        report.totalCompletionTokens += entry.completionTokens;
        report.totalTokens += entry.totalTokens;
        report.totalEstimatedCost += entry.estimatedCost;

        // By provider
        if (!report.byProvider[entry.provider]) {
          report.byProvider[entry.provider] = {
            jobs: 0,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            estimatedCost: 0,
          };
        }
        report.byProvider[entry.provider].jobs++;
        report.byProvider[entry.provider].promptTokens += entry.promptTokens;
        report.byProvider[entry.provider].completionTokens += entry.completionTokens;
        report.byProvider[entry.provider].totalTokens += entry.totalTokens;
        report.byProvider[entry.provider].estimatedCost += entry.estimatedCost;

        // By model
        if (!report.byModel[entry.model]) {
          report.byModel[entry.model] = {
            provider: entry.provider,
            jobs: 0,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            estimatedCost: 0,
          };
        }
        report.byModel[entry.model].jobs++;
        report.byModel[entry.model].promptTokens += entry.promptTokens;
        report.byModel[entry.model].completionTokens += entry.completionTokens;
        report.byModel[entry.model].totalTokens += entry.totalTokens;
        report.byModel[entry.model].estimatedCost += entry.estimatedCost;

        // By user
        if (!report.byUser[entry.userId]) {
          report.byUser[entry.userId] = {
            jobs: 0,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            estimatedCost: 0,
          };
        }
        report.byUser[entry.userId].jobs++;
        report.byUser[entry.userId].promptTokens += entry.promptTokens;
        report.byUser[entry.userId].completionTokens += entry.completionTokens;
        report.byUser[entry.userId].totalTokens += entry.totalTokens;
        report.byUser[entry.userId].estimatedCost += entry.estimatedCost;

        // By date
        const dateKey = entry.timestamp.split('T')[0]; // YYYY-MM-DD
        if (!report.byDate[dateKey]) {
          report.byDate[dateKey] = {
            jobs: 0,
            totalTokens: 0,
            estimatedCost: 0,
          };
        }
        report.byDate[dateKey].jobs++;
        report.byDate[dateKey].totalTokens += entry.totalTokens;
        report.byDate[dateKey].estimatedCost += entry.estimatedCost;
      });

      // Limit top users if specified
      if (options?.topUsersLimit) {
        const sortedUsers = Object.entries(report.byUser)
          .sort(([, a], [, b]) => b.totalTokens - a.totalTokens)
          .slice(0, options.topUsersLimit);

        report.byUser = Object.fromEntries(sortedUsers);
      }

      // Round all costs to 2 decimal places
      report.totalEstimatedCost = Math.round(report.totalEstimatedCost * 100) / 100;
      Object.keys(report.byProvider).forEach(key => {
        report.byProvider[key].estimatedCost = Math.round(report.byProvider[key].estimatedCost * 100) / 100;
      });
      Object.keys(report.byModel).forEach(key => {
        report.byModel[key].estimatedCost = Math.round(report.byModel[key].estimatedCost * 100) / 100;
      });
      Object.keys(report.byUser).forEach(key => {
        report.byUser[key].estimatedCost = Math.round(report.byUser[key].estimatedCost * 100) / 100;
      });
      Object.keys(report.byDate).forEach(key => {
        report.byDate[key].estimatedCost = Math.round(report.byDate[key].estimatedCost * 100) / 100;
      });

      logger.info('Generated usage report', {
        startDate: report.startDate,
        endDate: report.endDate,
        totalJobs: report.totalJobs,
        totalCost: report.totalEstimatedCost,
      });

      return report;

    } catch (error: any) {
      logger.error('Failed to generate usage report', { error: error.message });
      throw error;
    }
  }

  /**
   * Estimate cost based on token usage
   */
  private estimateCost(
    provider: string,
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    const pricing = TOKEN_PRICING[provider]?.[model];

    if (!pricing) {
      logger.warn('No pricing data for provider/model', { provider, model });
      return 0;
    }

    // Cost per 1K tokens
    const promptCost = (promptTokens / 1000) * pricing.prompt;
    const completionCost = (completionTokens / 1000) * pricing.completion;

    return promptCost + completionCost;
  }

  /**
   * Get current month report
   */
  async getCurrentMonthReport(): Promise<UsageReport> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return this.generateReport(startDate, endDate);
  }

  /**
   * Get last N days report
   */
  async getLastNDaysReport(days: number): Promise<UsageReport> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.generateReport(startDate, endDate);
  }

  /**
   * Export report as CSV
   */
  exportAsCSV(report: UsageReport): string {
    const lines: string[] = [];

    // Header
    lines.push('# AI Usage Report');
    lines.push(`# Period: ${report.startDate} to ${report.endDate}`);
    lines.push(`# Total Jobs: ${report.totalJobs}`);
    lines.push(`# Total Tokens: ${report.totalTokens}`);
    lines.push(`# Total Cost: $${report.totalEstimatedCost}`);
    lines.push('');

    // By Provider
    lines.push('Provider,Jobs,Prompt Tokens,Completion Tokens,Total Tokens,Estimated Cost');
    Object.entries(report.byProvider).forEach(([provider, stats]) => {
      lines.push(`${provider},${stats.jobs},${stats.promptTokens},${stats.completionTokens},${stats.totalTokens},${stats.estimatedCost}`);
    });
    lines.push('');

    // By Model
    lines.push('Model,Provider,Jobs,Prompt Tokens,Completion Tokens,Total Tokens,Estimated Cost');
    Object.entries(report.byModel).forEach(([model, stats]) => {
      lines.push(`${model},${stats.provider},${stats.jobs},${stats.promptTokens},${stats.completionTokens},${stats.totalTokens},${stats.estimatedCost}`);
    });
    lines.push('');

    // By Date
    lines.push('Date,Jobs,Total Tokens,Estimated Cost');
    Object.entries(report.byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, stats]) => {
        lines.push(`${date},${stats.jobs},${stats.totalTokens},${stats.estimatedCost}`);
      });

    return lines.join('\n');
  }

  /**
   * Cleanup (for graceful shutdown)
   */
  async cleanup(): Promise<void> {
    await this.redis.quit();
    logger.info('AI usage report service cleaned up');
  }
}

// Phase 2.5: LAZY initialization - don't create usage report service on module import
let _aiUsageReport: AIUsageReportService | null = null;

export function getAIUsageReport(): AIUsageReportService {
  if (!_aiUsageReport) {
    _aiUsageReport = AIUsageReportService.getInstance();
  }
  return _aiUsageReport;
}

// For backwards compatibility - lazy proxy
export const aiUsageReport = {
  get instance() {
    return getAIUsageReport();
  },
  generateReport: (...args: Parameters<AIUsageReportService['generateReport']>) => getAIUsageReport().generateReport(...args),
  exportReport: (report: any) => getAIUsageReport().exportAsCSV(report),
  exportAsCSV: (report: any) => getAIUsageReport().exportAsCSV(report),
  getCurrentMonthReport: () => getAIUsageReport().getCurrentMonthReport(),
  getLastNDaysReport: (...args: Parameters<AIUsageReportService['getLastNDaysReport']>) => getAIUsageReport().getLastNDaysReport(...args),
  getRecentUsage: (...args: any) => getAIUsageReport().getCurrentMonthReport(),
  cleanup: () => getAIUsageReport().cleanup(),
};
