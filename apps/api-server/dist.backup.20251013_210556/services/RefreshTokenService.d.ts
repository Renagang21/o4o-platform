export declare class RefreshTokenService {
    static generateTokenFamily(...args: any[]): string;
    static generateRefreshToken(...args: any[]): string;
    static rotateRefreshToken(...args: any[]): {
        accessToken: string;
        refreshToken: string;
        token: {
            accessToken: string;
            refreshToken: string;
        };
    };
    static verifyRefreshToken(...args: any[]): {
        valid: boolean;
        token: {
            accessToken: string;
            refreshToken: string;
        };
        userId: string;
    };
    static revokeAllUserTokens(...args: any[]): boolean;
}
export declare const refreshTokenService: RefreshTokenService;
//# sourceMappingURL=RefreshTokenService.d.ts.map