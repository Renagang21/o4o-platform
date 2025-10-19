"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountLinkingService = void 0;
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const LinkedAccount_1 = require("../entities/LinkedAccount");
const LinkingSession_1 = require("../entities/LinkingSession");
const AccountActivity_1 = require("../entities/AccountActivity");
const account_linking_1 = require("../types/account-linking");
const email_service_1 = require("./email.service");
const auth_utils_1 = require("../utils/auth.utils");
const logger_1 = __importDefault(require("../utils/logger"));
class AccountLinkingService {
    /**
     * Link an OAuth account to existing user
     */
    static async linkOAuthAccount(userId, provider, providerData) {
        const linkedAccountRepo = connection_1.AppDataSource.getRepository(LinkedAccount_1.LinkedAccount);
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        const activityRepo = connection_1.AppDataSource.getRepository(AccountActivity_1.AccountActivity);
        try {
            // Check if user exists
            const user = await userRepo.findOne({
                where: { id: userId },
                relations: ['linkedAccounts']
            });
            if (!user) {
                return {
                    success: false,
                    message: '사용자를 찾을 수 없습니다',
                    error: {
                        code: account_linking_1.AccountLinkingError.ACCOUNT_NOT_FOUND,
                        message: '사용자를 찾을 수 없습니다'
                    }
                };
            }
            // Check if provider is already linked
            const existingLink = user.linkedAccounts.find(account => account.provider === provider && account.providerId === providerData.providerId);
            if (existingLink) {
                return {
                    success: false,
                    message: '이미 연결된 계정입니다',
                    error: {
                        code: account_linking_1.AccountLinkingError.ALREADY_LINKED,
                        message: '이미 연결된 계정입니다'
                    }
                };
            }
            // Check if this OAuth account is linked to another user
            const otherUserLink = await linkedAccountRepo.findOne({
                where: {
                    provider,
                    providerId: providerData.providerId
                }
            });
            if (otherUserLink && otherUserLink.userId !== userId) {
                return {
                    success: false,
                    message: '이 계정은 다른 사용자에게 이미 연결되어 있습니다',
                    error: {
                        code: account_linking_1.AccountLinkingError.MERGE_CONFLICT,
                        message: '이 계정은 다른 사용자에게 이미 연결되어 있습니다'
                    }
                };
            }
            // Create new linked account
            const linkedAccount = linkedAccountRepo.create({
                userId,
                user,
                provider,
                providerId: providerData.providerId,
                email: providerData.email,
                displayName: providerData.displayName,
                profileImage: providerData.profileImage,
                isVerified: true,
                isPrimary: user.linkedAccounts.length === 0
            });
            await linkedAccountRepo.save(linkedAccount);
            // Log activity
            await activityRepo.save(activityRepo.create({
                userId,
                action: 'linked',
                provider,
                ipAddress: '',
                userAgent: '',
                metadata: { providerId: providerData.providerId }
            }));
            return {
                success: true,
                message: `${provider} 계정이 성공적으로 연결되었습니다`,
                linkedAccount
            };
        }
        catch (error) {
            logger_1.default.error('Account linking error:', error);
            return {
                success: false,
                message: '계정 연결 중 오류가 발생했습니다',
                error: {
                    code: account_linking_1.AccountLinkingError.PROVIDER_ERROR,
                    message: '계정 연결 중 오류가 발생했습니다'
                }
            };
        }
    }
    /**
     * Link email account to existing OAuth user
     */
    static async linkEmailAccount(userId, email, password) {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        const linkedAccountRepo = connection_1.AppDataSource.getRepository(LinkedAccount_1.LinkedAccount);
        const sessionRepo = connection_1.AppDataSource.getRepository(LinkingSession_1.LinkingSession);
        try {
            const user = await userRepo.findOne({
                where: { id: userId },
                relations: ['linkedAccounts']
            });
            if (!user) {
                return {
                    success: false,
                    message: '사용자를 찾을 수 없습니다',
                    error: {
                        code: account_linking_1.AccountLinkingError.ACCOUNT_NOT_FOUND,
                        message: '사용자를 찾을 수 없습니다'
                    }
                };
            }
            // Check if email is already linked
            const existingEmailLink = user.linkedAccounts.find(account => account.provider === 'email' && account.email === email);
            if (existingEmailLink) {
                return {
                    success: false,
                    message: '이미 연결된 이메일입니다',
                    error: {
                        code: account_linking_1.AccountLinkingError.ALREADY_LINKED,
                        message: '이미 연결된 이메일입니다'
                    }
                };
            }
            // Set password for user if not already set
            if (!user.password) {
                user.password = await (0, auth_utils_1.hashPassword)(password);
                await userRepo.save(user);
            }
            // Create verification session
            const verificationToken = (0, auth_utils_1.generateRandomToken)();
            const session = sessionRepo.create({
                userId,
                user,
                provider: 'email',
                status: account_linking_1.LinkingStatus.PENDING,
                verificationToken,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                metadata: { email }
            });
            await sessionRepo.save(session);
            // Send verification email
            await email_service_1.emailService.sendEmail({
                to: email,
                subject: '이메일 계정 연결 확인',
                template: 'verification',
                data: {
                    name: user.name || email,
                    actionUrl: `${process.env.FRONTEND_URL}/auth/link-email?token=${verificationToken}`,
                    supportEmail: process.env.SUPPORT_EMAIL || 'support@o4o.com',
                    companyName: process.env.COMPANY_NAME || 'O4O Platform',
                    year: new Date().getFullYear()
                }
            });
            return {
                success: true,
                message: '인증 이메일이 발송되었습니다. 이메일을 확인해주세요.',
                requiresVerification: true
            };
        }
        catch (error) {
            logger_1.default.error('Email account linking error:', error);
            return {
                success: false,
                message: '이메일 계정 연결 중 오류가 발생했습니다',
                error: {
                    code: account_linking_1.AccountLinkingError.PROVIDER_ERROR,
                    message: '이메일 계정 연결 중 오류가 발생했습니다'
                }
            };
        }
    }
    /**
     * Verify email linking
     */
    static async verifyEmailLinking(token) {
        var _a;
        const sessionRepo = connection_1.AppDataSource.getRepository(LinkingSession_1.LinkingSession);
        const linkedAccountRepo = connection_1.AppDataSource.getRepository(LinkedAccount_1.LinkedAccount);
        const activityRepo = connection_1.AppDataSource.getRepository(AccountActivity_1.AccountActivity);
        try {
            const session = await sessionRepo.findOne({
                where: { verificationToken: token },
                relations: ['user']
            });
            if (!session) {
                return {
                    success: false,
                    message: '유효하지 않은 인증 토큰입니다',
                    error: {
                        code: account_linking_1.AccountLinkingError.SESSION_EXPIRED,
                        message: '유효하지 않은 인증 토큰입니다'
                    }
                };
            }
            if (session.expiresAt < new Date()) {
                return {
                    success: false,
                    message: '인증 토큰이 만료되었습니다',
                    error: {
                        code: account_linking_1.AccountLinkingError.SESSION_EXPIRED,
                        message: '인증 토큰이 만료되었습니다'
                    }
                };
            }
            if (session.status !== account_linking_1.LinkingStatus.PENDING) {
                return {
                    success: false,
                    message: '이미 처리된 요청입니다',
                    error: {
                        code: account_linking_1.AccountLinkingError.SESSION_EXPIRED,
                        message: '이미 처리된 요청입니다'
                    }
                };
            }
            // Create linked account
            const email = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.email;
            if (!email) {
                throw new Error('Email not found in session metadata');
            }
            const linkedAccount = linkedAccountRepo.create({
                userId: session.userId,
                user: session.user,
                provider: 'email',
                email,
                displayName: session.user.name,
                isVerified: true,
                isPrimary: false
            });
            await linkedAccountRepo.save(linkedAccount);
            // Update session status
            session.status = account_linking_1.LinkingStatus.VERIFIED;
            await sessionRepo.save(session);
            // Log activity
            await activityRepo.save(activityRepo.create({
                userId: session.userId,
                action: 'linked',
                provider: 'email',
                ipAddress: '',
                userAgent: '',
                metadata: { email }
            }));
            return {
                success: true,
                message: '이메일 계정이 성공적으로 연결되었습니다',
                linkedAccount
            };
        }
        catch (error) {
            logger_1.default.error('Email verification error:', error);
            return {
                success: false,
                message: '이메일 인증 중 오류가 발생했습니다',
                error: {
                    code: account_linking_1.AccountLinkingError.VERIFICATION_REQUIRED,
                    message: '이메일 인증 중 오류가 발생했습니다'
                }
            };
        }
    }
    /**
     * Unlink account
     */
    static async unlinkAccount(userId, request, verification) {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        const linkedAccountRepo = connection_1.AppDataSource.getRepository(LinkedAccount_1.LinkedAccount);
        const activityRepo = connection_1.AppDataSource.getRepository(AccountActivity_1.AccountActivity);
        try {
            const user = await userRepo.findOne({
                where: { id: userId },
                relations: ['linkedAccounts']
            });
            if (!user) {
                return {
                    success: false,
                    message: '사용자를 찾을 수 없습니다',
                    error: {
                        code: account_linking_1.AccountLinkingError.ACCOUNT_NOT_FOUND,
                        message: '사용자를 찾을 수 없습니다'
                    }
                };
            }
            // Verify security
            if (verification.method === 'password' && verification.password) {
                const isValid = await (0, auth_utils_1.comparePassword)(verification.password, user.password);
                if (!isValid) {
                    return {
                        success: false,
                        message: '비밀번호가 올바르지 않습니다',
                        error: {
                            code: account_linking_1.AccountLinkingError.SECURITY_VERIFICATION_FAILED,
                            message: '비밀번호가 올바르지 않습니다'
                        }
                    };
                }
            }
            // Find linked account
            const linkedAccount = user.linkedAccounts.find(account => account.provider === request.provider);
            if (!linkedAccount) {
                return {
                    success: false,
                    message: '연결된 계정을 찾을 수 없습니다',
                    error: {
                        code: account_linking_1.AccountLinkingError.ACCOUNT_NOT_FOUND,
                        message: '연결된 계정을 찾을 수 없습니다'
                    }
                };
            }
            // Check if it's the last authentication method
            if (user.linkedAccounts.length === 1) {
                return {
                    success: false,
                    message: '마지막 로그인 방법은 삭제할 수 없습니다',
                    error: {
                        code: account_linking_1.AccountLinkingError.LAST_PROVIDER,
                        message: '마지막 로그인 방법은 삭제할 수 없습니다'
                    }
                };
            }
            // Remove linked account
            await linkedAccountRepo.remove(linkedAccount);
            // Log activity
            await activityRepo.save(activityRepo.create({
                userId,
                action: 'unlinked',
                provider: request.provider,
                ipAddress: '',
                userAgent: '',
                metadata: { providerId: linkedAccount.providerId }
            }));
            return {
                success: true,
                message: `${request.provider} 계정 연결이 해제되었습니다`
            };
        }
        catch (error) {
            logger_1.default.error('Account unlinking error:', error);
            return {
                success: false,
                message: '계정 연결 해제 중 오류가 발생했습니다',
                error: {
                    code: account_linking_1.AccountLinkingError.PROVIDER_ERROR,
                    message: '계정 연결 해제 중 오류가 발생했습니다'
                }
            };
        }
    }
    /**
     * Get merged profile
     */
    static async getMergedProfile(userId, options) {
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        try {
            const user = await userRepo.findOne({
                where: { id: userId },
                relations: ['linkedAccounts']
            });
            if (!user) {
                return null;
            }
            // Sort linked accounts by preference
            const sortedAccounts = [...user.linkedAccounts].sort((a, b) => {
                if (a.isPrimary)
                    return -1;
                if (b.isPrimary)
                    return 1;
                if (options === null || options === void 0 ? void 0 : options.preferredProvider) {
                    if (a.provider === options.preferredProvider)
                        return -1;
                    if (b.provider === options.preferredProvider)
                        return 1;
                }
                return b.linkedAt.getTime() - a.linkedAt.getTime();
            });
            // Get primary account for default values
            const primaryAccount = sortedAccounts[0];
            return {
                id: user.id,
                email: user.email,
                name: user.name || (primaryAccount === null || primaryAccount === void 0 ? void 0 : primaryAccount.displayName) || user.email,
                profileImage: primaryAccount === null || primaryAccount === void 0 ? void 0 : primaryAccount.profileImage,
                emailVerified: user.isEmailVerified,
                providers: user.linkedAccounts.map(acc => acc.provider),
                linkedAccounts: user.linkedAccounts,
                primaryProvider: (primaryAccount === null || primaryAccount === void 0 ? void 0 : primaryAccount.provider) || 'email',
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            };
        }
        catch (error) {
            logger_1.default.error('Get merged profile error:', error);
            return null;
        }
    }
    /**
     * Merge two user accounts
     */
    static async mergeAccounts(request) {
        const queryRunner = connection_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const userRepo = queryRunner.manager.getRepository(User_1.User);
            const linkedAccountRepo = queryRunner.manager.getRepository(LinkedAccount_1.LinkedAccount);
            // Get both users
            const [sourceUser, targetUser] = await Promise.all([
                userRepo.findOne({
                    where: { id: request.sourceUserId },
                    relations: ['linkedAccounts']
                }),
                userRepo.findOne({
                    where: { id: request.targetUserId },
                    relations: ['linkedAccounts']
                })
            ]);
            if (!sourceUser || !targetUser) {
                throw new Error('One or both users not found');
            }
            // Move all linked accounts from source to target
            for (const account of sourceUser.linkedAccounts) {
                account.userId = targetUser.id;
                account.user = targetUser;
                await linkedAccountRepo.save(account);
            }
            // Merge profile data based on options
            if (request.mergeOptions.mergeFields) {
                const { mergeFields } = request.mergeOptions;
                // Merge name
                if (mergeFields.name && sourceUser.name && !targetUser.name) {
                    targetUser.name = sourceUser.name;
                }
                // Merge firstName and lastName
                if (mergeFields.name) {
                    if (sourceUser.firstName && !targetUser.firstName) {
                        targetUser.firstName = sourceUser.firstName;
                    }
                    if (sourceUser.lastName && !targetUser.lastName) {
                        targetUser.lastName = sourceUser.lastName;
                    }
                }
                // Merge avatar/profile image
                if (mergeFields.profileImage && sourceUser.avatar && !targetUser.avatar) {
                    targetUser.avatar = sourceUser.avatar;
                }
                // Merge business info
                if (mergeFields.businessInfo && sourceUser.businessInfo) {
                    targetUser.businessInfo = {
                        ...(targetUser.businessInfo || {}),
                        ...sourceUser.businessInfo
                    };
                }
                // Merge permissions (union of both)
                if (mergeFields.permissions) {
                    const allPermissions = new Set([
                        ...(targetUser.permissions || []),
                        ...(sourceUser.permissions || [])
                    ]);
                    targetUser.permissions = Array.from(allPermissions);
                }
                // Merge roles (keep higher role)
                if (mergeFields.roles) {
                    const roleHierarchy = {
                        SUPER_ADMIN: 4,
                        ADMIN: 3,
                        VENDOR: 2,
                        CUSTOMER: 1
                    };
                    const targetRoleValue = roleHierarchy[targetUser.role] || 0;
                    const sourceRoleValue = roleHierarchy[sourceUser.role] || 0;
                    if (sourceRoleValue > targetRoleValue) {
                        targetUser.role = sourceUser.role;
                    }
                    // Merge roles array
                    const allRoles = new Set([
                        ...(targetUser.roles || []),
                        ...(sourceUser.roles || [])
                    ]);
                    targetUser.roles = Array.from(allRoles);
                }
            }
            // Update verification status if source is verified
            if (sourceUser.isEmailVerified && !targetUser.isEmailVerified) {
                targetUser.isEmailVerified = true;
            }
            // Save target user
            await userRepo.save(targetUser);
            // Delete source user
            await userRepo.remove(sourceUser);
            await queryRunner.commitTransaction();
            // Get merged profile
            const mergedProfile = await this.getMergedProfile(targetUser.id, request.mergeOptions);
            return {
                success: true,
                mergedUserId: targetUser.id,
                mergedProfile: mergedProfile,
                deletedUserId: request.sourceUserId
            };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            logger_1.default.error('Account merge error:', error);
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Check if account can be linked
     */
    static async canLinkAccount(userId, provider, providerId) {
        const linkedAccountRepo = connection_1.AppDataSource.getRepository(LinkedAccount_1.LinkedAccount);
        try {
            // Check if already linked to another user
            if (providerId) {
                const existing = await linkedAccountRepo.findOne({
                    where: { provider, providerId }
                });
                return !existing || existing.userId === userId;
            }
            // Check if user already has this provider
            const userLink = await linkedAccountRepo.findOne({
                where: { userId, provider }
            });
            return !userLink;
        }
        catch (error) {
            logger_1.default.error('Check account link error:', error);
            return false;
        }
    }
}
exports.AccountLinkingService = AccountLinkingService;
//# sourceMappingURL=account-linking.service.js.map