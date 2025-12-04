import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { Commission } from '../entities/Commission.js';
import { Order } from '../../commerce/entities/Order.js';
import { CommissionType } from '../entities/CommissionPolicy.js';
import { PolicyResolutionService, PolicyResolutionContext } from './PolicyResolutionService.js';
import shadowModeService, { ShadowModeService } from '../../../services/shadow-mode.service.js';
import FeatureFlags from '../../../config/featureFlags.js';
import logger from '../../../utils/logger.js';
import metricsService from '../../../services/metrics.service.js';

/**
 * SettlementService
 * Phase 8: Commission Calculation Entry Point
 *
 * Integrates PolicyResolutionService for commission calculation.
 * Implements:
 * - Policy-based commission calculation
 * - Min/max cap application
 * - Immutable policy snapshots
 * - Safe mode (0% commission) fallback
 * - Shadow mode for gradual rollout (when ENABLE_SUPPLIER_POLICY=false)
 *
 * Created: 2025-01-07
 */

export interface CommissionCalculationRequest {
  orderId: string;
  orderItemId: string;
  productId: string;
  supplierId: string;
  partnerId: string;
  price: number;
  quantity: number;
  orderDate: Date;
}

export interface CommissionCalculationResult {
  commissionAmount: number;
  commissionRate?: number;
  appliedPolicy: any | null;
  resolutionLevel: string;
  calculationTimeMs: number;
}

export class SettlementService {
  private policyResolutionService: PolicyResolutionService;
  private commissionRepo: Repository<Commission>;
  private orderRepo: Repository<Order>;

  constructor() {
    this.policyResolutionService = new PolicyResolutionService();
    this.commissionRepo = AppDataSource.getRepository(Commission);
    this.orderRepo = AppDataSource.getRepository(Order);
  }

