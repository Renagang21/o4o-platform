/**
 * Cache Middleware
 * HTTP response caching middleware with intelligent invalidation
 */

import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/CacheService.js';
import crypto from 'crypto';
import logger from '../utils/simpleLogger.js';

// Cache configuration per route
interface CacheConfig {
  ttl?: number;
  tags?: string[];
  varyBy?: string[];
  condition?: (req: Request) => boolean;
  keyGenerator?: (req: Request) => string;
  shouldCache?: (req: Request, res: Response) => boolean;
}

// Default cache configurations by route pattern
const cacheConfigs = new Map<RegExp, CacheConfig>([
  // Product listings - cache for 5 minutes
  [/^\/api\/v1\/products$/, {
    ttl: 300,
    tags: ['products'],
    varyBy: ['category', 'page', 'limit', 'sort']
  }],
  
  // Individual product - cache for 10 minutes
  [/^\/api\/v1\/products\/[\w-]+$/, {
    ttl: 600,
    tags: ['products'],
    shouldCache: (req, res) => res.statusCode === 200
  }],
  
  // Categories - cache for 1 hour
  [/^\/api\/v1\/products\/categories$/, {
    ttl: 3600,
    tags: ['categories']
  }],
  
  // User profile - cache for 5 minutes, vary by user
  [/^\/api\/v1\/users\/me$/, {
    ttl: 300,
    tags: ['users'],
    keyGenerator: (req) => `user:${(req as any).user?.id}`
  }],
  
  // Static content - cache for 1 day
  [/^\/api\/v1\/content\/pages\/[\w-]+$/, {
    ttl: 86400,
    tags: ['content', 'pages']
  }],
  
  // Search results - cache for 2 minutes
  [/^\/api\/v1\/search$/, {
    ttl: 120,
    tags: ['search'],
    varyBy: ['q', 'type', 'page']
  }],
  
  // Settings - cache for 30 minutes
  [/^\/api\/v1\/settings$/, {
    ttl: 1800,
    tags: ['settings']
  }]
]);

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request, config?: CacheConfig): string {
  // Use custom key generator if provided
  if (config?.keyGenerator) {
    return config.keyGenerator(req);
  }
  
  // Build key components
  const components = [
    req.method,
    req.path
  ];
  
  // Add query parameters specified in varyBy
  if (config?.varyBy) {
    const queryParams = config.varyBy
      .map(param => `${param}:${req.query[param] || ''}`)
      .join(':');
    components.push(queryParams);
  } else if (Object.keys(req.query).length > 0) {
    // Include all query params if varyBy not specified
    components.push(JSON.stringify(req.query));
  }
  
  // Add user context for authenticated routes
  const user = (req as any).user;
  if (user) {
    components.push(`user:${user.id}`);
    if (user.roles?.[0]) {
      components.push(`role:${user.roles[0]}`);
    }
  }
  
  // Generate hash for consistent key length
  const keyString = components.join(':');
  return crypto
    .createHash('md5')
    .update(keyString)
    .digest('hex');
}

/**
 * Find matching cache configuration
 */
function findCacheConfig(path: string): CacheConfig | undefined {
  for (const [pattern, config] of cacheConfigs) {
    if (pattern.test(path)) {
      return config;
    }
  }
  return undefined;
}

/**
 * Cache middleware factory
 */
