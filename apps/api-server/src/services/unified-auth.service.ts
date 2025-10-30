import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import { LinkedAccount } from '../entities/LinkedAccount.js';
import { AccountActivity } from '../entities/AccountActivity.js';
import { AuthService } from './AuthService.js';
import { AccountLinkingService } from './account-linking.service.js';
import { emailService } from './email.service.js';
import { 
  AuthProvider, 
  UnifiedLoginRequest, 
  UnifiedLoginResponse,
  OAuthProfile,
  AccountLinkingError
} from '../types/account-linking.js';
import { 
  UserRole, 
  UserStatus, 
  LoginResponse,
  AuthTokens
} from '../types/auth.js';
import { generateRandomToken, hashPassword, comparePassword } from '../utils/auth.utils.js';
import logger from '../utils/logger.js';

export class UnifiedAuthService {
  private authService: AuthService;

  constructor() {
    const userRepo = AppDataSource.getRepository(User);
    this.authService = new AuthService(userRepo);
  }

  /**
   * Unified login method that handles both email and OAuth
   */
  async login(request: UnifiedLoginRequest): Promise<UnifiedLoginResponse> {
    const { provider, credentials, oauthProfile, ipAddress, userAgent } = request;

    try {
      if (provider === 'email') {
        return await this.handleEmailLogin(credentials!, ipAddress, userAgent);
      } else {
        return await this.handleOAuthLogin(provider, oauthProfile!, ipAddress, userAgent);
      }
    } catch (error) {
      logger.error('Unified login error:', error);
      throw error;
    }
  }

  /**
   * Handle email/password login
   */
  private async handleEmailLogin(
    credentials: { email: string; password: string },
    ipAddress: string,
    userAgent: string
  ): Promise<UnifiedLoginResponse> {
    const userRepo = AppDataSource.getRepository(User);
    const linkedAccountRepo = AppDataSource.getRepository(LinkedAccount);
    const activityRepo = AppDataSource.getRepository(AccountActivity);

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
    const isValidPassword = await comparePassword(credentials.password, user.password);
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
    if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.APPROVED) {
      throw new Error('Account is not active');
    }

    // Generate tokens
    const loginResult = await this.authService.login(
      credentials.email,
      credentials.password,
      userAgent,
      ipAddress
    );

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
    const mergedProfile = await AccountLinkingService.getMergedProfile(user.id);

    return {
      success: true,
      user: loginResult.user,
      tokens: {
        accessToken: loginResult.tokens.accessToken,
        refreshToken: loginResult.tokens.refreshToken,
        expiresIn: loginResult.tokens.expiresIn || 900 // Default to 15 minutes
      },
      sessionId: loginResult.sessionId,
      linkedAccounts: mergedProfile?.linkedAccounts || [],
      isNewUser: false
    };
  }

  /**
   * Handle OAuth login
   */
  private async handleOAuthLogin(
    provider: AuthProvider,
    profile: OAuthProfile,
    ipAddress: string,
    userAgent: string
  ): Promise<UnifiedLoginResponse> {
    const userRepo = AppDataSource.getRepository(User);
    const linkedAccountRepo = AppDataSource.getRepository(LinkedAccount);
    const activityRepo = AppDataSource.getRepository(AccountActivity);

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
      if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.APPROVED) {
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
      const mergedProfile = await AccountLinkingService.getMergedProfile(user.id);

      return {
        success: true,
        user: user.toPublicData(),
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn || 900
        },
        sessionId: `oauth-${Date.now()}`,
        linkedAccounts: mergedProfile?.linkedAccounts || [],
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
      const linkResult = await AccountLinkingService.linkOAuthAccount(
        existingUserByEmail.id,
        provider,
        {
          providerId: profile.id,
          email: profile.email,
          displayName: profile.displayName,
          profileImage: profile.avatar
        }
      );

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
      const mergedProfile = await AccountLinkingService.getMergedProfile(existingUserByEmail.id);

      return {
        success: true,
        user: existingUserByEmail.toPublicData(),
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn || 900
        },
        sessionId: `oauth-${Date.now()}`,
        linkedAccounts: mergedProfile?.linkedAccounts || [],
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
      password: await hashPassword(generateRandomToken()), // Random password for OAuth users
      role: UserRole.CUSTOMER,
      roles: [UserRole.CUSTOMER],
      status: UserStatus.ACTIVE,
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
  async canLogin(email: string, provider: AuthProvider): Promise<boolean> {
    const linkedAccountRepo = AppDataSource.getRepository(LinkedAccount);

    const account = await linkedAccountRepo.findOne({
      where: { email, provider }
    });

    return !!account;
  }

  /**
   * Get available login methods for email
   */
  async getAvailableProviders(email: string): Promise<AuthProvider[]> {
    const linkedAccountRepo = AppDataSource.getRepository(LinkedAccount);
    const userRepo = AppDataSource.getRepository(User);

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