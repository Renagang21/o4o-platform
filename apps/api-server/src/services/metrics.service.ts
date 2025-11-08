import { Registry, Histogram, Counter, Summary } from 'prom-client';

/**
 * Prometheus Metrics Service
 * Phase 8: Policy Resolution & Commission Calculation Metrics
 *
 * Metrics:
 * 1. policy_resolution_duration_ms - Policy resolution latency (Histogram)
 * 2. policy_resolution_total - Policy resolutions by source level (Counter)
 * 3. commission_calc_total - Commission calculations by result (Counter)
 * 4. commission_value_sum - Total commission value (Summary)
 * 5. shadow_mode_comparison_total - Shadow mode comparisons by status (Counter)
 * 6. shadow_mode_diff_absolute - Shadow mode absolute difference (Histogram)
 *
 * Created: 2025-01-07
 */

class MetricsService {
  private registry: Registry;

  // Policy resolution duration (P50, P95, P99)
  public policyResolutionDuration: Histogram<string>;

  // Policy resolution count by source level
  public policyResolutionTotal: Counter<string>;

  // Commission calculation count by result
  public commissionCalcTotal: Counter<string>;

  // Total commission value
  public commissionValueSum: Summary<string>;

  // Shadow mode comparison counter
  public shadowModeComparisonTotal: Counter<string>;

  // Shadow mode difference histogram
  public shadowModeDiffAbsolute: Histogram<string>;

  constructor() {
    this.registry = new Registry();

    // Policy resolution duration histogram
    this.policyResolutionDuration = new Histogram({
      name: 'policy_resolution_duration_ms',
      help: 'Time taken to resolve commission policy in milliseconds',
      labelNames: ['source', 'success'],
      buckets: [1, 2, 5, 10, 20, 50, 100, 200], // milliseconds
      registers: [this.registry]
    });

    // Policy resolution counter by source
    this.policyResolutionTotal = new Counter({
      name: 'policy_resolution_total',
      help: 'Total number of policy resolutions by source level',
      labelNames: ['source'], // product, supplier, tier, default, safe_mode
      registers: [this.registry]
    });

    // Commission calculation counter by result
    this.commissionCalcTotal = new Counter({
      name: 'commission_calc_total',
      help: 'Total number of commission calculations by result',
      labelNames: ['result'], // success, fallback, error
      registers: [this.registry]
    });

    // Commission value summary
    this.commissionValueSum = new Summary({
      name: 'commission_value_sum',
      help: 'Total commission value calculated',
      labelNames: ['source'],
      percentiles: [0.5, 0.95, 0.99],
      registers: [this.registry]
    });

    // Shadow mode comparison counter
    this.shadowModeComparisonTotal = new Counter({
      name: 'shadow_mode_comparison_total',
      help: 'Total number of shadow mode comparisons by status',
      labelNames: ['status'], // match, mismatch, error
      registers: [this.registry]
    });

    // Shadow mode difference histogram
    this.shadowModeDiffAbsolute = new Histogram({
      name: 'shadow_mode_diff_absolute',
      help: 'Absolute difference between legacy and policy engine commission',
      labelNames: ['status'],
      buckets: [0.01, 0.1, 0.5, 1, 5, 10, 50, 100, 500, 1000], // KRW
      registers: [this.registry]
    });
  }

  /**
   * Record policy resolution metrics
   */
  recordPolicyResolution(params: {
    source: 'product' | 'supplier' | 'tier' | 'default' | 'safe_mode';
    durationMs: number;
    success: boolean;
  }): void {
    const { source, durationMs, success } = params;

    // Record duration
    this.policyResolutionDuration.observe(
      { source, success: success.toString() },
      durationMs
    );

    // Increment counter
    this.policyResolutionTotal.inc({ source });
  }

  /**
   * Record commission calculation metrics
   */
  recordCommissionCalculation(params: {
    result: 'success' | 'fallback' | 'error';
    value: number;
    source: string;
  }): void {
    const { result, value, source } = params;

    // Increment calculation counter
    this.commissionCalcTotal.inc({ result });

    // Record commission value (only for success)
    if (result === 'success') {
      this.commissionValueSum.observe({ source }, value);
    }
  }

  /**
   * Record shadow mode comparison metrics
   */
  recordShadowModeComparison(params: {
    status: 'match' | 'mismatch' | 'error';
    diffAbsolute: number;
  }): void {
    const { status, diffAbsolute } = params;

    // Increment comparison counter
    this.shadowModeComparisonTotal.inc({ status });

    // Record absolute difference (skip for errors)
    if (status !== 'error') {
      this.shadowModeDiffAbsolute.observe({ status }, diffAbsolute);
    }
  }

  /**
   * Get metrics for /metrics endpoint
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get registry for custom metrics
   */
  getRegistry(): Registry {
    return this.registry;
  }
}

// Singleton instance
export const metricsService = new MetricsService();
export default metricsService;
