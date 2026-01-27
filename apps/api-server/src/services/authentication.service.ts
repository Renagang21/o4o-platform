import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import { LinkedAccount } from '../entities/LinkedAccount.js';
import { AccountActivity } from '../entities/AccountActivity.js';
import {
  AuthTokens,
  LoginResponse,
  UserRole,
  UserStatus,
  AccessTokenPayload
} from '../types/auth.js';
import {
  AuthProvider,
  OAuthProfile,
  UnifiedLoginRequest,
  UnifiedLoginResponse,
  ServiceUserLoginRequest,
  ServiceUserLoginResponse,
  ServiceUserData,
  GuestTokenIssueRequest,
  GuestTokenIssueResponse,
  GuestUpgradeRequest,
  GuestUpgradeResponse,
  GuestUserData
} from '../types/account-linking.js';
import * as tokenUtils from '../utils/token.utils.js';
import * as cookieUtils from '../utils/cookie.utils.js';
import { hashPassword, comparePassword, generateRandomToken } from '../utils/auth.utils.js';
import {
  InvalidCredentialsError,
  AccountInactiveError,
  AccountLockedError,
  EmailNotVerifiedError,
  UserNotFoundError,
  SocialLoginRequiredError,
  EmailAlreadyExistsError,
  InvalidPasswordResetTokenError
} from '../errors/AuthErrors.js';
import { SessionSyncService } from './sessionSyncService.js';
import { LoginSecurityService } from './LoginSecurityService.js';
import { AccountLinkingService } from './account-linking.service.js';
import { emailService } from './email.service.js';
import logger from '../utils/logger.js';

/**
 * AuthenticationService - SSOT (Single Source of Truth) for Authentication
 *
 * ============================================================================
 * THIS IS THE ONLY AUTHORIZED AUTH SERVICE IN O4O PLATFORM
 * ============================================================================
 *
 * This service is the single source of truth for all authentication operations:
 * - Login (email + OAuth)
 * - Token generation and validation
 * - Session management
 * - Password reset
 *
 * DO NOT use:
 * - AuthService (DEPRECATED)
 * - AuthServiceV2 (DEPRECATED)
 * - Any direct JWT generation outside this service
 *
 * For user CRUD operations, use userService (modules/auth/services/user.service.ts)
 *
 * @see docs/architecture/auth-ssot-declaration.md
 * @see CLAUDE.md Section 2.6
 */
