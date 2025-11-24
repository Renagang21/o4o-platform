/**
 * Memory Cache Service Implementation
 * R-8-7: Performance Optimization - Caching Strategy
 *
 * In-memory cache using node-cache library
 */

import NodeCache from 'node-cache';
import { ICacheService } from './ICacheService.js';
import type { CacheConfig } from './cache.config.js';
import logger from '../utils/logger.js';

export class MemoryCacheService implements ICacheService {
  private cache: NodeCache;
  private hits: number = 0;
  private misses: number = 0;

  constructor(config: CacheConfig) {
    const memoryConfig = config.memory || { max: 1000, checkPeriod: 600 };

    this.cache = new NodeCache({
      stdTTL: config.ttl.short,
      checkperiod: memoryConfig.checkPeriod,
      useClones: false, // Better performance, but requires immutable data
      deleteOnExpire: true,
      maxKeys: memoryConfig.max
    });

    // Log cache events
    this.cache.on('expired', (key, value) => {
      logger.debug(`[MemoryCache] Key expired: ${key}`);
    });

    this.cache.on('flush', () => {
      logger.info('[MemoryCache] Cache flushed');
    });

    logger.info('[MemoryCache] Memory cache initialized', {
      maxKeys: memoryConfig.max,
      checkPeriod: memoryConfig.checkPeriod
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.cache.get<T>(key);

    if (value !== undefined) {
      this.hits++;
      logger.debug(`[MemoryCache] Cache HIT: ${key}`);
      return value;
    }

    this.misses++;
    logger.debug(`[MemoryCache] Cache MISS: ${key}`);
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const success = this.cache.set(key, value, ttl || 0);

    if (success) {
      logger.debug(`[MemoryCache] Cache SET: ${key}`, {
        ttl: ttl ? `${ttl}s` : 'default'
      });
    } else {
      logger.warn(`[MemoryCache] Failed to set cache: ${key}`);
    }
  }

  async delete(key: string): Promise<void> {
    const deletedCount = this.cache.del(key);
    logger.debug(`[MemoryCache] Cache DELETE: ${key} (deleted: ${deletedCount})`);
  }

  async deletePattern(pattern: string): Promise<number> {
    // Convert glob pattern to RegExp
    const regex = this.globToRegex(pattern);
    const allKeys = this.cache.keys();
    const matchingKeys = allKeys.filter(key => regex.test(key));

    if (matchingKeys.length > 0) {
      const deletedCount = this.cache.del(matchingKeys);
      logger.debug(`[MemoryCache] Pattern DELETE: ${pattern} (deleted: ${deletedCount})`);
      return deletedCount;
    }

    return 0;
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = this.globToRegex(pattern);
    const allKeys = this.cache.keys();
    return allKeys.filter(key => regex.test(key));
  }

  async clear(): Promise<void> {
    this.cache.flushAll();
    this.hits = 0;
    this.misses = 0;
    logger.info('[MemoryCache] Cache cleared');
  }

  async stats(): Promise<{
    type: string;
    keys: number;
    hits: number;
    misses: number;
    hitRate: number;
  }> {
    const keys = this.cache.keys().length;
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      type: 'memory',
      keys,
      hits: this.hits,
      misses: this.misses,
      hitRate: parseFloat((hitRate * 100).toFixed(2))
    };
  }

  /**
   * Convert glob pattern to RegExp
   * Supports: * (any chars), ? (single char)
   */
  private globToRegex(pattern: string): RegExp {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regexPattern}$`);
  }
}
