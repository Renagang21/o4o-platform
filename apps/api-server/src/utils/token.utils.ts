import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../entities/User.js';
import { AccessTokenPayload, RefreshTokenPayload, AuthTokens, TokenType, type SessionAuthMethod } from '../types/auth.js';
import type { GuestUserData } from '../types/account-linking.js';
import logger from './logger.js';
import { compatPrimaryRole } from './compat-primary-role.js';
import { resolveAccountAccess } from '../common/auth/account-access.policy.js';

/**
 * Token Utility Module
 *
 * Centralized token generation and verification logic.
 * Used by all auth services to ensure consistency.
 *
 * === Phase 2.5 Server Isolation ===
 * JWT tokens include issuer (iss) and audience (aud) claims
 * to ensure tokens from one server cannot be used on another.
 *
 * - JWT_ISSUER: Identifies the server that issued the token
 * - JWT_AUDIENCE: Identifies the intended recipient of the token
 *
 * Cross-server token usage is BLOCKED at verification time.
 */

// Token configuration
const ACCESS_TOKEN_EXPIRES_IN = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Get JWT configuration from environment
 *
 * issuer/audience are used to isolate tokens between servers
 * (e.g., Cosmetics vs Yaksa servers)
 */
function getJwtConfig() {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  // Server isolation: issuer identifies who created the token
  const jwtIssuer = process.env.JWT_ISSUER || 'o4o-platform';
  // Server isolation: audience identifies who should accept the token
  const jwtAudience = process.env.JWT_AUDIENCE || 'o4o-api';

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  if (!jwtRefreshSecret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
  }

  return { jwtSecret, jwtRefreshSecret, jwtIssuer, jwtAudience };
}

/**
 * Get JWT secrets from environment (legacy alias)
 * @deprecated Use getJwtConfig() instead
 */
function getJwtSecrets() {
  const config = getJwtConfig();
  return { jwtSecret: config.jwtSecret, jwtRefreshSecret: config.jwtRefreshSecret };
}

/**
 * Generate access token for Platform Users
 *
 * @param user - User entity
 * @param domain - Domain for the token (default: neture.co.kr)
 * @returns JWT access token string
 *
 * === Phase 2.5: Server Isolation ===
 * Token includes iss (issuer) and aud (audience) for cross-server protection
 *
 * === Phase 1: Service User 인증 기반 (WO-AUTH-SERVICE-IDENTITY-PHASE1) ===
 * Token includes tokenType: 'user' to distinguish from service tokens
 */
export function generateAccessToken(
  user: User,
  roles: string[],
  domain: string = 'neture.co.kr',
  memberships?: { serviceKey: string; status: string; role?: string }[],
  sessionScope?: { serviceKey?: string | null; sessionEpoch?: number | null; authMethod?: SessionAuthMethod | null; sessionId?: string; tokenFamily?: string },
): string {
  const { jwtSecret, jwtIssuer, jwtAudience } = getJwtConfig();

  // Phase3-E PR3: roles from RoleAssignment table (explicit parameter)
  const userRoles = roles;
  // WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1 §7-B:
  //   `role` claim 은 **compatibility 필드**다(인가는 `roles[]` 로 한다 — 이 claim 을 보는
  //   권한 판정 코드는 census 결과 0). 다만 값이 조회 순서에 따라 흔들리면 로그·표시가
  //   요청마다 달라지므로 **정렬 사본의 첫 원소**로 고정한다. 원본 배열은 건드리지 않는다.
  //   ※ RBAC SSOT(role-assignment.service, FROZEN Core)는 수정하지 않았다.
  const primaryRole = compatPrimaryRole(userRoles);

  // WO-O4O-LEGACY-BACKEND-JWT-SCOPE-BRANCH-REMOVAL-V1:
  //   access token 의 scopes claim 생성을 제거했다. 인증 미들웨어가 payload.scopes 를
  //   req.user 로 전달한 적이 없어 백엔드 권한 판정에 연결된 적이 없는 축이다.
  //   프런트가 소비하는 user.scopes 는 GET /auth/me 가 deriveUserScopes() 로 별도
  //   계산해 응답하므로 그대로 유지된다 (본 변경의 영향 없음).
  const payload: AccessTokenPayload = {
    userId: user.id,
    sub: user.id,
    email: user.email,
    role: primaryRole,
    roles: userRoles, // Phase3-E: from RoleAssignment
    memberships: memberships || [], // WO-O4O-SERVICE-MEMBERSHIP-GUARD-V1
    // WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1:
    //   users.status 에서 파생되는 계정 접근 상태. 프론트 분기용 힌트이며
    //   서버측 판정은 항상 DB users.status 로 다시 수행한다 (claim 위조 무의미).
    //   'blocked' 상태는 애초에 토큰을 발급하지 않으므로 여기서는 restricted 로 접힌다.
    accountAccess: resolveAccountAccess(user.status) === 'normal' ? 'normal' : 'restricted',
    // WO-O4O-AUTH-JWT-SECURITY-REFINE-V1: domain 제거 (미사용, 하드코딩 'neture.co.kr')
    tokenType: 'user',  // Phase 1: Service User 인증 기반
    ...(sessionScope?.sessionId ? { sessionId: sessionScope.sessionId } : {}),
    ...(sessionScope?.tokenFamily ? { tokenFamily: sessionScope.tokenFamily } : {}),
    // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (3차): 세션 귀속.
    //   sessionEpoch 는 0 도 유효하므로 truthy 검사를 쓰지 않는다.
    ...(sessionScope?.serviceKey ? { serviceKey: sessionScope.serviceKey } : {}),
    ...(typeof sessionScope?.sessionEpoch === 'number' ? { sessionEpoch: sessionScope.sessionEpoch } : {}),
    // WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-4: 비밀번호로 발급된 세션 표식.
    //   Google 세션에는 넣지 않는다(claim 부재 = 기존 토큰과 같은 취급). 관리자 경계 판정 축이다.
    ...(sessionScope?.authMethod ? { authMethod: sessionScope.authMethod } : {}),
    iss: jwtIssuer,     // Phase 2.5: Server isolation
    aud: jwtAudience,   // Phase 2.5: Server isolation
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRES_IN,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, jwtSecret);
}

