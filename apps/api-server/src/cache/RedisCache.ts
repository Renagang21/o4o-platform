import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

@Injectable()
export class RedisCache implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private defaultTTL: number;
  private keyPrefix: string;

  constructor(private configService: ConfigService) {
    this.defaultTTL = this.configService.get<number>('cache.defaultTTL', 300);
    this.keyPrefix = this.configService.get<string>('cache.keyPrefix', 'o4o:cache:');
  }

  async onModuleInit() {
    const redisConfig = this.configService.get('redis');

    this.redis = new Redis({
      host: redisConfig?.host || 'localhost',
      port: redisConfig?.port || 6379,
      password: redisConfig?.password,
      db: redisConfig?.db || 0,
      keyPrefix: this.keyPrefix,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;

      if (expiry > 0) {
        await this.redis.setex(key, expiry, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}${pattern}`);
      if (keys.length > 0) {
        // Remove the prefix from keys before deleting
        const cleanKeys = keys.map(k => k.replace(this.keyPrefix, ''));
        await this.redis.del(...cleanKeys);
      }
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(key, ttl);
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
    }
  }

  async flush(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error('Cache flush error:', error);
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
    const tagArray = Array.isArray(tags) ? tags : [tags];

    for (const tag of tagArray) {
      const tagKey = `tag:${tag}`;
      await this.redis.sadd(tagKey, key);
      // Set TTL for tag set to match longest possible cache TTL
      await this.redis.expire(tagKey, 86400); // 24 hours
    }
  }

  async invalidateTag(tag: string): Promise<void> {
    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.redis.smembers(tagKey);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        await this.redis.del(tagKey);
      }
    } catch (error) {
      console.error(`Tag invalidation error for ${tag}:`, error);
    }
  }

  async invalidateTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.invalidateTag(tag);
    }
  }

  // Cache warming

  async warm(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    const pipeline = this.redis.pipeline();

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
      const info = await this.redis.info('stats');
      const memory = await this.redis.info('memory');

      // Parse Redis INFO output
      const stats = this.parseRedisInfo(info);
      const memStats = this.parseRedisInfo(memory);

      const hits = parseInt(stats.keyspace_hits || '0');
      const misses = parseInt(stats.keyspace_misses || '0');
      const total = hits + misses;

      return {
        size: await this.redis.dbsize(),
        memory: memStats.used_memory_human || 'N/A',
        hits,
        misses,
        hitRate: total > 0 ? (hits / total) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
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
    const lockKey = `lock:${key}`;
    const result = await this.redis.set(lockKey, '1', 'NX', 'EX', ttl);
    return result === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    await this.redis.del(lockKey);
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