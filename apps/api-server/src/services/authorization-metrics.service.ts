import * as promClient from 'prom-client';

/**
 * Phase 9: Authorization Metrics Service
 *
 * Service for collecting and exposing Prometheus metrics for seller authorization system.
 *
 * Metrics Categories:
 * 1. Request Counters (approval, rejection, revocation rates)
 * 2. Business Rules (limit rejections, cooldown blocks)
 * 3. Gate Performance (latency, deny rate)
 * 4. Supplier Health (inbox size, response time)
 * 5. Cache Performance (hit rate, size)
 *
 * Feature Flag: ENABLE_SELLER_AUTHORIZATION (default: false)
 *
 * Created: 2025-01-07
 */

/**
 * Prometheus Metric Types (Specification)
 */

/**
 * 1. seller_auth_requests_total (Counter)
 *
 * Description: Total count of authorization requests by action and result
 * Labels: action, result
 * Actions: request, cancel, approve, reject, revoke
 * Results: success, error
 *
 * Example Queries:
 * - Total requests: `sum(seller_auth_requests_total{action="request"})`
 * - Approval rate: `rate(seller_auth_requests_total{action="approve"}[1h]) / rate(seller_auth_requests_total{action="request"}[1h])`
 * - Error rate: `rate(seller_auth_requests_total{result="error"}[5m])`
 *
 * Usage:
 * ```typescript
 * metrics.incrementRequestCounter('request', 'success');
 * metrics.incrementRequestCounter('approve', 'error');
 * ```
 */
export interface RequestCounterMetric {
  action: 'request' | 'cancel' | 'approve' | 'reject' | 'revoke';
  result: 'success' | 'error';
}

/**
 * 2. seller_auth_inbox_size (Gauge)
 *
 * Description: Number of pending authorization requests per supplier
 * Labels: supplierId
 *
 * Example Queries:
 * - Inbox size for supplier: `seller_auth_inbox_size{supplierId="uuid"}`
 * - Total pending requests: `sum(seller_auth_inbox_size)`
 * - Suppliers with >100 pending: `count(seller_auth_inbox_size > 100)`
 *
 * Usage:
 * ```typescript
 * metrics.setInboxSize('supplier-uuid', 25);
 * ```
 *
 * Update Frequency: Every 5 minutes (background job) or on state change
 */
export interface InboxSizeMetric {
  supplierId: string;
  size: number;
}

/**
 * 3. seller_auth_limit_rejections_total (Counter)
 *
 * Description: Number of requests rejected due to 10-product limit
 * Labels: None
 *
 * Example Queries:
 * - Total limit rejections: `seller_auth_limit_rejections_total`
 * - Rejection rate: `rate(seller_auth_limit_rejections_total[1h])`
 *
 * Usage:
 * ```typescript
 * metrics.incrementLimitRejection();
 * ```
 *
 * Alert Threshold: >10 rejections/hour (high demand, consider tier-based limits)
 */
export type LimitRejectionMetric = void;

/**
 * 4. seller_auth_cooldown_blocks_total (Counter)
 *
 * Description: Number of re-requests blocked due to cooldown period
 * Labels: None
 *
 * Example Queries:
 * - Total cooldown blocks: `seller_auth_cooldown_blocks_total`
 * - Block rate: `rate(seller_auth_cooldown_blocks_total[1h])`
 *
 * Usage:
 * ```typescript
 * metrics.incrementCooldownBlock();
 * ```
 *
 * Alert Threshold: >5 blocks/hour (sellers re-requesting too soon, education needed)
 */
export type CooldownBlockMetric = void;

/**
 * 5. seller_auth_gate_denies_total (Counter)
 *
 * Description: Number of denials at authorization gates (cart, order, settlement)
 * Labels: stage
 * Stages: cart, order, settlement
 *
 * Example Queries:
 * - Cart denials: `seller_auth_gate_denies_total{stage="cart"}`
 * - Total denials: `sum(seller_auth_gate_denies_total)`
 * - Denial rate by stage: `rate(seller_auth_gate_denies_total[5m])`
 *
 * Usage:
 * ```typescript
 * metrics.incrementGateDeny('cart');
 * metrics.incrementGateDeny('order');
 * ```
 *
 * Alert Threshold: Sudden spike (>50/min) indicates authorization issue
 */