// WO-O4O-AUTH-SERVICE-TOKEN-BOUNDARY-HARDENING-V1: generateServiceAccessToken / generateServiceRefreshToken /
//   generateServiceTokens RETIRED — tokenType:'service' 발급 경로(service login · guest upgrade) 은퇴.
//   사용자 access token 과 같은 jwtSecret 으로 임의 providerUserId 를 userId 로 서명하던 함수였다.

/**
 * Generate refresh token
 *
 * @param user - User entity
 * @param tokenFamily - Token family ID for refresh token rotation
 * @returns JWT refresh token string
 *
 * === Phase 2.5: Server Isolation ===
 * Token includes iss (issuer) and aud (audience) for cross-server protection
 */
export function generateRefreshToken(
  user: User,
  tokenFamily?: string,
  serviceKey?: string | null,
  sessionEpoch?: number | null,
  authMethod?: SessionAuthMethod | null,
  sessionId?: string,
): string {
  const { jwtRefreshSecret, jwtIssuer, jwtAudience } = getJwtConfig();

  const payload: RefreshTokenPayload = {
    userId: user.id,
    sub: user.id,
    tokenVersion: 1,
    tokenFamily: tokenFamily || uuidv4(),
    ...(sessionId ? { sessionId } : {}),
    // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8: 서비스 단위 로그아웃의 판정 축.
    //   값이 없으면 claim 을 넣지 않는다(빈 문자열을 넣으면 '' 서비스가 생긴다).
    ...(serviceKey ? { serviceKey } : {}),
    //   세대는 0 도 유효한 값이므로 truthy 검사를 쓰지 않는다 — 0 을 빠뜨리면 그 토큰이
    //   "claim 없음"(= 배포 전 토큰)으로 취급돼 첫 로그아웃 뒤 전부 거절된다.
    ...(typeof sessionEpoch === 'number' ? { sessionEpoch } : {}),
    // WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-4: 회전·재발급이 이 표식을 승계한다.
    //   refresh 에서 빠지면 비밀번호 세션이 한 번의 회전으로 "Google 세션" 이 된다.
    ...(authMethod ? { authMethod } : {}),
    iss: jwtIssuer,     // Phase 2.5: Server isolation
    aud: jwtAudience,   // Phase 2.5: Server isolation
    exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRES_IN,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, jwtRefreshSecret);
}

/**
 * Generate both access and refresh tokens
 *
 * @param user - User entity
 * @param domain - Domain for the token (default: neture.co.kr)
 * @returns AuthTokens object with both tokens
 */
export function generateTokens(user: User, roles: string[], domain: string = 'neture.co.kr', memberships?: { serviceKey: string; status: string; role?: string }[], reuseTokenFamily?: string | null, serviceKey?: string | null, sessionEpoch?: number | null, authMethod?: SessionAuthMethod | null, reuseSessionId?: string): AuthTokens {
  // WO-O4O-LOGOUT-ALL-TOKEN-INVALIDATION-V1:
  //   reuseTokenFamily 를 넘기면 기존 세션 family 를 그대로 승계한다 (교차 서비스 handoff 용).
  //   넘기지 않으면 새 family 를 발급한다 (신규 로그인).
  const tokenFamily = reuseTokenFamily || uuidv4();

  const sessionId = reuseSessionId ?? uuidv4();
  const accessToken = generateAccessToken(user, roles, domain, memberships, { serviceKey, sessionEpoch, authMethod, sessionId, tokenFamily });
  const refreshToken = generateRefreshToken(user, tokenFamily, serviceKey, sessionEpoch, authMethod, sessionId);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN
  };
}

