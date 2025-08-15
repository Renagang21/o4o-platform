import { RefreshToken } from '../entities/RefreshToken';
import { User } from '../entities/User';
interface RefreshTokenPayload {
    userId: string;
    sub?: string;
    tokenFamily: string;
    tokenVersion: number;
    exp: number;
    iat: number;
}
interface TokenMetadata {
    userAgent?: string;
    ipAddress?: string;
}
export declare class RefreshTokenService {
    private static refreshTokenRepository;
    private static userRepository;
    private static readonly REFRESH_TOKEN_SECRET;
    private static readonly REFRESH_TOKEN_EXPIRY;
    private static readonly MAX_TOKENS_PER_USER;
    /**
     * Generate a new refresh token and save to database
     */
    static generateRefreshToken(user: User, tokenFamily: string, metadata?: TokenMetadata): Promise<string>;
    /**
     * Verify and rotate refresh token (token rotation for security)
     */
    static rotateRefreshToken(oldToken: string, metadata?: TokenMetadata): Promise<{
        token: string;
        family: string;
    } | null>;
    /**
     * Verify refresh token without rotation
     */
    static verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null>;
    /**
     * Revoke a specific refresh token
     */
    static revokeToken(token: string): Promise<void>;
    /**
     * Revoke all tokens in a family (used for security breach scenarios)
     */
    static revokeTokenFamily(family: string): Promise<void>;
    /**
     * Revoke all refresh tokens for a user
     */
    static revokeAllUserTokens(userId: string): Promise<void>;
    /**
     * Get active refresh tokens for a user
     */
    static getUserTokens(userId: string): Promise<RefreshToken[]>;
    /**
     * Clean up expired and excess tokens
     */
    static cleanupOldTokens(userId: string): Promise<void>;
    /**
     * Clean up all expired tokens (for scheduled job)
     */
    static cleanupExpiredTokens(): Promise<number>;
    /**
     * Generate a new token family ID
     */
    static generateTokenFamily(): string;
}
export {};
//# sourceMappingURL=RefreshTokenService.d.ts.map