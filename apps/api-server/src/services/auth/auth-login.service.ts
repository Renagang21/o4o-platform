import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../entities/User.js';
import { LinkedAccount } from '../../entities/LinkedAccount.js';
import { AccountActivity } from '../../entities/AccountActivity.js';
import { ServiceMembership } from '../../modules/auth/entities/ServiceMembership.js';
// WO-O4O-IDENTITY-V2-PHASE1-REGISTER-LOGIN-V1: Identity V2 L2 Credential dual-read
import { ServiceCredential } from '../../modules/auth/entities/ServiceCredential.js';
import { UserRole, UserStatus } from '../../types/auth.js';
import {
  AuthProvider,
  OAuthProfile,
  UnifiedLoginRequest,
  UnifiedLoginResponse,
} from '../../types/account-linking.js';
import * as tokenUtils from '../../utils/token.utils.js';
import { hashPassword, comparePassword, generateRandomToken } from '../../utils/auth.utils.js';
import {
  InvalidCredentialsError,
  AccountInactiveError,
  AccountLockedError,
  EmailNotVerifiedError,
  UserNotFoundError,
  SocialLoginRequiredError,
} from '../../errors/AuthErrors.js';
import { SessionSyncService } from '../sessionSyncService.js';
import { LoginSecurityService } from '../LoginSecurityService.js';
import { AccountLinkingService } from '../account-linking.service.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import {
  generateTokensWithContext,
  injectRolesIntoPublicData,
} from './auth-context.helper.js';
import { ActionLogService } from '@o4o/action-log-core';
import logger from '../../utils/logger.js';

/**
 * AuthLoginService
 *
 * Platform login flows — email/password and OAuth authentication.
 *
 * Extracted from AuthenticationService (WO-O4O-AUTHENTICATION-SERVICE-SPLIT-V1).
 */
export class AuthLoginService {
  // Lazy repositories
  private _userRepo?: Repository<User>;
  private _linkedAccountRepo?: Repository<LinkedAccount>;
  private _activityRepo?: Repository<AccountActivity>;
  private _actionLogService?: ActionLogService;

  private get userRepository(): Repository<User> {
    if (!this._userRepo) {
      this._userRepo = AppDataSource.getRepository(User);
    }
    return this._userRepo;
  }

  private get linkedAccountRepository(): Repository<LinkedAccount> {
    if (!this._linkedAccountRepo) {
      this._linkedAccountRepo = AppDataSource.getRepository(LinkedAccount);
    }
    return this._linkedAccountRepo;
  }

  private get activityRepository(): Repository<AccountActivity> {
    if (!this._activityRepo) {
      this._activityRepo = AppDataSource.getRepository(AccountActivity);
    }
    return this._activityRepo;
  }

  private get actionLogService(): ActionLogService {
    if (!this._actionLogService) {
      this._actionLogService = new ActionLogService(AppDataSource);
    }
    return this._actionLogService;
  }

