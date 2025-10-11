/**
 * Preview Token Service
 * JWT-based preview token with jti for one-time consumption
 * Sprint 2 - P1: Preview Protection
 */

import jwt from 'jsonwebtoken';
import { RedisService } from './redis.service';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

interface PreviewTokenPayload {
  userId: string;
  pageId: string;
  jti: string; // JWT ID for one-time consumption
  iat: number; // issued at
  exp: number; // expiration
}

interface TokenValidationResult {
  valid: boolean;
  payload?: PreviewTokenPayload;
  error?: string;
}

class PreviewTokenService {
  private static instance: PreviewTokenService;
  private readonly TOKEN_TTL = 10 * 60; // 10 minutes in seconds
  private readonly REDIS_PREFIX = 'preview:jti:';
  private readonly JWT_SECRET: string;

  private constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';

    if (process.env.NODE_ENV === 'production' && this.JWT_SECRET === 'dev-jwt-secret-change-in-production') {
      logger.warn('⚠️ WARNING: Using default JWT_SECRET in production environment');
    }
  }

  static getInstance(): PreviewTokenService {
    if (!PreviewTokenService.instance) {
      PreviewTokenService.instance = new PreviewTokenService();
    }
    return PreviewTokenService.instance;
  }

  /**
   * Generate preview token with jti
   * Token is valid for 10 minutes and can be consumed only once
   */
  async generateToken(userId: string, pageId: string): Promise<string> {
    const jti = uuidv4(); // Generate unique JWT ID
    const now = Math.floor(Date.now() / 1000);

    const payload: PreviewTokenPayload = {
      userId,
      pageId,
      jti,
      iat: now,
      exp: now + this.TOKEN_TTL
    };

    // Store jti in Redis with TTL
    const redisKey = `${this.REDIS_PREFIX}${jti}`;
    const redisService = RedisService.getInstance();
    const stored = await redisService.set(
      redisKey,
      JSON.stringify({ userId, pageId, createdAt: new Date().toISOString() }),
      this.TOKEN_TTL
    );

    if (!stored) {
      throw new Error('Failed to store preview token in Redis');
    }

    // Generate JWT
    const token = jwt.sign(payload, this.JWT_SECRET, {
      algorithm: 'HS256',
      jwtid: jti
    });

    logger.info('Preview token generated', {
      userId,
      pageId,
      jti,
      expiresIn: `${this.TOKEN_TTL}s`
    });

    return token;
  }

  /**
   * Verify and consume preview token (one-time use)
   * Returns payload if valid, null if invalid/expired/already consumed
   */
  async verifyAndConsumeToken(token: string): Promise<TokenValidationResult> {
    try {
      // Verify JWT signature and expiration
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256']
      }) as PreviewTokenPayload;

      const { jti, userId, pageId, exp } = decoded;

      // Check if token is expired (double-check)
      if (exp < Math.floor(Date.now() / 1000)) {
        logger.warn('Preview token expired', { jti, userId, pageId });
        return {
          valid: false,
          error: 'TOKEN_EXPIRED'
        };
      }

      // Check if jti exists in Redis (not yet consumed)
      const redisKey = `${this.REDIS_PREFIX}${jti}`;
      const redisService = RedisService.getInstance();
      const exists = await redisService.exists(redisKey);

      if (!exists) {
        logger.warn('Preview token already consumed or not found', { jti, userId, pageId });
        return {
          valid: false,
          error: 'TOKEN_CONSUMED'
        };
      }

      // Consume token (delete from Redis)
      const deleted = await redisService.del(redisKey);

      if (!deleted) {
        logger.error('Failed to consume preview token', { jti, userId, pageId });
        return {
          valid: false,
          error: 'CONSUMPTION_FAILED'
        };
      }

      logger.info('Preview token consumed successfully', {
        userId,
        pageId,
        jti,
        remainingTTL: exp - Math.floor(Date.now() / 1000)
      });

      return {
        valid: true,
        payload: decoded
      };

    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('Preview token verification failed: expired', {
          error: error.message
        });
        return {
          valid: false,
          error: 'TOKEN_EXPIRED'
        };
      }

      if (error.name === 'JsonWebTokenError') {
        logger.warn('Preview token verification failed: invalid signature', {
          error: error.message
        });
        return {
          valid: false,
          error: 'INVALID_TOKEN'
        };
      }

      logger.error('Preview token verification error', {
        error: error.message,
        stack: error.stack
      });

      return {
        valid: false,
        error: 'VERIFICATION_ERROR'
      };
    }
  }

  /**
   * Revoke a token before expiration (manual invalidation)
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      const decoded = jwt.decode(token) as PreviewTokenPayload | null;

      if (!decoded || !decoded.jti) {
        return false;
      }

      const redisKey = `${this.REDIS_PREFIX}${decoded.jti}`;
      const redisService = RedisService.getInstance();
      const deleted = await redisService.del(redisKey);

      if (deleted) {
        logger.info('Preview token revoked manually', {
          jti: decoded.jti,
          userId: decoded.userId,
          pageId: decoded.pageId
        });
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to revoke preview token', { error });
      return false;
    }
  }

  /**
   * Check token validity without consuming it
   * Used for debugging/admin purposes only
   */
  async checkTokenStatus(token: string): Promise<{
    valid: boolean;
    payload?: PreviewTokenPayload;
    consumed: boolean;
    expired: boolean;
  }> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256']
      }) as PreviewTokenPayload;

      const redisKey = `${this.REDIS_PREFIX}${decoded.jti}`;
      const redisService = RedisService.getInstance();
      const exists = await redisService.exists(redisKey);
      const expired = decoded.exp < Math.floor(Date.now() / 1000);

      return {
        valid: exists && !expired,
        payload: decoded,
        consumed: !exists,
        expired
      };
    } catch (error) {
      return {
        valid: false,
        consumed: false,
        expired: false
      };
    }
  }

  /**
   * Get token TTL (for info purposes)
   */
  getTokenTTL(): number {
    return this.TOKEN_TTL;
  }
}

export const previewTokenService = PreviewTokenService.getInstance();
