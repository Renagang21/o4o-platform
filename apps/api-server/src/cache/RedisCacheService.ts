/**
 * Redis Cache Service Implementation
 * R-8-7: Performance Optimization - Caching Strategy
 *
 * Redis-based distributed cache
 *
 * Note: This implementation requires ioredis package.
 * Install with: pnpm add ioredis
 */

import { ICacheService } from './ICacheService.js';
import type { CacheConfig } from './cache.config.js';
import logger from '../utils/logger.js';

// Conditional import - Redis is optional
let Redis: any;
try {
  Redis = require('ioredis');
} catch (error) {
  logger.warn('[RedisCache] ioredis not installed. Using memory cache instead.');
}

export class RedisCacheService implements ICacheService {
  private client: any;
  private config: CacheConfig;
  private hits: number = 0;
  private misses: number = 0;

  constructor(config: CacheConfig) {
    if (!Redis) {
      throw new Error(
        'Redis cache requires ioredis package. Install with: pnpm add ioredis'
      );
    }

    this.config = config;
    const redisConfig = config.redis!;

    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db || 0,
      keyPrefix: redisConfig.keyPrefix || 'o4o:',
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    this.client.on('connect', () => {
      logger.info('[RedisCache] Connected to Redis', {
        host: redisConfig.host,
        port: redisConfig.port
      });
    });

    this.client.on('error', (error: Error) => {
      logger.error('[RedisCache] Redis connection error', error);
    });

    this.client.on('ready', () => {
      logger.info('[RedisCache] Redis client ready');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);

      if (value) {
        this.hits++;
        logger.debug(`[RedisCache] Cache HIT: ${key}`);
        return JSON.parse(value) as T;
      }

      this.misses++;
      logger.debug(`[RedisCache] Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error(`[RedisCache] Error getting key: ${key}`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);

      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      logger.debug(`[RedisCache] Cache SET: ${key}`, {
        ttl: ttl ? `${ttl}s` : 'no expiry'
      });
    } catch (error) {
      logger.error(`[RedisCache] Error setting key: ${key}`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const deleted = await this.client.del(key);
      logger.debug(`[RedisCache] Cache DELETE: ${key} (deleted: ${deleted})`);
    } catch (error) {
      logger.error(`[RedisCache] Error deleting key: ${key}`, error);
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      // Use SCAN for safe pattern deletion (doesn't block Redis)
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          const deleted = await this.client.del(...keys);
          deletedCount += deleted;
        }
      } while (cursor !== '0');

      logger.debug(`[RedisCache] Pattern DELETE: ${pattern} (deleted: ${deletedCount})`);
      return deletedCount;
    } catch (error) {
      logger.error(`[RedisCache] Error deleting pattern: ${pattern}`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`[RedisCache] Error checking existence: ${key}`, error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const keys: string[] = [];
      let cursor = '0';

      do {
        const [nextCursor, matchedKeys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );

        cursor = nextCursor;
        keys.push(...matchedKeys);
      } while (cursor !== '0');

      return keys;
    } catch (error) {
      logger.error(`[RedisCache] Error getting keys: ${pattern}`, error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      await this.client.flushdb();
      this.hits = 0;
      this.misses = 0;
      logger.info('[RedisCache] Cache cleared');
    } catch (error) {
      logger.error('[RedisCache] Error clearing cache', error);
    }
  }

  async stats(): Promise<{
    type: string;
    keys: number;
    hits: number;
    misses: number;
    hitRate: number;
  }> {
    try {
      const dbSize = await this.client.dbsize();
      const total = this.hits + this.misses;
      const hitRate = total > 0 ? this.hits / total : 0;

      return {
        type: 'redis',
        keys: dbSize,
        hits: this.hits,
        misses: this.misses,
        hitRate: parseFloat((hitRate * 100).toFixed(2))
      };
    } catch (error) {
      logger.error('[RedisCache] Error getting stats', error);
      return {
        type: 'redis',
        keys: 0,
        hits: this.hits,
        misses: this.misses,
        hitRate: 0
      };
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
    logger.info('[RedisCache] Disconnected from Redis');
  }
}