  /**
   * Calculate commission for order item
   * Entry point for Phase 8 policy-based commission calculation
   *
   * When ENABLE_SUPPLIER_POLICY=false:
   * - Primary Path: Legacy calculation (10% flat rate)
   * - Shadow Path: Policy engine (no DB write, only comparison logs)
   */
  async calculateCommission(request: CommissionCalculationRequest): Promise<CommissionCalculationResult> {
    const startTime = Date.now();

    try {
      logger.debug('[Settlement] Starting commission calculation', {
        orderId: request.orderId,
        orderItemId: request.orderItemId,
        productId: request.productId,
        shadowModeEnabled: ShadowModeService.isShadowModeEnabled()
      });

      // Shadow Mode: When supplier policy is disabled
      if (!FeatureFlags.isSupplierPolicyEnabled()) {
        return await this.calculateWithShadowMode(request, startTime);
      }

      // Normal Mode: Full policy engine
      return await this.calculateWithPolicyEngine(request, startTime);

    } catch (error: any) {
      logger.error('[Settlement] Error during commission calculation', {
        error: error.message,
        request
      });

      // Record error metrics
      metricsService.recordCommissionCalculation({
        result: 'error',
        value: 0,
        source: 'error'
      });

      // Safe mode on error
      return {
        commissionAmount: 0,
        commissionRate: 0,
        appliedPolicy: null,
        resolutionLevel: 'safe_mode',
        calculationTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Shadow mode calculation: Legacy + Policy Engine comparison
   */
  private async calculateWithShadowMode(
    request: CommissionCalculationRequest,
    startTime: number
  ): Promise<CommissionCalculationResult> {
    logger.debug('[Settlement] Shadow mode enabled - using legacy calculation');

    // Primary Path: Legacy calculation (simple 10% flat rate)
    const orderTotal = request.price * request.quantity;
    const legacyCommission = orderTotal * 0.10; // 10% flat rate as baseline

    logger.info('[Settlement] Legacy commission calculated', {
      orderId: request.orderId,
      orderItemId: request.orderItemId,
      legacyCommission,
      orderTotal
    });

    // Shadow Path: Run policy engine in parallel (fire-and-forget)
    // Errors in shadow mode should NOT affect primary calculation
    shadowModeService.runShadowComparison(
      {
        orderId: request.orderId,
        orderItemId: request.orderItemId,
        productId: request.productId,
        supplierId: request.supplierId,
        partnerId: request.partnerId,
        price: request.price,
        quantity: request.quantity,
        orderDate: request.orderDate
      },
      legacyCommission
    ).catch((error) => {
      // Log but don't throw - shadow errors are non-blocking
      logger.warn('[Settlement] Shadow mode comparison failed (non-blocking)', {
        error: error.message,
        orderId: request.orderId
      });
    });

    // Record legacy calculation metrics
    metricsService.recordCommissionCalculation({
      result: 'success',
      value: legacyCommission,
      source: 'legacy'
    });

    return {
      commissionAmount: legacyCommission,
      commissionRate: 10,
      appliedPolicy: null,
      resolutionLevel: 'legacy',
      calculationTimeMs: Date.now() - startTime
    };
  }

  /**
   * Normal mode calculation: Full policy engine
   */
  private async calculateWithPolicyEngine(
    request: CommissionCalculationRequest,
    startTime: number
  ): Promise<CommissionCalculationResult> {
    // Resolve policy using PolicyResolutionService
    const resolved = await this.policyResolutionService.resolve({
      productId: request.productId,
      supplierId: request.supplierId,
      partnerId: request.partnerId,
      orderDate: request.orderDate,
      orderId: request.orderId,
      orderItemId: request.orderItemId
    });

    // Safe mode: No policy found
    if (!resolved) {
      logger.warn('[Settlement] Safe mode: No valid policy found', {
        orderItemId: request.orderItemId,
        productId: request.productId
      });

      // Record fallback metrics
      metricsService.recordCommissionCalculation({
        result: 'fallback',
        value: 0,
        source: 'safe_mode'
      });

      return {
        commissionAmount: 0,
        commissionRate: 0,
        appliedPolicy: null,
        resolutionLevel: 'safe_mode',
        calculationTimeMs: Date.now() - startTime
      };
    }

    // Calculate commission based on policy type
    let commissionAmount = 0;
    const orderTotal = request.price * request.quantity;

    if (resolved.policy.commissionType === CommissionType.PERCENTAGE) {
      const rate = resolved.policy.commissionRate || 0;
      commissionAmount = (orderTotal * rate) / 100;
    } else if (resolved.policy.commissionType === CommissionType.FIXED) {
      commissionAmount = resolved.policy.commissionAmount || 0;
    }

    // Apply min/max constraints
    if (resolved.policy.minCommission && commissionAmount < resolved.policy.minCommission) {
      commissionAmount = resolved.policy.minCommission;
      logger.debug('[Settlement] Applied minCommission cap', {
        original: commissionAmount,
        capped: resolved.policy.minCommission
      });
    }

    if (resolved.policy.maxCommission && commissionAmount > resolved.policy.maxCommission) {
      const original = commissionAmount;
      commissionAmount = resolved.policy.maxCommission;
      logger.debug('[Settlement] Applied maxCommission cap', {
        original,
        capped: commissionAmount
      });
    }

    // Create immutable snapshot
    const snapshot = this.policyResolutionService.createSnapshot(resolved, commissionAmount);

    // Log structured event
    logger.info('[Settlement] Commission calculated', {
      orderId: request.orderId,
      orderItemId: request.orderItemId,
      productId: request.productId,
      supplierId: request.supplierId,
      partnerId: request.partnerId,
      appliedPolicy: {
        id: resolved.policy.id,
        code: resolved.policy.policyCode,
        type: resolved.policy.policyType,
        rate: resolved.policy.commissionRate,
        level: resolved.resolutionLevel
      },
      calculatedCommission: commissionAmount,
      resolutionTimeMs: resolved.resolutionTimeMs,
      totalCalculationTimeMs: Date.now() - startTime
    });

    // Record success metrics
    metricsService.recordCommissionCalculation({
      result: 'success',
      value: commissionAmount,
      source: resolved.resolutionLevel
    });

    return {
      commissionAmount,
      commissionRate: resolved.policy.commissionRate,
      appliedPolicy: snapshot,
      resolutionLevel: resolved.resolutionLevel,
      calculationTimeMs: Date.now() - startTime
    };
  }

  /**
   * Stub: Get settlement summary for partner
   * (Full implementation in Phase 8 main work)
   */
  async getSettlementSummary(partnerId: string, startDate: Date, endDate: Date): Promise<any> {
    logger.debug('[Settlement] Getting settlement summary (stub)', {
      partnerId,
      startDate,
      endDate
    });

    // Stub response
    return {
      success: true,
      data: {
        partnerId,
        period: { startDate, endDate },
        totalCommission: 0,
        totalOrders: 0,
        message: 'Stub: Full implementation in Phase 8'
      }
    };
  }

  /**
   * Stub: Calculate settlement for partner
   * (Full implementation in Phase 8 main work)
   */
  async calculateSettlement(partnerId: string, startDate: Date, endDate: Date): Promise<any> {
    logger.debug('[Settlement] Calculating settlement (stub)', {
      partnerId,
      startDate,
      endDate
    });

    // Stub response
    return {
      success: true,
      data: {
        message: 'Stub: Full implementation in Phase 8'
      }
    };
  }
}
