/**
 * Prometheus Metrics Service
 * Sprint 4: Expose AI job metrics in Prometheus format
 *
 * Metrics exposed:
 * - ai_jobs_total: Total number of jobs (by provider, status)
 * - ai_jobs_processing_duration_seconds: Job processing time histogram
 * - ai_jobs_retry_total: Total retry count
 * - ai_jobs_validation_pass_rate: Validation pass rate
 * - ai_queue_size: Queue size by status (waiting, active, completed, failed)
 * - ai_llm_tokens_total: LLM token usage (by provider, type)
 */

import * as promClient from 'prom-client';
import { aiMetrics } from './ai-metrics.service.js';
import logger from '../utils/logger.js';

class PrometheusMetricsService {
  private static instance: PrometheusMetricsService;
  private registry: promClient.Registry;

  // Metrics
  private jobsTotalCounter: promClient.Counter;
  private jobsProcessingDurationHistogram: promClient.Histogram;
  private jobsRetryCounter: promClient.Counter;
  private validationPassRateGauge: promClient.Gauge;
  private queueSizeGauge: promClient.Gauge;
  private llmTokensCounter: promClient.Counter;

  private constructor() {
    // Create a new registry
    this.registry = new promClient.Registry();

    // Add default metrics (process, nodejs metrics)
    promClient.collectDefaultMetrics({ register: this.registry });

    // Define custom metrics
    this.jobsTotalCounter = new promClient.Counter({
      name: 'ai_jobs_total',
      help: 'Total number of AI jobs processed',
      labelNames: ['provider', 'model', 'status'],
      registers: [this.registry],
    });

    this.jobsProcessingDurationHistogram = new promClient.Histogram({
      name: 'ai_jobs_processing_duration_seconds',
      help: 'AI job processing duration in seconds',
      labelNames: ['provider', 'model'],
      buckets: [0.5, 1, 2, 5, 10, 15, 30, 60], // seconds
      registers: [this.registry],
    });

    this.jobsRetryCounter = new promClient.Counter({
      name: 'ai_jobs_retry_total',
      help: 'Total number of job retries',
      labelNames: ['provider', 'model'],
      registers: [this.registry],
    });

    this.validationPassRateGauge = new promClient.Gauge({
      name: 'ai_jobs_validation_pass_rate',
      help: 'Validation pass rate (0-100)',
      registers: [this.registry],
    });

    this.queueSizeGauge = new promClient.Gauge({
      name: 'ai_queue_size',
      help: 'Number of jobs in queue by status',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.llmTokensCounter = new promClient.Counter({
      name: 'ai_llm_tokens_total',
      help: 'Total LLM tokens consumed',
      labelNames: ['provider', 'model', 'type'], // type: prompt, completion
      registers: [this.registry],
    });

    logger.info('✅ Prometheus metrics service initialized');
  }

  static getInstance(): PrometheusMetricsService {
    if (!PrometheusMetricsService.instance) {
      PrometheusMetricsService.instance = new PrometheusMetricsService();
    }
    return PrometheusMetricsService.instance;
  }

  /**
   * Update metrics from AI metrics service
   * Call this periodically or on-demand
   */
  async updateMetrics(): Promise<void> {
    try {
      const metrics = await aiMetrics.collectMetrics();

      // Update queue size
      this.queueSizeGauge.set({ status: 'waiting' }, metrics.queueStatus.waiting);
      this.queueSizeGauge.set({ status: 'active' }, metrics.queueStatus.active);
      this.queueSizeGauge.set({ status: 'completed' }, metrics.queueStatus.completed);
      this.queueSizeGauge.set({ status: 'failed' }, metrics.queueStatus.failed);
      this.queueSizeGauge.set({ status: 'delayed' }, metrics.queueStatus.delayed);

      // Update validation pass rate
      this.validationPassRateGauge.set(metrics.validationPassRate);

      // Update provider-specific metrics
      Object.entries(metrics.providerStats).forEach(([provider, stats]) => {
        // Note: Counter values should only increase, so we track them incrementally
        // For gauges, we can set absolute values
        // Since we're pulling from historical data, we'll skip counter updates here
        // and rely on real-time updates from job completion events
      });

    } catch (error: any) {
      logger.error('Failed to update Prometheus metrics', { error: error.message });
    }
  }

  /**
   * Record job completion (called from worker)
   */
  recordJobCompletion(
    provider: string,
    model: string,
    status: 'success' | 'failed',
    durationMs: number,
    retryCount: number,
    tokens?: { prompt?: number; completion?: number }
  ): void {
    // Increment job counter
    this.jobsTotalCounter.inc({ provider, model, status });

    // Record processing duration
    this.jobsProcessingDurationHistogram.observe(
      { provider, model },
      durationMs / 1000 // convert to seconds
    );

    // Record retries
    if (retryCount > 0) {
      this.jobsRetryCounter.inc({ provider, model }, retryCount);
    }

    // Record token usage
    if (tokens) {
      if (tokens.prompt) {
        this.llmTokensCounter.inc({ provider, model, type: 'prompt' }, tokens.prompt);
      }
      if (tokens.completion) {
        this.llmTokensCounter.inc({ provider, model, type: 'completion' }, tokens.completion);
      }
    }
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    // Update dynamic metrics before returning
    await this.updateMetrics();

    return this.registry.metrics();
  }

  /**
   * Get content type for Prometheus
   */
  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.registry.resetMetrics();
  }
}

export const prometheusMetrics = PrometheusMetricsService.getInstance();