  /**
   * Unified login method
   *
   * Handles both email/password and OAuth login.
   */
  async login(request: UnifiedLoginRequest): Promise<UnifiedLoginResponse> {
    const { provider, credentials, oauthProfile, ipAddress, userAgent } = request;

    try {
      if (provider === 'email') {
        if (!credentials) {
          throw new InvalidCredentialsError();
        }
        return await this.handleEmailLogin(credentials, ipAddress, userAgent, credentials.serviceKey);
      } else {
        if (!oauthProfile) {
          throw new InvalidCredentialsError();
        }
        return await this.handleOAuthLogin(provider, oauthProfile, ipAddress, userAgent);
      }
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Handle email/password login
   *
   * WO-O4O-LOGIN-SERVICEKEY-PARAMETER-V1:
   * serviceKey 제공 시 해당 서비스 멤버십 검증 추가.
   * 미제공 시 기존 전역 인증 방식으로 fallback (호환 유지).
   */
  private async handleEmailLogin(
    credentials: { email: string; password: string },
    ipAddress: string,
    userAgent: string,
    serviceKey?: string,
  ): Promise<UnifiedLoginResponse> {
    const { email, password } = credentials;

    // Security check: Rate limiting
    const loginCheck = await LoginSecurityService.isLoginAllowed(email, ipAddress);
    if (!loginCheck.allowed) {
      await this.logLoginAttempt(null, email, ipAddress, userAgent, false, loginCheck.reason);

      if (loginCheck.reason === 'account_locked') {
        throw new AccountLockedError();
      } else {
        throw new Error('Too many login attempts. Please try again later.');
      }
    }

    // Find user
    let user = await this.userRepository.findOne({
      where: { email },
      relations: ['linkedAccounts'],
    });

    // Check linked accounts if user not found
    if (!user) {
      const linkedAccount = await this.linkedAccountRepository.findOne({
        where: { email, provider: 'email' },
        relations: ['user', 'user.linkedAccounts'],
      });

      if (linkedAccount) {
        user = linkedAccount.user;
      }
    }

    if (!user) {
      await this.logLoginAttempt(null, email, ipAddress, userAgent, false, 'account_not_found');
      throw new UserNotFoundError();
    }

    // WO-O4O-LOGIN-SERVICEKEY-PARAMETER-V1: 서비스 멤버십 검증
    // serviceKey 제공 시 해당 서비스에 가입된 멤버십이 존재하는지 확인.
    // 이 검증은 차후 email unique 제거(WO-O4O-EMAIL-UNIQUENESS-REDESIGN-V1) 이후
    // user 조회 자체를 (email + serviceKey) 기반으로 전환할 준비 단계이다.
    //
    // WO-O4O-ADMIN-DASHBOARD-PLATFORM-ADMIN-MEMBERSHIP-BYPASS-FIX-V1 (단기 패치):
    // platform 관리자 역할(platform:super_admin, platform:admin, super_admin) 보유 계정은
    // service_memberships 검증을 우회한다. admin.neture.co.kr 접근 자격은
    // 특정 서비스 가입 여부가 아니라 platform 관리자 역할 보유 여부로 판단한다.
    // 비밀번호 검증은 이후 단계에서 동일하게 수행된다.
    if (serviceKey) {
      const PLATFORM_ADMIN_ROLES = ['platform:super_admin', 'platform:admin', 'super_admin'];
      const isPlatformAdmin = await roleAssignmentService.hasAnyRole(user.id, PLATFORM_ADMIN_ROLES);

      if (!isPlatformAdmin) {
        const smRepo = AppDataSource.getRepository(ServiceMembership);
        const membership = await smRepo.findOne({
          where: { userId: user.id, serviceKey },
        });
        if (!membership) {
          await this.logLoginAttempt(user.id, email, ipAddress, userAgent, false, 'service_not_member');
          const err: any = new Error(`이 계정은 ${serviceKey} 서비스에 가입되어 있지 않습니다.`);
          err.code = 'SERVICE_NOT_MEMBER';
          throw err;
        }
      }
    }

    // WO-O4O-IDENTITY-V2-PHASE1-REGISTER-LOGIN-V1: Identity V2 dual-read
    //   serviceKey 있음 + credential 있음 → V2 path (credential.passwordHash 사용)
    //   serviceKey 있음 + credential 없음 → V1 fallback (users.password)
    //   serviceKey 없음                   → V1 fallback (users.password)
    // Phase 1 정책 (G-B No Backfill): 기존 사용자는 credential 없이도 users.password 로 정상 로그인.
    let credentialHash: string | null = null;
    if (serviceKey) {
      const credRepo = AppDataSource.getRepository(ServiceCredential);
      const credential = await credRepo.findOne({
        where: { userId: user.id, serviceKey },
      });
      credentialHash = credential?.passwordHash ?? null;
    }

    // Check if user has authentication material (credential for the service OR user.password)
    // social-only account 판정: credential 도 user.password 도 없을 때만
    if (!credentialHash && !user.password) {
      await this.logLoginAttempt(user.id, email, ipAddress, userAgent, false, 'no_password');
      throw new SocialLoginRequiredError();
    }

    // Check if account is locked
    if (user.isLocked || (user.lockedUntil && user.lockedUntil > new Date())) {
      await this.logLoginAttempt(user.id, email, ipAddress, userAgent, false, 'account_locked');
      throw new AccountLockedError(user.lockedUntil || undefined);
    }

    // Verify password — credential 우선, 없으면 users.password fallback
    const targetHash = credentialHash ?? user.password;
    const isValidPassword = await comparePassword(password, targetHash);
    if (!isValidPassword) {
      await this.handleFailedLogin(user);
      await this.logLoginAttempt(user.id, email, ipAddress, userAgent, false, 'invalid_password', 'email', targetHash?.substring(0, 4));
      throw new InvalidCredentialsError();
    }

    // Check account status
    if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.APPROVED) {
      await this.logLoginAttempt(user.id, email, ipAddress, userAgent, false, 'account_inactive');
      throw new AccountInactiveError(user.status);
    }

    // Check email verification
    if (!user.isEmailVerified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
      await this.logLoginAttempt(
        user.id,
        email,
        ipAddress,
        userAgent,
        false,
        'email_not_verified',
      );
      throw new EmailNotVerifiedError();
    }

    // Login successful - run non-critical tasks in parallel/background
    // Fire-and-forget for logging (non-critical)
    this.logLoginAttempt(user.id, email, ipAddress, userAgent, true).catch((err) =>
      logger.warn('Failed to log login attempt (non-critical):', err),
    );

    // Phase3-E: Query RoleAssignment + memberships, generate tokens
    const { tokens, roles, memberships } = await generateTokensWithContext(user);

    // Generate session ID
    const sessionId = SessionSyncService.generateSessionId();

    // Prepare user updates
    const tokenFamily = tokenUtils.getTokenFamily(tokens.refreshToken);
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    if (tokenFamily) {
      user.refreshTokenFamily = tokenFamily;
    }

    // Prepare linked account update
    const emailAccount = user.linkedAccounts?.find((acc) => acc.provider === 'email');
    if (emailAccount) {
      emailAccount.lastUsedAt = new Date();
    }

    // Run all DB saves and Redis operations in parallel
    const parallelTasks: Promise<any>[] = [this.userRepository.save(user)];

    if (emailAccount) {
      parallelTasks.push(this.linkedAccountRepository.save(emailAccount));
    }

    // Session operations (non-critical, don't block login)
    SessionSyncService.checkConcurrentSessions(user.id)
      .then((sessionCheck) => {
        if (!sessionCheck.allowed) {
          SessionSyncService.enforceSessionLimit(user.id).catch((err) =>
            logger.warn('Failed to enforce session limit (non-critical):', err),
          );
        }
      })
      .catch((err) => logger.warn('Failed to check concurrent sessions (non-critical):', err));

    SessionSyncService.createSession(user, sessionId, { userAgent, ipAddress }).catch((err) =>
      logger.warn('Failed to create session in Redis (non-critical):', err),
    );

    // Wait for critical DB saves
    await Promise.all(parallelTasks);

    // Get merged profile - pass preloaded user to avoid duplicate query
    const mergedProfile = await AccountLinkingService.getMergedProfile(user.id, undefined, user);

    // Phase3-E Fix: Inject roles from RoleAssignment into login response
    const publicData = user.toPublicData();
    injectRolesIntoPublicData(publicData as Record<string, unknown>, roles, memberships);

    return {
      success: true,
      user: publicData,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn || 900, // 15 minutes
      },
      sessionId,
      linkedAccounts: mergedProfile?.linkedAccounts || [],
      isNewUser: false,
    };
  }

