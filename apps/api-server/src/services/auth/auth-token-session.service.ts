import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../entities/User.js';
import { AuthTokens, AccessTokenPayload } from '../../types/auth.js';
import * as tokenUtils from '../../utils/token.utils.js';
import * as cookieUtils from '../../utils/cookie.utils.js';
import { freshenUserContext } from './auth-context.helper.js';
import { resolveAccountAccess } from '../../common/auth/account-access.policy.js';
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
   * - TOKEN_FAMILY_REVOKED: logout / logout-all 로 폐기된 세션 (do NOT retry)
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
    //   users.refreshTokenFamily 가 비어 있다 = logout / logout-all / 도난 대응으로
    //   해당 사용자의 모든 refresh token 이 폐기된 상태다.
    //   이전에는 이 조건이 family 검사 전체를 우회시켜 logout-all 이 무력했다.
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
    // WO-O4O-AUTH-REFRESH-TOKEN-FAMILY-CONTINUITY-AND-HANDOFF-STALE-TOKEN-GUARD-V1:
    //   family = 로그인 세션 계보, refresh token = 그 family 안에서 회전.
    //   회전 시 기존 family 를 승계한다. users.refreshTokenFamily 는 사용자당 단일 슬롯이라
    //   매 refresh 마다 새 family 를 덮어쓰면 handoff 로 같은 family 를 승계한 다른 origin 의
    //   refresh token 이 즉시 stale 이 되고, 그 다음 refresh 가 MISMATCH → family null →
    //   모든 origin 이 TOKEN_FAMILY_REVOKED 로 연쇄 사망했다 (IR-O4O-CROSSSERVICE-HANDOFF-SESSION-PERSISTENCE-V1).
    //   새 로그인 = 새 family / logout·logout-all = family null 계약은 그대로다.
    const ctx = await freshenUserContext(user.id);
    const tokens = tokenUtils.generateTokens(
      user,
      ctx.roles,
      'neture.co.kr',
      ctx.memberships,
      payload.tokenFamily
    );

    // family 는 승계됐으므로 users 갱신이 필요 없다. 방어적으로 값이 다를 때만 저장한다.
    const tokenFamily = tokenUtils.getTokenFamily(tokens.refreshToken);
    if (tokenFamily && user.refreshTokenFamily !== tokenFamily) {
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
  async logout(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (user) {
      // Invalidate token family
      user.refreshTokenFamily = null;
      await this.userRepository.save(user);
    }
  }

  /**
   * Logout from all devices
   *
   * WO-O4O-LOGOUT-ALL-TOKEN-INVALIDATION-V1:
   *   users.refreshTokenFamily 를 비우면 refreshTokens() 가 TOKEN_FAMILY_REVOKED 로
   *   거부하므로, 이미 발급된 모든 기기의 refresh token 이 즉시 무효가 된다.
   *   (현재 데이터 모델에 기기별 세션 레코드가 없어 무효화 단위는 사용자 전체다.)
   */
  async logoutAll(userId: string): Promise<void> {
    await this.logout(userId);
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