/**
 * Verify access token
 *
 * @param token - JWT access token string
 * @returns Decoded payload or null if invalid
 *
 * === Phase 2.5: Server Isolation ===
 * Verifies issuer and audience to prevent cross-server token usage.
 * Tokens from a different server will be rejected (returns null).
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const { jwtSecret, jwtIssuer, jwtAudience } = getJwtConfig();

    // Phase 2.5: Verify with issuer/audience for server isolation
    const payload = jwt.verify(token, jwtSecret, {
      issuer: jwtIssuer,
      audience: jwtAudience
    }) as AccessTokenPayload;

    // Ensure userId is set (handle both userId and sub)
    return {
      userId: payload.userId || payload.sub || '',
      email: payload.email || '',
      role: payload.role,
      ...payload
    };
  } catch (error) {
    // Phase 2.5: Log specific error for debugging server isolation issues
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('issuer') || errorMessage.includes('audience')) {
      logger.warn('Access token rejected: server isolation mismatch', {
        error: errorMessage
      });
    } else {
      logger.debug('Access token verification failed', {
        error: errorMessage
      });
    }
    return null;
  }
}

/**
 * Verify refresh token
 *
 * @param token - JWT refresh token string
 * @returns Decoded payload or null if invalid
 *
 * === Phase 2.5: Server Isolation ===
 * Verifies issuer and audience to prevent cross-server token usage.
 * Tokens from a different server will be rejected (returns null).
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const { jwtRefreshSecret, jwtIssuer, jwtAudience } = getJwtConfig();

    // Phase 2.5: Verify with issuer/audience for server isolation
    const payload = jwt.verify(token, jwtRefreshSecret, {
      issuer: jwtIssuer,
      audience: jwtAudience
    }) as RefreshTokenPayload;

    return {
      userId: payload.userId || payload.sub || '',
      sub: payload.sub || payload.userId,
      tokenVersion: payload.tokenVersion,
      tokenFamily: payload.tokenFamily,
      sessionId: payload.sessionId,
      // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8:
      //   이 함수는 payload 를 **좁혀 재구성**하므로 새 claim 을 여기 명시하지 않으면 조용히
      //   사라진다. serviceKey 가 사라지면 서비스 단위 폐기 검사가 legacy 경로로 떨어져
      //   "어느 서비스 로그아웃이든 거절" 이 되고, 다른 서비스 세션이 함께 끊긴다.
      serviceKey: payload.serviceKey,
      sessionEpoch: payload.sessionEpoch,
      // WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-4: 위와 같은 이유로 명시한다.
      authMethod: payload.authMethod,
      exp: payload.exp,
      iat: payload.iat
    };
  } catch (error) {
    // Phase 2.5: Log specific error for debugging server isolation issues
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('issuer') || errorMessage.includes('audience')) {
      logger.warn('Refresh token rejected: server isolation mismatch', {
        error: errorMessage
      });
    } else {
      logger.debug('Refresh token verification failed', {
        error: errorMessage
      });
    }
    return null;
  }
}

/**
 * Extract token family from refresh token
 *
 * @param token - JWT refresh token string
 * @returns Token family ID or null
 */
export function getTokenFamily(token: string): string | null {
  const payload = verifyRefreshToken(token);
  return payload?.tokenFamily || null;
}

/**
 * refresh token 이 **어느 서비스 세션**의 것인가.
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 — 서비스 단위 로그아웃의 판정 축.
 * 이 변경 배포 전에 발급된 토큰에는 claim 이 없어 `null` 이다. `null` 의 처리는
 * `auth-token-session.service.ts` 의 assertServiceSessionNotRevoked 주석 참조.
 */
export function getRefreshTokenServiceKey(token: string): string | null {
  const payload = verifyRefreshToken(token);
  return payload?.serviceKey || null;
}

/**
 * refresh token 의 세션 **세대**. claim 이 없으면 `null`(배포 전 발급분).
 *
 * `0` 과 `null` 은 다르다 — 0 은 "아직 한 번도 로그아웃하지 않은 세대", null 은 "어느 세대인지
 * 모른다" 다. `|| null` 로 합치면 0 이 null 이 되어 첫 로그아웃 뒤 정상 토큰까지 거절된다.
 */
export function getRefreshTokenSessionEpoch(token: string): number | null {
  const payload = verifyRefreshToken(token);
  return typeof payload?.sessionEpoch === 'number' ? payload.sessionEpoch : null;
}

