/**
 * HTTP Metrics Middleware for Prometheus
 *
 * Collects HTTP request metrics:
 * - http_requests_total: Total HTTP requests by method, path, status
 * - http_request_duration_seconds: Request duration histogram
 */

import { Request, Response, NextFunction } from 'express';
import * as promClient from 'prom-client';
import logger from '../utils/logger.js';

class HttpMetricsService {
  private static instance: HttpMetricsService;
  private static registry: promClient.Registry;

  // HTTP Metrics
  private httpRequestsTotal: promClient.Counter;
  private httpRequestDuration: promClient.Histogram;
  private httpRequestsInProgress: promClient.Gauge;

  // Custom Business Metrics
  private commissionsInProgress: promClient.Gauge;
  private activePartnersCount: promClient.Gauge;

  // Cache Metrics
  private cacheHitsTotal: promClient.Counter;
  private cacheMissesTotal: promClient.Counter;
  private cacheHitRate: promClient.Gauge;
  private redisErrorsTotal: promClient.Counter;

  // Webhook Metrics
  private webhookDeliveriesTotal: promClient.Counter;
  private webhookDeliveryDuration: promClient.Histogram;
  private webhookQueueSize: promClient.Gauge;
  private webhookFailuresTotal: promClient.Counter;

  // Batch Job Metrics
  private batchJobRunsTotal: promClient.Counter;
  private batchJobDuration: promClient.Histogram;
  private batchJobItemsProcessed: promClient.Counter;

