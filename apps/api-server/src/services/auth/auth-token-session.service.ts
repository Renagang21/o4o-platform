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
import { bumpServiceSessionEpoch, isSessionScopeLive } from './service-session-epoch.js';
import {
  isPasswordSessionAllowed,
  PASSWORD_SESSION_NOT_ALLOWED_CODE,
  PASSWORD_SESSION_NOT_ALLOWED_MESSAGE,
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
   * - TOKEN_FAMILY_MISMATCH: Token rotation detected, possible theft (do NOT retry)
   * - TOKEN_FAMILY_REVOKED: logout / 보안 세션 폐기로 폐기된 세션 (do NOT retry)
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

    // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8: 서비스 단위 폐기 검사.
    //   전역 family 검사보다 **먼저** 본다 — 이 토큰이 속한 서비스에서 로그아웃했으면
    //   family 가 살아 있어도(다른 서비스가 쓰는 중) 이 토큰은 무효다.
    await this.assertServiceSessionNotRevoked(payload);

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
    //   로그인은 살아 있는 family를 재사용한다. 전역 보안 폐기만 family를 비운다.
    const ctx = await freshenUserContext(user.id);

    // WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-4: 비밀번호 세션은 관리자 경계 밖에서만 산다.
    //   발급 뒤 `platform:*` 역할이 붙었으면 회전으로 연장하지 않는다(Google 로 다시 로그인).
    if (payload.authMethod === 'password' && !isPasswordSessionAllowed(payload.serviceKey, ctx.roles)) {
      logger.warn('[refreshTokens] password session rejected by admin boundary', { userId: user.id });
      const error = new Error(PASSWORD_SESSION_NOT_ALLOWED_MESSAGE) as Error & { code: string };
      error.code = PASSWORD_SESSION_NOT_ALLOWED_CODE;
      throw error;
    }

    // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8: 회전은 같은 세션의 연장이므로
    //   serviceKey 와 **세대를 그대로 승계**한다. 세대를 다시 읽으면 로그아웃 뒤에도 회전
    //   한 번으로 최신 세대를 얻어 세션이 부활한다. 떨어뜨리면 반대로 정상 세션이 끊긴다.
    const tokens = tokenUtils.generateTokens(
      user,
      ctx.roles,
      'neture.co.kr',
      ctx.memberships,
      payload.tokenFamily,
      payload.serviceKey ?? null,
      payload.sessionEpoch ?? null,
      // WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-4: 수단 표식도 승계한다.
      payload.authMethod ?? null
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
  async logout(userId: string, serviceKey?: string | null): Promise<void> {
    // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (S7):
    //   로그아웃은 **지금 쓰던 서비스의 세션만** 서버에서 무효화한다. 다른 서비스 세션은 유지된다.
    //
    //   종전 1차: `revokeAllSessions` 위임 → `users.refreshTokenFamily = null`. 그 값은 **사용자 전체**
    //     범위라서 한 서비스 로그아웃이 9개 주소를 모두 끊었다(= 보안 세션 폐기와 동일).
    //   종전 2차: 아무것도 하지 않고 기록만 남겼다. 그러면 **이미 발급된 refresh token 이
    //     서버에서 계속 유효**하므로 "세션 종료" 가 아니다.
    //
    //   이제는 `service_session_revocations` 의 **세대를 올린다.** refresh 는 토큰에 새겨진
    //   세대를 현재 세대와 비교해 거절한다(아래 assertServiceSessionNotRevoked).
    //
    //   ⚠ 처음에는 폐기 **시각**과 토큰 `iat` 를 비교했다. `iat` 는 초 단위라 같은 초의 기존
    //   토큰과 새 토큰을 구별할 수 없고, 로그아웃한 같은 초에 다시 로그인하면 새 토큰까지
    //   거절됐다. 그래서 시간 비교를 버렸다.
    //
    //   `users.refreshTokenFamily` 는 손대지 않는다 — 그것은 전역 축이고 보안 세션 폐기 의 것이다.
    if (!serviceKey) {
      // 서비스를 식별하지 못하면 **무효화 범위를 정할 수 없다.** 전역 폐기로 확대하지 않고
      // (그것이 고치려는 결함이다) 쿠키 정리에만 의존한다는 사실을 남긴다.
      logger.warn('[logout] service could not be resolved — server-side revocation skipped', { userId });
      return;
    }

    const epoch = await bumpServiceSessionEpoch(userId, serviceKey, this.userRepository.manager);
    logger.info('[logout] service session revoked', { userId, serviceKey, sessionEpoch: epoch });
  }

  /**
   * 이 refresh token 이 속한 서비스 세션이 아직 살아 있는지.
   *
   * 판정은 **세대 비교**다 — `token.sessionEpoch < 현재 epoch` 이면 그 로그아웃보다 먼저
   * 발급된 토큰이므로 거절한다. 시각을 보지 않으므로 같은 초·같은 밀리초에 일어난
   * 로그아웃 → 재로그인도 정확히 갈린다.
   *
   * `serviceKey` claim 이 없는 토큰(배포 전 발급분)은 어느 세션인지 알 수 없다. 그 사용자에게
   * 폐기 기록이 하나라도 있으면 거절한다 — 통과시키면 배포 직후 최대 7일간 로그아웃이
   * 무력해진다. 폐기 기록이 아예 없으면 통과한다(배포만으로 전원을 로그아웃시키지 않는다).
   */
  private async assertServiceSessionNotRevoked(payload: {
    userId: string;
    serviceKey?: string;
    sessionEpoch?: number;
  }): Promise<void> {
    // 판정은 `isSessionScopeLive` 하나 — handoff 발급·교환도 같은 함수를 쓴다.
    //   한쪽만 느슨해지면 그쪽이 옆길이 된다(4차 리뷰에서 실제로 그랬다).
    if (await isSessionScopeLive(payload.userId, payload.serviceKey, payload.sessionEpoch, this.userRepository.manager)) {
      return;
    }
    this.throwServiceSessionRevoked(payload.userId, payload.serviceKey ?? 'UNKNOWN_LEGACY_TOKEN');
  }

  private throwServiceSessionRevoked(userId: string, serviceKey: string): never {
    logger.warn('[refreshTokens] refresh rejected — service session revoked', { userId, serviceKey });
    const error = new Error('세션이 종료되었습니다. 다시 로그인해 주세요.') as Error & {
      code: string;
    };
    error.code = 'SERVICE_SESSION_REVOKED';
    throw error;
  }

  /**
   * Internal global session revocation for password reset and security events.
   *
   * WO-O4O-LOGOUT-ALL-TOKEN-INVALIDATION-V1:
   *   users.refreshTokenFamily 를 비우면 refreshTokens() 가 TOKEN_FAMILY_REVOKED 로
   *   거부하므로, 이미 발급된 모든 기기의 refresh token 이 즉시 무효가 된다.
   *   (현재 데이터 모델에 기기별 세션 레코드가 없어 무효화 단위는 사용자 전체다.)
   *
   * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8: **전역 폐기는 이 경로만 한다.**
   *   `logout` 에 위임하지 않는다 — 위임하던 동안 서비스 하나의 로그아웃이 전역 폐기였다.
   */
  async revokeAllSessions(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (user) {
      // Invalidate token family (사용자 전체 범위)
      user.refreshTokenFamily = null;
      await this.userRepository.save(user);
    }
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
