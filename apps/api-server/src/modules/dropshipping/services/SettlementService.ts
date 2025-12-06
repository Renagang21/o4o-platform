import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { Commission } from '../entities/Commission.js';
import { Order } from '../../commerce/entities/Order.js';
import { Settlement, SettlementStatus, SettlementPartyType } from '../entities/Settlement.js';
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

export interface SettlementFilters {
  partyType?: SettlementPartyType;
  partyId?: string;
  status?: SettlementStatus;
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class SettlementService {
  private policyResolutionService: PolicyResolutionService;
  private commissionRepo: Repository<Commission>;
  private orderRepo: Repository<Order>;
  private settlementRepo: Repository<Settlement>;

  constructor() {
    this.policyResolutionService = new PolicyResolutionService();
    this.commissionRepo = AppDataSource.getRepository(Commission);
    this.orderRepo = AppDataSource.getRepository(Order);
    this.settlementRepo = AppDataSource.getRepository(Settlement);
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

  /**
   * Create a new settlement record
   */
  async create(data: Partial<Settlement>): Promise<Settlement> {
    try {
      // Convert numeric strings to proper format for database
      const settlementData = {
        ...data,
        totalSaleAmount: data.totalSaleAmount?.toString() || '0',
        totalBaseAmount: data.totalBaseAmount?.toString() || '0',
        totalCommissionAmount: data.totalCommissionAmount?.toString() || '0',
        totalMarginAmount: data.totalMarginAmount?.toString() || '0',
        payableAmount: data.payableAmount?.toString() || '0',
        status: data.status || SettlementStatus.PENDING
      };

      const settlement = this.settlementRepo.create(settlementData);
      const savedResult = await this.settlementRepo.save(settlement);
      // Ensure we return a single Settlement, not an array
      const saved: Settlement = Array.isArray(savedResult) ? savedResult[0] : savedResult;

      logger.info('[Settlement] Settlement created', {
        settlementId: saved.id,
        partyType: saved.partyType,
        partyId: saved.partyId,
        period: `${saved.periodStart} - ${saved.periodEnd}`,
        payableAmount: saved.payableAmount
      });

      return saved;
    } catch (error: any) {
      logger.error('[Settlement] Error creating settlement', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Find settlement by ID
   */
  async findById(settlementId: string): Promise<Settlement | null> {
    try {
      const settlement = await this.settlementRepo.findOne({
        where: { id: settlementId },
        relations: ['items', 'party']
      });

      if (!settlement) {
        logger.warn('[Settlement] Settlement not found', { settlementId });
        return null;
      }

      return settlement;
    } catch (error: any) {
      logger.error('[Settlement] Error finding settlement by ID', {
        error: error.message,
        settlementId
      });
      throw error;
    }
  }

  /**
   * List settlements with filters and pagination
   */
  async list(filters: SettlementFilters = {}) {
    try {
      const {
        partyType,
        partyId,
        status,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = filters;

      const queryBuilder = this.settlementRepo.createQueryBuilder('settlement')
        .leftJoinAndSelect('settlement.party', 'party')
        .leftJoinAndSelect('settlement.items', 'items');

      if (partyType) {
        queryBuilder.andWhere('settlement.partyType = :partyType', { partyType });
      }

      if (partyId) {
        queryBuilder.andWhere('settlement.partyId = :partyId', { partyId });
      }

      if (status) {
        queryBuilder.andWhere('settlement.status = :status', { status });
      }

      if (startDate) {
        queryBuilder.andWhere('settlement.periodStart >= :startDate', { startDate });
      }

      if (endDate) {
        queryBuilder.andWhere('settlement.periodEnd <= :endDate', { endDate });
      }

      const sortField = `settlement.${sortBy}`;
      queryBuilder.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');

      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [settlements, total] = await queryBuilder.getManyAndCount();

      return {
        settlements,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error: any) {
      logger.error('[Settlement] Error listing settlements', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Update settlement
   */
  async update(settlementId: string, data: Partial<Settlement>): Promise<Settlement> {
    try {
      const existing = await this.settlementRepo.findOne({
        where: { id: settlementId }
      });

      if (!existing) {
        throw new Error('Settlement not found');
      }

      // Check if settlement can be modified
      if (!existing.canModify() && data.status !== SettlementStatus.PAID) {
        throw new Error('Cannot modify settlement in current status');
      }

      // Convert numeric values if present
      const updateData: any = { ...data };
      if (updateData.payableAmount !== undefined) {
        updateData.payableAmount = updateData.payableAmount.toString();
      }

      const updated = await this.settlementRepo.save({
        ...existing,
        ...updateData,
        updatedAt: new Date()
      });

      logger.info('[Settlement] Settlement updated', {
        settlementId,
        changes: Object.keys(data)
      });

      return updated;
    } catch (error: any) {
      logger.error('[Settlement] Error updating settlement', {
        error: error.message,
        settlementId,
        data
      });
      throw error;
    }
  }

  /**
   * Process settlement (mark as paid/processing/cancelled)
   */
  async process(settlementId: string, action: 'pay' | 'cancel' | 'start_processing'): Promise<Settlement> {
    try {
      const settlement = await this.settlementRepo.findOne({
        where: { id: settlementId }
      });

      if (!settlement) {
        throw new Error('Settlement not found');
      }

      switch (action) {
        case 'pay':
          settlement.markAsPaid();
          logger.info('[Settlement] Settlement marked as paid', {
            settlementId,
            partyType: settlement.partyType,
            partyId: settlement.partyId,
            payableAmount: settlement.payableAmount
          });
          break;

        case 'cancel':
          settlement.cancel();
          logger.info('[Settlement] Settlement cancelled', {
            settlementId,
            partyType: settlement.partyType,
            partyId: settlement.partyId
          });
          break;

        case 'start_processing':
          if (settlement.status !== SettlementStatus.PENDING) {
            throw new Error('Can only start processing settlements in PENDING status');
          }
          settlement.status = SettlementStatus.PROCESSING;
          logger.info('[Settlement] Settlement processing started', {
            settlementId,
            partyType: settlement.partyType,
            partyId: settlement.partyId
          });
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      const updated = await this.settlementRepo.save(settlement);

      return updated;
    } catch (error: any) {
      logger.error('[Settlement] Error processing settlement', {
        error: error.message,
        settlementId,
        action
      });
      throw error;
    }
  }
}
