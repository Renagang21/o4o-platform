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
import { LRUCache } from 'lru-cache';
import zlib from 'zlib';
import { promisify } from 'util';
import crypto from 'crypto';
import logger from '../utils/simpleLogger.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Cache configuration types
interface CacheConfig {
  memory: {
    max: number;          // Maximum items in memory
    ttl: number;          // TTL in milliseconds
    updateAgeOnGet: boolean;
    updateAgeOnHas: boolean;
  };
  redis: {
    ttl: number;          // TTL in seconds
    compressionThreshold: number; // Bytes
    keyPrefix: string;
  };
  circuitBreaker: {
    threshold: number;    // Error threshold
    timeout: number;      // Recovery timeout
    halfOpenRequests: number;
  };
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  l1Hits: number;
  l2Hits: number;
  errors: number;
  evictions: number;
  compressionSaved: number;
}

// Cache options
interface CacheOptions {
  ttl?: number;
  compress?: boolean;
  tags?: string[];
  staleWhileRevalidate?: boolean;
  preload?: boolean;
}

// Circuit breaker states
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CacheService {
  private static instance: CacheService;
  
  private memoryCache: LRUCache<string, any>;
  private redisClient: Redis | null = null;
  private config: CacheConfig;
  private stats: CacheStats;
  private circuitBreaker: {
    state: CircuitState;
    failures: number;
    lastFailTime: number;
    halfOpenRequests: number;
  };
  
  private constructor() {
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
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }
  
  /**
   * Connect to Redis
   */
  private async connectRedis(): Promise<void> {
    try {
      if (process.env.REDIS_HOST) {
        this.redisClient = new Redis({
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          }
        });
        
        this.redisClient.on('error', (err) => {
          logger.error('Redis cache error:', err);
          this.handleRedisError();
        });
        
        this.redisClient.on('connect', () => {
          logger.info('Redis cache connected');
          this.circuitBreaker.state = CircuitState.CLOSED;
          this.circuitBreaker.failures = 0;
        });
      }
    } catch (error) {
      logger.error('Failed to connect to Redis cache:', error);
    }
  }
  
  /**
   * Handle Redis errors with circuit breaker
   */
  private handleRedisError(): void {
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
  private isRedisAvailable(): boolean {
    if (!this.redisClient) return false;
    
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
  private generateKey(key: string, namespace?: string): string {
    const prefix = namespace ? `${namespace}:` : '';
    return `${this.config.redis.keyPrefix}${prefix}${key}`;
  }
  
  /**
   * Compress data if needed
   */
  private async compress(data: any): Promise<{ data: string; compressed: boolean }> {
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
      } catch (error) {
        logger.error('Compression error:', error);
      }
    }
    
    return { data: json, compressed: false };
  }
  
  /**
   * Decompress data if needed
   */
  private async decompress(data: string, compressed: boolean): Promise<any> {
    try {
      if (compressed) {
        const buffer = Buffer.from(data, 'base64');
        const decompressed = await gunzip(buffer);
        return JSON.parse(decompressed.toString());
      }
      return JSON.parse(data);
    } catch (error) {
      logger.error('Decompression error:', error);
      throw error;
    }
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
          if (options?.staleWhileRevalidate && meta.staleAt && Date.now() > meta.staleAt) {
            // Return stale value and trigger background revalidation
            this.revalidate(key, namespace, options);
          }
          
          return value;
        }
      } catch (error) {
        logger.error('Redis get error:', error);
        this.handleRedisError();
      }
    }
    
    this.stats.misses++;
    return null;
  }
  
  /**
   * Set value in cache
   */
  public async set<T>(
    key: string,
    value: T,
    namespace?: string,
    options?: CacheOptions
  ): Promise<void> {
    const fullKey = this.generateKey(key, namespace);
    const ttl = options?.ttl || this.config.redis.ttl;
    
    // Set in L1 memory cache
    this.memoryCache.set(fullKey, value);
    
    // Set in L2 Redis cache if available
    if (this.isRedisAvailable() && this.redisClient) {
      try {
        const { data, compressed } = await this.compress(value);
        const meta = {
          compressed,
          createdAt: Date.now(),
          staleAt: options?.staleWhileRevalidate 
            ? Date.now() + (ttl * 1000 * 0.8) // 80% of TTL
            : null,
          tags: options?.tags || []
        };
        
        const pipeline = this.redisClient.pipeline();
        pipeline.set(fullKey + ':data', data, 'EX', ttl);
        pipeline.set(fullKey + ':meta', JSON.stringify(meta), 'EX', ttl);
        
        // Add to tag sets if provided
        if (options?.tags) {
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
      } catch (error) {
        logger.error('Redis set error:', error);
        this.handleRedisError();
      }
    }
  }
  
  /**
   * Delete value from cache
   */
  public async delete(key: string, namespace?: string): Promise<void> {
    const fullKey = this.generateKey(key, namespace);
    
    // Delete from L1 memory cache
    this.memoryCache.delete(fullKey);
    
    // Delete from L2 Redis cache if available
    if (this.isRedisAvailable() && this.redisClient) {
      try {
        await this.redisClient.del([fullKey + ':data', fullKey + ':meta']);
      } catch (error) {
        logger.error('Redis delete error:', error);
        this.handleRedisError();
      }
    }
  }
  
  /**
   * Clear cache by pattern or tags
   */
  public async clear(pattern?: string, tags?: string[]): Promise<void> {
    // Clear L1 memory cache
    if (!pattern && !tags) {
      this.memoryCache.clear();
    } else if (pattern) {
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
        } else if (pattern) {
          // Clear by pattern
          const keys = await this.redisClient.keys(`${this.config.redis.keyPrefix}${pattern}*`);
          if (keys.length > 0) {
            await this.redisClient.del(keys);
          }
        } else {
          // Clear all cache
          const keys = await this.redisClient.keys(`${this.config.redis.keyPrefix}*`);
          if (keys.length > 0) {
            await this.redisClient.del(keys);
          }
        }
      } catch (error) {
        logger.error('Redis clear error:', error);
        this.handleRedisError();
      }
    }
  }
  
  /**
   * Revalidate stale cache in background
   */
  private async revalidate(
    key: string,
    namespace?: string,
    options?: CacheOptions
  ): Promise<void> {
    // This would trigger a background job to refresh the cache
    // Implementation depends on the specific use case
    logger.info(`Revalidating cache for key: ${key}`);
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
    l2HitRate: number;
    memorySize: number;
    circuitBreakerState: CircuitState;
  } {
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
    return this.clear(`pricing:${productId}*`);
  }

  public async invalidateUserPricing(userId: number): Promise<void> {
    return this.clear(`pricing:*:${userId}`);
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

  // Redis availability properties for backward compatibility
  public get redis(): Redis | null {
    return this.redisClient;
  }

  public get isEnabled(): boolean {
    return this.isRedisAvailable();
  }
  
  /**
   * Reset statistics
   */
  public resetStats(): void {
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