  /**
   * Handle OAuth login
   */
  private async handleOAuthLogin(
    provider: AuthProvider,
    profile: OAuthProfile,
    ipAddress: string,
    userAgent: string,
  ): Promise<UnifiedLoginResponse> {
    // Find existing linked account
    const existingLinkedAccount = await this.linkedAccountRepository.findOne({
      where: {
        providerId: profile.id,
      },
      relations: ['user', 'user.linkedAccounts'],
    });

    if (existingLinkedAccount) {
      // Existing user login
      const user = existingLinkedAccount.user;

      // Check account status
      if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.APPROVED) {
        throw new AccountInactiveError(user.status);
      }

      // Update profile info if changed
      if (
        profile.displayName !== existingLinkedAccount.displayName ||
        profile.avatar !== existingLinkedAccount.profileImage
      ) {
        existingLinkedAccount.displayName = profile.displayName;
        existingLinkedAccount.profileImage = profile.avatar;
        existingLinkedAccount.lastUsedAt = new Date();
        await this.linkedAccountRepository.save(existingLinkedAccount);
      }

      // Generate tokens
      const { tokens, roles } = await generateTokensWithContext(user);

      // Log successful login
      await this.logLoginAttempt(
        user.id,
        profile.email,
        ipAddress,
        userAgent,
        true,
        undefined,
        provider,
      );

      // Get merged profile
      const mergedProfile = await AccountLinkingService.getMergedProfile(user.id);

      // Phase3-E Fix: Inject roles from RoleAssignment
      const publicData0 = user.toPublicData();
      injectRolesIntoPublicData(publicData0 as Record<string, unknown>, roles);

      return {
        success: true,
        user: publicData0,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn || 900, // 15 minutes
        },
        sessionId: `oauth-${Date.now()}`,
        linkedAccounts: mergedProfile?.linkedAccounts || [],
        isNewUser: false,
      };
    }

    // Check if email is already used by another account
    const existingUserByEmail = await this.userRepository.findOne({
      where: { email: profile.email },
      relations: ['linkedAccounts'],
    });

    if (existingUserByEmail) {
      // Auto-link if same email
      const linkResult = await AccountLinkingService.linkOAuthAccount(
        existingUserByEmail.id,
        provider,
        {
          providerId: profile.id,
          email: profile.email,
          displayName: profile.displayName,
          profileImage: profile.avatar,
        },
      );

      if (!linkResult.success) {
        throw new Error(linkResult.message);
      }

      // Generate tokens
      const { tokens, roles } = await generateTokensWithContext(existingUserByEmail);

      // Log successful login
      await this.logLoginAttempt(
        existingUserByEmail.id,
        profile.email,
        ipAddress,
        userAgent,
        true,
        undefined,
        provider,
      );

      // Get merged profile
      const mergedProfile = await AccountLinkingService.getMergedProfile(existingUserByEmail.id);

      // Phase3-E Fix: Inject roles from RoleAssignment
      const publicDataExisting = existingUserByEmail.toPublicData();
      injectRolesIntoPublicData(publicDataExisting as Record<string, unknown>, roles);

      return {
        success: true,
        user: publicDataExisting,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn || 900, // 15 minutes
        },
        sessionId: `oauth-${Date.now()}`,
        linkedAccounts: mergedProfile?.linkedAccounts || [],
        isNewUser: false,
        autoLinked: true,
      };
    }

    // Create new user
    const newUser = this.userRepository.create({
      email: profile.email,
      name: profile.displayName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatar: profile.avatar,
      password: await hashPassword(generateRandomToken()), // Random password for OAuth users
      status: UserStatus.ACTIVE,
      isEmailVerified: profile.emailVerified || false,
      provider: provider,
      provider_id: profile.id,
      permissions: [],
    });

    await this.userRepository.save(newUser);

    // Write to role_assignments (SSOT)
    await roleAssignmentService.assignRole({
      userId: newUser.id,
      role: UserRole.USER,
    });

    // Create linked account
    const linkedAccount = this.linkedAccountRepository.create({
      userId: newUser.id,
      user: newUser,
      provider: provider,
      providerId: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      profileImage: profile.avatar,
      isVerified: profile.emailVerified || false,
      isPrimary: true,
      lastUsedAt: new Date(),
    });

    await this.linkedAccountRepository.save(linkedAccount);

    // Generate tokens
    const { tokens, roles } = await generateTokensWithContext(newUser);

    // Log new user creation and login
    await this.logLoginAttempt(
      newUser.id,
      profile.email,
      ipAddress,
      userAgent,
      true,
      undefined,
      provider,
    );

    // Phase3-E Fix: Inject roles from RoleAssignment
    const publicDataNew = newUser.toPublicData();
    injectRolesIntoPublicData(publicDataNew as Record<string, unknown>, roles);

    return {
      success: true,
      user: publicDataNew,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn || 900, // 15 minutes
      },
      sessionId: `oauth-${Date.now()}`,
      linkedAccounts: [linkedAccount],
      isNewUser: true,
    };
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(user: User): Promise<void> {
    user.loginAttempts = (user.loginAttempts || 0) + 1;

    // Lock account after 5 failed attempts (30 minutes)
    if (user.loginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    }

    await this.userRepository.save(user);
  }

  /**
   * Handle successful login
   */
  private async handleSuccessfulLogin(user: User): Promise<void> {
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();

    await this.userRepository.save(user);
  }

  /**
   * Log login attempt to AccountActivity + action_logs
   */
  private async logLoginAttempt(
    userId: string | null,
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string,
    provider: AuthProvider = 'email',
    hashPrefix?: string,
  ): Promise<void> {
    try {
      await this.activityRepository.save(
        this.activityRepository.create({
          userId: userId || undefined,
          type: `login_${provider}`,
          ipAddress,
          userAgent,
          details: {
            provider,
            email,
            success,
            ...(failureReason && { reason: failureReason }),
          },
        }),
      );
    } catch (error) {
      logger.warn('Failed to log login attempt:', error);
    }

    // action_logs — operator dashboard visibility
    try {
      const actionKey = `auth.login.${provider}`;
      const meta = {
        email,
        ip: ipAddress,
        ...(failureReason && { errorCode: failureReason }),
        ...(hashPrefix && { hashPrefix }),
      };

      if (success) {
        this.actionLogService.logSuccess('platform', userId || null, actionKey, { meta }).catch(() => {});
      } else {
        this.actionLogService.logFailure('platform', userId || null, actionKey, failureReason || 'unknown', { meta }).catch(() => {});
      }
    } catch {
      // fire-and-forget
    }
  }
}
