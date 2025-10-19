import { Response } from 'express';
import { User } from '../entities/User';
import { AccessTokenPayload, AuthTokens, LoginResponse } from '../types/auth';
interface TokenMetadata {
    userAgent?: string;
    ipAddress?: string;
}
export declare class AuthServiceV2 {
    private static readonly JWT_SECRET;
    private static readonly JWT_EXPIRES_IN;
    /**
     * User login
     */
    static login(email: string, password: string, userAgent?: string, ipAddress?: string): Promise<LoginResponse | null>;
    /**
     * Generate access and refresh tokens
     */
    static generateTokens(user: User, metadata?: TokenMetadata): Promise<AuthTokens>;
    /**
     * Refresh access token using refresh token
     */
    static refreshTokens(refreshToken: string, metadata?: TokenMetadata): Promise<AuthTokens | null>;
    /**
     * Verify access token
     */
    static verifyAccessToken(token: string): AccessTokenPayload | null;
    /**
     * Logout user
     */
    static logout(userId: string): Promise<void>;
    /**
     * Set authentication cookies
     */
    static setAuthCookies(res: Response, tokens: AuthTokens): void;
    /**
     * Clear authentication cookies
     */
    static clearAuthCookies(res: Response): void;
    /**
     * Get request metadata
     */
    static getRequestMetadata(req: any): TokenMetadata;
}
export {};
//# sourceMappingURL=AuthServiceV2.d.ts.map