export interface GateDenyMetric {
  stage: 'cart' | 'order' | 'settlement';
}

/**
 * 6. seller_auth_gate_duration_seconds (Histogram)
 *
 * Description: Authorization gate check latency distribution
 * Labels: cache_hit
 * Buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
 *
 * Example Queries:
 * - P95 latency: `histogram_quantile(0.95, rate(seller_auth_gate_duration_seconds_bucket[5m]))`
 * - P99 latency: `histogram_quantile(0.99, rate(seller_auth_gate_duration_seconds_bucket[5m]))`
 * - Cache hit P95: `histogram_quantile(0.95, rate(seller_auth_gate_duration_seconds_bucket{cache_hit="true"}[5m]))`
 * - Cache miss P95: `histogram_quantile(0.95, rate(seller_auth_gate_duration_seconds_bucket{cache_hit="false"}[5m]))`
 *
 * Usage:
 * ```typescript
 * const start = Date.now();
 * const isAuthorized = await gate.check();
 * metrics.recordGateLatency(Date.now() - start, cacheHit);
 * ```
 *
 * Alert Threshold: P95 >10ms (performance degradation)
 */
export interface GateLatencyMetric {
  durationMs: number;
  cacheHit: boolean;
}

/**
 * 7. seller_auth_cache_hit_rate (Gauge)
 *
 * Description: Cache hit rate (0-1) for authorization gate checks
 * Labels: None
 *
 * Example Queries:
 * - Current hit rate: `seller_auth_cache_hit_rate`
 * - Hit rate trend: `avg_over_time(seller_auth_cache_hit_rate[1h])`
 *
 * Usage:
 * ```typescript
 * metrics.setCacheHitRate(0.85); // 85% hit rate
 * ```
 *
 * Update Frequency: Every 1 minute (background job)
 * Alert Threshold: <70% (cache not effective, increase TTL or warm cache)
 */
export type CacheHitRateMetric = number;

/**
 * Authorization Metrics Service
 */
export class AuthorizationMetricsService {
  private registry: promClient.Registry;
  private requestsCounter: promClient.Counter;
  private inboxSizeGauge: promClient.Gauge;
  private limitRejectionsCounter: promClient.Counter;
  private cooldownBlocksCounter: promClient.Counter;
  private gateDeniesCounter: promClient.Counter;
  private gateLatencyHistogram: promClient.Histogram;
  private cacheHitRateGauge: promClient.Gauge;

