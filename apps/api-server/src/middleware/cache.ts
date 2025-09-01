import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';
import Redis from 'ioredis';

// In-memory cache for development
const memoryCache = new NodeCache({ 
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60 // Check for expired keys every 60 seconds
});

// Redis cache for production
let redisClient: Redis | null = null;

if (process.env.NODE_ENV === 'production' && process.env.REDIS_HOST) {
  redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  });

  redisClient.on('error', (err) => {
    // Error log removed
    // Fallback to memory cache if Redis fails
    redisClient = null;
  });
}

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

      if (redisClient) {
        cachedData = await redisClient.get(cacheKey);
      } else {
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
      res.send = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const dataToCache = typeof data === 'string' ? data : JSON.stringify(data);
          const ttl = options.ttl || 300; // Default 5 minutes

          if (redisClient) {
            redisClient.setex(cacheKey, ttl, dataToCache).catch(err => {
              // Error log removed
            });
          } else {
            memoryCache.set(cacheKey, dataToCache, ttl);
          }
        }

        return originalSend(data);
      };

      next();
    } catch (error) {
      // Error log removed
      next();
    }
  };
};

/**
 * Invalidate cache by pattern
 */
export const invalidateCache = async (pattern: string) => {
  if (redisClient) {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } else {
    // For memory cache, we need to iterate through all keys
    const keys = memoryCache.keys();
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    keys.forEach(key => {
      if (regex.test(key)) {
        memoryCache.del(key);
      }
    });
  }
};

/**
 * Clear all cache
 */
export const clearCache = async () => {
  if (redisClient) {
    await redisClient.flushdb();
  } else {
    memoryCache.flushAll();
  }
};

/**
 * Cache statistics
 */
export const getCacheStats = () => {
  if (redisClient) {
    return redisClient.info('stats');
  } else {
    return {
      keys: memoryCache.keys().length,
      hits: memoryCache.getStats().hits,
      misses: memoryCache.getStats().misses,
      ksize: memoryCache.getStats().ksize,
      vsize: memoryCache.getStats().vsize
    };
  }
};