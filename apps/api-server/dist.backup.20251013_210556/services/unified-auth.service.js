"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedAuthService = void 0;
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const LinkedAccount_1 = require("../entities/LinkedAccount");
const AccountActivity_1 = require("../entities/AccountActivity");
const AuthService_1 = require("./AuthService");
const account_linking_service_1 = require("./account-linking.service");
const auth_1 = require("../types/auth");
const auth_utils_1 = require("../utils/auth.utils");
const logger_1 = __importDefault(require("../utils/logger"));
class UnifiedAuthService {
    constructor() {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        this.authService = new AuthService_1.AuthService(userRepo);
    }
    /**
     * Unified login method that handles both email and OAuth
     */
    async login(request) {
        const { provider, credentials, oauthProfile, ipAddress, userAgent } = request;
        try {
            if (provider === 'email') {
                return await this.handleEmailLogin(credentials, ipAddress, userAgent);
            }
            else {
                return await this.handleOAuthLogin(provider, oauthProfile, ipAddress, userAgent);
            }
        }
        catch (error) {
            logger_1.default.error('Unified login error:', error);
            throw error;
        }
    }
    /**
     * Handle email/password login
     */
    async handleEmailLogin(credentials, ipAddress, userAgent) {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        const linkedAccountRepo = connection_1.AppDataSource.getRepository(LinkedAccount_1.LinkedAccount);
        const activityRepo = connection_1.AppDataSource.getRepository(AccountActivity_1.AccountActivity);
        // Find user by email
        let user = await userRepo.findOne({
            where: { email: credentials.email },
            relations: ['linkedAccounts']
        });
        if (!user) {
            // Check if email exists in linked accounts
            const linkedAccount = await linkedAccountRepo.findOne({
                where: { email: credentials.email, provider: 'email' },
                relations: ['user', 'user.linkedAccounts']
            });
            if (linkedAccount) {
                user = linkedAccount.user;
            }
        }
        if (!user) {
            throw new Error('Invalid credentials');
        }
        // Verify password
        const isValidPassword = await (0, auth_utils_1.comparePassword)(credentials.password, user.password);
        if (!isValidPassword) {
            // Log failed attempt
            await activityRepo.save(activityRepo.create({
                userId: user.id,
                action: 'failed_link',
                provider: 'email',
                ipAddress,
                userAgent,
                metadata: { reason: 'invalid_password' }
            }));
            throw new Error('Invalid credentials');
        }
        // Check account status
        if (user.status !== auth_1.UserStatus.ACTIVE && user.status !== auth_1.UserStatus.APPROVED) {
            throw new Error('Account is not active');
        }
        // Generate tokens
        const loginResult = await this.authService.login(credentials.email, credentials.password, userAgent, ipAddress);
        // Log successful login
        await activityRepo.save(activityRepo.create({
            userId: user.id,
            action: 'login',
            provider: 'email',
            ipAddress,
            userAgent
        }));
        // Update last used for email linked account
        const emailAccount = user.linkedAccounts.find(acc => acc.provider === 'email');
        if (emailAccount) {
            emailAccount.lastUsedAt = new Date();
            await linkedAccountRepo.save(emailAccount);
        }
        // Get merged profile
        const mergedProfile = await account_linking_service_1.AccountLinkingService.getMergedProfile(user.id);
        return {
            success: true,
            user: loginResult.user,
            tokens: {
                accessToken: loginResult.tokens.accessToken,
                refreshToken: loginResult.tokens.refreshToken,
                expiresIn: loginResult.tokens.expiresIn || 900 // Default to 15 minutes
            },
            sessionId: loginResult.sessionId,
            linkedAccounts: (mergedProfile === null || mergedProfile === void 0 ? void 0 : mergedProfile.linkedAccounts) || [],
            isNewUser: false
        };
    }
    /**
     * Handle OAuth login
     */
    async handleOAuthLogin(provider, profile, ipAddress, userAgent) {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        const linkedAccountRepo = connection_1.AppDataSource.getRepository(LinkedAccount_1.LinkedAccount);
        const activityRepo = connection_1.AppDataSource.getRepository(AccountActivity_1.AccountActivity);
        // Find existing linked account
        const existingLinkedAccount = await linkedAccountRepo.findOne({
            where: {
                provider,
                providerId: profile.id
            },
            relations: ['user', 'user.linkedAccounts']
        });
        if (existingLinkedAccount) {
            // Existing user login
            const user = existingLinkedAccount.user;
            // Check account status
            if (user.status !== auth_1.UserStatus.ACTIVE && user.status !== auth_1.UserStatus.APPROVED) {
                throw new Error('Account is not active');
            }
            // Update profile info if changed
            if (profile.displayName !== existingLinkedAccount.displayName ||
                profile.avatar !== existingLinkedAccount.profileImage) {
                existingLinkedAccount.displayName = profile.displayName;
                existingLinkedAccount.profileImage = profile.avatar;
                existingLinkedAccount.lastUsedAt = new Date();
                await linkedAccountRepo.save(existingLinkedAccount);
            }
            // Generate tokens
            const tokens = await this.authService.generateTokens(user, 'neture.co.kr');
            // Log successful login
            await activityRepo.save(activityRepo.create({
                userId: user.id,
                action: 'login',
                provider,
                ipAddress,
                userAgent,
                metadata: { providerId: profile.id }
            }));
            // Get merged profile
            const mergedProfile = await account_linking_service_1.AccountLinkingService.getMergedProfile(user.id);
            return {
                success: true,
                user: user.toPublicData(),
                tokens: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresIn: tokens.expiresIn || 900
                },
                sessionId: `oauth-${Date.now()}`,
                linkedAccounts: (mergedProfile === null || mergedProfile === void 0 ? void 0 : mergedProfile.linkedAccounts) || [],
                isNewUser: false
            };
        }
        // Check if email is already used by another account
        const existingUserByEmail = await userRepo.findOne({
            where: { email: profile.email },
            relations: ['linkedAccounts']
        });
        if (existingUserByEmail) {
            // Auto-link if same email
            const linkResult = await account_linking_service_1.AccountLinkingService.linkOAuthAccount(existingUserByEmail.id, provider, {
                providerId: profile.id,
                email: profile.email,
                displayName: profile.displayName,
                profileImage: profile.avatar
            });
            if (!linkResult.success) {
                throw new Error(linkResult.message);
            }
            // Generate tokens
            const tokens = await this.authService.generateTokens(existingUserByEmail, 'neture.co.kr');
            // Log successful login
            await activityRepo.save(activityRepo.create({
                userId: existingUserByEmail.id,
                action: 'login',
                provider,
                ipAddress,
                userAgent,
                metadata: { providerId: profile.id, autoLinked: true }
            }));
            // Get merged profile
            const mergedProfile = await account_linking_service_1.AccountLinkingService.getMergedProfile(existingUserByEmail.id);
            return {
                success: true,
                user: existingUserByEmail.toPublicData(),
                tokens: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresIn: tokens.expiresIn || 900
                },
                sessionId: `oauth-${Date.now()}`,
                linkedAccounts: (mergedProfile === null || mergedProfile === void 0 ? void 0 : mergedProfile.linkedAccounts) || [],
                isNewUser: false,
                autoLinked: true
            };
        }
        // Create new user
        const newUser = userRepo.create({
            email: profile.email,
            name: profile.displayName,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatar: profile.avatar,
            password: await (0, auth_utils_1.hashPassword)((0, auth_utils_1.generateRandomToken)()), // Random password for OAuth users
            role: auth_1.UserRole.CUSTOMER,
            roles: [auth_1.UserRole.CUSTOMER],
            status: auth_1.UserStatus.ACTIVE,
            isEmailVerified: profile.emailVerified || false,
            provider: provider,
            provider_id: profile.id,
            permissions: []
        });
        await userRepo.save(newUser);
        // Create linked account
        const linkedAccount = linkedAccountRepo.create({
            userId: newUser.id,
            user: newUser,
            provider,
            providerId: profile.id,
            email: profile.email,
            displayName: profile.displayName,
            profileImage: profile.avatar,
            isVerified: profile.emailVerified || false,
            isPrimary: true,
            lastUsedAt: new Date()
        });
        await linkedAccountRepo.save(linkedAccount);
        // Generate tokens
        const tokens = await this.authService.generateTokens(newUser, 'neture.co.kr');
        // Log new user creation and login
        await activityRepo.save(activityRepo.create({
            userId: newUser.id,
            action: 'linked',
            provider,
            ipAddress,
            userAgent,
            metadata: { providerId: profile.id, newUser: true }
        }));
        return {
            success: true,
            user: newUser.toPublicData(),
            tokens: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: tokens.expiresIn || 900
            },
            sessionId: `oauth-${Date.now()}`,
            linkedAccounts: [linkedAccount],
            isNewUser: true
        };
    }
    /**
     * Check if user can login with provider
     */
    async canLogin(email, provider) {
        const linkedAccountRepo = connection_1.AppDataSource.getRepository(LinkedAccount_1.LinkedAccount);
        const account = await linkedAccountRepo.findOne({
            where: { email, provider }
        });
        return !!account;
    }
    /**
     * Get available login methods for email
     */
    async getAvailableProviders(email) {
        const linkedAccountRepo = connection_1.AppDataSource.getRepository(LinkedAccount_1.LinkedAccount);
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        // Check linked accounts
        const linkedAccounts = await linkedAccountRepo.find({
            where: { email }
        });
        const providers = linkedAccounts.map(acc => acc.provider);
        // Check if user has password (can use email login)
        const user = await userRepo.findOne({
            where: { email }
        });
        if (user && user.password) {
            if (!providers.includes('email')) {
                providers.push('email');
            }
        }
        return providers;
    }
}
exports.UnifiedAuthService = UnifiedAuthService;
//# sourceMappingURL=unified-auth.service.js.map