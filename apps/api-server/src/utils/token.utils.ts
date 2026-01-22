import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../entities/User.js';
import { AccessTokenPayload, RefreshTokenPayload, AuthTokens } from '../types/auth.js';
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
 * Generate access token
 *
 * @param user - User entity
 * @param domain - Domain for the token (default: neture.co.kr)
 * @returns JWT access token string
 *
 * === Phase 2.5: Server Isolation ===
 * Token includes iss (issuer) and aud (audience) for cross-server protection
 */
export function generateAccessToken(user: User, domain: string = 'neture.co.kr'): string {
  const { jwtSecret, jwtIssuer, jwtAudience } = getJwtConfig();

  // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1: 역할 기반 스코프 도출
  const userScopes = deriveUserScopes({
    role: user.role,
    roles: user.getRoleNames?.() || [],
  });

  const payload: AccessTokenPayload = {
    userId: user.id,
    sub: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    scopes: userScopes, // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1
    domain,
    iss: jwtIssuer,     // Phase 2.5: Server isolation
    aud: jwtAudience,   // Phase 2.5: Server isolation
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRES_IN,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, jwtSecret);
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
export function generateTokens(user: User, domain: string = 'neture.co.kr'): AuthTokens {
  const tokenFamily = uuidv4();

  const accessToken = generateAccessToken(user, domain);
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
