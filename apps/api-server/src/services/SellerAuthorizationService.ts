import { In, Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { SellerAuthorization, AuthorizationStatus } from '../entities/SellerAuthorization.js';
import { SellerAuthorizationAuditLog, AuditAction } from '../entities/SellerAuthorizationAuditLog.js';
import { authorizationGateService } from './AuthorizationGateService.js';
import { authorizationMetrics } from './authorization-metrics.service.js';
import logger from '../utils/logger.js';

/**
 * Phase 9: Seller Authorization Service
 *
 * Business logic for seller authorization workflow:
 * - Request, approve, reject, revoke, cancel
 * - Business rules: 10-product limit, 30-day cooldown, self-seller bypass
 * - Audit logging for all state changes
 *
 * Created: 2025-01-07
 */

export interface RequestAuthorizationInput {
  sellerId: string;
  productId: string;
  supplierId: string;
  metadata?: {
    businessJustification?: string;
    expectedVolume?: number;
    [key: string]: any;
  };
}

export interface ApproveAuthorizationInput {
  authorizationId: string;
  approvedBy: string;
  expiresAt?: Date;
}

export interface RejectAuthorizationInput {
  authorizationId: string;
  rejectedBy: string;
  reason: string;
  cooldownDays?: number;
}

export interface RevokeAuthorizationInput {
  authorizationId: string;
  revokedBy: string;
  reason: string;
}

export interface ListAuthorizationsFilter {
  sellerId?: string;
  supplierId?: string;
  productId?: string;
  status?: AuthorizationStatus;
  page?: number;
  limit?: number;
}

export interface AuthorizationLimits {
  currentCount: number;
  maxLimit: number;
  remainingSlots: number;
  cooldowns: Array<{
    productId: string;
    productName?: string;
    cooldownUntil: Date;
    daysRemaining: number;
  }>;
}

export class SellerAuthorizationService {
  private authRepo: Repository<SellerAuthorization>;
  private auditRepo: Repository<SellerAuthorizationAuditLog>;
  private readonly PRODUCT_LIMIT = parseInt(process.env.SELLER_AUTHORIZATION_LIMIT || '10', 10);
  private readonly COOLDOWN_DAYS = parseInt(process.env.SELLER_AUTHORIZATION_COOLDOWN_DAYS || '30', 10);

  constructor() {
    this.authRepo = AppDataSource.getRepository(SellerAuthorization);
    this.auditRepo = AppDataSource.getRepository(SellerAuthorizationAuditLog);
  }

  /**
   * Check if feature is enabled
   */
  private isFeatureEnabled(): boolean {
    return process.env.ENABLE_SELLER_AUTHORIZATION === 'true';
  }

  /**
   * Request authorization for a product
   *
   * Business Rules:
   * 1. Seller must have seller role (checked in middleware)
   * 2. Product must exist
   * 3. No duplicate authorization for same (seller, product) pair
   * 4. Seller must not be in cooldown for this product
   * 5. Seller must not have exceeded 10-product limit
   * 6. Authorization must not be REVOKED permanently
   */
  async requestAuthorization(input: RequestAuthorizationInput): Promise<SellerAuthorization> {
    if (!this.isFeatureEnabled()) {
      throw new Error('FEATURE_NOT_ENABLED: Seller authorization system is disabled');
    }

    const { sellerId, productId, supplierId, metadata } = input;

    // 1. Check for existing authorization
    const existing = await this.authRepo.findOne({
      where: { sellerId, productId },
    });

    if (existing) {
      // Check if revoked (permanent block)
      if (existing.status === AuthorizationStatus.REVOKED) {
        authorizationMetrics.incrementRequestCounter('request', 'error');
        throw new Error('ERR_AUTHORIZATION_REVOKED: This product authorization was permanently revoked');
      }

      // Check if in cooldown
      if (existing.isInCooldown()) {
        const daysRemaining = existing.getCooldownDaysRemaining();
        authorizationMetrics.incrementCooldownBlock();
        authorizationMetrics.incrementRequestCounter('request', 'error');
        throw new Error(
          `ERR_COOLDOWN_ACTIVE: You can re-apply in ${daysRemaining} day(s). Previous rejection reason: ${existing.rejectionReason}`
        );
      }

      // Check if already approved
      if (existing.status === AuthorizationStatus.APPROVED) {
        authorizationMetrics.incrementRequestCounter('request', 'error');
        throw new Error('ERR_ALREADY_APPROVED: You already have authorization for this product');
      }

      // Check if already pending
      if (existing.status === AuthorizationStatus.REQUESTED) {
        authorizationMetrics.incrementRequestCounter('request', 'error');
        throw new Error('ERR_ALREADY_APPLIED: Authorization request is already pending supplier approval');
      }

      // Allow re-request if previously rejected and cooldown expired, or cancelled
      if (
        existing.status === AuthorizationStatus.REJECTED ||
        existing.status === AuthorizationStatus.CANCELLED
      ) {
        // Update existing record to REQUESTED
        existing.status = AuthorizationStatus.REQUESTED;
        existing.requestedAt = new Date();
        existing.metadata = metadata;

        await this.authRepo.save(existing);

        // Create audit log
        await this.auditRepo.save(
          SellerAuthorizationAuditLog.createRequestLog(existing.id, sellerId, metadata)
        );

        authorizationMetrics.incrementRequestCounter('request', 'success');
        logger.info('[SellerAuthorization] Re-request submitted', {
          authorizationId: existing.id,
          sellerId,
          productId,
        });

        return existing;
      }
    }

    // 2. Check product limit (only count APPROVED authorizations)
    const approvedCount = await this.authRepo.count({
      where: {
        sellerId,
        status: AuthorizationStatus.APPROVED,
      },
    });

    if (approvedCount >= this.PRODUCT_LIMIT) {
      authorizationMetrics.incrementLimitRejection();
      authorizationMetrics.incrementRequestCounter('request', 'error');
      throw new Error(
        `ERR_PRODUCT_LIMIT_REACHED: You have reached the maximum limit of ${this.PRODUCT_LIMIT} authorized products`
      );
    }

    // 3. Create new authorization request
    const authorization = this.authRepo.create({
      sellerId,
      productId,
      supplierId,
      status: AuthorizationStatus.REQUESTED,
      requestedAt: new Date(),
      metadata,
    });

    await this.authRepo.save(authorization);

    // 4. Create audit log
    await this.auditRepo.save(
      SellerAuthorizationAuditLog.createRequestLog(authorization.id, sellerId, metadata)
    );

    authorizationMetrics.incrementRequestCounter('request', 'success');
    logger.info('[SellerAuthorization] New request submitted', {
      authorizationId: authorization.id,
      sellerId,
      productId,
      supplierId,
    });

    return authorization;
  }

  /**
   * Approve authorization (Supplier/Admin only)
   */
  async approveAuthorization(input: ApproveAuthorizationInput): Promise<SellerAuthorization> {
    if (!this.isFeatureEnabled()) {
      throw new Error('FEATURE_NOT_ENABLED: Seller authorization system is disabled');
    }

    const { authorizationId, approvedBy, expiresAt } = input;

    const authorization = await this.authRepo.findOne({
      where: { id: authorizationId },
    });

    if (!authorization) {
      authorizationMetrics.incrementRequestCounter('approve', 'error');
      throw new Error('ERR_AUTHORIZATION_NOT_FOUND: Authorization not found');
    }

    if (authorization.status !== AuthorizationStatus.REQUESTED) {
      authorizationMetrics.incrementRequestCounter('approve', 'error');
      throw new Error(
        `ERR_INVALID_STATUS: Can only approve REQUESTED authorizations. Current status: ${authorization.status}`
      );
    }

    // Check product limit for seller
    const approvedCount = await this.authRepo.count({
      where: {
        sellerId: authorization.sellerId,
        status: AuthorizationStatus.APPROVED,
      },
    });

    if (approvedCount >= this.PRODUCT_LIMIT) {
      authorizationMetrics.incrementLimitRejection();
      authorizationMetrics.incrementRequestCounter('approve', 'error');
      throw new Error(
        `ERR_PRODUCT_LIMIT_REACHED: Seller has reached the maximum limit of ${this.PRODUCT_LIMIT} authorized products`
      );
    }

    // Approve
    authorization.approve(approvedBy);
    if (expiresAt) {
      authorization.expiresAt = expiresAt;
    }

    await this.authRepo.save(authorization);

    // Create audit log
    await this.auditRepo.save(
      SellerAuthorizationAuditLog.createApprovalLog(authorization.id, approvedBy)
    );

    // Invalidate cache
    await authorizationGateService.invalidateCache(authorization.sellerId, authorization.productId);

    authorizationMetrics.incrementRequestCounter('approve', 'success');
    logger.info('[SellerAuthorization] Authorization approved', {
      authorizationId: authorization.id,
      sellerId: authorization.sellerId,
      productId: authorization.productId,
      approvedBy,
    });

    return authorization;
  }

  /**
   * Reject authorization (Supplier/Admin only)
   */
  async rejectAuthorization(input: RejectAuthorizationInput): Promise<SellerAuthorization> {
    if (!this.isFeatureEnabled()) {
      throw new Error('FEATURE_NOT_ENABLED: Seller authorization system is disabled');
    }

    const { authorizationId, rejectedBy, reason, cooldownDays = this.COOLDOWN_DAYS } = input;

    if (!reason || reason.length < 10) {
      authorizationMetrics.incrementRequestCounter('reject', 'error');
      throw new Error('ERR_REASON_REQUIRED: Rejection reason must be at least 10 characters');
    }

    const authorization = await this.authRepo.findOne({
      where: { id: authorizationId },
    });

    if (!authorization) {
      authorizationMetrics.incrementRequestCounter('reject', 'error');
      throw new Error('ERR_AUTHORIZATION_NOT_FOUND: Authorization not found');
    }

    if (authorization.status !== AuthorizationStatus.REQUESTED) {
      authorizationMetrics.incrementRequestCounter('reject', 'error');
      throw new Error(
        `ERR_INVALID_STATUS: Can only reject REQUESTED authorizations. Current status: ${authorization.status}`
      );
    }

    // Reject with cooldown
    authorization.reject(rejectedBy, reason, cooldownDays);

    await this.authRepo.save(authorization);

    // Create audit log
    await this.auditRepo.save(
      SellerAuthorizationAuditLog.createRejectionLog(
        authorization.id,
        rejectedBy,
        reason,
        authorization.cooldownUntil!
      )
    );

    // Invalidate cache
    await authorizationGateService.invalidateCache(authorization.sellerId, authorization.productId);

    authorizationMetrics.incrementRequestCounter('reject', 'success');
    logger.info('[SellerAuthorization] Authorization rejected', {
      authorizationId: authorization.id,
      sellerId: authorization.sellerId,
      productId: authorization.productId,
      rejectedBy,
      cooldownUntil: authorization.cooldownUntil,
    });

    return authorization;
  }

  /**
   * Revoke authorization permanently (Supplier/Admin only)
   */
  async revokeAuthorization(input: RevokeAuthorizationInput): Promise<SellerAuthorization> {
    if (!this.isFeatureEnabled()) {
      throw new Error('FEATURE_NOT_ENABLED: Seller authorization system is disabled');
    }

    const { authorizationId, revokedBy, reason } = input;

    if (!reason || reason.length < 10) {
      authorizationMetrics.incrementRequestCounter('revoke', 'error');
      throw new Error('ERR_REASON_REQUIRED: Revocation reason must be at least 10 characters');
    }

    const authorization = await this.authRepo.findOne({
      where: { id: authorizationId },
    });

    if (!authorization) {
      authorizationMetrics.incrementRequestCounter('revoke', 'error');
      throw new Error('ERR_AUTHORIZATION_NOT_FOUND: Authorization not found');
    }

    if (authorization.status !== AuthorizationStatus.APPROVED) {
      authorizationMetrics.incrementRequestCounter('revoke', 'error');
      throw new Error(
        `ERR_INVALID_STATUS: Can only revoke APPROVED authorizations. Current status: ${authorization.status}`
      );
    }

    // Revoke permanently
    authorization.revoke(revokedBy, reason);

    await this.authRepo.save(authorization);

    // Create audit log
    await this.auditRepo.save(
      SellerAuthorizationAuditLog.createRevocationLog(authorization.id, revokedBy, reason)
    );

    // Invalidate cache
    await authorizationGateService.invalidateCache(authorization.sellerId, authorization.productId);

    authorizationMetrics.incrementRequestCounter('revoke', 'success');
    logger.info('[SellerAuthorization] Authorization revoked', {
      authorizationId: authorization.id,
      sellerId: authorization.sellerId,
      productId: authorization.productId,
      revokedBy,
    });

    return authorization;
  }

  /**
   * Cancel authorization (Seller only)
   */
  async cancelAuthorization(authorizationId: string, sellerId: string): Promise<SellerAuthorization> {
    if (!this.isFeatureEnabled()) {
      throw new Error('FEATURE_NOT_ENABLED: Seller authorization system is disabled');
    }

    const authorization = await this.authRepo.findOne({
      where: { id: authorizationId, sellerId },
    });

    if (!authorization) {
      authorizationMetrics.incrementRequestCounter('cancel', 'error');
      throw new Error('ERR_AUTHORIZATION_NOT_FOUND: Authorization not found or not owned by you');
    }

    if (authorization.status !== AuthorizationStatus.REQUESTED) {
      authorizationMetrics.incrementRequestCounter('cancel', 'error');
      throw new Error(
        `ERR_INVALID_STATUS: Can only cancel REQUESTED authorizations. Current status: ${authorization.status}`
      );
    }

    // Cancel
    authorization.cancel();

    await this.authRepo.save(authorization);

    // Create audit log
    await this.auditRepo.save(
      SellerAuthorizationAuditLog.createCancellationLog(authorization.id, sellerId)
    );

    // Invalidate cache
    await authorizationGateService.invalidateCache(authorization.sellerId, authorization.productId);

    authorizationMetrics.incrementRequestCounter('cancel', 'success');
    logger.info('[SellerAuthorization] Authorization cancelled', {
      authorizationId: authorization.id,
      sellerId: authorization.sellerId,
      productId: authorization.productId,
    });

    return authorization;
  }

  /**
   * List authorizations with filtering and pagination
   */
  async listAuthorizations(filter: ListAuthorizationsFilter) {
    const { sellerId, supplierId, productId, status, page = 1, limit = 20 } = filter;

    const where: any = {};
    if (sellerId) where.sellerId = sellerId;
    if (supplierId) where.supplierId = supplierId;
    if (productId) where.productId = productId;
    if (status) where.status = status;

    const [authorizations, total] = await this.authRepo.findAndCount({
      where,
      order: { requestedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['seller', 'product', 'supplier'],
    });

    return {
      authorizations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get seller limits and cooldowns
   */
  async getSellerLimits(sellerId: string): Promise<AuthorizationLimits> {
    const approvedCount = await this.authRepo.count({
      where: {
        sellerId,
        status: AuthorizationStatus.APPROVED,
      },
    });

    // Get cooldowns
    const cooldownAuthorizations = await this.authRepo.find({
      where: {
        sellerId,
        status: AuthorizationStatus.REJECTED,
      },
      relations: ['product'],
    });

    const cooldowns = cooldownAuthorizations
      .filter((auth) => auth.isInCooldown())
      .map((auth) => ({
        productId: auth.productId,
        productName: (auth.product as any)?.name,
        cooldownUntil: auth.cooldownUntil!,
        daysRemaining: auth.getCooldownDaysRemaining(),
      }));

    return {
      currentCount: approvedCount,
      maxLimit: this.PRODUCT_LIMIT,
      remainingSlots: Math.max(0, this.PRODUCT_LIMIT - approvedCount),
      cooldowns,
    };
  }

  /**
   * Get audit logs for an authorization
   */
  async getAuditLogs(authorizationId: string, page = 1, limit = 50) {
    const [logs, total] = await this.auditRepo.findAndCount({
      where: { authorizationId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

/**
 * Singleton instance
 */
export const sellerAuthorizationService = new SellerAuthorizationService();
