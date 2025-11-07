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
 * Status: SPECIFICATION - Implementation pending
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
 *
 * SPECIFICATION ONLY - Stub implementation logs to console
 */
export class AuthorizationMetricsService {
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
   *
   * Implementation:
   * - Use Prometheus client library: `prom-client`
   * - Counter name: `seller_auth_requests_total`
   * - Labels: { action, result }
   */
  incrementRequestCounter(action: RequestCounterMetric['action'], result: RequestCounterMetric['result']): void {
    console.log('[STUB] Metrics: seller_auth_requests_total', { action, result });
  }

  /**
   * Set supplier inbox size
   *
   * @param supplierId - Supplier UUID
   * @param size - Number of pending requests
   *
   * @example
   * ```typescript
   * metrics.setInboxSize('supplier-uuid', 42);
   * ```
   *
   * Implementation:
   * - Use Prometheus Gauge
   * - Gauge name: `seller_auth_inbox_size`
   * - Labels: { supplierId }
   */
  setInboxSize(supplierId: string, size: number): void {
    console.log('[STUB] Metrics: seller_auth_inbox_size', { supplierId, size });
  }

  /**
   * Increment product limit rejection counter
   *
   * @example
   * ```typescript
   * metrics.incrementLimitRejection();
   * ```
   *
   * Implementation:
   * - Use Prometheus Counter
   * - Counter name: `seller_auth_limit_rejections_total`
   */
  incrementLimitRejection(): void {
    console.log('[STUB] Metrics: seller_auth_limit_rejections_total');
  }

  /**
   * Increment cooldown block counter
   *
   * @example
   * ```typescript
   * metrics.incrementCooldownBlock();
   * ```
   *
   * Implementation:
   * - Use Prometheus Counter
   * - Counter name: `seller_auth_cooldown_blocks_total`
   */
  incrementCooldownBlock(): void {
    console.log('[STUB] Metrics: seller_auth_cooldown_blocks_total');
  }

  /**
   * Increment gate deny counter
   *
   * @param stage - Gate stage (cart, order, settlement)
   *
   * @example
   * ```typescript
   * metrics.incrementGateDeny('cart');
   * ```
   *
   * Implementation:
   * - Use Prometheus Counter
   * - Counter name: `seller_auth_gate_denies_total`
   * - Labels: { stage }
   */
  incrementGateDeny(stage: GateDenyMetric['stage']): void {
    console.log('[STUB] Metrics: seller_auth_gate_denies_total', { stage });
  }

  /**
   * Record gate check latency
   *
   * @param durationMs - Duration in milliseconds
   * @param cacheHit - Was cache hit?
   *
   * @example
   * ```typescript
   * const start = Date.now();
   * const result = await gate.check();
   * metrics.recordGateLatency(Date.now() - start, true);
   * ```
   *
   * Implementation:
   * - Use Prometheus Histogram
   * - Histogram name: `seller_auth_gate_duration_seconds`
   * - Labels: { cache_hit }
   * - Buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1] (1ms to 1s)
   * - Convert ms to seconds: `durationMs / 1000`
   */
  recordGateLatency(durationMs: number, cacheHit: boolean): void {
    console.log('[STUB] Metrics: seller_auth_gate_duration_seconds', { durationMs, cacheHit });
  }

  /**
   * Set cache hit rate
   *
   * @param hitRate - Hit rate (0-1)
   *
   * @example
   * ```typescript
   * metrics.setCacheHitRate(0.87); // 87% hit rate
   * ```
   *
   * Implementation:
   * - Use Prometheus Gauge
   * - Gauge name: `seller_auth_cache_hit_rate`
   * - Value range: 0.0 to 1.0
   */
  setCacheHitRate(hitRate: number): void {
    console.log('[STUB] Metrics: seller_auth_cache_hit_rate', { hitRate });
  }

  /**
   * Get all metrics for Prometheus scraping
   *
   * @returns Prometheus-formatted metrics string
   *
   * @example
   * ```typescript
   * app.get('/metrics', async (req, res) => {
   *   const metrics = await authorizationMetrics.getMetrics();
   *   res.set('Content-Type', 'text/plain');
   *   res.send(metrics);
   * });
   * ```
   *
   * Implementation:
   * - Use `prom-client` registry
   * - Return: `await register.metrics()`
   */
  async getMetrics(): Promise<string> {
    console.log('[STUB] Metrics: getMetrics called');
    return '# STUB: Metrics not implemented yet';
  }

  /**
   * Reset all metrics (for testing)
   *
   * @example
   * ```typescript
   * beforeEach(() => {
   *   metrics.reset();
   * });
   * ```
   */
  reset(): void {
    console.log('[STUB] Metrics: reset called');
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