export function cache(customConfig?: CacheConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Skip if cache is disabled
    if (process.env.CACHE_ENABLED === 'false') {
      return next();
    }
    
    // Get cache configuration
    const routeConfig = findCacheConfig(req.path);
    const config = { ...routeConfig, ...customConfig };
    
    // Check if should cache based on condition
    if (config?.condition && !config.condition(req)) {
      return next();
    }
    
    // Generate cache key
    const cacheKey = generateCacheKey(req, config);
    const namespace = 'http';
    
    try {
      // Try to get from cache
      const cached = await cacheService.get(cacheKey, namespace);
      
      if (cached) {
        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        // Send cached response
        const { statusCode, headers, body } = cached as any;
        
        // Set cached headers
        Object.keys(headers).forEach(key => {
          res.set(key, headers[key]);
        });
        
        // Send response
        res.status(statusCode).send(body);
        
        logger.debug(`Cache HIT: ${req.method} ${req.path}`);
        return;
      }
    } catch (error) {
      logger.error('Cache retrieval error:', error);
      // Continue without cache on error
    }
    
    // Cache MISS - capture response
    res.set('X-Cache', 'MISS');
    res.set('X-Cache-Key', cacheKey);
    
    // Store original methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;
    
    let responseBody: any;
    let responseSent = false;
    
    // Intercept response methods
    const cacheResponse = async (body: any) => {
      if (responseSent) return;
      responseSent = true;
      
      // Check if should cache this response
      const shouldCache = config?.shouldCache 
        ? config.shouldCache(req, res)
        : res.statusCode >= 200 && res.statusCode < 300;
      
      if (shouldCache && body) {
        try {
          // Prepare cache data
          const cacheData = {
            statusCode: res.statusCode,
            headers: res.getHeaders(),
            body: body
          };
          
          // Store in cache
          await cacheService.set(
            cacheKey,
            cacheData,
            namespace,
            {
              ttl: config?.ttl,
              tags: config?.tags,
              staleWhileRevalidate: true
            }
          );
          
          logger.debug(`Cache SET: ${req.method} ${req.path} (TTL: ${config?.ttl || 'default'}s)`);
        } catch (error) {
          logger.error('Cache storage error:', error);
        }
      }
    };
    
    // Override send method
    res.send = function(body: any): Response {
      responseBody = body;
      cacheResponse(body);
      return originalSend.call(this, body);
    };
    
    // Override json method
    res.json = function(body: any): Response {
      responseBody = JSON.stringify(body);
      cacheResponse(responseBody);
      return originalJson.call(this, body);
    };
    
    // Override end method
    res.end = function(...args: any[]): Response {
      if (args[0]) {
        responseBody = args[0];
        cacheResponse(responseBody);
      }
      return originalEnd.apply(this, args);
    };
    
    next();
  };
}

/**
 * Cache invalidation middleware
 */
export function invalidateCache(tags?: string[], pattern?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Invalidate cache based on tags or pattern
      if (tags || pattern) {
        await cacheService.clear(pattern, tags);
        logger.info(`Cache invalidated - Tags: ${tags?.join(', ') || 'none'}, Pattern: ${pattern || 'none'}`);
      }
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
    
    next();
  };
}

/**
 * Automatic cache invalidation based on mutations
 */
export function autoCacheInvalidation() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip for GET requests
    if (req.method === 'GET') {
      return next();
    }
    
    // Determine tags to invalidate based on route
    const invalidationRules: Array<{ pattern: RegExp; tags: string[] }> = [
      { pattern: /^\/api\/v1\/products/, tags: ['products'] },
      { pattern: /^\/api\/v1\/categories/, tags: ['categories', 'products'] },
      { pattern: /^\/api\/v1\/orders/, tags: ['orders'] },
      { pattern: /^\/api\/v1\/users/, tags: ['users'] },
      { pattern: /^\/api\/v1\/settings/, tags: ['settings'] },
      { pattern: /^\/api\/v1\/content/, tags: ['content'] }
    ];
    
    // Find matching invalidation rule
    const rule = invalidationRules.find(r => r.pattern.test(req.path));
    
    if (rule) {
      // Invalidate after successful response
      const originalSend = res.send;
      const originalJson = res.json;
      
      const invalidateAfterResponse = async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            await cacheService.clear(undefined, rule.tags);
            logger.debug(`Auto-invalidated cache tags: ${rule.tags.join(', ')}`);
          } catch (error) {
            logger.error('Auto cache invalidation error:', error);
          }
        }
      };
      
      res.send = function(body: any): Response {
        invalidateAfterResponse();
        return originalSend.call(this, body);
      };
      
      res.json = function(body: any): Response {
        invalidateAfterResponse();
        return originalJson.call(this, body);
      };
    }
    
    next();
  };
}

/**
 * Cache statistics endpoint
 */
export function cacheStats(req: Request, res: Response) {
  const stats = cacheService.getStats();
  
  res.json({
    success: true,
    data: {
      ...stats,
      hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
      l1HitRate: `${(stats.l1HitRate * 100).toFixed(2)}%`,
      l2HitRate: `${(stats.l2HitRate * 100).toFixed(2)}%`,
      compressionSavedMB: (stats.compressionSaved / 1024 / 1024).toFixed(2)
    }
  });
}

/**
 * Clear cache endpoint
 */
export async function clearCache(req: Request, res: Response) {
  try {
    const { tags, pattern } = req.body;
    
    await cacheService.clear(pattern, tags);
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      tags,
      pattern
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
}

/**
 * Warm cache endpoint
 */
export async function warmCache(req: Request, res: Response) {
  try {
    // Implement cache warming logic based on your needs
    // This could preload frequently accessed data
    
    const itemsToWarm = [
      // Example: Preload popular products
      // { key: 'products:popular', value: await getPopularProducts() },
      // { key: 'categories:all', value: await getAllCategories() }
    ];
    
    await cacheService.warmCache(itemsToWarm);
    
    res.json({
      success: true,
      message: `Cache warmed with ${itemsToWarm.length} items`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to warm cache'
    });
  }
}