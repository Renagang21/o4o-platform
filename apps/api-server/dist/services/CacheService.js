"use strict";
/**
 * Advanced Multi-Layer Caching Service
 * 고급 다층 캐싱 전략 구현
 *
 * Features:
 * - L1 Cache: In-memory LRU cache for ultra-fast access
 * - L2 Cache: Redis distributed cache for shared data
 * - TTL-based invalidation with stale-while-revalidate
 * - Cache warming and preloading
 * - Compression for large values
 * - Circuit breaker for Redis failures
 * - Metrics and monitoring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const lru_cache_1 = require("lru-cache");
const zlib_1 = __importDefault(require("zlib"));
const util_1 = require("util");
const crypto_1 = __importDefault(require("crypto"));
const simpleLogger_1 = __importDefault(require("../utils/simpleLogger"));
const gzip = (0, util_1.promisify)(zlib_1.default.gzip);
const gunzip = (0, util_1.promisify)(zlib_1.default.gunzip);
// Circuit breaker states
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (CircuitState = {}));
class CacheService {
    constructor() {
        this.redisClient = null;
        // Initialize configuration
        this.config = {
            memory: {
                max: parseInt(process.env.CACHE_MEMORY_MAX || '1000'),
                ttl: parseInt(process.env.CACHE_MEMORY_TTL || '300000'), // 5 minutes
                updateAgeOnGet: true,
                updateAgeOnHas: false
            },
            redis: {
                ttl: parseInt(process.env.CACHE_REDIS_TTL || '3600'), // 1 hour
                compressionThreshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD || '1024'), // 1KB
                keyPrefix: process.env.CACHE_KEY_PREFIX || 'o4o:cache:'
            },
            circuitBreaker: {
                threshold: 5,
                timeout: 60000, // 1 minute
                halfOpenRequests: 3
            }
        };
        // Initialize L1 memory cache
        this.memoryCache = new lru_cache_1.LRUCache({
            max: this.config.memory.max,
            ttl: this.config.memory.ttl,
            updateAgeOnGet: this.config.memory.updateAgeOnGet,
            updateAgeOnHas: this.config.memory.updateAgeOnHas,
            dispose: (key, value) => {
                this.stats.evictions++;
            }
        });
        // Initialize statistics
        this.stats = {
            hits: 0,
            misses: 0,
            l1Hits: 0,
            l2Hits: 0,
            errors: 0,
            evictions: 0,
            compressionSaved: 0
        };
        // Initialize circuit breaker
        this.circuitBreaker = {
            state: CircuitState.CLOSED,
            failures: 0,
            lastFailTime: 0,
            halfOpenRequests: 0
        };
        // Connect to Redis if available
        this.connectRedis();
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }
    /**
     * Connect to Redis
     */
    async connectRedis() {
        try {
            if (process.env.REDIS_HOST) {
                this.redisClient = new ioredis_1.default({
                    host: process.env.REDIS_HOST,
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    password: process.env.REDIS_PASSWORD,
                    retryStrategy: (times) => {
                        const delay = Math.min(times * 50, 2000);
                        return delay;
                    }
                });
                this.redisClient.on('error', (err) => {
                    simpleLogger_1.default.error('Redis cache error:', err);
                    this.handleRedisError();
                });
                this.redisClient.on('connect', () => {
                    simpleLogger_1.default.info('Redis cache connected');
                    this.circuitBreaker.state = CircuitState.CLOSED;
                    this.circuitBreaker.failures = 0;
                });
            }
        }
        catch (error) {
            simpleLogger_1.default.error('Failed to connect to Redis cache:', error);
        }
    }
    /**
     * Handle Redis errors with circuit breaker
     */
    handleRedisError() {
        this.stats.errors++;
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailTime = Date.now();
        if (this.circuitBreaker.failures >= this.config.circuitBreaker.threshold) {
            this.circuitBreaker.state = CircuitState.OPEN;
            // Schedule circuit breaker recovery
            setTimeout(() => {
                this.circuitBreaker.state = CircuitState.HALF_OPEN;
                this.circuitBreaker.halfOpenRequests = 0;
            }, this.config.circuitBreaker.timeout);
        }
    }
    /**
     * Check if Redis is available
     */
    isRedisAvailable() {
        if (!this.redisClient)
            return false;
        switch (this.circuitBreaker.state) {
            case CircuitState.OPEN:
                return false;
            case CircuitState.HALF_OPEN:
                if (this.circuitBreaker.halfOpenRequests >= this.config.circuitBreaker.halfOpenRequests) {
                    return false;
                }
                this.circuitBreaker.halfOpenRequests++;
                return true;
            case CircuitState.CLOSED:
                return true;
            default:
                return false;
        }
    }
    /**
     * Generate cache key
     */
    generateKey(key, namespace) {
        const prefix = namespace ? `${namespace}:` : '';
        return `${this.config.redis.keyPrefix}${prefix}${key}`;
    }
    /**
     * Compress data if needed
     */
    async compress(data) {
        const json = JSON.stringify(data);
        if (json.length > this.config.redis.compressionThreshold) {
            try {
                const compressed = await gzip(json);
                const base64 = compressed.toString('base64');
                // Only use compression if it actually saves space
                if (base64.length < json.length) {
                    this.stats.compressionSaved += json.length - base64.length;
                    return { data: base64, compressed: true };
                }
            }
            catch (error) {
                simpleLogger_1.default.error('Compression error:', error);
            }
        }
        return { data: json, compressed: false };
    }
    /**
     * Decompress data if needed
     */
    async decompress(data, compressed) {
        try {
            if (compressed) {
                const buffer = Buffer.from(data, 'base64');
                const decompressed = await gunzip(buffer);
                return JSON.parse(decompressed.toString());
            }
            return JSON.parse(data);
        }
        catch (error) {
            simpleLogger_1.default.error('Decompression error:', error);
            throw error;
        }
    }
    /**
     * Get value from cache
     */
    async get(key, namespace, options) {
        const fullKey = this.generateKey(key, namespace);
        // Try L1 memory cache first
        const memoryValue = this.memoryCache.get(fullKey);
        if (memoryValue !== undefined) {
            this.stats.hits++;
            this.stats.l1Hits++;
            return memoryValue;
        }
        // Try L2 Redis cache if available
        if (this.isRedisAvailable() && this.redisClient) {
            try {
                const redisData = await this.redisClient.get(fullKey + ':data');
                const redisMeta = await this.redisClient.get(fullKey + ':meta');
                if (redisData && redisMeta) {
                    const meta = JSON.parse(redisMeta);
                    const value = await this.decompress(redisData, meta.compressed);
                    // Update L1 cache
                    this.memoryCache.set(fullKey, value);
                    this.stats.hits++;
                    this.stats.l2Hits++;
                    // Handle stale-while-revalidate
                    if ((options === null || options === void 0 ? void 0 : options.staleWhileRevalidate) && meta.staleAt && Date.now() > meta.staleAt) {
                        // Return stale value and trigger background revalidation
                        this.revalidate(key, namespace, options);
                    }
                    return value;
                }
            }
            catch (error) {
                simpleLogger_1.default.error('Redis get error:', error);
                this.handleRedisError();
            }
        }
        this.stats.misses++;
        return null;
    }
    /**
     * Set value in cache
     */
    async set(key, value, namespace, options) {
        const fullKey = this.generateKey(key, namespace);
        const ttl = (options === null || options === void 0 ? void 0 : options.ttl) || this.config.redis.ttl;
        // Set in L1 memory cache
        this.memoryCache.set(fullKey, value);
        // Set in L2 Redis cache if available
        if (this.isRedisAvailable() && this.redisClient) {
            try {
                const { data, compressed } = await this.compress(value);
                const meta = {
                    compressed,
                    createdAt: Date.now(),
                    staleAt: (options === null || options === void 0 ? void 0 : options.staleWhileRevalidate)
                        ? Date.now() + (ttl * 1000 * 0.8) // 80% of TTL
                        : null,
                    tags: (options === null || options === void 0 ? void 0 : options.tags) || []
                };
                const pipeline = this.redisClient.pipeline();
                pipeline.set(fullKey + ':data', data, 'EX', ttl);
                pipeline.set(fullKey + ':meta', JSON.stringify(meta), 'EX', ttl);
                // Add to tag sets if provided
                if (options === null || options === void 0 ? void 0 : options.tags) {
                    for (const tag of options.tags) {
                        pipeline.sadd(`${this.config.redis.keyPrefix}tag:${tag}`, fullKey);
                        pipeline.expire(`${this.config.redis.keyPrefix}tag:${tag}`, ttl);
                    }
                }
                await pipeline.exec();
                // Reset circuit breaker on success
                if (this.circuitBreaker.state === CircuitState.HALF_OPEN) {
                    this.circuitBreaker.state = CircuitState.CLOSED;
                    this.circuitBreaker.failures = 0;
                }
            }
            catch (error) {
                simpleLogger_1.default.error('Redis set error:', error);
                this.handleRedisError();
            }
        }
    }
    /**
     * Delete value from cache
     */
    async delete(key, namespace) {
        const fullKey = this.generateKey(key, namespace);
        // Delete from L1 memory cache
        this.memoryCache.delete(fullKey);
        // Delete from L2 Redis cache if available
        if (this.isRedisAvailable() && this.redisClient) {
            try {
                await this.redisClient.del([fullKey + ':data', fullKey + ':meta']);
            }
            catch (error) {
                simpleLogger_1.default.error('Redis delete error:', error);
                this.handleRedisError();
            }
        }
    }
    /**
     * Clear cache by pattern or tags
     */
    async clear(pattern, tags) {
        // Clear L1 memory cache
        if (!pattern && !tags) {
            this.memoryCache.clear();
        }
        else if (pattern) {
            const regex = new RegExp(pattern);
            for (const key of this.memoryCache.keys()) {
                if (regex.test(key)) {
                    this.memoryCache.delete(key);
                }
            }
        }
        // Clear L2 Redis cache if available
        if (this.isRedisAvailable() && this.redisClient) {
            try {
                if (tags) {
                    // Clear by tags
                    for (const tag of tags) {
                        const tagKey = `${this.config.redis.keyPrefix}tag:${tag}`;
                        const members = await this.redisClient.smembers(tagKey);
                        if (members.length > 0) {
                            const keysToDelete = [];
                            for (const member of members) {
                                keysToDelete.push(member + ':data', member + ':meta');
                            }
                            await this.redisClient.del(keysToDelete);
                            await this.redisClient.del(tagKey);
                        }
                    }
                }
                else if (pattern) {
                    // Clear by pattern
                    const keys = await this.redisClient.keys(`${this.config.redis.keyPrefix}${pattern}*`);
                    if (keys.length > 0) {
                        await this.redisClient.del(keys);
                    }
                }
                else {
                    // Clear all cache
                    const keys = await this.redisClient.keys(`${this.config.redis.keyPrefix}*`);
                    if (keys.length > 0) {
                        await this.redisClient.del(keys);
                    }
                }
            }
            catch (error) {
                simpleLogger_1.default.error('Redis clear error:', error);
                this.handleRedisError();
            }
        }
    }
    /**
     * Revalidate stale cache in background
     */
    async revalidate(key, namespace, options) {
        // This would trigger a background job to refresh the cache
        // Implementation depends on the specific use case
        simpleLogger_1.default.info(`Revalidating cache for key: ${key}`);
    }
    /**
     * Warm cache with preloaded data
     */
    async warmCache(data) {
        simpleLogger_1.default.info(`Warming cache with ${data.length} items`);
        for (const item of data) {
            await this.set(item.key, item.value, item.namespace, item.options);
        }
        simpleLogger_1.default.info('Cache warming completed');
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        return {
            ...this.stats,
            hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
            l1HitRate: this.stats.hits > 0 ? this.stats.l1Hits / this.stats.hits : 0,
            l2HitRate: this.stats.hits > 0 ? this.stats.l2Hits / this.stats.hits : 0,
            memorySize: this.memoryCache.size,
            circuitBreakerState: this.circuitBreaker.state
        };
    }
    // Alias methods for backwards compatibility
    async getCache(key, namespace) {
        return this.get(key, namespace);
    }
    async setCache(key, value, ttl, namespace) {
        return this.set(key, value, namespace, { ttl });
    }
    async clearAll() {
        return this.clear();
    }
    // Pricing cache methods
    generatePricingCacheKey(productId, userId) {
        return userId ? `pricing:${productId}:${userId}` : `pricing:${productId}`;
    }
    async getCachedPricingResult(key) {
        return this.get(key, 'pricing');
    }
    async cachePricingResult(key, result, ttl) {
        return this.set(key, result, 'pricing', { ttl });
    }
    async invalidateProductPricing(productId) {
        return this.clear(`pricing:${productId}*`);
    }
    async invalidateUserPricing(userId) {
        return this.clear(`pricing:*:${userId}`);
    }
    // Inventory cache methods
    async getTotalReservedQuantity(productId) {
        const key = `inventory:reserved:${productId}`;
        const reserved = await this.get(key, 'inventory');
        return reserved || 0;
    }
    async reserveInventory(productId, quantity) {
        const key = `inventory:reserved:${productId}`;
        const current = await this.getTotalReservedQuantity(productId);
        await this.set(key, current + quantity, 'inventory', { ttl: 900 }); // 15 minutes
    }
    async releaseInventoryReservation(productId, quantity) {
        const key = `inventory:reserved:${productId}`;
        const current = await this.getTotalReservedQuantity(productId);
        const newQuantity = Math.max(0, current - quantity);
        if (newQuantity > 0) {
            await this.set(key, newQuantity, 'inventory', { ttl: 900 });
        }
        else {
            await this.delete(key, 'inventory');
        }
    }
    // Redis availability properties for backward compatibility
    get redis() {
        return this.redisClient;
    }
    get isEnabled() {
        return this.isRedisAvailable();
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            l1Hits: 0,
            l2Hits: 0,
            errors: 0,
            evictions: 0,
            compressionSaved: 0
        };
    }
    /**
     * Decorator for method caching
     */
    static cache(keyGenerator, options) {
        return function (target, propertyKey, descriptor) {
            const originalMethod = descriptor.value;
            descriptor.value = async function (...args) {
                const cache = CacheService.getInstance();
                const key = keyGenerator
                    ? keyGenerator(args)
                    : `${target.constructor.name}:${propertyKey}:${crypto_1.default
                        .createHash('md5')
                        .update(JSON.stringify(args))
                        .digest('hex')}`;
                // Try to get from cache
                const cached = await cache.get(key, 'method', options);
                if (cached !== null) {
                    return cached;
                }
                // Execute method and cache result
                const result = await originalMethod.apply(this, args);
                await cache.set(key, result, 'method', options);
                return result;
            };
            return descriptor;
        };
    }
}
exports.CacheService = CacheService;
// Export singleton instance
exports.cacheService = CacheService.getInstance();
//# sourceMappingURL=CacheService.js.map