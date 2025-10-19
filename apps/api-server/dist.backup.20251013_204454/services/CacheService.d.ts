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
import Redis from 'ioredis';
interface CacheStats {
    hits: number;
    misses: number;
    l1Hits: number;
    l2Hits: number;
    errors: number;
    evictions: number;
    compressionSaved: number;
}
interface CacheOptions {
    ttl?: number;
    compress?: boolean;
    tags?: string[];
    staleWhileRevalidate?: boolean;
    preload?: boolean;
}
declare enum CircuitState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
}
export declare class CacheService {
    private static instance;
    private memoryCache;
    private redisClient;
    private config;
    private stats;
    private circuitBreaker;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): CacheService;
    /**
     * Connect to Redis
     */
    private connectRedis;
    /**
     * Handle Redis errors with circuit breaker
     */
    private handleRedisError;
    /**
     * Check if Redis is available
     */
    private isRedisAvailable;
    /**
     * Generate cache key
     */
    private generateKey;
    /**
     * Compress data if needed
     */
    private compress;
    /**
     * Decompress data if needed
     */
    private decompress;
    /**
     * Get value from cache
     */
    get<T>(key: string, namespace?: string, options?: CacheOptions): Promise<T | null>;
    /**
     * Set value in cache
     */
    set<T>(key: string, value: T, namespace?: string, options?: CacheOptions): Promise<void>;
    /**
     * Delete value from cache
     */
    delete(key: string, namespace?: string): Promise<void>;
    /**
     * Clear cache by pattern or tags
     */
    clear(pattern?: string, tags?: string[]): Promise<void>;
    /**
     * Revalidate stale cache in background
     */
    private revalidate;
    /**
     * Warm cache with preloaded data
     */
    warmCache(data: Array<{
        key: string;
        value: any;
        namespace?: string;
        options?: CacheOptions;
    }>): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats & {
        hitRate: number;
        l1HitRate: number;
        l2HitRate: number;
        memorySize: number;
        circuitBreakerState: CircuitState;
    };
    getCache(key: string, namespace?: string): Promise<any>;
    setCache(key: string, value: any, ttl?: number, namespace?: string): Promise<void>;
    clearAll(): Promise<void>;
    generatePricingCacheKey(productId: number, userId?: number): string;
    getCachedPricingResult(key: string): Promise<any>;
    cachePricingResult(key: string, result: any, ttl?: number): Promise<void>;
    invalidateProductPricing(productId: number): Promise<void>;
    invalidateUserPricing(userId: number): Promise<void>;
    getTotalReservedQuantity(productId: number): Promise<number>;
    reserveInventory(productId: number, quantity: number): Promise<void>;
    releaseInventoryReservation(productId: number, quantity: number): Promise<void>;
    get redis(): Redis | null;
    get isEnabled(): boolean;
    /**
     * Reset statistics
     */
    resetStats(): void;
    /**
     * Decorator for method caching
     */
    static cache(keyGenerator?: (args: any[]) => string, options?: CacheOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
}
export declare const cacheService: CacheService;
export {};
//# sourceMappingURL=CacheService.d.ts.map