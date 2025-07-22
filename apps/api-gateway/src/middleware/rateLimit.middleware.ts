import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response } from 'express';
import Redis from 'ioredis';
import { gatewayConfig } from '../config/gateway.config.js';
import { createLogger } from '../utils/logger.js';
import { AuthRequest } from './auth.middleware.js';

const logger = createLogger('RateLimitMiddleware');

export interface RateLimitConfig {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  message?: string;
}

export class RateLimitMiddleware {
  private redis: Redis | null;
  private limiters: Map<string, RateLimitRequestHandler> = new Map();

  constructor(redis?: Redis) {
    this.redis = redis || null;
  }

  /**
   * Create a rate limiter instance
   */
  private createLimiter(config: RateLimitConfig): RateLimitRequestHandler {
    const baseConfig = {
      windowMs: config.windowMs || gatewayConfig.rateLimit.windowMs,
      max: config.max || gatewayConfig.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: config.message || 'Too many requests, please try again later.',
      handler: (req: Request, res: Response) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          user: (req as AuthRequest).user?.id
        });
        
        res.status(429).json({
          error: config.message || 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: res.getHeader('Retry-After')
        });
      },
      skip: config.skip,
      keyGenerator: config.keyGenerator || ((req: Request) => {
        // Use user ID if authenticated, otherwise use IP
        const authReq = req as AuthRequest;
        return authReq.user?.id || req.ip || 'unknown';
      })
    };

    // Use Redis store if available
    if (this.redis) {
      return rateLimit({
        ...baseConfig,
        store: new RedisStore({
          // @ts-expect-error - RedisStore types might not match exactly
          client: this.redis,
          prefix: 'rl:',
          sendCommand: (...args: string[]) => (this.redis as any).call(...args)
        })
      });
    }

    // Fallback to memory store
    return rateLimit(baseConfig);
  }

  /**
   * Global rate limiter
   */
  global(): RateLimitRequestHandler {
    const key = 'global';
    if (!this.limiters.has(key)) {
      this.limiters.set(key, this.createLimiter({}));
    }
    return this.limiters.get(key)!;
  }

  /**
   * Auth endpoints rate limiter (stricter)
   */
  auth(): RateLimitRequestHandler {
    const key = 'auth';
    if (!this.limiters.has(key)) {
      this.limiters.set(key, this.createLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 requests per window
        message: 'Too many authentication attempts, please try again later.',
        keyGenerator: (req: Request) => {
          // Rate limit by IP for auth endpoints
          return req.ip || 'unknown';
        }
      }));
    }
    return this.limiters.get(key)!;
  }

  /**
   * API endpoints rate limiter (per user)
   */
  api(): RateLimitRequestHandler {
    const key = 'api';
    if (!this.limiters.has(key)) {
      this.limiters.set(key, this.createLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        skip: (req: Request) => {
          // Skip rate limiting for admin users
          const authReq = req as AuthRequest;
          return authReq.user?.role === 'admin';
        }
      }));
    }
    return this.limiters.get(key)!;
  }

  /**
   * Public endpoints rate limiter (more lenient)
   */
  public(): RateLimitRequestHandler {
    const key = 'public';
    if (!this.limiters.has(key)) {
      this.limiters.set(key, this.createLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 300, // 300 requests per window
        keyGenerator: (req: Request) => {
          // Rate limit by IP for public endpoints
          return req.ip || 'unknown';
        }
      }));
    }
    return this.limiters.get(key)!;
  }

  /**
   * Create custom rate limiter
   */
  custom(key: string, config: RateLimitConfig): RateLimitRequestHandler {
    if (!this.limiters.has(key)) {
      this.limiters.set(key, this.createLimiter(config));
    }
    return this.limiters.get(key)!;
  }

  /**
   * Dynamic rate limiter based on route config
   */
  dynamic(windowMs?: number, max?: number): RateLimitRequestHandler {
    const key = `dynamic-${windowMs}-${max}`;
    if (!this.limiters.has(key)) {
      this.limiters.set(key, this.createLimiter({ windowMs, max }));
    }
    return this.limiters.get(key)!;
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(key: string): Promise<void> {
    if (!this.redis) {
      logger.warn('Cannot reset rate limit without Redis');
      return;
    }

    try {
      const keys = await this.redis.keys(`rl:${key}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info(`Reset rate limit for key: ${key}`, { count: keys.length });
      }
    } catch (error) {
      logger.error('Failed to reset rate limit', { key, error });
    }
  }

  /**
   * Get current rate limit status for a key
   */
  async getStatus(key: string): Promise<any> {
    if (!this.redis) {
      return null;
    }

    try {
      const value = await this.redis.get(`rl:${key}`);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.error('Failed to get rate limit status', { key, error });
      return null;
    }
  }
}