/**
 * Cache Invalidation Helpers
 * R-8-7: Performance Optimization - Cache Invalidation Policy
 *
 * Provides centralized cache invalidation functions to maintain data consistency
 * when orders or settlements are created/updated.
 */

import { cacheService, CacheKeys } from '../cache/index.js';
import logger from './logger.js';

/**
 * Invalidate all cache entries for a seller
 * Clears: dashboard summaries, commission summaries, settlement summaries
 */
export async function invalidateSellerCache(sellerId: string): Promise<void> {
  try {
    const pattern = CacheKeys.PATTERN.SELLER_ALL(sellerId);
    const deletedCount = await cacheService.deletePattern(pattern);

    logger.info('[CacheInvalidation] Seller cache invalidated', {
      sellerId,
      pattern,
      deletedCount
    });
  } catch (error) {
    logger.error('[CacheInvalidation] Failed to invalidate seller cache', {
      sellerId,
      error
    });
    // Don't throw - cache invalidation failure shouldn't break the main operation
  }
}

/**
 * Invalidate all cache entries for a supplier
 * Clears: dashboard summaries, commission summaries, settlement summaries
 */
export async function invalidateSupplierCache(supplierId: string): Promise<void> {
  try {
    const pattern = CacheKeys.PATTERN.SUPPLIER_ALL(supplierId);
    const deletedCount = await cacheService.deletePattern(pattern);

    logger.info('[CacheInvalidation] Supplier cache invalidated', {
      supplierId,
      pattern,
      deletedCount
    });
  } catch (error) {
    logger.error('[CacheInvalidation] Failed to invalidate supplier cache', {
      supplierId,
      error
    });
  }
}

/**
 * Invalidate settlement-related cache for a party
 * Clears: settlement summaries, commission summaries for specific party
 */
export async function invalidateSettlementCache(
  partyType: 'seller' | 'supplier' | 'platform',
  partyId: string
): Promise<void> {
  try {
    const pattern = CacheKeys.PATTERN.SETTLEMENT_ALL(partyType, partyId);
    const deletedCount = await cacheService.deletePattern(pattern);

    logger.info('[CacheInvalidation] Settlement cache invalidated', {
      partyType,
      partyId,
      pattern,
      deletedCount
    });
  } catch (error) {
    logger.error('[CacheInvalidation] Failed to invalidate settlement cache', {
      partyType,
      partyId,
      error
    });
  }
}

/**
 * Invalidate dashboard-related cache for a party
 * More granular than full invalidation - only clears dashboard summaries
 */
export async function invalidateDashboardCache(
  partyType: 'seller' | 'supplier',
  partyId: string
): Promise<void> {
  try {
    // Use appropriate pattern based on party type
    const pattern = partyType === 'seller'
      ? `dashboard:seller:${partyId}:*`
      : `dashboard:supplier:${partyId}:*`;

    const deletedCount = await cacheService.deletePattern(pattern);

    logger.info('[CacheInvalidation] Dashboard cache invalidated', {
      partyType,
      partyId,
      pattern,
      deletedCount
    });
  } catch (error) {
    logger.error('[CacheInvalidation] Failed to invalidate dashboard cache', {
      partyType,
      partyId,
      error
    });
  }
}

/**
 * Generic function to invalidate cache by custom pattern
 * Use with caution - prefer specific invalidation functions above
 */
export async function invalidateAllByPattern(pattern: string): Promise<void> {
  try {
    const deletedCount = await cacheService.deletePattern(pattern);

    logger.info('[CacheInvalidation] Custom pattern cache invalidated', {
      pattern,
      deletedCount
    });
  } catch (error) {
    logger.error('[CacheInvalidation] Failed to invalidate cache by pattern', {
      pattern,
      error
    });
  }
}

/**
 * Helper: Invalidate multiple seller caches at once
 * Useful when a single operation affects multiple sellers
 */
export async function invalidateMultipleSellerCaches(
  sellerIds: string[]
): Promise<void> {
  await Promise.all(sellerIds.map(id => invalidateSellerCache(id)));
}

/**
 * Helper: Invalidate multiple supplier caches at once
 * Useful when a single operation affects multiple suppliers
 */
export async function invalidateMultipleSupplierCaches(
  supplierIds: string[]
): Promise<void> {
  await Promise.all(supplierIds.map(id => invalidateSupplierCache(id)));
}

/**
 * Helper: Invalidate all party types involved in an order
 * Call this when an order is created/updated
 */
export async function invalidateOrderRelatedCaches(
  sellerIds: string[],
  supplierIds: string[]
): Promise<void> {
  try {
    await Promise.all([
      ...sellerIds.map(id => invalidateSellerCache(id)),
      ...supplierIds.map(id => invalidateSupplierCache(id))
    ]);

    logger.info('[CacheInvalidation] Order-related caches invalidated', {
      sellerCount: sellerIds.length,
      supplierCount: supplierIds.length
    });
  } catch (error) {
    logger.error('[CacheInvalidation] Failed to invalidate order-related caches', {
      error
    });
  }
}
