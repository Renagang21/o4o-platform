/**
 * In-Process Caching Service
 * L1(메모리) 단일 계층 캐싱
 *
 * WO-O4O-IOREDIS-BULLMQ-RESIDUE-CENSUS-REMOVAL-V1:
 *   WO-O4O-REDIS-REMOVAL-V1 로 Memorystore(Redis) 가 폐기되면서 L2 계층은
 *   `redisClient = null` 로 고정되어 도달 불가능한 코드가 되어 있었다.
 *   본 서비스에서 L2(Redis) 경로 · circuit breaker · 압축 · rate limit 을 제거하고
 *   L1 LRU 캐시만 남긴다. 공개 API(get/set/delete/clear/getStats 등)는 유지한다.
 *
 * Features:
 * - L1 Cache: In-memory LRU cache
 * - Cache warming and preloading
 * - Metrics and monitoring
 */

import { LRUCache } from 'lru-cache';
import crypto from 'crypto';
import logger from '../utils/logger.js';

// Cache configuration types
interface CacheConfig {
  memory: {
    max: number;          // Maximum items in memory
    ttl: number;          // TTL in milliseconds
    updateAgeOnGet: boolean;
    updateAgeOnHas: boolean;
  };
  entry: {
    keyPrefix: string;
  };
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  l1Hits: number;
  errors: number;
  evictions: number;
}

// Cache options
interface CacheOptions {
  ttl?: number;
  compress?: boolean;
  tags?: string[];
  staleWhileRevalidate?: boolean;
  preload?: boolean;
}

export class CacheService {
  private static instance: CacheService;

  private memoryCache: LRUCache<string, any>;
  private config: CacheConfig;
  private stats: CacheStats;

  private constructor() {
    // Initialize configuration
    this.config = {
      memory: {
        max: parseInt(process.env.CACHE_MEMORY_MAX || '1000'),
        ttl: parseInt(process.env.CACHE_MEMORY_TTL || '300000'), // 5 minutes
        updateAgeOnGet: true,
        updateAgeOnHas: false
      },
      entry: {
        keyPrefix: process.env.CACHE_KEY_PREFIX || 'o4o:cache:'
      }
    };

    // Initialize L1 memory cache
    this.memoryCache = new LRUCache({
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
      errors: 0,
      evictions: 0
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Generate cache key
   */
  private generateKey(key: string, namespace?: string): string {
    const prefix = namespace ? `${namespace}:` : '';
    return `${this.config.entry.keyPrefix}${prefix}${key}`;
  }

  /**
   * Get value from cache
   */
  public async get<T>(
    key: string,
    namespace?: string,
    options?: CacheOptions
  ): Promise<T | null> {
    const fullKey = this.generateKey(key, namespace);

    const memoryValue = this.memoryCache.get(fullKey);
    if (memoryValue !== undefined) {
      this.stats.hits++;
      this.stats.l1Hits++;
      return memoryValue;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set value in cache
   *
   * NOTE: L1 LRU 는 인스턴스 공통 TTL(config.memory.ttl)을 사용한다.
   *       options.ttl 은 이전에도 L2(Redis) 전용이었고 L1 에는 적용되지 않았다.
   *       동작 변경을 피하기 위해 기존과 동일하게 유지한다.
   */
  public async set<T>(
    key: string,
    value: T,
    namespace?: string,
    options?: CacheOptions
  ): Promise<void> {
    const fullKey = this.generateKey(key, namespace);
    this.memoryCache.set(fullKey, value);
  }

  /**
   * Get multiple values from cache
   */
  public async mget<T>(keys: string[], namespace?: string): Promise<(T | null)[]> {
    const results: (T | null)[] = [];

    for (const key of keys) {
      const value = await this.get<T>(key, namespace);
      results.push(value);
    }

    return results;
  }

  /**
   * Delete value from cache (single key or array)
   */
  public async delete(key: string | string[], namespace?: string): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];

    for (const k of keys) {
      this.memoryCache.delete(this.generateKey(k, namespace));
    }
  }

  /**
   * Delete multiple keys (alias for delete with array)
   */
  public async del(keys: string | string[], namespace?: string): Promise<void> {
    return this.delete(keys, namespace);
  }

  /**
   * Clear cache by pattern
   */
  public async clear(pattern?: string, tags?: string[]): Promise<void> {
    if (!pattern) {
      this.memoryCache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Warm cache with preloaded data
   */
  public async warmCache(
    data: Array<{ key: string; value: any; namespace?: string; options?: CacheOptions }>
  ): Promise<void> {
    logger.info(`Warming cache with ${data.length} items`);

    for (const item of data) {
      await this.set(item.key, item.value, item.namespace, item.options);
    }

    logger.info('Cache warming completed');
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats & {
    hitRate: number;
    l1HitRate: number;
    memorySize: number;
  } {
    const totalRequests = this.stats.hits + this.stats.misses;

    return {
      ...this.stats,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      l1HitRate: this.stats.hits > 0 ? this.stats.l1Hits / this.stats.hits : 0,
      memorySize: this.memoryCache.size
    };
  }

  // Alias methods for backwards compatibility
  public async getCache(key: string, namespace?: string): Promise<any> {
    return this.get(key, namespace);
  }

  public async setCache(key: string, value: any, ttl?: number, namespace?: string): Promise<void> {
    return this.set(key, value, namespace, { ttl });
  }

  public async clearAll(): Promise<void> {
    return this.clear();
  }

  // Pricing cache methods
  public generatePricingCacheKey(productId: number, userId?: number): string {
    return userId ? `pricing:${productId}:${userId}` : `pricing:${productId}`;
  }

  public async getCachedPricingResult(key: string): Promise<any> {
    return this.get(key, 'pricing');
  }

  public async cachePricingResult(key: string, result: any, ttl?: number): Promise<void> {
    return this.set(key, result, 'pricing', { ttl });
  }

  public async invalidateProductPricing(productId: number): Promise<void> {
    return this.clear(`pricing:${productId}`);
  }

  public async invalidateUserPricing(userId: number): Promise<void> {
    return this.clear(`pricing:.*:${userId}$`);
  }

  // Inventory cache methods
  public async getTotalReservedQuantity(productId: number): Promise<number> {
    const key = `inventory:reserved:${productId}`;
    const reserved = await this.get<number>(key, 'inventory');
    return reserved || 0;
  }

  public async reserveInventory(productId: number, quantity: number): Promise<void> {
    const key = `inventory:reserved:${productId}`;
    const current = await this.getTotalReservedQuantity(productId);
    await this.set(key, current + quantity, 'inventory', { ttl: 900 }); // 15 minutes
  }

  public async releaseInventoryReservation(productId: number, quantity: number): Promise<void> {
    const key = `inventory:reserved:${productId}`;
    const current = await this.getTotalReservedQuantity(productId);
    const newQuantity = Math.max(0, current - quantity);
    if (newQuantity > 0) {
      await this.set(key, newQuantity, 'inventory', { ttl: 900 });
    } else {
      await this.delete(key, 'inventory');
    }
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      l1Hits: 0,
      errors: 0,
      evictions: 0
    };
  }

  /**
   * Decorator for method caching
   */
  public static cache(
    keyGenerator?: (args: any[]) => string,
    options?: CacheOptions
  ) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cache = CacheService.getInstance();
        const key = keyGenerator
          ? keyGenerator(args)
          : `${target.constructor.name}:${propertyKey}:${crypto
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

// Export singleton instance
export const cacheService = CacheService.getInstance();
