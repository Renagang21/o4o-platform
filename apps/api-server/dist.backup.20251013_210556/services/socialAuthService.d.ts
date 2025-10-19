import { User } from '../entities/User';
import { Response } from 'express';
interface SocialProfile {
    provider: 'google' | 'kakao' | 'naver';
    providerId: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
}
export declare class SocialAuthService {
    /**
     * Handle social login/registration
     */
    static handleSocialAuth(profile: SocialProfile): Promise<User>;
    /**
     * Complete social login and set cookies
     */
    static completeSocialLogin(user: User, res: Response): Promise<{
        user: User;
        sessionId: string;
    }>;
    /**
     * Link social account to existing user
     */
    static linkSocialAccount(userId: string, provider: string, providerId: string): Promise<User>;
    /**
     * Unlink social account
     */
    static unlinkSocialAccount(userId: string): Promise<User>;
    /**
     * Get linked accounts for a user
     */
    static getLinkedAccounts(userId: string): Promise<{
        local: boolean;
        google: boolean;
        kakao: boolean;
        naver: boolean;
    }>;
}
export {};
//# sourceMappingURL=socialAuthService.d.ts.map