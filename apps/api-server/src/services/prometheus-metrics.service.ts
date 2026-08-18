/**
 * Prometheus Metrics Service
 *
 * WO-O4O-IOREDIS-BULLMQ-RESIDUE-CENSUS-REMOVAL-V1:
 *   BullMQ AI job queue 가 제거되면서 ai_* 큐 지표(queue size / validation pass rate /
 *   job counter)는 생산자가 사라졌다. 본 서비스는 이제 default 프로세스 지표 registry 와
 *   HttpMetricsService 공유용 registry 제공만 담당한다.
 */

import * as promClient from 'prom-client';
import logger from '../utils/logger.js';

class PrometheusMetricsService {
  private static instance: PrometheusMetricsService;
  private static defaultMetricsCollected = false;
  public registry: promClient.Registry; // Made public to share with HTTP metrics

  // Cache metrics - removed to avoid duplication with HttpMetricsService
  // Cache metrics are now defined in HttpMetricsService only

  private constructor() {
    // Create a new registry
    this.registry = new promClient.Registry();

    // Add default metrics ONLY ONCE (process, nodejs metrics)
    if (!PrometheusMetricsService.defaultMetricsCollected) {
      promClient.collectDefaultMetrics({ register: this.registry });
      PrometheusMetricsService.defaultMetricsCollected = true;
      logger.info('✅ Default Prometheus metrics collection started');
    }

    logger.info('✅ Prometheus metrics service initialized');
  }

  static getInstance(): PrometheusMetricsService {
    if (!PrometheusMetricsService.instance) {
      PrometheusMetricsService.instance = new PrometheusMetricsService();
    }
    return PrometheusMetricsService.instance;
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get content type for Prometheus
   */
  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Record cache hit - delegate to HttpMetricsService to avoid duplication
   * @deprecated Use HttpMetricsService.recordCacheHit() instead
   */
  recordCacheHit(layer: 'l1' | 'l2', type: string): void {
    logger.warn('prometheusMetrics.recordCacheHit() is deprecated. Use httpMetrics.recordCacheHit() instead');
  }

  /**
   * Record cache miss - delegate to HttpMetricsService to avoid duplication
   * @deprecated Use HttpMetricsService.recordCacheMiss() instead
   */
  recordCacheMiss(type: string): void {
    logger.warn('prometheusMetrics.recordCacheMiss() is deprecated. Use httpMetrics.recordCacheMiss() instead');
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.registry.resetMetrics();
  }
}

export const prometheusMetrics = PrometheusMetricsService.getInstance();
