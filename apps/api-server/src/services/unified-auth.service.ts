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

  /**
   * Get test accounts for development/staging
   * Returns one user per role: admin, seller, supplier, partner, customer
   */
  async getTestAccounts(): Promise<Array<{role: string; email: string; password: string}>> {
    const userRepo = AppDataSource.getRepository(User);

    // Define roles we want to show in test panel
    const targetRoles = ['admin', 'seller', 'supplier', 'partner', 'customer'];
    const testAccounts: Array<{role: string; email: string; password: string}> = [];

    // All test accounts use the same password for convenience
    const testPassword = 'test123!@#';

    // Find one user for each role
    for (const role of targetRoles) {
      const user = await userRepo
        .createQueryBuilder('user')
        .where('user.role = :role', { role })
        .andWhere(
          '(user.email LIKE :pattern1 OR user.email LIKE :pattern2)',
          { pattern1: '%@test.com', pattern2: '%test%' }
        )
        .select(['user.email', 'user.role'])
        .limit(1)
        .getOne();

      if (user) {
        testAccounts.push({
          role: this.getRoleLabel(user.role),
          email: user.email,
          password: testPassword
        });
      }
    }

    return testAccounts;
  }

  /**
   * Send find ID email
   */
  async sendFindIdEmail(email: string): Promise<void> {
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Mask email/username for security
    const maskedEmail = this.maskEmail(user.email);

    await emailService.sendEmail({
      to: email,
      subject: '아이디 찾기 결과',
      html: `
        <h2>아이디 찾기</h2>
        <p>입력하신 이메일로 등록된 계정 정보입니다:</p>
        <p><strong>이메일:</strong> ${maskedEmail}</p>
        <p>로그인 페이지: <a href="${process.env.FRONTEND_URL}/login">로그인하기</a></p>
        <p>비밀번호를 잊으셨다면 <a href="${process.env.FRONTEND_URL}/find-password">비밀번호 찾기</a>를 이용해주세요.</p>
        <br/>
        <p style="color: #666; font-size: 12px;">본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.</p>
      `
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Generate reset token (expires in 10 minutes)
    const resetToken = generateRandomToken(32);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = expiresAt;
    await userRepo.save(user);

    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    await emailService.sendEmail({
      to: email,
      subject: '비밀번호 재설정',
      html: `
        <h2>비밀번호 재설정</h2>
        <p>비밀번호 재설정을 요청하셨습니다.</p>
        <p>아래 링크를 클릭하여 새 비밀번호를 설정해주세요:</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">비밀번호 재설정하기</a></p>
        <p>또는 다음 주소를 브라우저에 복사하여 붙여넣으세요:</p>
        <p>${resetUrl}</p>
        <br/>
        <p style="color: #666; font-size: 12px;">이 링크는 10분간 유효합니다.</p>
        <p style="color: #666; font-size: 12px;">본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.</p>
      `
    });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({
      where: { resetPasswordToken: token }
    });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new Error('Invalid or expired token');
    }

    // Hash new password
    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await userRepo.save(user);
  }

  /**
   * Helper: Mask email for privacy
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 3) {
      return `${local[0]}***@${domain}`;
    }
    const masked = local.substring(0, 3) + '***';
    return `${masked}@${domain}`;
  }

  /**
   * Helper: Get role label in Korean
   */
  private getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      user: '사용자',
      member: '멤버',
      contributor: '기여자',
      seller: '판매자',
      vendor: '벤더',
      partner: '파트너',
      operator: '운영자',
      admin: '관리자'
    };
    return labels[role] || role;
  }
}