export class AuthenticationService {
  private userRepository: Repository<User>;
  private linkedAccountRepository: Repository<LinkedAccount>;
  private activityRepository: Repository<AccountActivity>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.linkedAccountRepository = AppDataSource.getRepository(LinkedAccount);
    this.activityRepository = AppDataSource.getRepository(AccountActivity);
  }

  /**
   * Unified login method
   *
   * Handles both email/password and OAuth login.
   *
   * @param request - Login request (email or OAuth)
   * @returns Login response with tokens and user data
   */
  async login(request: UnifiedLoginRequest): Promise<UnifiedLoginResponse> {
    const { provider, credentials, oauthProfile, ipAddress, userAgent } = request;

    try {
      if (provider === 'email') {
        if (!credentials) {
          throw new InvalidCredentialsError();
        }
        return await this.handleEmailLogin(credentials, ipAddress, userAgent);
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
   */
  private async handleEmailLogin(
    credentials: { email: string; password: string },
    ipAddress: string,
    userAgent: string
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
      relations: ['linkedAccounts']
    });

    // Check linked accounts if user not found
    if (!user) {
      const linkedAccount = await this.linkedAccountRepository.findOne({
        where: { email, provider: 'email' },
        relations: ['user', 'user.linkedAccounts']
      });

      if (linkedAccount) {
        user = linkedAccount.user;
      }
    }

    if (!user) {
      await this.logLoginAttempt(null, email, ipAddress, userAgent, false, 'account_not_found');
      throw new UserNotFoundError();
    }

    // Check if user has password (not social-only account)
    if (!user.password) {
      await this.logLoginAttempt(user.id, email, ipAddress, userAgent, false, 'no_password');
      throw new SocialLoginRequiredError();
    }

    // Check if account is locked
    if (user.isLocked || (user.lockedUntil && user.lockedUntil > new Date())) {
      await this.logLoginAttempt(user.id, email, ipAddress, userAgent, false, 'account_locked');
      throw new AccountLockedError(user.lockedUntil || undefined);
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      await this.handleFailedLogin(user);
      await this.logLoginAttempt(user.id, email, ipAddress, userAgent, false, 'invalid_password');
      throw new InvalidCredentialsError();
    }

    // Check account status
    if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.APPROVED) {
      await this.logLoginAttempt(user.id, email, ipAddress, userAgent, false, 'account_inactive');
      throw new AccountInactiveError(user.status);
    }

    // Check email verification
    if (!user.isEmailVerified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
      await this.logLoginAttempt(user.id, email, ipAddress, userAgent, false, 'email_not_verified');
      throw new EmailNotVerifiedError();
    }

    // Login successful - run non-critical tasks in parallel/background
    // Fire-and-forget for logging (non-critical)
    this.logLoginAttempt(user.id, email, ipAddress, userAgent, true).catch(err =>
      logger.warn('Failed to log login attempt (non-critical):', err)
    );

    // Generate session ID and tokens first (critical path)
    const sessionId = SessionSyncService.generateSessionId();
    const tokens = tokenUtils.generateTokens(user, 'neture.co.kr');

    // Prepare user updates
    const tokenFamily = tokenUtils.getTokenFamily(tokens.refreshToken);
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    if (tokenFamily) {
      user.refreshTokenFamily = tokenFamily;
    }

    // Prepare linked account update
    const emailAccount = user.linkedAccounts?.find(acc => acc.provider === 'email');
    if (emailAccount) {
      emailAccount.lastUsedAt = new Date();
    }

    // Run all DB saves and Redis operations in parallel
    const parallelTasks: Promise<any>[] = [
      this.userRepository.save(user),
    ];

    if (emailAccount) {
      parallelTasks.push(this.linkedAccountRepository.save(emailAccount));
    }

    // Session operations (non-critical, don't block login)
    SessionSyncService.checkConcurrentSessions(user.id).then(sessionCheck => {
      if (!sessionCheck.allowed) {
        SessionSyncService.enforceSessionLimit(user.id).catch(err =>
          logger.warn('Failed to enforce session limit (non-critical):', err)
        );
      }
    }).catch(err => logger.warn('Failed to check concurrent sessions (non-critical):', err));

    SessionSyncService.createSession(user, sessionId, { userAgent, ipAddress }).catch(err =>
      logger.warn('Failed to create session in Redis (non-critical):', err)
    );

    // Wait for critical DB saves
    await Promise.all(parallelTasks);

    // Get merged profile - pass preloaded user to avoid duplicate query
    const mergedProfile = await AccountLinkingService.getMergedProfile(user.id, undefined, user);

    return {
      success: true,
      user: user.toPublicData(),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn || 900 // 15 minutes
      },
      sessionId,
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
    // Find existing linked account
    const existingLinkedAccount = await this.linkedAccountRepository.findOne({
      where: {
        
        providerId: profile.id
      },
      relations: ['user', 'user.linkedAccounts']
    });

    if (existingLinkedAccount) {
      // Existing user login
      const user = existingLinkedAccount.user;

      // Check account status
      if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.APPROVED) {
        throw new AccountInactiveError(user.status);
      }

      // Update profile info if changed
      if (profile.displayName !== existingLinkedAccount.displayName ||
        profile.avatar !== existingLinkedAccount.profileImage) {
        existingLinkedAccount.displayName = profile.displayName;
        existingLinkedAccount.profileImage = profile.avatar;
        existingLinkedAccount.lastUsedAt = new Date();
        await this.linkedAccountRepository.save(existingLinkedAccount);
      }

      // Generate tokens
      const tokens = tokenUtils.generateTokens(user, 'neture.co.kr');

      // Log successful login
      await this.logLoginAttempt(user.id, profile.email, ipAddress, userAgent, true, undefined, provider);

      // Get merged profile
      const mergedProfile = await AccountLinkingService.getMergedProfile(user.id);

      return {
        success: true,
        user: user.toPublicData(),
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn || 900 // 15 minutes
        },
        sessionId: `oauth-${Date.now()}`,
        linkedAccounts: mergedProfile?.linkedAccounts || [],
        isNewUser: false
      };
    }

    // Check if email is already used by another account
    const existingUserByEmail = await this.userRepository.findOne({
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
      const tokens = tokenUtils.generateTokens(existingUserByEmail, 'neture.co.kr');

      // Log successful login
      await this.logLoginAttempt(existingUserByEmail.id, profile.email, ipAddress, userAgent, true, undefined, provider);

      // Get merged profile
      const mergedProfile = await AccountLinkingService.getMergedProfile(existingUserByEmail.id);

      return {
        success: true,
        user: existingUserByEmail.toPublicData(),
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn || 900 // 15 minutes
        },
        sessionId: `oauth-${Date.now()}`,
        linkedAccounts: mergedProfile?.linkedAccounts || [],
        isNewUser: false,
        autoLinked: true
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
      role: UserRole.USER,
      roles: [UserRole.USER],
      status: UserStatus.ACTIVE,
      isEmailVerified: profile.emailVerified || false,
      provider: provider,
      provider_id: profile.id,
      permissions: []
    });

    await this.userRepository.save(newUser);

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
      lastUsedAt: new Date()
    });

    await this.linkedAccountRepository.save(linkedAccount);

    // Generate tokens
    const tokens = tokenUtils.generateTokens(newUser, 'neture.co.kr');

    // Log new user creation and login
    await this.logLoginAttempt(newUser.id, profile.email, ipAddress, userAgent, true, undefined, provider);

    return {
      success: true,
      user: newUser.toPublicData(),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn || 900 // 15 minutes
      },
      sessionId: `oauth-${Date.now()}`,
      linkedAccounts: [linkedAccount],
      isNewUser: true
    };
  }

  // ============================================================================
  // Phase 1: Service User 인증 기반 (WO-AUTH-SERVICE-IDENTITY-PHASE1)
  // ============================================================================

  /**
   * Handle Service User login
   *
   * Service Users are authenticated via OAuth but:
   * - Do NOT create Platform User records
   * - Receive Service JWT (tokenType: 'service')
   * - Cannot access Admin/Operator APIs
   *
   * @param request - Service user login request with OAuth profile
   * @returns Service user login response with tokens
   */
  async handleServiceUserLogin(
    request: ServiceUserLoginRequest
  ): Promise<ServiceUserLoginResponse> {
    const { credentials, ipAddress, userAgent } = request;
    const { provider, oauthToken, serviceId, storeId } = credentials;

    try {
      // Phase 1: OAuth token validation
      // In production, this should validate the token with the OAuth provider
      // For now, we expect the caller to provide validated OAuth profile data
      const oauthProfile = await this.validateServiceOAuthToken(provider, oauthToken);

      if (!oauthProfile) {
        throw new InvalidCredentialsError();
      }

      // Create service user data (NOT stored in database)
      const serviceUser: ServiceUserData = {
        providerUserId: oauthProfile.id,
        provider: provider,
        email: oauthProfile.email,
        displayName: oauthProfile.displayName,
        profileImage: oauthProfile.avatar,
        serviceId: serviceId,
        storeId: storeId
      };

      // Generate Service tokens (tokenType: 'service')
      const tokens = tokenUtils.generateServiceTokens(serviceUser, 'neture.co.kr');

      // Log service user login (non-critical)
      this.logServiceUserLogin(serviceUser, ipAddress, userAgent).catch(err =>
        logger.warn('Failed to log service user login (non-critical):', err)
      );

      logger.info('Service user login successful', {
        provider,
        serviceId,
        storeId,
        email: serviceUser.email
      });

      return {
        success: true,
        user: serviceUser,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn || 900
        },
        tokenType: 'service'
      };
    } catch (error) {
      logger.error('Service user login error:', error);
      throw error;
    }
  }

  /**
   * Validate OAuth token with provider
   *
   * Phase 1: Basic validation structure
   * Phase 2: Full provider-specific validation
   *
   * @param provider - OAuth provider (google, kakao, naver)
   * @param oauthToken - OAuth access token or profile data
   * @returns OAuth profile or null if invalid
   */
  private async validateServiceOAuthToken(
    provider: 'google' | 'kakao' | 'naver',
    oauthToken: string
  ): Promise<OAuthProfile | null> {
    try {
      // Phase 1: Accept JSON-encoded profile data for testing
      // In production (Phase 2), this should call the OAuth provider API
      // to validate the token and fetch user profile

      // Try to parse as JSON profile (for Phase 1 testing)
      try {
        const profile = JSON.parse(oauthToken) as OAuthProfile;
        if (profile.id && profile.email) {
          return profile;
        }
      } catch {
        // Not JSON, continue to provider validation
      }

      // Phase 2 TODO: Implement provider-specific token validation
      // For now, log that real validation is needed
      logger.warn(`Service OAuth validation not fully implemented for provider: ${provider}`);

      // Return null to indicate validation failed
      // In Phase 2, this will be replaced with actual provider API calls
      return null;
    } catch (error) {
      logger.error('Service OAuth validation error:', error);
      return null;
    }
  }

  /**
   * Log service user login attempt
   */
  private async logServiceUserLogin(
    serviceUser: ServiceUserData,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      await this.activityRepository.save(
        this.activityRepository.create({
          userId: undefined, // Service users don't have platform user IDs
          type: `service_login_${serviceUser.provider}`,
          ipAddress,
          userAgent,
          details: {
            provider: serviceUser.provider,
            email: serviceUser.email,
            serviceId: serviceUser.serviceId,
            storeId: serviceUser.storeId,
            success: true
          }
        })
      );
    } catch (error) {
      logger.warn('Failed to log service user login:', error);
    }
  }

  // ============================================================================
  // Phase 3: Guest 인증 (WO-AUTH-SERVICE-IDENTITY-PHASE3-QR-GUEST-DEVICE)
  // ============================================================================

  /**
   * Issue Guest Token
   *
   * Guest tokens are for anonymous/temporary users:
   * - QR code entry at stores/kiosks
   * - Signage device access
   * - Anonymous browsing with tracking
   *
   * Guest tokens are:
   * - Short-lived (2 hours, no refresh)
   * - No DB user record created
   * - Can be upgraded to Service User token
   *
   * @param request - Guest token issue request
   * @returns Guest token response
   */
  async issueGuestToken(
    request: GuestTokenIssueRequest
  ): Promise<GuestTokenIssueResponse> {
    const { serviceId, storeId, deviceId, entryType, metadata } = request;

    try {
      // Generate unique guest session ID
      const guestSessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

      // Create guest user data (NOT stored in database)
      const guestData: GuestUserData = {
        guestSessionId,
        serviceId,
        storeId,
        deviceId,
        entryType,
        createdAt: now,
        expiresAt
      };

      // Generate Guest token (tokenType: 'guest')
      const accessToken = tokenUtils.generateGuestAccessToken(guestData, 'neture.co.kr');
      const tokenConfig = tokenUtils.getGuestTokenConfig();

      // Log guest token issuance (non-critical)
      this.logGuestTokenIssue(guestData, metadata).catch(err =>
        logger.warn('Failed to log guest token issue (non-critical):', err)
      );

      logger.info('Guest token issued', {
        guestSessionId,
        serviceId,
        storeId,
        entryType,
        deviceId
      });

      return {
        success: true,
        guestSessionId,
        tokens: {
          accessToken,
          expiresIn: tokenConfig.guestTokenExpiresIn
        },
        tokenType: 'guest',
        context: {
          serviceId,
          storeId,
          deviceId,
          entryType
        }
      };
    } catch (error) {
      logger.error('Guest token issue error:', error);
      throw error;
    }
  }

  /**
   * Upgrade Guest to Service User
   *
   * When a guest user authenticates via OAuth, their session
   * is "upgraded" (not "logged in") to a Service User session.
   *
   * This preserves:
   * - Guest activity tracking
   * - Cart/wishlist (if implemented)
   * - Entry context (store, device)
   *
   * @param request - Guest upgrade request
   * @returns Service user tokens and preserved activity info
   */
  async upgradeGuestToServiceUser(
    request: GuestUpgradeRequest
  ): Promise<GuestUpgradeResponse> {
    const { guestToken, credentials, ipAddress, userAgent } = request;

    try {
      // Verify guest token
      const guestPayload = tokenUtils.verifyAccessToken(guestToken);

      if (!guestPayload || guestPayload.tokenType !== 'guest') {
        throw new InvalidCredentialsError();
      }

      const guestSessionId = guestPayload.guestSessionId || guestPayload.userId || '';

      // Perform service user login
      const serviceLoginResult = await this.handleServiceUserLogin({
        credentials,
        ipAddress,
        userAgent
      });

      // Preserve guest context in service user session
      // (e.g., transfer cart, wishlist, activity)
      const activityPreserved = await this.transferGuestActivity(
        guestSessionId,
        serviceLoginResult.user.providerUserId
      );

      // Log upgrade event
      this.logGuestUpgrade(guestSessionId, serviceLoginResult.user, ipAddress).catch(err =>
        logger.warn('Failed to log guest upgrade (non-critical):', err)
      );

      logger.info('Guest upgraded to Service User', {
        guestSessionId,
        provider: serviceLoginResult.user.provider,
        serviceId: serviceLoginResult.user.serviceId,
        email: serviceLoginResult.user.email
      });

      return {
        success: true,
        user: serviceLoginResult.user,
        tokens: serviceLoginResult.tokens,
        tokenType: 'service',
        previousGuestSessionId: guestSessionId,
        activityPreserved
      };
    } catch (error) {
      logger.error('Guest upgrade error:', error);
      throw error;
    }
  }

  /**
   * Transfer guest activity to service user
   *
   * Phase 3: Stub implementation
   * Future: Transfer cart, wishlist, browsing history, etc.
   */
  private async transferGuestActivity(
    guestSessionId: string,
    serviceUserId: string
  ): Promise<boolean> {
    try {
      // Phase 3: Log transfer intent (actual transfer TBD)
      logger.info('Guest activity transfer requested', {
        guestSessionId,
        serviceUserId
      });

      // TODO: Implement actual activity transfer in future phases
      // - Cart items
      // - Wishlist items
      // - Browsing history
      // - Preferences

      return true;
    } catch (error) {
      logger.warn('Guest activity transfer failed:', error);
      return false;
    }
  }

  /**
   * Log guest token issuance
   */
  private async logGuestTokenIssue(
    guestData: GuestUserData,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.activityRepository.save(
        this.activityRepository.create({
          userId: undefined, // Guest users don't have platform user IDs
          type: 'guest_token_issue',
          ipAddress: metadata?.ipAddress || 'unknown',
          userAgent: metadata?.userAgent || 'unknown',
          details: {
            guestSessionId: guestData.guestSessionId,
            serviceId: guestData.serviceId,
            storeId: guestData.storeId,
            deviceId: guestData.deviceId,
            entryType: guestData.entryType,
            ...metadata
          }
        })
      );
    } catch (error) {
      logger.warn('Failed to log guest token issue:', error);
    }
  }

  /**
   * Log guest upgrade event
   */
  private async logGuestUpgrade(
    guestSessionId: string,
    serviceUser: ServiceUserData,
    ipAddress: string
  ): Promise<void> {
    try {
      await this.activityRepository.save(
        this.activityRepository.create({
          userId: undefined,
          type: 'guest_upgrade_to_service',
          ipAddress,
          userAgent: 'unknown',
          details: {
            guestSessionId,
            provider: serviceUser.provider,
            email: serviceUser.email,
            serviceId: serviceUser.serviceId,
            storeId: serviceUser.storeId
          }
        })
      );
    } catch (error) {
      logger.warn('Failed to log guest upgrade:', error);
    }
  }

  /**
   * Refresh tokens
   *
   * === Phase 2.5: Unified Error Handling ===
   * Returns specific error codes for frontend handling:
   * - REFRESH_TOKEN_EXPIRED: Token has expired (do NOT retry)
   * - REFRESH_TOKEN_INVALID: Token is malformed or signature invalid (do NOT retry)
   * - TOKEN_FAMILY_MISMATCH: Token rotation detected, possible theft (do NOT retry)
   * - USER_NOT_FOUND: User does not exist or is inactive (do NOT retry)
   *
   * @param refreshToken - Current refresh token
   * @returns New tokens or throws error with specific code
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Phase 2.5: Verify JWT token (includes issuer/audience check for server isolation)
    const payload = tokenUtils.verifyRefreshToken(refreshToken);

    if (!payload) {
      // Token is invalid, expired, or from a different server
      const error = new Error('Invalid or expired refresh token') as Error & { code: string };
      error.code = 'REFRESH_TOKEN_INVALID';
      throw error;
    }

    // Check token expiration explicitly for clearer error
    if (tokenUtils.isTokenExpired(refreshToken)) {
      const error = new Error('Refresh token has expired') as Error & { code: string };
      error.code = 'REFRESH_TOKEN_EXPIRED';
      throw error;
    }

    // Find user with matching token family
    const user = await this.userRepository.findOne({
      where: {
        id: payload.userId,
        isActive: true
      }
    });

    if (!user) {
      const error = new Error('User not found or inactive') as Error & { code: string };
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // Phase 2.5: Token family check for rotation security
    // If token family doesn't match, this could indicate token theft
    if (user.refreshTokenFamily && payload.tokenFamily &&
        user.refreshTokenFamily !== payload.tokenFamily) {
      logger.warn('Token family mismatch - possible token theft detected', {
        userId: user.id,
        expectedFamily: user.refreshTokenFamily,
        receivedFamily: payload.tokenFamily
      });

      // Invalidate all tokens for this user (security measure)
      user.refreshTokenFamily = null;
      await this.userRepository.save(user);

      const error = new Error('Token family mismatch - please login again') as Error & { code: string };
      error.code = 'TOKEN_FAMILY_MISMATCH';
      throw error;
    }

    // Generate new tokens (with rotation)
    const tokens = tokenUtils.generateTokens(user, 'neture.co.kr');

    // Update token family
    const tokenFamily = tokenUtils.getTokenFamily(tokens.refreshToken);
    if (tokenFamily) {
      user.refreshTokenFamily = tokenFamily;
      await this.userRepository.save(user);
    }

    return tokens;
  }

  /**
   * Verify access token
   *
   * @param token - Access token
   * @returns Token payload or null
   */
  verifyAccessToken(token: string): AccessTokenPayload | null {
    return tokenUtils.verifyAccessToken(token);
  }

  /**
   * Logout user
   *
   * @param userId - User ID
   */
  async logout(userId: string, sessionId?: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (user) {
      // Invalidate token family
      user.refreshTokenFamily = null;
      await this.userRepository.save(user);
    }

    // Remove SSO session
    if (sessionId) {
      await SessionSyncService.removeSession(sessionId, userId);
    }
  }

  /**
   * Logout from all devices
   *
   * @param userId - User ID
   */
  async logoutAll(userId: string): Promise<void> {
    await this.logout(userId);
    await SessionSyncService.removeAllUserSessions(userId);
  }

  /**
   * Set authentication cookies
   *
   * @param req - Express Request (for origin-based domain detection)
   * @param res - Express Response
   * @param tokens - Auth tokens
   * @param sessionId - Session ID (optional)
   */
  setAuthCookies(req: Request, res: Response, tokens: AuthTokens, sessionId?: string): void {
    cookieUtils.setAuthCookies(req, res, tokens);

    if (sessionId) {
      cookieUtils.setSessionCookie(req, res, sessionId);
    }
  }

  /**
   * Clear authentication cookies
   *
   * @param req - Express Request (for origin-based domain detection)
   * @param res - Express Response
   */
  clearAuthCookies(req: Request, res: Response): void {
    cookieUtils.clearAuthCookies(req, res);
  }

  /**
   * Get user by ID
   *
   * @param userId - User ID
   * @returns User or null
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({ where: { id: userId } });
    } catch (error) {
      logger.error('Get user by ID error:', error);
      return null;
    }
  }

  /**
   * Request password reset
   *
   * @param email - User email
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

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
    await this.userRepository.save(user);

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
   *
   * @param token - Reset token
   * @param newPassword - New password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: token }
    });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new InvalidPasswordResetTokenError();
    }

    // Hash new password
    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.userRepository.save(user);
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
   * Log login attempt
   */
  private async logLoginAttempt(
    userId: string | null,
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string,
    provider: AuthProvider = 'email'
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
            ...(failureReason && { reason: failureReason })
          }
        })
      );
    } catch (error) {
      logger.warn('Failed to log login attempt:', error);
    }
  }

  /**
   * Check if user can login with specific provider
   *
   * @param email - User email
   * @param provider - Auth provider
   * @returns True if can login, false otherwise
   */
  async canLogin(email: string, provider: AuthProvider): Promise<boolean> {
    const account = await this.linkedAccountRepository.findOne({
      where: { email, provider }
    });

    return !!account;
  }

  /**
   * Get available login providers for email
   *
   * @param email - User email
   * @returns Array of available providers
   */
  async getAvailableProviders(email: string): Promise<AuthProvider[]> {
    // Check linked accounts
    const linkedAccounts = await this.linkedAccountRepository.find({
      where: { email }
    });

    const providers = linkedAccounts.map(acc => acc.provider);

    // Check if user has password (can use email login)
    const user = await this.userRepository.findOne({
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
   * Auto-creates test accounts if they don't exist
   *
   * @returns Array of test account credentials
   */
  async getTestAccounts(): Promise<Array<{ role: string; email: string; password: string }>> {
    // Define roles we want to show in test panel
    const targetRoles: UserRole[] = [
      UserRole.ADMIN,
      UserRole.SELLER,
      UserRole.SUPPLIER,
      UserRole.PARTNER,
      UserRole.USER
    ];
    const testAccounts: Array<{ role: string; email: string; password: string }> = [];

    // All test accounts use the same password for convenience
    const testPassword = 'test123!@#';

    // Find or create one user for each role
    for (const role of targetRoles) {
      let user = await this.userRepository
        .createQueryBuilder('user')
        .where('user.role = :role', { role })
        .andWhere(
          '(user.email LIKE :pattern1 OR user.email LIKE :pattern2)',
          { pattern1: '%@test.com', pattern2: '%test%' }
        )
        .select(['user.id', 'user.email', 'user.role', 'user.password'])
        .limit(1)
        .getOne();

      // If user doesn't exist, create one
      if (!user) {
        const testEmail = `${role}@test.com`;
        user = this.userRepository.create({
          email: testEmail,
          name: `Test ${this.getRoleLabel(role)}`,
          password: await hashPassword(testPassword),
          role: role,
          roles: [role],
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          permissions: []
        });
        await this.userRepository.save(user);
        logger.info(`Created test account: ${testEmail} (${role})`);
      } else {
        // Update password and status if needed
        let needsUpdate = false;
        const isCorrectPassword = await comparePassword(testPassword, user.password || '');
        if (!isCorrectPassword) {
          user.password = await hashPassword(testPassword);
          needsUpdate = true;
        }
        if (user.status !== UserStatus.ACTIVE) {
          user.status = UserStatus.ACTIVE;
          needsUpdate = true;
        }
        if (!user.isEmailVerified) {
          user.isEmailVerified = true;
          needsUpdate = true;
        }
        if (needsUpdate) {
          await this.userRepository.save(user);
          logger.info(`Updated test account: ${user.email} (status: ACTIVE, verified: true)`);
        }
      }

      testAccounts.push({
        role: this.getRoleLabel(user.role),
        email: user.email,
        password: testPassword
      });
    }

    return testAccounts;
  }

  /**
   * Send find ID email
   *
   * @param email - User email
   */
  async sendFindIdEmail(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
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
      admin: '관리자',
      customer: '고객',
      supplier: '공급자'
    };
    return labels[role] || role;
  }
}

// Create singleton instance
let authenticationServiceInstance: AuthenticationService | null = null;

export const getAuthenticationService = (): AuthenticationService => {
  if (!authenticationServiceInstance) {
    authenticationServiceInstance = new AuthenticationService();
  }
  return authenticationServiceInstance;
};

// Export singleton instance
export const authenticationService = getAuthenticationService();
