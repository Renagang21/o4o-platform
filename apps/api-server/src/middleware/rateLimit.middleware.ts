import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../services/redis.service';

interface RateLimitOptions {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Max requests per window
  message?: string;  // Custom error message
  keyGenerator?: (req: Request) => string; // Custom key generator
}

export function rateLimitMiddleware(options: RateLimitOptions) {
  const redisService = RedisService.getInstance();
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {
      windowMs,
      max,
      message = 'Too many requests, please try again later.',
      keyGenerator = (req) => req.ip || 'unknown'
    } = options;

    const key = `ratelimit:${keyGenerator(req)}:${req.path}`;
    const windowSeconds = Math.floor(windowMs / 1000);

    try {
      // Get current count
      const current = await redisService.get(key);
      const count = current ? parseInt(current) : 0;

      if (count >= max) {
        res.status(429).json({
          success: false,
          error: message,
          retryAfter: windowSeconds,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Increment counter
      if (count === 0) {
        // First request in window
        await redisService.set(key, '1', windowSeconds);
      } else {
        // Increment existing counter
        await redisService.incrby(key, 1);
      }

      // Add headers
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', (max - count - 1).toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

      next();
    } catch (error) {
      // If Redis fails, allow the request but log the error
      console.error('Rate limit middleware error:', error);
      next();
    }
  };
}