  constructor() {
    this.registry = new promClient.Registry();

    // 1. seller_auth_requests_total
    this.requestsCounter = new promClient.Counter({
      name: 'seller_auth_requests_total',
      help: 'Total count of authorization requests by action and result',
      labelNames: ['action', 'result'],
      registers: [this.registry],
    });

    // 2. seller_auth_inbox_size
    this.inboxSizeGauge = new promClient.Gauge({
      name: 'seller_auth_inbox_size',
      help: 'Number of pending authorization requests per supplier',
      labelNames: ['supplierId'],
      registers: [this.registry],
    });

    // 3. seller_auth_limit_rejections_total
    this.limitRejectionsCounter = new promClient.Counter({
      name: 'seller_auth_limit_rejections_total',
      help: 'Number of requests rejected due to 10-product limit',
      registers: [this.registry],
    });

    // 4. seller_auth_cooldown_blocks_total
    this.cooldownBlocksCounter = new promClient.Counter({
      name: 'seller_auth_cooldown_blocks_total',
      help: 'Number of re-requests blocked due to cooldown period',
      registers: [this.registry],
    });

    // 5. seller_auth_gate_denies_total
    this.gateDeniesCounter = new promClient.Counter({
      name: 'seller_auth_gate_denies_total',
      help: 'Number of denials at authorization gates',
      labelNames: ['stage'],
      registers: [this.registry],
    });

    // 6. seller_auth_gate_duration_seconds
    this.gateLatencyHistogram = new promClient.Histogram({
      name: 'seller_auth_gate_duration_seconds',
      help: 'Authorization gate check latency distribution',
      labelNames: ['cache_hit'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    // 7. seller_auth_cache_hit_rate
    this.cacheHitRateGauge = new promClient.Gauge({
      name: 'seller_auth_cache_hit_rate',
      help: 'Cache hit rate (0-1) for authorization gate checks',
      registers: [this.registry],
    });
  }

  /**
   * Increment request counter
   *
   * @param action - Authorization action (request, approve, etc.)
   * @param result - Action result (success, error)
   *
   * @example
   * ```typescript
   * metrics.incrementRequestCounter('approve', 'success');
   * ```
   */
  incrementRequestCounter(action: RequestCounterMetric['action'], result: RequestCounterMetric['result']): void {
    this.requestsCounter.inc({ action, result });
  }

  /**
   * Set supplier inbox size
   */
  setInboxSize(supplierId: string, size: number): void {
    this.inboxSizeGauge.set({ supplierId }, size);
  }

  /**
   * Increment product limit rejection counter
   */
  incrementLimitRejection(): void {
    this.limitRejectionsCounter.inc();
  }

  /**
   * Increment cooldown block counter
   */
  incrementCooldownBlock(): void {
    this.cooldownBlocksCounter.inc();
  }

  /**
   * Increment gate deny counter
   */
  incrementGateDeny(stage: GateDenyMetric['stage']): void {
    this.gateDeniesCounter.inc({ stage });
  }

  /**
   * Record gate check latency
   *
   * Convert milliseconds to seconds for Prometheus
   */
  recordGateLatency(durationMs: number, cacheHit: boolean): void {
    const durationSeconds = durationMs / 1000;
    this.gateLatencyHistogram.observe({ cache_hit: cacheHit.toString() }, durationSeconds);
  }

  /**
   * Set cache hit rate (0-1)
   */
  setCacheHitRate(hitRate: number): void {
    this.cacheHitRateGauge.set(hitRate);
  }

  /**
   * Get all metrics for Prometheus scraping
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.registry.resetMetrics();
  }

  /**
   * Get registry (for integration with main Prometheus service)
   */
  getRegistry(): promClient.Registry {
    return this.registry;
  }
}

/**
 * Singleton instance
 */
export const authorizationMetrics = new AuthorizationMetricsService();

/**
 * Structured Log Keys (for JSON logging)
 *
 * Use these keys consistently for log aggregation and analysis.
 */
export const LOG_KEYS = {
  authId: 'authId',
  sellerId: 'sellerId',
  supplierId: 'supplierId',
  productId: 'productId',
  statusFrom: 'statusFrom',
  statusTo: 'statusTo',
  reason: 'reason',
  limitUsed: 'limitUsed',
  limitCap: 'limitCap',
  cooldownUntil: 'cooldownUntil',
  cacheHit: 'cacheHit',
  latencyMs: 'latencyMs',
  errorCode: 'errorCode',
} as const;

/**
 * Example Log Usage:
 *
 * ```typescript
 * import logger from '../utils/logger.js';
 * import { LOG_KEYS } from './authorization-metrics.service.js';
 *
 * logger.info('Authorization approved', {
 *   [LOG_KEYS.authId]: 'uuid',
 *   [LOG_KEYS.sellerId]: 'uuid',
 *   [LOG_KEYS.supplierId]: 'uuid',
 *   [LOG_KEYS.productId]: 'uuid',
 *   [LOG_KEYS.statusFrom]: 'REQUESTED',
 *   [LOG_KEYS.statusTo]: 'APPROVED',
 * });
 * ```
 */
