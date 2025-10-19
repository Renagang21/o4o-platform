import { RefreshToken } from '../entities/RefreshToken';
import { User } from '../entities/User';
export declare class RefreshTokenService {
    private refreshTokenRepository;
    private loginAttemptRepository;
    private userRepository;
    generateRefreshToken(user: User, deviceId?: string, userAgent?: string, ipAddress?: string): Promise<string>;
    verifyRefreshToken(token: string): Promise<{
        valid: boolean;
        user?: User;
        reason?: string;
    }>;
    refreshAccessToken(refreshToken: string): Promise<{
        accessToken?: string;
        error?: string;
    }>;
    revokeToken(token: string, reason?: string): Promise<boolean>;
    revokeAllUserTokens(userId: string, reason?: string): Promise<boolean>;
    cleanExpiredTokens(): Promise<number>;
    trackLoginAttempt(email: string, successful: boolean, ipAddress: string, userAgent?: string, deviceId?: string, failureReason?: string): Promise<void>;
    checkAccountLock(email: string): Promise<{
        locked: boolean;
        lockDuration?: number;
        attempts?: number;
    }>;
    getUserActiveTokens(userId: string): Promise<RefreshToken[]>;
}
export declare const refreshTokenService: RefreshTokenService;
//# sourceMappingURL=refreshToken.service.d.ts.map