import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/CacheService.js';
import logger from '../utils/logger.js';

/**
 * Cache Middleware
 *
 * Provides request-level caching for API endpoints.
 *
 * Features:
 * - Policy caching (TTL 5 minutes)
 * - Product caching (TTL 10 minutes)
 * - Partner caching (TTL 15 minutes)
 * - Automatic cache invalidation on mutations
 * - Cache-Control headers
 *
 * @middleware Phase 2.2 - Stage 4
 */

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request): string {
  const { method, path, query } = req;
  const queryString = JSON.stringify(query);
  return `api:${method}:${path}:${queryString}`;
}

/**
 * Generic cache middleware
 *
 * Caches GET requests and returns cached responses.
 *
 * Usage:
 * ```typescript
 * router.get('/policies', cacheMiddleware(300), policyController.list);
 * ```
 *
 * @param ttlSeconds - Time to live in seconds
 * @param namespace - Cache namespace (optional)
 */
export function cacheMiddleware(ttlSeconds: number = 300, namespace?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = generateCacheKey(req);

    try {
      // Try to get from cache
      const cached = await cacheService.get(cacheKey, namespace);

      if (cached) {
        // Add cache hit headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttlSeconds}`
        });

        return res.json(cached);
      }

      // Cache miss - intercept res.json to cache response
      const originalJson = res.json.bind(res);

      res.json = function (body: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, body, namespace, { ttl: ttlSeconds }).catch(err => {
            logger.error('Cache set error:', err);
          });
        }

        // Add cache miss headers
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttlSeconds}`
        });

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Policy cache middleware
 *
 * Caches commission policy requests with 5-minute TTL.
 *
 * Usage:
 * ```typescript
 * router.get('/policies/:id', cachePolicyMiddleware, policyController.getById);
 * ```
 */
export const cachePolicyMiddleware = cacheMiddleware(300, 'policy');

/**
 * Product cache middleware
 *
 * Caches product requests with 10-minute TTL.
 *
 * Usage:
 * ```typescript
 * router.get('/products/:id', cacheProductMiddleware, productController.getById);
 * ```
 */
export const cacheProductMiddleware = cacheMiddleware(600, 'product');

/**
 * Partner cache middleware
 *
 * Caches partner requests with 15-minute TTL.
 *
 * Usage:
 * ```typescript
 * router.get('/partners/:id', cachePartnerMiddleware, partnerController.getById);
 * ```
 */
export const cachePartnerMiddleware = cacheMiddleware(900, 'partner');

/**
 * Cache invalidation middleware
 *
 * Automatically invalidates cache on POST/PUT/DELETE requests.
 *
 * Usage:
 * ```typescript
 * router.post('/policies', cacheInvalidationMiddleware('policy'), policyController.create);
 * router.put('/policies/:id', cacheInvalidationMiddleware('policy'), policyController.update);
 * router.delete('/policies/:id', cacheInvalidationMiddleware('policy'), policyController.delete);
 * ```
 *
 * @param namespace - Cache namespace to invalidate
 * @param pattern - Optional pattern for selective invalidation
 */
export function cacheInvalidationMiddleware(namespace?: string, pattern?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only invalidate on mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Wait for response to complete before invalidating
    res.on('finish', async () => {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          if (pattern) {
            await cacheService.clear(pattern);
          } else if (namespace) {
            await cacheService.clear(`${namespace}:*`);
          } else {
            // Invalidate all API caches
            await cacheService.clear('api:*');
          }

          logger.info(`Cache invalidated: ${namespace || 'all'} ${pattern || ''}`);
        } catch (error) {
          logger.error('Cache invalidation error:', error);
        }
      }
    });

    next();
  };
}

/**
 * Cache statistics middleware
 *
 * Adds cache statistics to response headers.
 *
 * Usage:
 * ```typescript
 * app.use(cacheStatsMiddleware);
 * ```
 */
export function cacheStatsMiddleware(req: Request, res: Response, next: NextFunction) {
  const stats = cacheService.getStats();

  res.set({
    'X-Cache-Hit-Rate': `${(stats.hitRate * 100).toFixed(2)}%`,
    'X-Cache-L1-Hit-Rate': `${(stats.l1HitRate * 100).toFixed(2)}%`,
    'X-Cache-L2-Hit-Rate': `${(stats.l2HitRate * 100).toFixed(2)}%`
  });

  next();
}

/**
 * Entity-specific cache invalidation helpers
 */
export const cacheInvalidation = {
  /**
   * Invalidate policy cache
   */
  policy: cacheInvalidationMiddleware('policy'),

  /**
   * Invalidate product cache
   */
  product: cacheInvalidationMiddleware('product'),

  /**
   * Invalidate partner cache
   */
  partner: cacheInvalidationMiddleware('partner'),

  /**
   * Invalidate commission cache
   */
  commission: cacheInvalidationMiddleware('commission'),

  /**
   * Invalidate all caches
   */
  all: cacheInvalidationMiddleware()
};

// Note: staleWhileRevalidate middleware was removed due to TypeScript compilation issue
