import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { CommissionPolicy, PolicyType, PolicyStatus } from '../entities/CommissionPolicy.js';
import { Product } from '../entities/Product.js';
import { Supplier } from '../entities/Supplier.js';
import FeatureFlags from '../config/featureFlags.js';
import logger from '../utils/logger.js';
import metricsService from './metrics.service.js';

/**
 * PolicyResolutionService
 * Phase 8: Supplier Policy Integration
 *
 * Implements the 4-level priority hierarchy for commission policy resolution:
 * 1. Product Policy (Override)
 * 2. Supplier Policy
 * 3. Partner Tier Policy (future)
 * 4. Default Policy
 *
 * Returns policy snapshot for immutable commission records.
 *
 * Created: 2025-01-07
 */

export interface PolicyResolutionContext {
  productId: string;
  supplierId: string;
  partnerId?: string;
  partnerTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  orderDate: Date;
  orderId?: string;
  orderItemId?: string;
}

export interface ResolvedPolicy {
  policy: CommissionPolicy;
  resolutionLevel: 'product' | 'supplier' | 'tier' | 'default' | 'safe_mode';
  resolutionTimeMs: number;
}

export interface PolicySnapshot {
  policyId: string;
  policyCode: string;
  policyType: string;
  commissionType: string;
  commissionRate?: number;
  commissionAmount?: number;
  minCommission?: number;
  maxCommission?: number;
  resolutionLevel: string;
  appliedAt: string;
  calculatedCommission?: number;
}

export class PolicyResolutionService {
  private policyRepo: Repository<CommissionPolicy>;
  private productRepo: Repository<Product>;
  private supplierRepo: Repository<Supplier>;

  constructor() {
    this.policyRepo = AppDataSource.getRepository(CommissionPolicy);
    this.productRepo = AppDataSource.getRepository(Product);
    this.supplierRepo = AppDataSource.getRepository(Supplier);
  }

  /**
   * Main entry point for policy resolution
   * Implements 4-level priority: Product → Supplier → Tier → Default
   *
   * Returns: ResolvedPolicy or null (safe mode = 0% commission)
   */
  async resolve(context: PolicyResolutionContext): Promise<ResolvedPolicy | null> {
    const startTime = Date.now();

    try {
      logger.debug('[PolicyResolution] Starting policy resolution', {
        productId: context.productId,
        supplierId: context.supplierId
      });

      // Check feature flag
      if (!FeatureFlags.isSupplierPolicyEnabled()) {
        logger.debug('[PolicyResolution] Supplier policy feature disabled, using legacy mode');
        return await this.resolveLegacy(context, startTime);
      }

      // Priority 1: Product Policy Override
      const productPolicy = await this.resolveProductPolicy(context);
      if (productPolicy) {
        const resolutionTimeMs = Date.now() - startTime;

        logger.info('[PolicyResolution] Resolved to product policy', {
          policyId: productPolicy.id,
          resolutionLevel: 'product',
          resolutionTimeMs
        });

        // Record metrics
        metricsService.recordPolicyResolution({
          source: 'product',
          durationMs: resolutionTimeMs,
          success: true
        });

        return {
          policy: productPolicy,
          resolutionLevel: 'product',
          resolutionTimeMs
        };
      }

      // Priority 2: Supplier Policy
      const supplierPolicy = await this.resolveSupplierPolicy(context);
      if (supplierPolicy) {
        const resolutionTimeMs = Date.now() - startTime;

        logger.info('[PolicyResolution] Resolved to supplier policy', {
          policyId: supplierPolicy.id,
          resolutionLevel: 'supplier',
          resolutionTimeMs
        });

        // Record metrics
        metricsService.recordPolicyResolution({
          source: 'supplier',
          durationMs: resolutionTimeMs,
          success: true
        });

        return {
          policy: supplierPolicy,
          resolutionLevel: 'supplier',
          resolutionTimeMs
        };
      }

      // Priority 3: Tier Policy (Future - Phase 8B)
      // if (featureFlags.isTierPolicyEnabled()) {
      //   const tierPolicy = await this.resolveTierPolicy(context);
      //   if (tierPolicy) return { ... };
      // }

      // Priority 4: Default Policy
      const defaultPolicy = await this.resolveDefaultPolicy(context);
      if (defaultPolicy) {
        const resolutionTimeMs = Date.now() - startTime;

        logger.info('[PolicyResolution] Resolved to default policy', {
          policyId: defaultPolicy.id,
          resolutionLevel: 'default',
          resolutionTimeMs
        });

        // Record metrics
        metricsService.recordPolicyResolution({
          source: 'default',
          durationMs: resolutionTimeMs,
          success: true
        });

        return {
          policy: defaultPolicy,
          resolutionLevel: 'default',
          resolutionTimeMs
        };
      }

      // Safe Mode: No policy found
      const resolutionTimeMs = Date.now() - startTime;

      logger.warn('[PolicyResolution] No valid policy found - entering safe mode', {
        productId: context.productId,
        supplierId: context.supplierId,
        partnerId: context.partnerId,
        resolutionTimeMs
      });

      // Record metrics for safe mode
      metricsService.recordPolicyResolution({
        source: 'safe_mode',
        durationMs: resolutionTimeMs,
        success: true
      });

      return null; // Triggers 0% commission

    } catch (error: any) {
      const resolutionTimeMs = Date.now() - startTime;

      logger.error('[PolicyResolution] Error during policy resolution', {
        error: error.message,
        context,
        resolutionTimeMs
      });

      // Record error metrics
      metricsService.recordPolicyResolution({
        source: 'default',
        durationMs: resolutionTimeMs,
        success: false
      });

      // Fallback to default policy on error
      const defaultPolicy = await this.resolveDefaultPolicy(context);
      if (defaultPolicy) {
        return {
          policy: defaultPolicy,
          resolutionLevel: 'default',
          resolutionTimeMs
        };
      }

      return null; // Safe mode
    }
  }

