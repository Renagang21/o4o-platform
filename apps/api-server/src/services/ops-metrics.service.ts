/**
 * Operational Metrics Service
 *
 * WO-O4O-OBSERVABILITY-LAYER-V1
 *
 * Lightweight in-memory metrics for operational visibility.
 * Console-based initially, Prometheus-compatible structure.
 *
 * Principles:
 * - Zero external dependencies (no Redis/Prometheus required)
 * - Always works, never blocks main flow
 * - Periodic log output for dev/ops dashboard
 * - Fire-and-forget (no async, no errors)
 */

import logger from '../utils/logger.js';
import { betaConfig } from '../config/app.config.js';

class OpsMetrics {
  private counters = new Map<string, number>();
  private lastFlush = Date.now();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Increment a counter.
   * Labels are encoded into the key: `metric{label1=val1,label2=val2}`
   */
  inc(metric: string, labels?: Record<string, string>): void {
    const key = labels
      ? `${metric}{${Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(',')}}`
      : metric;
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  /**
   * Get current snapshot of all counters.
   */
  snapshot(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, value] of this.counters) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Get and reset counters (for periodic flush).
   */
  private flush(): Record<string, number> {
    const result = this.snapshot();
    this.counters.clear();
    this.lastFlush = Date.now();
    return result;
  }

  /**
   * Start periodic summary log.
   * Outputs non-zero metrics every `intervalMs` milliseconds.
   */
  startPeriodicLog(intervalMs = 60_000): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      const metrics = this.flush();
      const nonZero = Object.entries(metrics).filter(([, v]) => v > 0);

      if (nonZero.length === 0) return;

      const summary: Record<string, number> = {};
      for (const [k, v] of nonZero) {
        summary[k] = v;
      }

      logger.info('[OpsMetrics] 60s summary', summary);
    }, intervalMs);

    // Don't prevent process exit
    if (this.intervalId && typeof this.intervalId === 'object' && 'unref' in this.intervalId) {
      this.intervalId.unref();
    }
  }

  /**
   * Stop periodic log (for graceful shutdown).
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

/** Singleton instance */
export const opsMetrics = new OpsMetrics();

// Auto-start periodic log when BETA_MODE=true
if (betaConfig.isEnabled()) {
  opsMetrics.startPeriodicLog(60_000);
}

/**
 * Pre-defined metric names for type safety.
 */
export const OPS = {
  // Checkout
  CHECKOUT_ATTEMPT: 'checkout.attempt',
  CHECKOUT_SUCCESS: 'checkout.success',
  CHECKOUT_BLOCKED_DISTRIBUTION: 'checkout.blocked.distribution',
  CHECKOUT_BLOCKED_STOCK: 'checkout.blocked.stock',
  CHECKOUT_BLOCKED_SALES_LIMIT: 'checkout.blocked.sales_limit',
  CHECKOUT_BLOCKED_PRODUCT: 'checkout.blocked.product',
  CHECKOUT_ERROR: 'checkout.error',

  // Payment
  PAYMENT_PREPARE: 'payment.prepare',
  PAYMENT_PREPARE_ERROR: 'payment.prepare.error',
  PAYMENT_CONFIRM_SUCCESS: 'payment.confirm.success',
  PAYMENT_CONFIRM_FAILED: 'payment.confirm.failed',
  PAYMENT_DUPLICATE_BLOCKED: 'payment.duplicate.blocked',

  // Cache
  CACHE_HIT: 'cache.hit',
  CACHE_MISS: 'cache.miss',
  CACHE_ERROR: 'cache.error',
} as const;

export default opsMetrics;
