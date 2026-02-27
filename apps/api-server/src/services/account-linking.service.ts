import { AppDataSource } from '../database/connection.js';
import { User } from '../modules/auth/entities/User.js';
import { LinkedAccount } from '../entities/LinkedAccount.js';
import { LinkingSession } from '../modules/auth/entities/LinkingSession.js';
import { AccountActivity } from '../entities/AccountActivity.js';
import { 
  AuthProvider, 
  LinkAccountRequest, 
  LinkAccountResponse,
  UnlinkAccountRequest,
  AccountLinkingError,
  LinkingStatus,
  ProfileMergeOptions,
  MergedProfile,
  AccountMergeRequest,
  AccountMergeResult,
  SecurityVerification
} from '../types/account-linking.js';
import { emailService } from './email.service.js';
import { generateRandomToken, hashPassword, comparePassword } from '../utils/auth.utils.js';
import logger from '../utils/logger.js';
import { EntityManager } from 'typeorm';

export class AccountLinkingService {
  /**
   * Link an OAuth account to existing user
   */
  static async linkOAuthAccount(
    userId: string,
    provider: AuthProvider,
    providerData: {
      providerId: string;
      email: string;
      displayName?: string;
      profileImage?: string;
    }
  ): Promise<LinkAccountResponse> {
    const linkedAccountRepo = AppDataSource.getRepository(LinkedAccount);
    const userRepo = AppDataSource.getRepository(User);
    const activityRepo = AppDataSource.getRepository(AccountActivity);

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
            code: AccountLinkingError.ACCOUNT_NOT_FOUND,
            message: '사용자를 찾을 수 없습니다'
          }
        };
      }

      // Check if provider is already linked
      const existingLink = user.linkedAccounts.find(
        account => account.provider === provider && account.providerId === providerData.providerId
      );

      if (existingLink) {
        return {
          success: false,
          message: '이미 연결된 계정입니다',
          error: {
            code: AccountLinkingError.ALREADY_LINKED,
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
            code: AccountLinkingError.MERGE_CONFLICT,
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
        type: `linked_${provider}`,
        ipAddress: '',
        userAgent: '',
        details: { provider, providerId: providerData.providerId }
      }));

      return {
        success: true,
        message: `${provider} 계정이 성공적으로 연결되었습니다`,
        linkedAccount
      };
    } catch (error) {
      logger.error('Account linking error:', error);
      return {
        success: false,
        message: '계정 연결 중 오류가 발생했습니다',
        error: {
          code: AccountLinkingError.PROVIDER_ERROR,
          message: '계정 연결 중 오류가 발생했습니다'
        }
      };
    }
  }

  /**
   * Link email account to existing OAuth user
   */
  static async linkEmailAccount(
    userId: string,
    email: string,
    password: string
  ): Promise<LinkAccountResponse> {
    const userRepo = AppDataSource.getRepository(User);
    const linkedAccountRepo = AppDataSource.getRepository(LinkedAccount);
    const sessionRepo = AppDataSource.getRepository(LinkingSession);

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
            code: AccountLinkingError.ACCOUNT_NOT_FOUND,
            message: '사용자를 찾을 수 없습니다'
          }
        };
      }

      // Check if email is already linked
      const existingEmailLink = user.linkedAccounts.find(
        account => account.provider === 'email' && account.email === email
      );

      if (existingEmailLink) {
        return {
          success: false,
          message: '이미 연결된 이메일입니다',
          error: {
            code: AccountLinkingError.ALREADY_LINKED,
            message: '이미 연결된 이메일입니다'
          }
        };
      }

      // Set password for user if not already set
      if (!user.password) {
        user.password = await hashPassword(password);
        await userRepo.save(user);
      }

      // Create verification session
      const verificationToken = generateRandomToken();
      const session = sessionRepo.create({
        userId,
        user,
        provider: 'email',
        status: LinkingStatus.PENDING,
        verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        metadata: { email }
      });

      await sessionRepo.save(session);

      // Send verification email
      await emailService.sendEmail({
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
    } catch (error) {
      logger.error('Email account linking error:', error);
      return {
        success: false,
        message: '이메일 계정 연결 중 오류가 발생했습니다',
        error: {
          code: AccountLinkingError.PROVIDER_ERROR,
          message: '이메일 계정 연결 중 오류가 발생했습니다'
        }
      };
    }
  }

  /**
   * Verify email linking
   */
  static async verifyEmailLinking(token: string): Promise<LinkAccountResponse> {
    const sessionRepo = AppDataSource.getRepository(LinkingSession);
    const linkedAccountRepo = AppDataSource.getRepository(LinkedAccount);
    const activityRepo = AppDataSource.getRepository(AccountActivity);

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
            code: AccountLinkingError.SESSION_EXPIRED,
            message: '유효하지 않은 인증 토큰입니다'
          }
        };
      }

      if (session.expiresAt < new Date()) {
        return {
          success: false,
          message: '인증 토큰이 만료되었습니다',
          error: {
            code: AccountLinkingError.SESSION_EXPIRED,
            message: '인증 토큰이 만료되었습니다'
          }
        };
      }

      if (session.status !== LinkingStatus.PENDING) {
        return {
          success: false,
          message: '이미 처리된 요청입니다',
          error: {
            code: AccountLinkingError.SESSION_EXPIRED,
            message: '이미 처리된 요청입니다'
          }
        };
      }

      // Create linked account
      const email = session.metadata?.email;
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
      session.status = LinkingStatus.VERIFIED;
      await sessionRepo.save(session);

      // Log activity
      await activityRepo.save(activityRepo.create({
        userId: session.userId,
        type: 'linked_email',
        ipAddress: '',
        userAgent: '',
        details: { provider: 'email', email }
      }));

      return {
        success: true,
        message: '이메일 계정이 성공적으로 연결되었습니다',
        linkedAccount
      };
    } catch (error) {
      logger.error('Email verification error:', error);
      return {
        success: false,
        message: '이메일 인증 중 오류가 발생했습니다',
        error: {
          code: AccountLinkingError.VERIFICATION_REQUIRED,
          message: '이메일 인증 중 오류가 발생했습니다'
        }
      };
    }
  }

  /**
   * Unlink account
   */
  static async unlinkAccount(
    userId: string,
    request: UnlinkAccountRequest,
    verification: SecurityVerification
  ): Promise<LinkAccountResponse> {
    const userRepo = AppDataSource.getRepository(User);
    const linkedAccountRepo = AppDataSource.getRepository(LinkedAccount);
    const activityRepo = AppDataSource.getRepository(AccountActivity);

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
            code: AccountLinkingError.ACCOUNT_NOT_FOUND,
            message: '사용자를 찾을 수 없습니다'
          }
        };
      }

      // Verify security
      if (verification.method === 'password' && verification.password) {
        const isValid = await comparePassword(verification.password, user.password);
        if (!isValid) {
          return {
            success: false,
            message: '비밀번호가 올바르지 않습니다',
            error: {
              code: AccountLinkingError.SECURITY_VERIFICATION_FAILED,
              message: '비밀번호가 올바르지 않습니다'
            }
          };
        }
      }

      // Find linked account
      const linkedAccount = user.linkedAccounts.find(
        account => account.provider === request.provider
      );

      if (!linkedAccount) {
        return {
          success: false,
          message: '연결된 계정을 찾을 수 없습니다',
          error: {
            code: AccountLinkingError.ACCOUNT_NOT_FOUND,
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
            code: AccountLinkingError.LAST_PROVIDER,
            message: '마지막 로그인 방법은 삭제할 수 없습니다'
          }
        };
      }

      // Remove linked account
      await linkedAccountRepo.remove(linkedAccount);

      // Log activity
      await activityRepo.save(activityRepo.create({
        userId,
        type: `unlinked_${request.provider}`,
        ipAddress: '',
        userAgent: '',
        details: { provider: request.provider, providerId: linkedAccount.providerId }
      }));

      return {
        success: true,
        message: `${request.provider} 계정 연결이 해제되었습니다`
      };
    } catch (error) {
      logger.error('Account unlinking error:', error);
      return {
        success: false,
        message: '계정 연결 해제 중 오류가 발생했습니다',
        error: {
          code: AccountLinkingError.PROVIDER_ERROR,
          message: '계정 연결 해제 중 오류가 발생했습니다'
        }
      };
    }
  }

  /**
   * Get merged profile
   * @param userId - User ID
   * @param options - Profile merge options
   * @param preloadedUser - Optional pre-loaded user to avoid duplicate DB query
   */
  static async getMergedProfile(
    userId: string,
    options?: ProfileMergeOptions,
    preloadedUser?: User
  ): Promise<MergedProfile | null> {
    try {
      let user = preloadedUser;

      // Only query DB if user not preloaded
      if (!user) {
        const userRepo = AppDataSource.getRepository(User);
        user = await userRepo.findOne({
          where: { id: userId },
          relations: ['linkedAccounts']
        });
      }

      if (!user) {
        return null;
      }

      // Sort linked accounts by preference
      const sortedAccounts = [...user.linkedAccounts].sort((a, b) => {
        if (a.isPrimary) return -1;
        if (b.isPrimary) return 1;
        if (options?.preferredProvider) {
          if (a.provider === options.preferredProvider) return -1;
          if (b.provider === options.preferredProvider) return 1;
        }
        return b.linkedAt.getTime() - a.linkedAt.getTime();
      });

      // Get primary account for default values
      const primaryAccount = sortedAccounts[0];

      return {
        id: user.id,
        email: user.email,
        name: user.name || primaryAccount?.displayName || user.email,
        profileImage: primaryAccount?.profileImage,
        emailVerified: user.isEmailVerified,
        providers: user.linkedAccounts.map(acc => acc.provider),
        linkedAccounts: user.linkedAccounts,
        primaryProvider: primaryAccount?.provider || 'email',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      logger.error('Get merged profile error:', error);
      return null;
    }
  }

  /**
   * Merge two user accounts
   */
  static async mergeAccounts(
    request: AccountMergeRequest
  ): Promise<AccountMergeResult> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userRepo = queryRunner.manager.getRepository(User);
      const linkedAccountRepo = queryRunner.manager.getRepository(LinkedAccount);

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
          // Merge roles array (role column removed)
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
        mergedProfile: mergedProfile!,
        deletedUserId: request.sourceUserId
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Account merge error:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Check if account can be linked
   */
  static async canLinkAccount(
    userId: string,
    provider: AuthProvider,
    providerId?: string
  ): Promise<boolean> {
    const linkedAccountRepo = AppDataSource.getRepository(LinkedAccount);

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
    } catch (error) {
      logger.error('Check account link error:', error);
      return false;
    }
  }
}