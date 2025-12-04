import logger from '../../../utils/logger.js';

/**
 * Phase B-4 Step 3: Authorization Gate Service
 *
 * Manages authorization cache invalidation and access control checks.
 * Acts as a gate for seller product access authorization.
 *
 * Future enhancements:
 * - Redis cache integration for distributed systems
 * - Bulk authorization checks
 * - Authorization decision caching with TTL
 *
 * Created: 2025-01-04
 */

export class AuthorizationGateService {
  private cache: Map<string, any>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Invalidate cache for a specific seller-product pair
   * Called when authorization status changes (approve, reject, revoke, cancel)
   */
  async invalidateCache(sellerId: string, productId: string): Promise<void> {
    const cacheKey = `auth:${sellerId}:${productId}`;

    if (this.cache.has(cacheKey)) {
      this.cache.delete(cacheKey);

      logger.debug('[AuthorizationGateService] Cache invalidated', {
        sellerId,
        productId,
        cacheKey,
      });
    }
  }

  /**
   * Invalidate all cache entries for a seller
   * Useful when seller status changes or bulk operations occur
   */
  async invalidateSellerCache(sellerId: string): Promise<void> {
    let invalidatedCount = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(`auth:${sellerId}:`)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    logger.debug('[AuthorizationGateService] Seller cache invalidated', {
      sellerId,
      invalidatedCount,
    });
  }

  /**
   * Clear all cache entries
   * Useful for testing or system maintenance
   */
  async clearCache(): Promise<void> {
    const previousSize = this.cache.size;
    this.cache.clear();

    logger.info('[AuthorizationGateService] Cache cleared', {
      previousSize,
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Singleton instance
 */
export const authorizationGateService = new AuthorizationGateService();
