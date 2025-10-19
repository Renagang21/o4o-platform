import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import { User } from '../entities/User';
import { BusinessInfo } from '../types/user';
import { AccessTokenPayload, AuthTokens, LoginResponse, UserRole, CookieConfig } from '../types/auth';
declare class AuthService {
    private userRepository;
    private jwtSecret;
    private jwtRefreshSecret;
    private cookieConfig;
    constructor(userRepository: Repository<User>);
    login(email: string, password: string, userAgent: string, ipAddress: string): Promise<LoginResponse & {
        sessionId: string;
    }>;
    generateTokens(user: User, domain: string): Promise<AuthTokens>;
    verifyAccessToken(token: string): AccessTokenPayload | null;
    refreshTokens(refreshToken: string, domain: string): Promise<AuthTokens>;
    logout(userId: string): Promise<void>;
    hashPassword(password: string): Promise<string>;
    createUser(userData: {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
        role?: UserRole;
        permissions?: string[];
    }): Promise<User>;
    private getDefaultPermissions;
    private handleFailedLogin;
    private handleSuccessfulLogin;
    getCookieConfig(): CookieConfig;
    getUserById(id: string): Promise<User | null>;
    updateUserRole(userId: string, role: UserRole): Promise<User>;
    updateUserBusinessInfo(userId: string, businessInfo: BusinessInfo): Promise<User>;
    getUsersByRole(role: UserRole): Promise<User[]>;
    suspendUser(userId: string): Promise<User>;
    getRequestMetadata(req: Request): {
        userAgent: string;
        ipAddress: string;
    };
    rotateRefreshToken(refreshToken: string, userAgent: string, ipAddress: string): Promise<AuthTokens | null>;
    setAuthCookies(res: Response, tokens: AuthTokens): void;
    clearAuthCookies(res: Response): void;
    revokeAllUserTokens(userId: string): Promise<void>;
}
export { AuthService };
export declare const getAuthService: () => Promise<AuthService>;
export declare const authService: AuthService;
//# sourceMappingURL=AuthService.d.ts.map