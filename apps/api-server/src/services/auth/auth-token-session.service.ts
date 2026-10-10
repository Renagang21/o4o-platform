import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { Repository, type EntityManager } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../entities/User.js';
import { AuthTokens, AccessTokenPayload } from '../../types/auth.js';
import * as tokenUtils from '../../utils/token.utils.js';
import * as cookieUtils from '../../utils/cookie.utils.js';
import { freshenUserContext } from './auth-context.helper.js';
import { resolveAccountAccess } from '../../common/auth/account-access.policy.js';
import logger from '../../utils/logger.js';
import { isBrowserSessionLive, revokeBrowserSession } from './browser-session.service.js';
import {
  isSessionAuthMethodAllowed,
  sessionAuthMethodError,
} from '../../common/auth/password-session.policy.js';

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
   * - TOKEN_FAMILY_MISMATCH: Old account security generation (do NOT retry)
   * - TOKEN_FAMILY_REVOKED: 계정 세션 세대가 없는 토큰 (do NOT retry)
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

    // WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1 §5-A:
    //   refresh 시 DB 최신 users.status 로 접근 상태를 재판정한다.
    //   pending → 제한 토큰 재발급 / active·approved → 정상 토큰 (아래 generateTokens 가 파생)
    //   inactive·suspended·rejected → refresh 거부 (승인 취소·정지가 즉시 반영된다)
    if (resolveAccountAccess(user.status) === 'blocked') {
      logger.warn('[refreshTokens] refresh rejected by account status', {
        userId: user.id,
        status: user.status,
      });
      const error = new Error('계정 상태가 유효하지 않습니다. 다시 로그인해 주세요.') as Error & {
        code: string;
      };
      error.code = 'ACCOUNT_NOT_ACTIVE';
      throw error;
    }

    // WO-O4O-LOGOUT-ALL-TOKEN-INVALIDATION-V1:
    //   family 가 없는 refresh token 은 계약 위반이다. 재발급을 허용하지 않는다.
    if (!payload.tokenFamily) {
      const error = new Error('Refresh token has no token family') as Error & { code: string };
      error.code = 'REFRESH_TOKEN_INVALID';
      throw error;
    }

    // WO-O4O-LOGOUT-ALL-TOKEN-INVALIDATION-V1:
    //   users.refreshTokenFamily 가 비어 있다 = 보안 세션 폐기 / 도난 대응으로
    //   해당 사용자의 모든 refresh token 이 폐기된 상태다.
    //   이전에는 이 조건이 family 검사 전체를 우회시켜 보안 세션 폐기가 무력했다.
    if (!user.refreshTokenFamily) {
      logger.warn('[refreshTokens] refresh rejected — token family revoked', { userId: user.id });
      const error = new Error('세션이 종료되었습니다. 다시 로그인해 주세요.') as Error & {
        code: string;
      };
      error.code = 'TOKEN_FAMILY_REVOKED';
      throw error;
    }

    // Phase 2.5: Token family check for rotation security
    if (user.refreshTokenFamily !== payload.tokenFamily) {
      logger.warn('Refresh rejected: old account security generation', {
        userId: user.id,
      });

      // A stale family cannot revoke a newer login or restore a security generation.

      const error = new Error('Token family mismatch - please login again') as Error & {
        code: string;
      };
      error.code = 'TOKEN_FAMILY_MISMATCH';
      throw error;
    }

    // The database check binds this browser to the current account generation.
    if (!(await isBrowserSessionLive(user.id, payload, user.refreshTokenFamily, this.userRepository.manager))) {
      this.throwServiceSessionRevoked(user.id, payload.serviceKey ?? 'LEGACY_SESSION');
    }

    // Refresh preserves both the browser ID and current account security family.
    // Only a password security event rotates that family; no refresh/handoff writes it.
    const ctx = await freshenUserContext(user.id);

    // Do not promote missing/Kakao/password markers to Google during refresh.
    if (!isSessionAuthMethodAllowed(payload.authMethod, payload.serviceKey, ctx.roles)) {
      const rejection = sessionAuthMethodError(payload.authMethod);
      throw Object.assign(new Error(rejection.message), { code: rejection.code });
    }

    // Preserve signed scope and compatibility epoch without rereading either.
    const tokens = tokenUtils.generateTokens(
      user,
      ctx.roles,
      'neture.co.kr',
      ctx.memberships,
      payload.tokenFamily,
      payload.serviceKey ?? null,
      payload.sessionEpoch ?? null,
      // WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-4: 수단 표식도 승계한다.
      payload.authMethod ?? null,
      payload.sessionId,
    );

    // Refresh never writes the account family: a concurrent password change must win.

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
  async logout(userId: string, serviceKey: string, sessionId: string): Promise<void> {
    await revokeBrowserSession(userId, serviceKey, sessionId, this.userRepository.manager);
  }

  private throwServiceSessionRevoked(userId: string, serviceKey: string): never {
    logger.warn('[refreshTokens] refresh rejected — service session revoked', { userId, serviceKey });
    const error = new Error('세션이 종료되었습니다. 다시 로그인해 주세요.') as Error & {
      code: string;
    };
    error.code = 'SERVICE_SESSION_REVOKED';
    throw error;
  }

  /** Rotate the account generation atomically with password writes. Old logins cannot restore it. */
  async revokeAllSessions(userId: string, manager?: Pick<EntityManager, 'query'>): Promise<void> {
    await (manager ?? this.userRepository.manager).query(
      'UPDATE users SET "refreshTokenFamily" = $2 WHERE id = $1', [userId, randomUUID()],
    );
  }

  /**
   * Set authentication cookies
   */
  setAuthCookies(req: Request, res: Response, tokens: AuthTokens): void {
    cookieUtils.setAuthCookies(req, res, tokens);
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
