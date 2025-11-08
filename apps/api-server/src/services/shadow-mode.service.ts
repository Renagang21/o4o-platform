import { PolicyResolutionService } from './PolicyResolutionService.js';
import { CommissionType } from '../entities/CommissionPolicy.js';
import logger from '../utils/logger.js';
import metricsService from './metrics.service.js';

/**
 * ShadowModeService
 * Phase 8: Shadow Mode for Policy Engine Gradual Rollout
 *
 * Purpose:
 * - Run new policy engine in parallel without affecting legacy calculations
 * - Compare legacy vs policy engine results
 * - Log discrepancies for analysis
 * - Collect metrics for confidence building
 *
 * When ENABLE_SUPPLIER_POLICY=false:
 * - Primary Path: Legacy calculation (actual DB write)
 * - Shadow Path: Policy engine (NO DB write, only logs/metrics)
 *
 * Created: 2025-01-07
 */

export interface ShadowComparisonRequest {
  orderId: string;
  orderItemId: string;
  productId: string;
  supplierId: string;
  partnerId: string;
  price: number;
  quantity: number;
  orderDate: Date;
}

export interface ShadowComparisonResult {
  orderId: string;
  orderItemId: string;
  partnerId: string;
  legacyCommission: number;
  policyCommission: number;
  diff: number;
  diffPercent: number;
  policyResolutionLevel: string;
  shadowExecutionTimeMs: number;
}

export class ShadowModeService {
  private policyResolutionService: PolicyResolutionService;

  constructor() {
    this.policyResolutionService = new PolicyResolutionService();
  }

  /**
   * Run shadow comparison between legacy and policy engine
   * This is fire-and-forget - errors should not affect primary path
   */
  async runShadowComparison(
    request: ShadowComparisonRequest,
    legacyCommission: number
  ): Promise<void> {
    const startTime = Date.now();

    try {
      logger.debug('[ShadowMode] Starting shadow comparison', {
        orderId: request.orderId,
        orderItemId: request.orderItemId,
        legacyCommission
      });

      // Run policy engine in shadow mode
      const resolved = await this.policyResolutionService.resolve({
        productId: request.productId,
        supplierId: request.supplierId,
        partnerId: request.partnerId,
        orderDate: request.orderDate,
        orderId: request.orderId,
        orderItemId: request.orderItemId
      });

      // Calculate commission using policy engine
      let policyCommission = 0;
      const orderTotal = request.price * request.quantity;

      if (resolved) {
        if (resolved.policy.commissionType === CommissionType.PERCENTAGE) {
          const rate = resolved.policy.commissionRate || 0;
          policyCommission = (orderTotal * rate) / 100;
        } else if (resolved.policy.commissionType === CommissionType.FIXED) {
          policyCommission = resolved.policy.commissionAmount || 0;
        }

        // Apply min/max constraints
        if (resolved.policy.minCommission && policyCommission < resolved.policy.minCommission) {
          policyCommission = resolved.policy.minCommission;
        }

        if (resolved.policy.maxCommission && policyCommission > resolved.policy.maxCommission) {
          policyCommission = resolved.policy.maxCommission;
        }
      }

      // Calculate difference
      const diff = policyCommission - legacyCommission;
      const diffPercent = legacyCommission > 0
        ? (diff / legacyCommission) * 100
        : (policyCommission > 0 ? 100 : 0);

      const shadowExecutionTimeMs = Date.now() - startTime;

      // Create comparison result
      const comparisonResult: ShadowComparisonResult = {
        orderId: request.orderId,
        orderItemId: request.orderItemId,
        partnerId: request.partnerId,
        legacyCommission,
        policyCommission,
        diff,
        diffPercent: parseFloat(diffPercent.toFixed(2)),
        policyResolutionLevel: resolved?.resolutionLevel || 'safe_mode',
        shadowExecutionTimeMs
      };

      // Log structured comparison
      logger.info('[ShadowMode] Comparison completed', comparisonResult);

      // Record metrics
      const status = Math.abs(diff) < 0.01 ? 'match' : 'mismatch';
      metricsService.recordShadowModeComparison({
        status,
        diffAbsolute: Math.abs(diff)
      });

      logger.debug('[ShadowMode] Shadow comparison successful', {
        status,
        executionTimeMs: shadowExecutionTimeMs
      });

    } catch (error: any) {
      // Shadow mode errors should not affect primary path
      logger.error('[ShadowMode] Shadow comparison failed (non-blocking)', {
        error: error.message,
        orderId: request.orderId,
        orderItemId: request.orderItemId,
        executionTimeMs: Date.now() - startTime
      });

      // Record error metrics
      metricsService.recordShadowModeComparison({
        status: 'error',
        diffAbsolute: 0
      });
    }
  }

  /**
   * Check if shadow mode is enabled
   * Shadow mode runs when supplier policy is DISABLED
   */
  static isShadowModeEnabled(): boolean {
    return process.env.ENABLE_SUPPLIER_POLICY !== 'true';
  }
}

export default new ShadowModeService();
