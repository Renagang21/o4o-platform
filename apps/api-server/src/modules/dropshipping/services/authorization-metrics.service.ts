import logger from '../../../utils/logger.js';

/**
 * Phase B-4 Step 3: Authorization Metrics Service
 *
 * Tracks and monitors authorization system metrics for observability.
 * Provides insights into authorization patterns, rejections, and system health.
 *
 * Future enhancements:
 * - Integration with Prometheus/Grafana
 * - StatsD or CloudWatch metrics export
 * - Rate limiting based on metrics
 * - Anomaly detection for abuse patterns
 *
 * Created: 2025-01-04
 */

interface MetricsCounter {
  request: { success: number; error: number };
  approve: { success: number; error: number };
  reject: { success: number; error: number };
  revoke: { success: number; error: number };
  cancel: { success: number; error: number };
}

export class AuthorizationMetricsService {
  private counters: MetricsCounter;
  private cooldownBlocks: number;
  private limitRejections: number;
  private startTime: Date;

  constructor() {
    this.counters = {
      request: { success: 0, error: 0 },
      approve: { success: 0, error: 0 },
      reject: { success: 0, error: 0 },
      revoke: { success: 0, error: 0 },
      cancel: { success: 0, error: 0 },
    };
    this.cooldownBlocks = 0;
    this.limitRejections = 0;
    this.startTime = new Date();
  }

  /**
   * Increment request counter for an action
   */
  incrementRequestCounter(
    action: keyof MetricsCounter,
    result: 'success' | 'error'
  ): void {
    if (this.counters[action]) {
      this.counters[action][result]++;

      logger.debug('[AuthorizationMetrics] Counter incremented', {
        action,
        result,
        total: this.counters[action][result],
      });
    }
  }

  /**
   * Increment cooldown block counter
   * Called when a request is blocked due to active cooldown
   */
  incrementCooldownBlock(): void {
    this.cooldownBlocks++;

    logger.debug('[AuthorizationMetrics] Cooldown block', {
      total: this.cooldownBlocks,
    });
  }

  /**
   * Increment limit rejection counter
   * Called when a request is blocked due to product limit reached
   */
  incrementLimitRejection(): void {
    this.limitRejections++;

    logger.debug('[AuthorizationMetrics] Limit rejection', {
      total: this.limitRejections,
    });
  }

  /**
   * Get all metrics
   */
  getMetrics(): {
    counters: MetricsCounter;
    cooldownBlocks: number;
    limitRejections: number;
    uptime: number;
    startTime: Date;
  } {
    const uptime = Date.now() - this.startTime.getTime();

    return {
      counters: this.counters,
      cooldownBlocks: this.cooldownBlocks,
      limitRejections: this.limitRejections,
      uptime,
      startTime: this.startTime,
    };
  }

  /**
   * Get success rate for an action
   */
  getSuccessRate(action: keyof MetricsCounter): number {
    const { success, error } = this.counters[action];
    const total = success + error;

    if (total === 0) return 0;
    return (success / total) * 100;
  }

  /**
   * Reset all metrics
   * Useful for testing or periodic resets
   */
  reset(): void {
    this.counters = {
      request: { success: 0, error: 0 },
      approve: { success: 0, error: 0 },
      reject: { success: 0, error: 0 },
      revoke: { success: 0, error: 0 },
      cancel: { success: 0, error: 0 },
    };
    this.cooldownBlocks = 0;
    this.limitRejections = 0;
    this.startTime = new Date();

    logger.info('[AuthorizationMetrics] Metrics reset');
  }

  /**
   * Log current metrics summary
   */
  logSummary(): void {
    logger.info('[AuthorizationMetrics] Summary', {
      counters: this.counters,
      cooldownBlocks: this.cooldownBlocks,
      limitRejections: this.limitRejections,
      successRates: {
        request: this.getSuccessRate('request'),
        approve: this.getSuccessRate('approve'),
        reject: this.getSuccessRate('reject'),
        revoke: this.getSuccessRate('revoke'),
        cancel: this.getSuccessRate('cancel'),
      },
    });
  }
}

/**
 * Singleton instance
 */
export const authorizationMetrics = new AuthorizationMetricsService();
