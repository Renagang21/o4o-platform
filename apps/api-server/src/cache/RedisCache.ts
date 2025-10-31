import Redis from 'ioredis';
import logger from '../utils/logger.js';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

export interface RedisCacheConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  defaultTTL?: number;
  keyPrefix?: string;
}

export class RedisCache {
  private redis: Redis | null = null;
  private defaultTTL: number;
  private keyPrefix: string;
  private config: RedisCacheConfig;

  constructor(config: RedisCacheConfig = {}) {
    this.config = config;
    this.defaultTTL = config.defaultTTL || 300;
    this.keyPrefix = config.keyPrefix || 'o4o:cache:';
  }

  async initialize(): Promise<void> {
    if (this.redis) {
      return; // Already initialized
    }

    this.redis = new Redis({
      host: this.config.host || process.env.REDIS_HOST || 'localhost',
      port: this.config.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: this.config.password || process.env.REDIS_PASSWORD,
      db: this.config.db || parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: this.keyPrefix,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }

  private ensureConnected(): Redis {
    if (!this.redis) {
      throw new Error('Redis not initialized. Call initialize() first.');
    }
    return this.redis;
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const redis = this.ensureConnected();
      const value = await redis.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value);
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const redis = this.ensureConnected();
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;

      if (expiry > 0) {
        await redis.setex(key, expiry, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const redis = this.ensureConnected();
      await redis.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const redis = this.ensureConnected();
      const keys = await redis.keys(`${this.keyPrefix}${pattern}`);
      if (keys.length > 0) {
        // Remove the prefix from keys before deleting
        const cleanKeys = keys.map(k => k.replace(this.keyPrefix, ''));
        await redis.del(...cleanKeys);
      }
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const redis = this.ensureConnected();
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const redis = this.ensureConnected();
      return await redis.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      const redis = this.ensureConnected();
      await redis.expire(key, ttl);
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
    }
  }

  async flush(): Promise<void> {
    try {
      const redis = this.ensureConnected();
      await redis.flushdb();
    } catch (error) {
      logger.error('Cache flush error:', error);
    }
  }

  // Advanced caching methods

  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  async remember<T = any>(
    key: string,
    ttl: number,
    factory: () => Promise<T>
  ): Promise<T> {
    return this.getOrSet(key, factory, ttl);
  }

  // Tag-based cache invalidation

  async tag(tags: string | string[], key: string): Promise<void> {
    const redis = this.ensureConnected();
    const tagArray = Array.isArray(tags) ? tags : [tags];

    for (const tag of tagArray) {
      const tagKey = `tag:${tag}`;
      await redis.sadd(tagKey, key);
      // Set TTL for tag set to match longest possible cache TTL
      await redis.expire(tagKey, 86400); // 24 hours
    }
  }

  async invalidateTag(tag: string): Promise<void> {
    try {
      const redis = this.ensureConnected();
      const tagKey = `tag:${tag}`;
      const keys = await redis.smembers(tagKey);

      if (keys.length > 0) {
        await redis.del(...keys);
        await redis.del(tagKey);
      }
    } catch (error) {
      logger.error(`Tag invalidation error for ${tag}:`, error);
    }
  }

  async invalidateTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.invalidateTag(tag);
    }
  }

  // Cache warming

  async warm(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    const redis = this.ensureConnected();
    const pipeline = redis.pipeline();

    for (const entry of entries) {
      const serialized = JSON.stringify(entry.value);
      const ttl = entry.ttl || this.defaultTTL;

      if (ttl > 0) {
        pipeline.setex(entry.key, ttl, serialized);
      } else {
        pipeline.set(entry.key, serialized);
      }
    }

    await pipeline.exec();
  }

  // Statistics

  async getStats(): Promise<{
    size: number;
    memory: string;
    hits: number;
    misses: number;
    hitRate: number;
  }> {
    try {
      const redis = this.ensureConnected();
      const info = await redis.info('stats');
      const memory = await redis.info('memory');

      // Parse Redis INFO output
      const stats = this.parseRedisInfo(info);
      const memStats = this.parseRedisInfo(memory);

      const hits = parseInt(stats.keyspace_hits || '0');
      const misses = parseInt(stats.keyspace_misses || '0');
      const total = hits + misses;

      return {
        size: await redis.dbsize(),
        memory: memStats.used_memory_human || 'N/A',
        hits,
        misses,
        hitRate: total > 0 ? (hits / total) * 100 : 0
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        size: 0,
        memory: 'N/A',
        hits: 0,
        misses: 0,
        hitRate: 0
      };
    }
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n');
    const result: Record<string, string> = {};

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    }

    return result;
  }

  // Lock mechanism for preventing cache stampede

  async acquireLock(key: string, ttl = 5): Promise<boolean> {
    const redis = this.ensureConnected();
    const lockKey = `lock:${key}`;
    const result = await redis.set(lockKey, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    const redis = this.ensureConnected();
    const lockKey = `lock:${key}`;
    await redis.del(lockKey);
  }

  async withLock<T>(
    key: string,
    factory: () => Promise<T>,
    lockTTL = 5,
    maxWait = 10
  ): Promise<T | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait * 1000) {
      if (await this.acquireLock(key, lockTTL)) {
        try {
          return await factory();
        } finally {
          await this.releaseLock(key);
        }
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return null;
  }
}