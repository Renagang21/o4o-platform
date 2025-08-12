"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialAuthService = void 0;
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const AuthService_1 = require("./AuthService");
const sessionSyncService_1 = require("./sessionSyncService");
const emailService_1 = require("./emailService");
class SocialAuthService {
    /**
     * Handle social login/registration
     */
    static async handleSocialAuth(profile) {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        // Check if user exists by email or provider ID
        let user = await userRepo.findOne({
            where: [
                { email: profile.email },
                { provider: profile.provider, provider_id: profile.providerId }
            ]
        });
        if (user) {
            // Existing user - check if we need to link accounts
            if (user.provider === 'local' && !user.provider_id) {
                // This is a local account with same email - link it
                user.provider = profile.provider;
                user.provider_id = profile.providerId;
                user.isEmailVerified = true; // Social emails are pre-verified
            }
            // Update user info
            user.lastLoginAt = new Date();
            if (profile.avatar && !user.avatar) {
                user.avatar = profile.avatar;
            }
            await userRepo.save(user);
            return user;
        }
        // Create new user
        user = userRepo.create({
            email: profile.email,
            name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatar: profile.avatar,
            provider: profile.provider,
            provider_id: profile.providerId,
            role: User_1.UserRole.CUSTOMER,
            status: User_1.UserStatus.ACTIVE, // Auto-approve social logins
            isEmailVerified: true,
            password: '', // No password for social logins
            lastLoginAt: new Date()
        });
        await userRepo.save(user);
        // Send welcome email
        try {
            await emailService_1.emailService.sendWelcomeEmail(user.email, user.name || user.email);
        }
        catch (error) {
            console.error('Failed to send welcome email:', error);
        }
        return user;
    }
    /**
     * Complete social login and set cookies
     */
    static async completeSocialLogin(user, res) {
        // Generate tokens
        const tokens = await AuthService_1.authService.generateTokens(user, 'neture.co.kr');
        // Create SSO session
        const sessionId = sessionSyncService_1.SessionSyncService.generateSessionId();
        await sessionSyncService_1.SessionSyncService.createSession(user, sessionId);
        // Set cookies
        AuthService_1.authService.setAuthCookies(res, tokens);
        // Set session ID cookie for SSO
        res.cookie('sessionId', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            domain: process.env.COOKIE_DOMAIN || undefined
        });
        return { user, sessionId };
    }
    /**
     * Link social account to existing user
     */
    static async linkSocialAccount(userId, provider, providerId) {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        // Check if this social account is already linked
        const existingLink = await userRepo.findOne({
            where: { provider, provider_id: providerId }
        });
        if (existingLink) {
            if (existingLink.id === userId) {
                throw new Error('This social account is already linked to your account');
            }
            else {
                throw new Error('This social account is linked to another user');
            }
        }
        // Get user
        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }
        // Check if user already has a different social account
        if (user.provider && user.provider !== 'local') {
            throw new Error(`Account is already linked to ${user.provider}`);
        }
        // Link the account
        user.provider = provider;
        user.provider_id = providerId;
        await userRepo.save(user);
        return user;
    }
    /**
     * Unlink social account
     */
    static async unlinkSocialAccount(userId) {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }
        if (!user.provider || user.provider === 'local') {
            throw new Error('No social account linked');
        }
        // Check if user has a password
        if (!user.password) {
            throw new Error('Please set a password before unlinking social account');
        }
        // Unlink
        user.provider = 'local';
        user.provider_id = null;
        await userRepo.save(user);
        return user;
    }
    /**
     * Get linked accounts for a user
     */
    static async getLinkedAccounts(userId) {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }
        return {
            local: !!user.password,
            google: user.provider === 'google',
            kakao: user.provider === 'kakao',
            naver: user.provider === 'naver'
        };
    }
}
exports.SocialAuthService = SocialAuthService;
//# sourceMappingURL=socialAuthService.js.map