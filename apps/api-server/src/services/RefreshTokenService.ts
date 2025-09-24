// This service is deprecated - use refreshToken.service.ts instead
export class RefreshTokenService {
  // All methods moved to refreshToken.service.ts
  static generateTokenFamily(...args: any[]) { return ''; }
  static generateRefreshToken(...args: any[]) { return ''; }
  static rotateRefreshToken(...args: any[]) { return { accessToken: '', refreshToken: '', token: { accessToken: '', refreshToken: '' } }; }
  static verifyRefreshToken(...args: any[]) { return { valid: false, token: { accessToken: '', refreshToken: '' }, userId: '' }; }
  static revokeAllUserTokens(...args: any[]) { return true; }
}

export const refreshTokenService = new RefreshTokenService();