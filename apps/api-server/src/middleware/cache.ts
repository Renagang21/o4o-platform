/**
 * Cache Middleware
 *
 * Phase 2.5: GRACEFUL_STARTUP 호환
 * - Import 시점에 Redis 연결하지 않음
 * - Redis 없으면 메모리 캐시 사용
 */

import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';
import { getRedisClient, isRedisAvailable } from '../infrastructure/redis.guard.js';
import logger from '../utils/logger.js';

// In-memory cache (항상 사용 가능)
const memoryCache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60 // Check for expired keys every 60 seconds
});

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string | ((req: Request) => string); // Custom cache key
  condition?: (req: Request) => boolean; // Condition to cache
  invalidatePattern?: string; // Pattern to invalidate cache
}

/**
 * Cache middleware for GET requests
 */
export const cache = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check condition if provided
    if (options.condition && !options.condition(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = typeof options.key === 'function'
      ? options.key(req)
      : options.key || `cache:${req.originalUrl}`;

    try {
      // Try to get from cache
      let cachedData: string | null = null;

      // Try Redis first if available
      if (isRedisAvailable()) {
        const redisClient = getRedisClient();
        if (redisClient) {
          try {
            cachedData = await redisClient.get(cacheKey);
          } catch (error) {
            // Redis failed, fallback to memory
            cachedData = memoryCache.get(cacheKey) as string;
          }
        }
      } else {
        // Use memory cache
        cachedData = memoryCache.get(cacheKey) as string;
      }

      if (cachedData) {
        // Cache hit
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', 'application/json');
        return res.send(cachedData);
      }

      // Cache miss
      res.setHeader('X-Cache', 'MISS');

      // Store original send function
      const originalSend = res.send.bind(res);

      // Override send function to cache the response
      res.send = function (data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const dataToCache = typeof data === 'string' ? data : JSON.stringify(data);
          const ttl = options.ttl || 300; // Default 5 minutes

          // Try to cache in Redis if available
          if (isRedisAvailable()) {
            const redisClient = getRedisClient();
            if (redisClient) {
              redisClient.setex(cacheKey, ttl, dataToCache).catch(err => {
                // Fallback to memory cache
                memoryCache.set(cacheKey, dataToCache, ttl);
              });
            } else {
              memoryCache.set(cacheKey, dataToCache, ttl);
            }
          } else {
            memoryCache.set(cacheKey, dataToCache, ttl);
          }
        }

        return originalSend(data);
      };

      next();
    } catch (error) {
      next();
    }
  };
};

/**
 * Invalidate cache by pattern
 */
export const invalidateCache = async (pattern: string) => {
  // Try Redis first
  if (isRedisAvailable()) {
    const redisClient = getRedisClient();
    if (redisClient) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
        return;
      } catch (error) {
        // Fallback to memory cache
      }
    }
  }

  // Memory cache fallback
  const keys = memoryCache.keys();
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));
  keys.forEach(key => {
    if (regex.test(key)) {
      memoryCache.del(key);
    }
  });
};

/**
 * Clear all cache
 */
export const clearCache = async () => {
  // Try Redis first
  if (isRedisAvailable()) {
    const redisClient = getRedisClient();
    if (redisClient) {
      try {
        await redisClient.flushdb();
        return;
      } catch (error) {
        // Fallback to memory cache
      }
    }
  }

  // Memory cache fallback
  memoryCache.flushAll();
};

/**
 * Cache statistics
 */
export const getCacheStats = async () => {
  // Try Redis first
  if (isRedisAvailable()) {
    const redisClient = getRedisClient();
    if (redisClient) {
      try {
        return await redisClient.info('stats');
      } catch (error) {
        // Fallback to memory cache
      }
    }
  }

  // Memory cache stats
  return {
    keys: memoryCache.keys().length,
    hits: memoryCache.getStats().hits,
    misses: memoryCache.getStats().misses,
    ksize: memoryCache.getStats().ksize,
    vsize: memoryCache.getStats().vsize
  };
};