/**
 * Check if token is expired
 *
 * @param token - JWT token string
 * @returns true if expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (!decoded || !decoded.exp) {
      return true;
    }
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
}

/**
 * Get token expiration time
 *
 * @param token - JWT token string
 * @returns Expiration date or null
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (!decoded || !decoded.exp) {
      return null;
    }
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
}

/**
 * Get token configuration for client
 *
 * @returns Token configuration object
 */
export function getTokenConfig() {
  return {
    accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
    refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN,
    accessTokenExpiresInMs: ACCESS_TOKEN_EXPIRES_IN * 1000,
    refreshTokenExpiresInMs: REFRESH_TOKEN_EXPIRES_IN * 1000
  };
}

// ============================================================================
// Phase 1: Service User 인증 기반 (WO-AUTH-SERVICE-IDENTITY-PHASE1)
// ============================================================================

/**
 * Check if token is a service user token
 *
 * @param token - JWT access token string
 * @returns true if service token, false otherwise
 */
export function isServiceToken(token: string): boolean {
  const payload = verifyAccessToken(token);
  return payload?.tokenType === 'service';
}

/**
 * Check if token is a platform user token
 *
 * @param token - JWT access token string
 * @returns true if platform user token, false otherwise
 */
export function isPlatformUserToken(token: string): boolean {
  const payload = verifyAccessToken(token);
  // For backward compatibility, tokens without tokenType are considered user tokens
  return payload?.tokenType === 'user' || payload?.tokenType === undefined;
}

/**
 * Get token type from token
 *
 * @param token - JWT access token string
 * @returns TokenType or null if invalid
 */
export function getTokenType(token: string): TokenType | null {
  const payload = verifyAccessToken(token);
  if (!payload) return null;
  // Default to 'user' for backward compatibility
  return payload.tokenType || 'user';
}

// ============================================================================
// Phase 3: Guest 인증 (WO-AUTH-SERVICE-IDENTITY-PHASE3-QR-GUEST-DEVICE)
// ============================================================================

// Guest tokens are short-lived (2 hours) - no refresh token
const GUEST_TOKEN_EXPIRES_IN = 2 * 60 * 60; // 2 hours in seconds

/**
 * Generate access token for Guest Users (QR, Kiosk, Signage)
 *
 * === Phase 3: Guest 인증 (WO-AUTH-SERVICE-IDENTITY-PHASE3-QR-GUEST-DEVICE) ===
 *
 * Guest User tokens are:
 * - tokenType: 'guest'
 * - Short-lived (2 hours, no refresh)
 * - No platform role/permissions
 * - Contains guestSessionId, deviceId, serviceId
 * - Used for anonymous/temporary access via QR, kiosk, signage
 *
 * @param guestData - Guest user data
 * @param domain - Domain for the token (default: neture.co.kr)
 * @returns JWT access token string
 */
export function generateGuestAccessToken(
  guestData: GuestUserData,
  domain: string = 'neture.co.kr'
): string {
  const { jwtSecret, jwtIssuer, jwtAudience } = getJwtConfig();

  const payload: AccessTokenPayload = {
    userId: guestData.guestSessionId, // Use guestSessionId as userId for consistency
    sub: guestData.guestSessionId,
    role: 'guest', // Not a platform role, just for identification
    tokenType: 'guest', // Phase 3: Guest 인증
    serviceId: guestData.serviceId,
    storeId: guestData.storeId,
    deviceId: guestData.deviceId,
    guestSessionId: guestData.guestSessionId,
    iss: jwtIssuer,     // Phase 2.5: Server isolation
    aud: jwtAudience,   // Phase 2.5: Server isolation
    exp: Math.floor(Date.now() / 1000) + GUEST_TOKEN_EXPIRES_IN,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, jwtSecret);
}

/**
 * Check if token is a guest token
 *
 * @param token - JWT access token string
 * @returns true if guest token, false otherwise
 */
export function isGuestToken(token: string): boolean {
  const payload = verifyAccessToken(token);
  return payload?.tokenType === 'guest';
}

/**
 * Check if token is a guest or service token
 *
 * Used by guards that allow both guest and service users
 * (e.g., store browsing, product catalog access)
 *
 * @param token - JWT access token string
 * @returns true if guest or service token, false otherwise
 */
export function isGuestOrServiceToken(token: string): boolean {
  const payload = verifyAccessToken(token);
  return payload?.tokenType === 'guest' || payload?.tokenType === 'service';
}

/**
 * Get guest token configuration for client
 *
 * @returns Guest token configuration object
 */
export function getGuestTokenConfig() {
  return {
    guestTokenExpiresIn: GUEST_TOKEN_EXPIRES_IN,
    guestTokenExpiresInMs: GUEST_TOKEN_EXPIRES_IN * 1000
  };
}
