import { In } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { SellerAuthorization, AuthorizationStatus } from '../entities/SellerAuthorization.js';
import { CacheService } from './cache.service.js';
import { authorizationMetrics } from './authorization-metrics.service.js';
import logger from '../utils/logger.js';

/**
 * Phase 9: Authorization Gate Service
 *
 * Service for checking seller product authorization with caching.
 * Used in critical paths: Cart, Order, Settlement flows.
 *
 * Performance Requirements:
 * - P95 latency: <5ms (with Redis cache)
 * - P95 latency: <15ms (cache miss, database query)
 * - Throughput: >1000 checks/second per instance
 *
 * Feature Flag: ENABLE_SELLER_AUTHORIZATION (default: false)
 *
 * Created: 2025-01-07
 */

/**
 * Authorization gate check result with detailed context
 */
export interface AuthorizationGateResult {
  /** Is seller authorized for this product? */
  isAuthorized: boolean;

  /** Current authorization state */
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'CANCELLED' | 'NONE';

  /** Authorization ID (if exists) */
  authorizationId?: string;

  /** Rejection/revocation reason (if applicable) */
  reason?: string;

  /** Cooldown expiry date (if rejected) */
  cooldownUntil?: Date;

  /** Can seller request authorization now? */
  canRequest: boolean;

  /** Error code (if not authorized) */
  errorCode?: string;

  /** Human-readable message */
  message?: string;
}

/**
 * Bulk authorization check result
 */
export interface BulkAuthorizationResult {
  /** Map of productId → isAuthorized */
  authorizations: Map<string, boolean>;

  /** List of authorized product IDs */
  authorizedProducts: string[];

  /** List of unauthorized product IDs */
  unauthorizedProducts: string[];

  /** Cache hit rate (0-1) */
  cacheHitRate: number;

  /** Query execution time (ms) */
  executionTime: number;
}

/**
 * Cache configuration
 */
interface CacheConfig {
  /** Cache key prefix */
  keyPrefix: string;

  /** TTL in seconds (default: 60) */
  ttl: number;

  /** Enable caching (default: true) */
  enabled: boolean;
}

/**
 * Authorization Gate Service
 */
export class AuthorizationGateService {
  private cacheConfig: CacheConfig = {
    keyPrefix: 'auth:v2:seller',
    ttl: 30, // 30 seconds (as per spec)
    enabled: true,
  };

  private cacheService: CacheService;
  private repository = AppDataSource.getRepository(SellerAuthorization);

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * Check if feature is enabled
   */
  private isFeatureEnabled(): boolean {
    return process.env.ENABLE_SELLER_AUTHORIZATION === 'true';
  }

  /**
   * Generate cache key for seller-product pair
   */
  private getCacheKey(sellerId: string, productId: string): string {
    return `${this.cacheConfig.keyPrefix}:${sellerId}:product:${productId}`;
  }

  /**
   * Check if seller is approved for product
   *
   * Used in: Cart add, Order creation, Settlement calculation
   * Performance: P95 <5ms (with caching)
   *
   * @param sellerId - Seller UUID
   * @param productId - Product UUID
   * @returns Promise<boolean> - True if authorized, false otherwise
   *
   * @example
   * ```typescript
   * const isAuthorized = await authorizationGateService.isSellerApprovedForProduct(
   *   'seller-uuid',
   *   'product-uuid'
   * );
   *
   * if (!isAuthorized) {
   *   throw new Error('ERR_SELLER_NOT_AUTHORIZED');
   * }
   * ```
   *
   * Implementation Notes:
   * 1. Check feature flag first (fail-open if disabled)
   * 2. Check Redis cache: `auth:v2:seller:{sellerId}:product:{productId}` (TTL 30s)
   * 3. On cache miss, query database:
   *    - WHERE sellerId = ? AND productId = ? AND status = 'APPROVED'
   *    - Index: (sellerId, productId, status)
   * 4. Store result in cache (TTL 30s)
   * 5. Return boolean
   *
   * Cache Invalidation:
   * - On status change (approve/reject/revoke): DELETE auth:v2:seller:{sellerId}:product:{productId}
   *
   * Error Handling:
   * - Feature flag OFF: Return true (bypass)
   * - Redis error: Fallback to database (log error)
   * - Database error: Return false (fail-closed)
   */
  async isSellerApprovedForProduct(sellerId: string, productId: string): Promise<boolean> {
    const startTime = Date.now();
    let cacheHit = false;

    try {
      // 1. Feature flag check (fail-open if disabled)
      if (!this.isFeatureEnabled()) {
        logger.debug('[AuthorizationGate] Feature disabled, bypassing check', {
          sellerId,
          productId,
        });
        return true;
      }

      // 2. Check cache
      const cacheKey = this.getCacheKey(sellerId, productId);
      const cached = await this.cacheService.get<boolean>(cacheKey);

      if (cached !== null) {
        cacheHit = true;
        const latency = Date.now() - startTime;
        authorizationMetrics.recordGateLatency(latency, true);

        logger.debug('[AuthorizationGate] Cache hit', {
          sellerId,
          productId,
          result: cached,
          latencyMs: latency,
        });

        return cached;
      }

      // 3. Cache miss - query database
      const authorization = await this.repository.findOne({
        where: {
          sellerId,
          productId,
          status: AuthorizationStatus.APPROVED,
        },
      });

      const isAuthorized = authorization !== null;

      // 4. Store in cache
      await this.cacheService.set(cacheKey, isAuthorized, { ttl: this.cacheConfig.ttl });

      const latency = Date.now() - startTime;
      authorizationMetrics.recordGateLatency(latency, false);

      logger.debug('[AuthorizationGate] Cache miss, DB query', {
        sellerId,
        productId,
        result: isAuthorized,
        latencyMs: latency,
      });

      return isAuthorized;
    } catch (error) {
      const latency = Date.now() - startTime;
      authorizationMetrics.recordGateLatency(latency, cacheHit);

      logger.error('[AuthorizationGate] Check failed', {
        sellerId,
        productId,
        error,
        latencyMs: latency,
      });

      // Fail-closed: return false on error
      return false;
    }
  }

