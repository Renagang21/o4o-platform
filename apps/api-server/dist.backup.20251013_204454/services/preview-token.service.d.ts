/**
 * Preview Token Service
 * JWT-based preview token with jti for one-time consumption
 * Sprint 2 - P1: Preview Protection
 */
interface PreviewTokenPayload {
    userId: string;
    pageId: string;
    jti: string;
    iat: number;
    exp: number;
}
interface TokenValidationResult {
    valid: boolean;
    payload?: PreviewTokenPayload;
    error?: string;
}
declare class PreviewTokenService {
    private static instance;
    private readonly TOKEN_TTL;
    private readonly REDIS_PREFIX;
    private readonly JWT_SECRET;
    private constructor();
    static getInstance(): PreviewTokenService;
    /**
     * Generate preview token with jti
     * Token is valid for 10 minutes and can be consumed only once
     */
    generateToken(userId: string, pageId: string): Promise<string>;
    /**
     * Verify and consume preview token (one-time use)
     * Returns payload if valid, null if invalid/expired/already consumed
     */
    verifyAndConsumeToken(token: string): Promise<TokenValidationResult>;
    /**
     * Revoke a token before expiration (manual invalidation)
     */
    revokeToken(token: string): Promise<boolean>;
    /**
     * Check token validity without consuming it
     * Used for debugging/admin purposes only
     */
    checkTokenStatus(token: string): Promise<{
        valid: boolean;
        payload?: PreviewTokenPayload;
        consumed: boolean;
        expired: boolean;
    }>;
    /**
     * Get token TTL (for info purposes)
     */
    getTokenTTL(): number;
}
export declare const previewTokenService: PreviewTokenService;
export {};
//# sourceMappingURL=preview-token.service.d.ts.map