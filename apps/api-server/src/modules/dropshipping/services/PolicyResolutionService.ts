import { Repository, IsNull, Not } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { CommissionPolicy, CommissionType, PolicyType, PolicyStatus } from '../entities/CommissionPolicy.js';
import logger from '../../../utils/logger.js';

/**
 * PolicyResolutionService
 * Phase 8: Commission Policy Resolution
 *
 * Resolves commission policies based on hierarchy:
 * 1. Product-specific policy (highest priority)
 * 2. Partner-specific policy
 * 3. Supplier-level policy
 * 4. Global platform policy (fallback)
 *
 * Created: Phase B-4 Step 10 (Build Fix)
 */

export interface PolicyResolutionContext {
  productId: string;
  supplierId: string;
  partnerId: string;
  orderDate: Date;
  orderId: string;
  orderItemId: string;
}

export interface ResolvedPolicy {
  policy: CommissionPolicy;
  resolutionLevel: 'product_specific' | 'partner_specific' | 'supplier' | 'default' | 'safe_mode';
  resolutionTimeMs: number;
}

export interface PolicySnapshot {
  policyId: string;
  policyCode: string;
  policyType: PolicyType;
  commissionType: CommissionType;
  commissionRate?: number;
  commissionAmount?: number;
  minCommission?: number;
  maxCommission?: number;
  resolutionLevel: string;
  resolvedAt: Date;
  appliedCommissionAmount: number;
}

export class PolicyResolutionService {
  private policyRepo: Repository<CommissionPolicy>;

  constructor() {
    this.policyRepo = AppDataSource.getRepository(CommissionPolicy);
  }

  /**
   * Resolve commission policy based on context
   * Returns highest priority policy that matches
   */
  async resolve(context: PolicyResolutionContext): Promise<ResolvedPolicy | null> {
    const startTime = Date.now();

    try {
      logger.debug('[PolicyResolution] Starting policy resolution', {
        productId: context.productId,
        supplierId: context.supplierId,
        partnerId: context.partnerId
      });

      // Try product-specific policy first
      const productPolicy = await this.findProductPolicy(context);
      if (productPolicy && productPolicy.isActive()) {
        logger.info('[PolicyResolution] Resolved to product-specific policy', {
          policyId: productPolicy.id,
          policyCode: productPolicy.policyCode
        });
        return {
          policy: productPolicy,
          resolutionLevel: 'product_specific',
          resolutionTimeMs: Date.now() - startTime
        };
      }

      // Try partner-specific policy
      const partnerPolicy = await this.findPartnerPolicy(context);
      if (partnerPolicy && partnerPolicy.isActive()) {
        logger.info('[PolicyResolution] Resolved to partner-specific policy', {
          policyId: partnerPolicy.id,
          policyCode: partnerPolicy.policyCode
        });
        return {
          policy: partnerPolicy,
          resolutionLevel: 'partner_specific',
          resolutionTimeMs: Date.now() - startTime
        };
      }

      // Try supplier-level policy
      const supplierPolicy = await this.findSupplierPolicy(context);
      if (supplierPolicy && supplierPolicy.isActive()) {
        logger.info('[PolicyResolution] Resolved to supplier-level policy', {
          policyId: supplierPolicy.id,
          policyCode: supplierPolicy.policyCode
        });
        return {
          policy: supplierPolicy,
          resolutionLevel: 'supplier',
          resolutionTimeMs: Date.now() - startTime
        };
      }

      // Try default platform policy as fallback
      const defaultPolicy = await this.findDefaultPolicy();
      if (defaultPolicy && defaultPolicy.isActive()) {
        logger.info('[PolicyResolution] Resolved to default platform policy', {
          policyId: defaultPolicy.id,
          policyCode: defaultPolicy.policyCode
        });
        return {
          policy: defaultPolicy,
          resolutionLevel: 'default',
          resolutionTimeMs: Date.now() - startTime
        };
      }

      // No policy found
      logger.warn('[PolicyResolution] No applicable policy found', {
        context
      });

      return null;

    } catch (error: any) {
      logger.error('[PolicyResolution] Error during policy resolution', {
        error: error.message,
        context
      });
      return null;
    }
  }

  /**
   * Create immutable policy snapshot for audit trail
   */
  createSnapshot(resolved: ResolvedPolicy, appliedCommissionAmount: number): PolicySnapshot {
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
      resolvedAt: new Date(),
      appliedCommissionAmount
    };
  }

  /**
   * Find product-specific policy (highest priority)
   */
  private async findProductPolicy(context: PolicyResolutionContext): Promise<CommissionPolicy | null> {
    return await this.policyRepo.findOne({
      where: {
        policyType: PolicyType.PRODUCT_SPECIFIC,
        productId: context.productId,
        status: PolicyStatus.ACTIVE
      },
      order: {
        priority: 'DESC',
        createdAt: 'DESC'
      }
    });
  }

  /**
   * Find partner-specific policy
   */
  private async findPartnerPolicy(context: PolicyResolutionContext): Promise<CommissionPolicy | null> {
    return await this.policyRepo.findOne({
      where: {
        policyType: PolicyType.PARTNER_SPECIFIC,
        partnerId: context.partnerId,
        status: PolicyStatus.ACTIVE
      },
      order: {
        priority: 'DESC',
        createdAt: 'DESC'
      }
    });
  }

  /**
   * Find supplier-level policy
   */
  private async findSupplierPolicy(context: PolicyResolutionContext): Promise<CommissionPolicy | null> {
    return await this.policyRepo.findOne({
      where: {
        supplierId: context.supplierId,
        status: PolicyStatus.ACTIVE
      },
      order: {
        priority: 'DESC',
        createdAt: 'DESC'
      }
    });
  }

  /**
   * Find default platform policy (fallback)
   */
  private async findDefaultPolicy(): Promise<CommissionPolicy | null> {
    return await this.policyRepo.findOne({
      where: {
        policyType: PolicyType.DEFAULT,
        status: PolicyStatus.ACTIVE
      },
      order: {
        priority: 'DESC',
        createdAt: 'DESC'
      }
    });
  }
}
