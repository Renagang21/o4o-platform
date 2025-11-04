/**
 * Cache Middleware for Routes
 * Provides caching for Policy, Product, and Partner routes with:
 * - Different TTLs per resource type
 * - Stale-While-Revalidate (SWR)
 * - Automatic cache invalidation on writes
 */

import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/CacheService.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';

// Cache TTL configuration (seconds)
const CACHE_TTL = {
  POLICY: parseInt(process.env.CACHE_TTL_POLICY || '300'),      // 5 minutes
  PRODUCT: parseInt(process.env.CACHE_TTL_PRODUCT || '600'),    // 10 minutes
  PARTNER: parseInt(process.env.CACHE_TTL_PARTNER || '900'),    // 15 minutes
};

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request, prefix: string): string {
  const query = JSON.stringify(req.query);
  const params = JSON.stringify(req.params);
  const hash = crypto
    .createHash('md5')
    .update(query + params)
    .digest('hex');

  return `${prefix}:${hash}`;
}

/**
 * Cache middleware factory
 */
export function cacheMiddleware(
  type: 'policy' | 'product' | 'partner',
  options?: {
    ttl?: number;
    keyPrefix?: string;
    invalidatePattern?: string;
  }
) {
  const ttlMap = {
    policy: CACHE_TTL.POLICY,
    product: CACHE_TTL.PRODUCT,
    partner: CACHE_TTL.PARTNER,
  };

  const ttl = options?.ttl || ttlMap[type];
  const keyPrefix = options?.keyPrefix || `${type}:list`;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = generateCacheKey(req, keyPrefix);

    try {
      // Try to get from cache
      const cached = await cacheService.get(cacheKey, type, {
        staleWhileRevalidate: true,
      });

      if (cached) {
        logger.debug(`Cache hit for ${type}: ${cacheKey}`);

        // Track cache hit in metrics
        const httpMetrics = (await import('./metrics.middleware.js')).default;
        const instance = httpMetrics.getInstance((await import('../services/prometheus-metrics.service.js')).prometheusMetrics.registry);
        instance.recordCacheHit('L2', type);

        return res.json(cached);
      }

      // Cache miss - continue to handler
      logger.debug(`Cache miss for ${type}: ${cacheKey}`);

      // Intercept response to cache the result
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        // Cache the response
        cacheService.set(cacheKey, body, type, {
          ttl,
          staleWhileRevalidate: true,
        }).catch((err) => {
          logger.error(`Failed to cache ${type} response:`, err);
        });

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error(`Cache middleware error for ${type}:`, error);
      next();
    }
  };
}

/**
 * Cache invalidation middleware for write operations
 */
export function invalidateCacheMiddleware(
  type: 'policy' | 'product' | 'partner',
  options?: {
    invalidateAll?: boolean;
    invalidatePattern?: string;
  }
) {
  return async (req: Request, res: Response, next: NextFunction) {
    // Only invalidate on POST, PUT, DELETE, PATCH
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return next();
    }

    // Continue with request
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Invalidate cache after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (options?.invalidateAll) {
          // Invalidate all cache for this type
          cacheService.clear(`${type}:*`).catch((err) => {
            logger.error(`Failed to invalidate ${type} cache:`, err);
          });
        } else if (options?.invalidatePattern) {
          // Invalidate specific pattern
          cacheService.clear(options.invalidatePattern).catch((err) => {
            logger.error(`Failed to invalidate ${type} cache pattern:`, err);
          });
        } else {
          // Invalidate list caches (common pattern)
          cacheService.clear(`${type}:list:*`).catch((err) => {
            logger.error(`Failed to invalidate ${type} list cache:`, err);
          });

          // Invalidate specific item if ID is available
          const id = req.params.id || body?.id;
          if (id) {
            cacheService.delete(`${type}:${id}`, type).catch((err) => {
              logger.error(`Failed to invalidate ${type} item cache:`, err);
            });
          }
        }

        logger.debug(`Cache invalidated for ${type} after ${req.method}`);
      }

      return originalJson(body);
    };

    next();
  };
}

// Convenience middleware exports
export const cachePolicy = () => cacheMiddleware('policy');
export const cacheProduct = () => cacheMiddleware('product');
export const cachePartner = () => cacheMiddleware('partner');

export const invalidatePolicy = (options?: { invalidateAll?: boolean }) =>
  invalidateCacheMiddleware('policy', options);
export const invalidateProduct = (options?: { invalidateAll?: boolean }) =>
  invalidateCacheMiddleware('product', options);
export const invalidatePartner = (options?: { invalidateAll?: boolean }) =>
  invalidateCacheMiddleware('partner', options);