  /**
   * Priority 1: Resolve product-level policy (override)
   */
  private async resolveProductPolicy(context: PolicyResolutionContext): Promise<CommissionPolicy | null> {
    // Product-level policy has been removed in Phase 8-9
    // Commission policies are now resolved at supplier/partner/global level only
    return null;
  }

  /**
   * Priority 2: Resolve supplier-level policy
   */
  private async resolveSupplierPolicy(context: PolicyResolutionContext): Promise<CommissionPolicy | null> {
    const supplier = await this.supplierRepo.findOne({
      where: { id: context.supplierId },
      relations: ['policy']
    });

    if (!supplier?.policy) {
      return null;
    }

    return this.validatePolicy(supplier.policy, context.orderDate) ? supplier.policy : null;
  }

  /**
   * Priority 4: Resolve default policy
   */
  private async resolveDefaultPolicy(context: PolicyResolutionContext): Promise<CommissionPolicy | null> {
    const defaultPolicy = await this.policyRepo.findOne({
      where: {
        policyType: PolicyType.DEFAULT,
        status: PolicyStatus.ACTIVE
      },
      order: {
        priority: 'DESC',
        createdAt: 'DESC'
      }
    });

    if (!defaultPolicy) {
      return null;
    }

    return this.validatePolicy(defaultPolicy, context.orderDate) ? defaultPolicy : null;
  }

  /**
   * Legacy resolution mode (when supplier policy feature is disabled)
   * Falls back to default policy only
   */
  private async resolveLegacy(context: PolicyResolutionContext, startTime: number): Promise<ResolvedPolicy | null> {
    const defaultPolicy = await this.resolveDefaultPolicy(context);

    if (defaultPolicy) {
      const resolutionTimeMs = Date.now() - startTime;

      logger.info('[PolicyResolution] Legacy mode - resolved to default policy', {
        policyId: defaultPolicy.id,
        resolutionTimeMs
      });

      // Record metrics for legacy mode
      metricsService.recordPolicyResolution({
        source: 'default',
        durationMs: resolutionTimeMs,
        success: true
      });

      return {
        policy: defaultPolicy,
        resolutionLevel: 'default',
        resolutionTimeMs
      };
    }

    const resolutionTimeMs = Date.now() - startTime;

    logger.warn('[PolicyResolution] Legacy mode - no default policy found', {
      productId: context.productId,
      resolutionTimeMs
    });

    // Record metrics for safe mode in legacy
    metricsService.recordPolicyResolution({
      source: 'safe_mode',
      durationMs: resolutionTimeMs,
      success: true
    });

    return null; // Safe mode
  }

  /**
   * Validate policy is active and within date range
   */
  private validatePolicy(policy: CommissionPolicy, orderDate: Date): boolean {
    // Status check
    if (policy.status !== PolicyStatus.ACTIVE) {
      return false;
    }

    // Start date check
    if (policy.validFrom && policy.validFrom > orderDate) {
      return false;
    }

    // End date check
    if (policy.validUntil && policy.validUntil < orderDate) {
      return false;
    }

    return true;
  }

  /**
   * Create immutable snapshot of resolved policy
   */
  createSnapshot(resolved: ResolvedPolicy, calculatedCommission: number): PolicySnapshot {
    return {
      policyId: resolved.policy.id,
      policyCode: resolved.policy.policyCode,
      policyType: resolved.policy.policyType,
      commissionType: resolved.policy.commissionType,
      commissionRate: resolved.policy.commissionRate,
      commissionAmount: resolved.policy.commissionAmount,
      minCommission: resolved.policy.minCommission,
      maxCommission: resolved.policy.maxCommission,
      resolutionLevel: resolved.resolutionLevel,
      appliedAt: new Date().toISOString(),
      calculatedCommission
    };
  }
}