  /**
   * Bulk check for multiple products
   *
   * Used in: Product listing, Catalog filtering, Cart validation
   * Performance: P95 <50ms for 100 products (with caching)
   *
   * @param sellerId - Seller UUID
   * @param productIds - Array of Product UUIDs
   * @returns Promise<BulkAuthorizationResult> - Detailed authorization results
   *
   * @example
   * ```typescript
   * const result = await authorizationGateService.getApprovedProductsForSeller(
   *   'seller-uuid',
   *   ['prod-1', 'prod-2', 'prod-3']
   * );
   *
   * console.log(result.authorizedProducts); // ['prod-1', 'prod-3']
   * console.log(result.cacheHitRate); // 0.67 (2/3 from cache)
   * ```
   *
   * Implementation Notes:
   * 1. Check feature flag first (fail-open if disabled)
   * 2. Check cache for each product
   * 3. For cache misses, query database in single query:
   *    - WHERE sellerId = ? AND productId IN (?, ?, ...) AND status = 'APPROVED'
   *    - Index: (sellerId, productId, status)
   * 4. Store cache misses in Redis (TTL 30s)
   * 5. Aggregate results and return
   *
   * Optimization:
   * - Use database IN query (avoid N+1)
   * - Batch cache writes
   */
  async getApprovedProductsForSeller(
    sellerId: string,
    productIds: string[]
  ): Promise<BulkAuthorizationResult> {
    const startTime = Date.now();
    const authorizations = new Map<string, boolean>();
    const authorizedProducts: string[] = [];
    const unauthorizedProducts: string[] = [];
    let cacheHits = 0;

    try {
      // 1. Feature flag check (fail-open if disabled)
      if (!this.isFeatureEnabled()) {
        // If disabled, all products are authorized
        productIds.forEach((productId) => {
          authorizations.set(productId, true);
          authorizedProducts.push(productId);
        });

        return {
          authorizations,
          authorizedProducts,
          unauthorizedProducts: [],
          cacheHitRate: 1,
          executionTime: Date.now() - startTime,
        };
      }

      // 2. Check cache for each product
      const cacheMisses: string[] = [];

      for (const productId of productIds) {
        const cacheKey = this.getCacheKey(sellerId, productId);
        const cached = await this.cacheService.get<boolean>(cacheKey);

        if (cached !== null) {
          cacheHits++;
          authorizations.set(productId, cached);
          if (cached) {
            authorizedProducts.push(productId);
          } else {
            unauthorizedProducts.push(productId);
          }
        } else {
          cacheMisses.push(productId);
        }
      }

      // 3. Query database for cache misses
      if (cacheMisses.length > 0) {
        const dbAuthorizations = await this.repository.find({
          where: {
            sellerId,
            productId: In(cacheMisses) as any,
            status: AuthorizationStatus.APPROVED,
          },
        });

        const approvedProductIds = new Set(dbAuthorizations.map((auth) => auth.productId));

        // 4. Store results in cache and aggregate
        for (const productId of cacheMisses) {
          const isAuthorized = approvedProductIds.has(productId);
          authorizations.set(productId, isAuthorized);

          if (isAuthorized) {
            authorizedProducts.push(productId);
          } else {
            unauthorizedProducts.push(productId);
          }

          // Cache the result
          const cacheKey = this.getCacheKey(sellerId, productId);
          await this.cacheService.set(cacheKey, isAuthorized, { ttl: this.cacheConfig.ttl });
        }
      }

      const executionTime = Date.now() - startTime;
      const cacheHitRate = productIds.length > 0 ? cacheHits / productIds.length : 0;

      logger.debug('[AuthorizationGate] Bulk check completed', {
        sellerId,
        totalProducts: productIds.length,
        cacheHits,
        cacheMisses: cacheMisses.length,
        cacheHitRate,
        authorizedCount: authorizedProducts.length,
        executionTime,
      });

      return {
        authorizations,
        authorizedProducts,
        unauthorizedProducts,
        cacheHitRate,
        executionTime,
      };
    } catch (error) {
      logger.error('[AuthorizationGate] Bulk check failed', {
        sellerId,
        productCount: productIds.length,
        error,
      });

      // Fail-closed: return all unauthorized on error
      productIds.forEach((productId) => {
        authorizations.set(productId, false);
        unauthorizedProducts.push(productId);
      });

      return {
        authorizations,
        authorizedProducts: [],
        unauthorizedProducts,
        cacheHitRate: 0,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check if user has seller role (platform-level qualification)
   *
   * Used in: Seller endpoint authorization
   * Performance: P95 <5ms (should be checked via JWT or session, not DB)
   *
   * @param userId - User UUID
   * @returns Promise<boolean> - True if user has seller role
   *
   * @example
   * ```typescript
   * const isSeller = await authorizationGateService.hasSellerRole('user-uuid');
   *
   * if (!isSeller) {
   *   throw new Error('ERR_INSUFFICIENT_PERMISSIONS');
   * }
   * ```
   *
   * Implementation Notes:
   * 1. This should typically be checked via JWT roles
   * 2. This method is for cases where JWT is not available
   * 3. Query Seller entity to verify user has seller record
   */
  async hasSellerRole(userId: string): Promise<boolean> {
    try {
      if (!this.isFeatureEnabled()) {
        return true; // Bypass if feature disabled
      }

      const sellerRepo = AppDataSource.getRepository('Seller');
      const seller = await sellerRepo.findOne({
        where: { userId },
      });

      return seller !== null && seller.isActive;
    } catch (error) {
      logger.error('[AuthorizationGate] hasSellerRole check failed', {
        userId,
        error,
      });
      return false;
    }
  }

  /**
   * Get authorization status with detailed context
   *
   * Used in: UI display, Error messages, Admin dashboards
   * Performance: P95 <10ms (database query, no caching)
   *
   * @param sellerId - Seller UUID
   * @param productId - Product UUID
   * @returns Promise<AuthorizationStatus> - Detailed authorization status
   *
   * @example
   * ```typescript
   * const status = await authorizationGateService.getAuthorizationStatus(
   *   'seller-uuid',
   *   'product-uuid'
   * );
   *
   * if (!status.isAuthorized) {
   *   if (status.status === 'REJECTED' && status.cooldownUntil) {
   *     throw new Error(`ERR_COOLDOWN_ACTIVE: ${status.message}`);
   *   } else if (status.status === 'REVOKED') {
   *     throw new Error(`ERR_AUTHORIZATION_REVOKED: ${status.reason}`);
   *   } else {
   *     throw new Error(`ERR_SELLER_NOT_AUTHORIZED: ${status.message}`);
   *   }
   * }
   * ```
   *
   * Implementation Notes:
   * 1. Query seller_authorizations table
   * 2. Calculate canRequest based on status, cooldown
   * 3. Return detailed AuthorizationGateResult object
   */
  async getAuthorizationStatus(sellerId: string, productId: string): Promise<AuthorizationGateResult> {
    try {
      if (!this.isFeatureEnabled()) {
        return {
          isAuthorized: true,
          status: 'APPROVED',
          canRequest: false,
          message: 'Authorization system is disabled',
        };
      }

      const authorization = await this.repository.findOne({
        where: { sellerId, productId },
      });

      if (!authorization) {
        return {
          isAuthorized: false,
          status: 'NONE',
          canRequest: true,
          errorCode: 'ERR_NO_AUTHORIZATION',
          message: 'No authorization record found. You can request authorization.',
        };
      }

      const isAuthorized = authorization.status === AuthorizationStatus.APPROVED;
      const canRequest = authorization.canRequest();

      let errorCode: string | undefined;
      let message: string | undefined;

      if (!isAuthorized) {
        errorCode = `ERR_${authorization.status}`;
        message = authorization.getErrorMessage();
      }

      return {
        isAuthorized,
        status: authorization.status,
        authorizationId: authorization.id,
        reason: authorization.rejectionReason || authorization.revocationReason,
        cooldownUntil: authorization.cooldownUntil,
        canRequest,
        errorCode,
        message,
      };
    } catch (error) {
      logger.error('[AuthorizationGate] getAuthorizationStatus failed', {
        sellerId,
        productId,
        error,
      });

      return {
        isAuthorized: false,
        status: 'NONE',
        canRequest: false,
        errorCode: 'ERR_SYSTEM_ERROR',
        message: 'Failed to check authorization status',
      };
    }
  }

  /**
   * Invalidate cache for seller-product pair
   *
   * Used in: Authorization state changes (approve/reject/revoke)
   * Performance: P95 <5ms (Redis DELETE)
   *
   * @param sellerId - Seller UUID
   * @param productId - Product UUID
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * // After approving authorization
   * await authorizationGateService.invalidateCache('seller-uuid', 'product-uuid');
   * ```
   *
   * Implementation Notes:
   * 1. Delete Redis key: `auth:v2:seller:{sellerId}:product:{productId}`
   * 2. Log cache invalidation for debugging
   * 3. Handle Redis errors gracefully (don't throw)
   */
  async invalidateCache(sellerId: string, productId: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(sellerId, productId);
      await this.cacheService.del(cacheKey);

      logger.debug('[AuthorizationGate] Cache invalidated', {
        sellerId,
        productId,
        cacheKey,
      });
    } catch (error) {
      logger.error('[AuthorizationGate] Cache invalidation failed', {
        sellerId,
        productId,
        error,
      });
      // Don't throw - cache invalidation failures should not block operations
    }
  }

  /**
   * Warm cache for seller's authorized products
   *
   * Used in: Seller login, Periodic cache refresh
   * Performance: P95 <100ms for 100 products
   *
   * @param sellerId - Seller UUID
   * @returns Promise<number> - Number of products cached
   *
   * @example
   * ```typescript
   * // After seller login
   * const cachedCount = await authorizationGateService.warmCache('seller-uuid');
   * console.log(`Cached ${cachedCount} authorized products`);
   * ```
   *
   * Implementation Notes:
   * 1. Query all APPROVED authorizations for seller
   * 2. Batch write to Redis
   * 3. Set TTL for all keys (30 seconds)
   * 4. Return count of cached products
   */
  async warmCache(sellerId: string): Promise<number> {
    try {
      if (!this.isFeatureEnabled()) {
        return 0;
      }

      const authorizations = await this.repository.find({
        where: {
          sellerId,
          status: AuthorizationStatus.APPROVED,
        },
      });

      for (const auth of authorizations) {
        const cacheKey = this.getCacheKey(sellerId, auth.productId);
        await this.cacheService.set(cacheKey, true, { ttl: this.cacheConfig.ttl });
      }

      logger.info('[AuthorizationGate] Cache warmed', {
        sellerId,
        productCount: authorizations.length,
      });

      return authorizations.length;
    } catch (error) {
      logger.error('[AuthorizationGate] Cache warm failed', {
        sellerId,
        error,
      });
      return 0;
    }
  }

  /**
   * Get cache statistics
   *
   * Used in: Monitoring, Debugging
   * Performance: P95 <10ms
   *
   * @returns Promise<{ hitRate: number, size: number, ttl: number }>
   *
   * Implementation Notes:
   * 1. Return cache configuration
   * 2. Actual hit rate should be tracked by metrics service
   */
  async getCacheStats(): Promise<{ hitRate: number; size: number; ttl: number }> {
    try {
      // In a real implementation, we would query Redis for actual stats
      // For now, return configuration values
      return {
        hitRate: 0, // Should be calculated from metrics
        size: 0, // Should be queried from Redis
        ttl: this.cacheConfig.ttl,
      };
    } catch (error) {
      logger.error('[AuthorizationGate] getCacheStats failed', { error });
      return {
        hitRate: 0,
        size: 0,
        ttl: this.cacheConfig.ttl,
      };
    }
  }
}

/**
 * Singleton instance
 */
export const authorizationGateService = new AuthorizationGateService();
