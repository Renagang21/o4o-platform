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
  private registry: promClient.Registry;

  // HTTP Metrics
  private httpRequestsTotal: promClient.Counter;
  private httpRequestDuration: promClient.Histogram;
  private httpRequestsInProgress: promClient.Gauge;

  // Custom Business Metrics
  private commissionsInProgress: promClient.Gauge;
  private activePartnersCount: promClient.Gauge;

  private constructor(registry: promClient.Registry) {
    this.registry = registry;

    // Define HTTP request counter
    this.httpRequestsTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    // Define HTTP request duration histogram
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // seconds
      registers: [this.registry],
    });

    // Define requests in progress gauge
    this.httpRequestsInProgress = new promClient.Gauge({
      name: 'http_requests_in_progress',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method', 'path'],
      registers: [this.registry],
    });

    // Custom business metrics
    this.commissionsInProgress = new promClient.Gauge({
      name: 'commissions_in_progress',
      help: 'Number of commissions currently in progress state',
      registers: [this.registry],
    });

    this.activePartnersCount = new promClient.Gauge({
      name: 'active_partners_count',
      help: 'Number of active partners in the system',
      registers: [this.registry],
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
}

export default HttpMetricsService;
export { HttpMetricsService };
