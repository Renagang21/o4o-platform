/**
 * Handoff Token Service
 *
 * WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1
 * Redis-based, single-use, short-lived token for cross-domain SSO handoff.
 *
 * Flow:
 * 1. Source service calls generateToken() → stores in Redis (60s TTL)
 * 2. Browser redirects to target service with token in URL
 * 3. Target service calls exchangeToken() → consumes from Redis (single-use)
 * 4. Target service receives userId, generates auth tokens for target domain
 */

import { v4 as uuidv4 } from 'uuid';
import { RedisService } from './redis.service.js';
import { getService } from '../config/service-catalog.js';
import logger from '../utils/logger.js';

export interface HandoffTokenPayload {
  userId: string;
  sourceServiceKey: string;
  targetServiceKey: string;
  createdAt: string;
}

class HandoffTokenService {
  private static instance: HandoffTokenService;
  private readonly TOKEN_TTL = 60; // 60 seconds
  private readonly REDIS_PREFIX = 'handoff:';

  static getInstance(): HandoffTokenService {
    if (!HandoffTokenService.instance) {
      HandoffTokenService.instance = new HandoffTokenService();
    }
    return HandoffTokenService.instance;
  }

  /**
   * Generate a handoff token for cross-service navigation
   *
   * @param userId - User ID requesting the handoff
   * @param sourceServiceKey - Service key the user is coming from
   * @param targetServiceKey - Service key the user wants to navigate to
   * @returns Token string (UUID)
   */
  async generateToken(
    userId: string,
    sourceServiceKey: string,
    targetServiceKey: string,
  ): Promise<string> {
    // Validate target service exists in catalog
    const targetService = getService(targetServiceKey);
    if (!targetService) {
      throw new Error(`Unknown target service: ${targetServiceKey}`);
    }

    const tokenId = uuidv4();
    const redisKey = `${this.REDIS_PREFIX}${tokenId}`;

    const payload: HandoffTokenPayload = {
      userId,
      sourceServiceKey,
      targetServiceKey,
      createdAt: new Date().toISOString(),
    };

    const redisService = RedisService.getInstance();
    const stored = await redisService.set(
      redisKey,
      JSON.stringify(payload),
      this.TOKEN_TTL,
    );

    if (!stored) {
      throw new Error('Failed to store handoff token in Redis');
    }

    logger.info('[Handoff] Token generated', {
      tokenId,
      userId,
      sourceServiceKey,
      targetServiceKey,
      ttl: this.TOKEN_TTL,
    });

    return tokenId;
  }

  /**
   * Exchange (consume) a handoff token — single-use
   *
   * @param tokenId - The handoff token to exchange
   * @returns Payload if valid, null if expired or already used
   */
  async exchangeToken(tokenId: string): Promise<HandoffTokenPayload | null> {
    const redisKey = `${this.REDIS_PREFIX}${tokenId}`;
    const redisService = RedisService.getInstance();

    // Look up token
    const raw = await redisService.get(redisKey);
    if (!raw) {
      logger.warn('[Handoff] Token not found or expired', { tokenId });
      return null;
    }

    // Delete immediately (single-use)
    const deleted = await redisService.del(redisKey);
    if (!deleted) {
      logger.error('[Handoff] Failed to consume token', { tokenId });
      return null;
    }

    try {
      const payload: HandoffTokenPayload = JSON.parse(raw);
      logger.info('[Handoff] Token exchanged', {
        tokenId,
        userId: payload.userId,
        targetServiceKey: payload.targetServiceKey,
      });
      return payload;
    } catch {
      logger.error('[Handoff] Failed to parse token payload', { tokenId });
      return null;
    }
  }
}

export const handoffTokenService = HandoffTokenService.getInstance();
