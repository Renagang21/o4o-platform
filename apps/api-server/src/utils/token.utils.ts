import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../entities/User.js';
import { AccessTokenPayload, RefreshTokenPayload, AuthTokens, TokenType } from '../types/auth.js';
import type { ServiceUserData, GuestUserData } from '../types/account-linking.js';
import logger from './logger.js';
import { deriveUserScopes } from './scope-assignment.utils.js';

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
export function generateAccessToken(user: User, roles: string[], domain: string = 'neture.co.kr'): string {
  const { jwtSecret, jwtIssuer, jwtAudience } = getJwtConfig();

  // Phase3-E PR3: roles from RoleAssignment table (explicit parameter)
  const userRoles = roles;
  const primaryRole = userRoles[0] || 'user';

  // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1: 역할 기반 스코프 도출
  const userScopes = deriveUserScopes({
    role: primaryRole,
    roles: userRoles,
  });

  const payload: AccessTokenPayload = {
    userId: user.id,
    sub: user.id,
    email: user.email,
    role: primaryRole,
    roles: userRoles, // Phase3-E: from RoleAssignment
    permissions: user.permissions || [],
    scopes: userScopes, // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1
    domain,
    tokenType: 'user',  // Phase 1: Service User 인증 기반
    iss: jwtIssuer,     // Phase 2.5: Server isolation
    aud: jwtAudience,   // Phase 2.5: Server isolation
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRES_IN,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, jwtSecret);
}

/**
 * Generate access token for Service Users
 *
 * === Phase 1: Service User 인증 기반 (WO-AUTH-SERVICE-IDENTITY-PHASE1) ===
 *
 * Service User tokens are distinct from Platform User tokens:
 * - tokenType: 'service' (not 'user')
 * - Contains serviceId and optional storeId
 * - No platform role/permissions
 * - Cannot access Admin/Operator APIs
 *
 * @param serviceUser - Service user data from OAuth
 * @param domain - Domain for the token (default: neture.co.kr)
 * @returns JWT access token string
 */
export function generateServiceAccessToken(
  serviceUser: ServiceUserData,
  domain: string = 'neture.co.kr'
): string {
  const { jwtSecret, jwtIssuer, jwtAudience } = getJwtConfig();

  const payload: AccessTokenPayload = {
    userId: serviceUser.providerUserId,
    sub: serviceUser.providerUserId,
    email: serviceUser.email,
    name: serviceUser.displayName,
    role: 'service_user', // Not a platform role, just for identification
    permissions: [],       // Service users have no platform permissions
    scopes: [],            // Service users have no platform scopes
    domain,
    tokenType: 'service',  // Phase 1: Service User 인증 기반
    serviceId: serviceUser.serviceId,
    storeId: serviceUser.storeId,
    iss: jwtIssuer,        // Phase 2.5: Server isolation
    aud: jwtAudience,      // Phase 2.5: Server isolation
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRES_IN,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, jwtSecret);
}

/**
 * Generate refresh token for Service Users
 *
 * === Phase 1: Service User 인증 기반 (WO-AUTH-SERVICE-IDENTITY-PHASE1) ===
 *
 * @param serviceUser - Service user data from OAuth
 * @param tokenFamily - Token family ID for refresh token rotation
 * @returns JWT refresh token string
 */
export function generateServiceRefreshToken(
  serviceUser: ServiceUserData,
  tokenFamily?: string
): string {
  const { jwtRefreshSecret, jwtIssuer, jwtAudience } = getJwtConfig();

  const payload: RefreshTokenPayload = {
    userId: serviceUser.providerUserId,
    sub: serviceUser.providerUserId,
    tokenVersion: 1,
    tokenFamily: tokenFamily || uuidv4(),
    iss: jwtIssuer,     // Phase 2.5: Server isolation
    aud: jwtAudience,   // Phase 2.5: Server isolation
    exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRES_IN,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, jwtRefreshSecret);
}

/**
 * Generate both access and refresh tokens for Service Users
 *
 * === Phase 1: Service User 인증 기반 (WO-AUTH-SERVICE-IDENTITY-PHASE1) ===
 *
 * @param serviceUser - Service user data from OAuth
 * @param domain - Domain for the token (default: neture.co.kr)
 * @returns AuthTokens object with both tokens
 */
export function generateServiceTokens(
  serviceUser: ServiceUserData,
  domain: string = 'neture.co.kr'
): AuthTokens {
  const tokenFamily = uuidv4();

  const accessToken = generateServiceAccessToken(serviceUser, domain);
  const refreshToken = generateServiceRefreshToken(serviceUser, tokenFamily);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN
  };
}

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
export function generateRefreshToken(user: User, tokenFamily?: string): string {
  const { jwtRefreshSecret, jwtIssuer, jwtAudience } = getJwtConfig();

  const payload: RefreshTokenPayload = {
    userId: user.id,
    sub: user.id,
    tokenVersion: 1,
    tokenFamily: tokenFamily || uuidv4(),
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
export function generateTokens(user: User, roles: string[], domain: string = 'neture.co.kr'): AuthTokens {
  const tokenFamily = uuidv4();

  const accessToken = generateAccessToken(user, roles, domain);
  const refreshToken = generateRefreshToken(user, tokenFamily);

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
    permissions: [],    // Guest users have no platform permissions
    scopes: [],         // Guest users have no platform scopes
    domain,
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