  private constructor(registry: promClient.Registry) {
    HttpMetricsService.registry = registry;

    // Helper to get or create metric
    const getOrCreateMetric = <T extends promClient.Counter | promClient.Histogram | promClient.Gauge>(
      MetricClass: any,
      config: any
    ): T => {
      try {
        // Try to get existing metric
        const existing = registry.getSingleMetric(config.name);
        if (existing) {
          logger.info(`♻️  Reusing existing metric: ${config.name}`);
          return existing as T;
        }
      } catch (e) {
        // Metric doesn't exist, create new one
      }
      return new MetricClass(config) as T;
    };

    // Define HTTP request counter
    this.httpRequestsTotal = getOrCreateMetric<promClient.Counter>(promClient.Counter, {
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [registry],
    });

    // Define HTTP request duration histogram
    this.httpRequestDuration = getOrCreateMetric<promClient.Histogram>(promClient.Histogram, {
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // seconds
      registers: [registry],
    });

    // Define requests in progress gauge
    this.httpRequestsInProgress = getOrCreateMetric<promClient.Gauge>(promClient.Gauge, {
      name: 'http_requests_in_progress',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method', 'path'],
      registers: [registry],
    });

    // Custom business metrics
    this.commissionsInProgress = getOrCreateMetric<promClient.Gauge>(promClient.Gauge, {
      name: 'commissions_in_progress',
      help: 'Number of commissions currently in progress state',
      registers: [registry],
    });

    this.activePartnersCount = getOrCreateMetric<promClient.Gauge>(promClient.Gauge, {
      name: 'active_partners_count',
      help: 'Number of active partners in the system',
      registers: [registry],
    });

    // Cache metrics
    this.cacheHitsTotal = getOrCreateMetric<promClient.Counter>(promClient.Counter, {
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['layer', 'type'],
      registers: [registry],
    });

    this.cacheMissesTotal = getOrCreateMetric<promClient.Counter>(promClient.Counter, {
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['type'],
      registers: [registry],
    });

    this.cacheHitRate = getOrCreateMetric<promClient.Gauge>(promClient.Gauge, {
      name: 'cache_hit_rate',
      help: 'Cache hit rate (0-1)',
      registers: [registry],
    });

    this.redisErrorsTotal = getOrCreateMetric<promClient.Counter>(promClient.Counter, {
      name: 'redis_errors_total',
      help: 'Total number of Redis errors',
      labelNames: ['op'],
      registers: [registry],
    });

    // Webhook metrics
    this.webhookDeliveriesTotal = getOrCreateMetric<promClient.Counter>(promClient.Counter, {
      name: 'webhook_deliveries_total',
      help: 'Total number of webhook deliveries',
      labelNames: ['event', 'status'],
      registers: [registry],
    });

    this.webhookDeliveryDuration = getOrCreateMetric<promClient.Histogram>(promClient.Histogram, {
      name: 'webhook_delivery_duration_seconds',
      help: 'Webhook delivery duration in seconds',
      labelNames: ['event', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [registry],
    });

    this.webhookQueueSize = getOrCreateMetric<promClient.Gauge>(promClient.Gauge, {
      name: 'webhook_queue_size',
      help: 'Number of webhooks in queue by status',
      labelNames: ['status'],
      registers: [registry],
    });

    this.webhookFailuresTotal = getOrCreateMetric<promClient.Counter>(promClient.Counter, {
      name: 'webhook_failures_total',
      help: 'Total number of webhook delivery failures',
      labelNames: ['event', 'reason'],
      registers: [registry],
    });

    // Batch job metrics
    this.batchJobRunsTotal = getOrCreateMetric<promClient.Counter>(promClient.Counter, {
      name: 'batch_job_runs_total',
      help: 'Total number of batch job runs',
      labelNames: ['job_name', 'status'],
      registers: [registry],
    });

    this.batchJobDuration = getOrCreateMetric<promClient.Histogram>(promClient.Histogram, {
      name: 'batch_job_duration_seconds',
      help: 'Batch job duration in seconds',
      labelNames: ['job_name'],
      buckets: [1, 5, 10, 30, 60, 120, 300],
      registers: [registry],
    });

    this.batchJobItemsProcessed = getOrCreateMetric<promClient.Counter>(promClient.Counter, {
      name: 'batch_job_items_processed_total',
      help: 'Total number of items processed by batch jobs',
      labelNames: ['job_name', 'status'],
      registers: [registry],
    });

    logger.info('✅ HTTP metrics middleware initialized');
  }

  static getInstance(registry: promClient.Registry): HttpMetricsService {
    if (!HttpMetricsService.instance) {
      HttpMetricsService.instance = new HttpMetricsService(registry);
    }
    return HttpMetricsService.instance;
  }

  /**
   * Express middleware to track HTTP metrics
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip metrics endpoint itself to avoid recursion
      if (req.path === '/metrics' || req.path === '/health') {
        return next();
      }

      // Normalize path to avoid cardinality explosion
      const path = this.normalizePath(req.path);
      const method = req.method;

      // Start timer
      const end = this.httpRequestDuration.startTimer({ method, path });

      // Track in-progress requests
      this.httpRequestsInProgress.inc({ method, path });

      // Hook into response finish event
      res.on('finish', () => {
        const status = res.statusCode.toString();

        // Record metrics
        this.httpRequestsTotal.inc({ method, path, status });
        end({ status });

        // Decrement in-progress counter
        this.httpRequestsInProgress.dec({ method, path });
      });

      next();
    };
  }

  /**
   * Normalize path to reduce cardinality
   * Converts /api/v1/posts/123 -> /api/v1/posts/:id
   */
  private normalizePath(path: string): string {
    return path
      .replace(/\/\d+/g, '/:id') // Replace numeric IDs
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid') // Replace UUIDs
      .replace(/\/[a-f0-9]{24}/g, '/:id'); // Replace MongoDB ObjectIds
  }

  /**
   * Update business metrics (call periodically or on-demand)
   */
  async updateBusinessMetrics(): Promise<void> {
    try {
      // These will be populated from actual data sources
      // For now, they're placeholders
      // TODO: Integrate with actual commission and partner services
    } catch (error: any) {
      logger.error('Failed to update business metrics', { error: error.message });
    }
  }

  /**
   * Set commissions in progress count
   */
  setCommissionsInProgress(count: number): void {
    this.commissionsInProgress.set(count);
  }

  /**
   * Set active partners count
   */
  setActivePartnersCount(count: number): void {
    this.activePartnersCount.set(count);
  }

  /**
   * Record cache hit
   */
  recordCacheHit(layer: 'L1' | 'L2', type: string): void {
    this.cacheHitsTotal.inc({ layer, type });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(type: string): void {
    this.cacheMissesTotal.inc({ type });
  }

  /**
   * Record Redis error
   */
  recordRedisError(op: string): void {
    this.redisErrorsTotal.inc({ op });
  }

  /**
   * Update cache hit rate from CacheService stats
   */
  async updateCacheMetrics(): Promise<void> {
    try {
      // Import CacheService dynamically to avoid circular dependency
      const { cacheService } = await import('../services/CacheService.js');
      const stats = cacheService.getStats();

      // Update hit rate gauge
      this.cacheHitRate.set(stats.hitRate);

      // Update counters with current totals (they track cumulative values)
      // Note: Prometheus counters should only increase, so we track incrementally
    } catch (error: any) {
      logger.error('Failed to update cache metrics', { error: error.message });
    }
  }

  /**
   * Record webhook delivery
   */
  recordWebhookDelivery(event: string, status: 'success' | 'failed', duration: number): void {
    this.webhookDeliveriesTotal.inc({ event, status });
    this.webhookDeliveryDuration.observe({ event, status }, duration);
  }

  /**
   * Record webhook failure
   */
  recordWebhookFailure(event: string, reason: string): void {
    this.webhookFailuresTotal.inc({ event, reason });
  }

  /**
   * Update webhook queue size metrics
   */
  async updateWebhookQueueMetrics(): Promise<void> {
    try {
      const { getWebhookQueueStats } = await import('../queues/webhook.queue.js');
      const stats = await getWebhookQueueStats();

      this.webhookQueueSize.set({ status: 'waiting' }, stats.waiting);
      this.webhookQueueSize.set({ status: 'active' }, stats.active);
      this.webhookQueueSize.set({ status: 'completed' }, stats.completed);
      this.webhookQueueSize.set({ status: 'failed' }, stats.failed);
      this.webhookQueueSize.set({ status: 'delayed' }, stats.delayed);
    } catch (error: any) {
      logger.error('Failed to update webhook queue metrics', { error: error.message });
    }
  }

  /**
   * Record batch job run
   */
  recordBatchJobRun(jobName: string, status: 'success' | 'failed', duration: number): void {
    this.batchJobRunsTotal.inc({ job_name: jobName, status });
    this.batchJobDuration.observe({ job_name: jobName }, duration);
  }

  /**
   * Record batch job items processed
   */
  recordBatchJobItemsProcessed(jobName: string, status: 'success' | 'failed', count: number): void {
    this.batchJobItemsProcessed.inc({ job_name: jobName, status }, count);
  }
}

export default HttpMetricsService;
export { HttpMetricsService };
