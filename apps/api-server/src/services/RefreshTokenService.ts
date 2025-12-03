/**
 * DEFERRED — Remove after AuthServiceV2 migration (Phase B-6 or Phase C)
 *
 * This stub service is kept temporarily for backward compatibility with AuthServiceV2.
 * AuthServiceV2 is deprecated and will be removed in Phase B-6/C.
 * At that time, this stub will be deleted automatically.
 *
 * New code should use: modules/auth/services/refresh-token.service.ts
 */
export class RefreshTokenService {
  // All methods moved to refreshToken.service.ts
  static generateTokenFamily(...args: any[]) { return ''; }
  static generateRefreshToken(...args: any[]) { return ''; }
  static rotateRefreshToken(...args: any[]) { return { accessToken: '', refreshToken: '', token: { accessToken: '', refreshToken: '' } }; }
  static verifyRefreshToken(...args: any[]) { return { valid: false, token: { accessToken: '', refreshToken: '' }, userId: '' }; }
  static revokeAllUserTokens(...args: any[]) { return true; }
}

export const refreshTokenService = new RefreshTokenService();