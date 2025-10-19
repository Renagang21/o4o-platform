"use strict";
/**
 * Cache Middleware
 * HTTP response caching middleware with intelligent invalidation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.warmCache = exports.clearCache = exports.cacheStats = exports.autoCacheInvalidation = exports.invalidateCache = exports.cache = void 0;
const CacheService_1 = require("../services/CacheService");
const crypto_1 = __importDefault(require("crypto"));
const simpleLogger_1 = __importDefault(require("../utils/simpleLogger"));
// Default cache configurations by route pattern
const cacheConfigs = new Map([
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
            keyGenerator: (req) => { var _a; return `user:${(_a = req.user) === null || _a === void 0 ? void 0 : _a.id}`; }
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
function generateCacheKey(req, config) {
    // Use custom key generator if provided
    if (config === null || config === void 0 ? void 0 : config.keyGenerator) {
        return config.keyGenerator(req);
    }
    // Build key components
    const components = [
        req.method,
        req.path
    ];
    // Add query parameters specified in varyBy
    if (config === null || config === void 0 ? void 0 : config.varyBy) {
        const queryParams = config.varyBy
            .map(param => `${param}:${req.query[param] || ''}`)
            .join(':');
        components.push(queryParams);
    }
    else if (Object.keys(req.query).length > 0) {
        // Include all query params if varyBy not specified
        components.push(JSON.stringify(req.query));
    }
    // Add user context for authenticated routes
    const user = req.user;
    if (user) {
        components.push(`user:${user.id}`);
        if (user.role) {
            components.push(`role:${user.role}`);
        }
    }
    // Generate hash for consistent key length
    const keyString = components.join(':');
    return crypto_1.default
        .createHash('md5')
        .update(keyString)
        .digest('hex');
}
/**
 * Find matching cache configuration
 */
function findCacheConfig(path) {
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
function cache(customConfig) {
    return async (req, res, next) => {
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
        if ((config === null || config === void 0 ? void 0 : config.condition) && !config.condition(req)) {
            return next();
        }
        // Generate cache key
        const cacheKey = generateCacheKey(req, config);
        const namespace = 'http';
        try {
            // Try to get from cache
            const cached = await CacheService_1.cacheService.get(cacheKey, namespace);
            if (cached) {
                // Set cache headers
                res.set('X-Cache', 'HIT');
                res.set('X-Cache-Key', cacheKey);
                // Send cached response
                const { statusCode, headers, body } = cached;
                // Set cached headers
                Object.keys(headers).forEach(key => {
                    res.set(key, headers[key]);
                });
                // Send response
                res.status(statusCode).send(body);
                simpleLogger_1.default.debug(`Cache HIT: ${req.method} ${req.path}`);
                return;
            }
        }
        catch (error) {
            simpleLogger_1.default.error('Cache retrieval error:', error);
            // Continue without cache on error
        }
        // Cache MISS - capture response
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        // Store original methods
        const originalSend = res.send;
        const originalJson = res.json;
        const originalEnd = res.end;
        let responseBody;
        let responseSent = false;
        // Intercept response methods
        const cacheResponse = async (body) => {
            if (responseSent)
                return;
            responseSent = true;
            // Check if should cache this response
            const shouldCache = (config === null || config === void 0 ? void 0 : config.shouldCache)
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
                    await CacheService_1.cacheService.set(cacheKey, cacheData, namespace, {
                        ttl: config === null || config === void 0 ? void 0 : config.ttl,
                        tags: config === null || config === void 0 ? void 0 : config.tags,
                        staleWhileRevalidate: true
                    });
                    simpleLogger_1.default.debug(`Cache SET: ${req.method} ${req.path} (TTL: ${(config === null || config === void 0 ? void 0 : config.ttl) || 'default'}s)`);
                }
                catch (error) {
                    simpleLogger_1.default.error('Cache storage error:', error);
                }
            }
        };
        // Override send method
        res.send = function (body) {
            responseBody = body;
            cacheResponse(body);
            return originalSend.call(this, body);
        };
        // Override json method
        res.json = function (body) {
            responseBody = JSON.stringify(body);
            cacheResponse(responseBody);
            return originalJson.call(this, body);
        };
        // Override end method
        res.end = function (...args) {
            if (args[0]) {
                responseBody = args[0];
                cacheResponse(responseBody);
            }
            return originalEnd.apply(this, args);
        };
        next();
    };
}
exports.cache = cache;
/**
 * Cache invalidation middleware
 */
function invalidateCache(tags, pattern) {
    return async (req, res, next) => {
        try {
            // Invalidate cache based on tags or pattern
            if (tags || pattern) {
                await CacheService_1.cacheService.clear(pattern, tags);
                simpleLogger_1.default.info(`Cache invalidated - Tags: ${(tags === null || tags === void 0 ? void 0 : tags.join(', ')) || 'none'}, Pattern: ${pattern || 'none'}`);
            }
        }
        catch (error) {
            simpleLogger_1.default.error('Cache invalidation error:', error);
        }
        next();
    };
}
exports.invalidateCache = invalidateCache;
/**
 * Automatic cache invalidation based on mutations
 */
function autoCacheInvalidation() {
    return async (req, res, next) => {
        // Skip for GET requests
        if (req.method === 'GET') {
            return next();
        }
        // Determine tags to invalidate based on route
        const invalidationRules = [
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
                        await CacheService_1.cacheService.clear(undefined, rule.tags);
                        simpleLogger_1.default.debug(`Auto-invalidated cache tags: ${rule.tags.join(', ')}`);
                    }
                    catch (error) {
                        simpleLogger_1.default.error('Auto cache invalidation error:', error);
                    }
                }
            };
            res.send = function (body) {
                invalidateAfterResponse();
                return originalSend.call(this, body);
            };
            res.json = function (body) {
                invalidateAfterResponse();
                return originalJson.call(this, body);
            };
        }
        next();
    };
}
exports.autoCacheInvalidation = autoCacheInvalidation;
/**
 * Cache statistics endpoint
 */
function cacheStats(req, res) {
    const stats = CacheService_1.cacheService.getStats();
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
exports.cacheStats = cacheStats;
/**
 * Clear cache endpoint
 */
async function clearCache(req, res) {
    try {
        const { tags, pattern } = req.body;
        await CacheService_1.cacheService.clear(pattern, tags);
        res.json({
            success: true,
            message: 'Cache cleared successfully',
            tags,
            pattern
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to clear cache'
        });
    }
}
exports.clearCache = clearCache;
/**
 * Warm cache endpoint
 */
async function warmCache(req, res) {
    try {
        // Implement cache warming logic based on your needs
        // This could preload frequently accessed data
        const itemsToWarm = [
        // Example: Preload popular products
        // { key: 'products:popular', value: await getPopularProducts() },
        // { key: 'categories:all', value: await getAllCategories() }
        ];
        await CacheService_1.cacheService.warmCache(itemsToWarm);
        res.json({
            success: true,
            message: `Cache warmed with ${itemsToWarm.length} items`
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to warm cache'
        });
    }
}
exports.warmCache = warmCache;
//# sourceMappingURL=cacheMiddleware.js.map