import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { Commission } from '../entities/Commission.js';
import { Order } from '../entities/Order.js';
import { CommissionType } from '../entities/CommissionPolicy.js';
import { PolicyResolutionService, PolicyResolutionContext } from './PolicyResolutionService.js';
import logger from '../utils/logger.js';

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
   */
  async calculateCommission(request: CommissionCalculationRequest): Promise<CommissionCalculationResult> {
    const startTime = Date.now();

    try {
      logger.debug('[Settlement] Starting commission calculation', {
        orderId: request.orderId,
        orderItemId: request.orderItemId,
        productId: request.productId
      });

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

      return {
        commissionAmount,
        commissionRate: resolved.policy.commissionRate,
        appliedPolicy: snapshot,
        resolutionLevel: resolved.resolutionLevel,
        calculationTimeMs: Date.now() - startTime
      };

    } catch (error: any) {
      logger.error('[Settlement] Error during commission calculation', {
        error: error.message,
        request
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
