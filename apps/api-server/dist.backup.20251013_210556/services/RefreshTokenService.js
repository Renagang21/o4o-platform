"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokenService = exports.RefreshTokenService = void 0;
// This service is deprecated - use refreshToken.service.ts instead
class RefreshTokenService {
    // All methods moved to refreshToken.service.ts
    static generateTokenFamily(...args) { return ''; }
    static generateRefreshToken(...args) { return ''; }
    static rotateRefreshToken(...args) { return { accessToken: '', refreshToken: '', token: { accessToken: '', refreshToken: '' } }; }
    static verifyRefreshToken(...args) { return { valid: false, token: { accessToken: '', refreshToken: '' }, userId: '' }; }
    static revokeAllUserTokens(...args) { return true; }
}
exports.RefreshTokenService = RefreshTokenService;
exports.refreshTokenService = new RefreshTokenService();
//# sourceMappingURL=RefreshTokenService.js.map