import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../entities/User.js';
import { AuthTokens, AccessTokenPayload } from '../../types/auth.js';
import * as tokenUtils from '../../utils/token.utils.js';
import * as cookieUtils from '../../utils/cookie.utils.js';
import { SessionSyncService } from '../sessionSyncService.js';
import { freshenUserContext } from './auth-context.helper.js';
import logger from '../../utils/logger.js';

/**
 * AuthTokenSessionService
 *
 * Token refresh, verification, logout, and cookie management.
 *
 * Extracted from AuthenticationService (WO-O4O-AUTHENTICATION-SERVICE-SPLIT-V1).
 */
export class AuthTokenSessionService {
  // Lazy repository
  private _userRepo?: Repository<User>;

  private get userRepository(): Repository<User> {
    if (!this._userRepo) {
      this._userRepo = AppDataSource.getRepository(User);
    }
    return this._userRepo;
  }

  /**
   * Refresh tokens
   *
   * === Phase 2.5: Unified Error Handling ===
   * Returns specific error codes for frontend handling:
   * - REFRESH_TOKEN_EXPIRED: Token has expired (do NOT retry)
   * - REFRESH_TOKEN_INVALID: Token is malformed or signature invalid (do NOT retry)
   * - TOKEN_FAMILY_MISMATCH: Token rotation detected, possible theft (do NOT retry)
   * - USER_NOT_FOUND: User does not exist or is inactive (do NOT retry)
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Phase 2.5: Verify JWT token (includes issuer/audience check for server isolation)
    const payload = tokenUtils.verifyRefreshToken(refreshToken);

    if (!payload) {
      const error = new Error('Invalid or expired refresh token') as Error & { code: string };
      error.code = 'REFRESH_TOKEN_INVALID';
      throw error;
    }

    // Check token expiration explicitly for clearer error
    if (tokenUtils.isTokenExpired(refreshToken)) {
      const error = new Error('Refresh token has expired') as Error & { code: string };
      error.code = 'REFRESH_TOKEN_EXPIRED';
      throw error;
    }

    // Find user with matching token family
    const user = await this.userRepository.findOne({
      where: {
        id: payload.userId,
        isActive: true,
      },
    });

    if (!user) {
      const error = new Error('User not found or inactive') as Error & { code: string };
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // Phase 2.5: Token family check for rotation security
    if (
      user.refreshTokenFamily &&
      payload.tokenFamily &&
      user.refreshTokenFamily !== payload.tokenFamily
    ) {
      logger.warn('Token family mismatch - possible token theft detected', {
        userId: user.id,
        expectedFamily: user.refreshTokenFamily,
        receivedFamily: payload.tokenFamily,
      });

      // Invalidate all tokens for this user (security measure)
      user.refreshTokenFamily = null;
      await this.userRepository.save(user);

      const error = new Error('Token family mismatch - please login again') as Error & {
        code: string;
      };
      error.code = 'TOKEN_FAMILY_MISMATCH';
      throw error;
    }

    // Generate new tokens (with rotation)
    // WO-O4O-AUTH-JWT-SECURITY-REFINE-V1: refresh 시에도 최신 memberships 포함
    const ctx = await freshenUserContext(user.id);
    const tokens = tokenUtils.generateTokens(user, ctx.roles, 'neture.co.kr', ctx.memberships);

    // Update token family
    const tokenFamily = tokenUtils.getTokenFamily(tokens.refreshToken);
    if (tokenFamily) {
      user.refreshTokenFamily = tokenFamily;
      await this.userRepository.save(user);
    }

    return tokens;
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): AccessTokenPayload | null {
    return tokenUtils.verifyAccessToken(token);
  }

  /**
   * Logout user
   */
  async logout(userId: string, sessionId?: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (user) {
      // Invalidate token family
      user.refreshTokenFamily = null;
      await this.userRepository.save(user);
    }

    // Remove SSO session
    if (sessionId) {
      await SessionSyncService.removeSession(sessionId, userId);
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    await this.logout(userId);
    await SessionSyncService.removeAllUserSessions(userId);
  }

  /**
   * Set authentication cookies
   */
  setAuthCookies(req: Request, res: Response, tokens: AuthTokens, sessionId?: string): void {
    cookieUtils.setAuthCookies(req, res, tokens);

    if (sessionId) {
      cookieUtils.setSessionCookie(req, res, sessionId);
    }
  }

  /**
   * Clear authentication cookies
   */
  clearAuthCookies(req: Request, res: Response): void {
    cookieUtils.clearAuthCookies(req, res);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({ where: { id: userId } });
    } catch (error) {
      logger.error('Get user by ID error:', error);
      return null;
    }
  }
}
