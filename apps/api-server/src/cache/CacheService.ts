/**
 * Cache Service Factory
 * R-8-7: Performance Optimization - Caching Strategy
 *
 * Creates and exports the appropriate cache service based on configuration
 */

import { ICacheService } from './ICacheService.js';
import { MemoryCacheService } from './MemoryCacheService.js';
import { RedisCacheService } from './RedisCacheService.js';
import { getCacheConfig } from './cache.config.js';
import logger from '../utils/logger.js';

let cacheServiceInstance: ICacheService | null = null;

/**
 * Initialize cache service based on configuration
 */
export function initializeCacheService(): ICacheService {
  if (cacheServiceInstance) {
    return cacheServiceInstance;
  }

  const config = getCacheConfig();

  logger.info('[CacheService] Initializing cache service', {
    type: config.type,
    ttl: config.ttl
  });

  try {
    if (config.type === 'redis') {
      cacheServiceInstance = new RedisCacheService(config);
      logger.info('[CacheService] Redis cache service initialized');
    } else {
      cacheServiceInstance = new MemoryCacheService(config);
      logger.info('[CacheService] Memory cache service initialized');
    }
  } catch (error) {
    logger.error('[CacheService] Failed to initialize cache service, falling back to memory cache', error);
    cacheServiceInstance = new MemoryCacheService(config);
  }

  return cacheServiceInstance;
}

/**
 * Get the global cache service instance
 */
export function getCacheService(): ICacheService {
  if (!cacheServiceInstance) {
    return initializeCacheService();
  }

  return cacheServiceInstance;
}

/**
 * Helper function to wrap cache operations with error handling
 */
export async function cachedOperation<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cacheService = getCacheService();

  try {
    // Try to get from cache
    const cached = await cacheService.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch data
    const data = await fetchFn();

    // Store in cache
    await cacheService.set(key, data, ttl);

    return data;
  } catch (error) {
    logger.error(`[CacheService] Error in cached operation for key: ${key}`, error);
    // Fall back to direct fetch on error
    return fetchFn();
  }
}

/**
 * Decorator for caching method results
 *
 * Example:
 * ```
 * @Cached('user', 300) // Cache for 5 minutes
 * async getUser(id: string) {
 *   return this.userRepository.findOne(id);
 * }
 * ```
 */
export function Cached(keyPrefix: string, ttl?: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;
      return cachedOperation(
        cacheKey,
        () => originalMethod.apply(this, args),
        ttl
      );
    };

    return descriptor;
  };
}

// Export cache service instance (lazily initialized)
export const cacheService = getCacheService();
