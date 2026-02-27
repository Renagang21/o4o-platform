import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { User } from '../modules/auth/entities/User.js';
import {
  AccessTokenPayload,
  AuthTokens,
  LoginRequest,
  LoginResponse,
  UserRole
} from '../types/auth.js';
import { userService } from '../modules/auth/services/user.service.js';
import { refreshTokenService } from '../modules/auth/services/refresh-token.service.js';
import { RefreshTokenService as RefreshTokenServiceStub } from './RefreshTokenService.js';
import { SessionSyncService } from './sessionSyncService.js';
import { LoginSecurityService } from './LoginSecurityService.js';
import * as tokenUtils from '../utils/token.utils.js';
import * as cookieUtils from '../utils/cookie.utils.js';
import { roleAssignmentService } from '../modules/auth/services/role-assignment.service.js';
import { comparePassword } from '../modules/auth/utils/auth.utils.js';
import {
  InvalidCredentialsError,
  AccountLockedError,
  AccountInactiveError,
  EmailNotVerifiedError,
  TooManyAttemptsError
} from '../errors/AuthErrors.js';

interface TokenMetadata {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * @deprecated Use AuthenticationService instead (apps/api-server/src/services/authentication.service.ts)
 *
 * This service is maintained for backward compatibility only.
 * New code should use the unified AuthenticationService.
 *
 * Migration guide:
 * - AuthServiceV2.login() -> authenticationService.login({ provider: 'email', credentials, ... })
 * - AuthServiceV2.generateTokens() -> tokenUtils.generateTokens()
 * - AuthServiceV2.verifyAccessToken() -> tokenUtils.verifyAccessToken()
 * - AuthServiceV2.refreshTokens() -> authenticationService.refreshTokens()
 * - AuthServiceV2.setAuthCookies() -> cookieUtils.setAuthCookies()
 * - AuthServiceV2.clearAuthCookies() -> cookieUtils.clearAuthCookies()
 */
export class AuthServiceV2 {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'jwt-secret';
  private static readonly JWT_EXPIRES_IN = '15m';

  /**
   * User login
   */
  static async login(
    email: string, 
    password: string, 
    userAgent?: string, 
    ipAddress?: string
  ): Promise<LoginResponse | null> {
    const ip = ipAddress || 'unknown';
    
    try {
      // Check if login is allowed (rate limiting)
      const loginCheck = await LoginSecurityService.isLoginAllowed(email, ip);
      if (!loginCheck.allowed) {
        await LoginSecurityService.recordLoginAttempt({
          email,
          ipAddress: ip,
          userAgent,
          success: false,
          failureReason: loginCheck.reason
        });
        
        if (loginCheck.reason === 'account_locked') {
          throw new Error('Account is temporarily locked due to multiple failed login attempts');
        } else if (loginCheck.reason === 'too_many_attempts_from_ip') {
          throw new Error('Too many login attempts from this IP address. Please try again later.');
        } else {
          throw new Error('Too many failed login attempts. Please try again later.');
        }
      }

      // Find user
      const user = await userService.findByEmail(email);
      if (!user) {
        await LoginSecurityService.recordLoginAttempt({
          email,
          ipAddress: ip,
          userAgent,
          success: false,
          failureReason: 'account_not_found'
        });
        return null;
      }

      // Check if account is locked
      if (userService.isAccountLocked(user)) {
        await LoginSecurityService.recordLoginAttempt({
          email,
          ipAddress: ip,
          userAgent,
          success: false,
          failureReason: 'account_locked'
        });
        throw new Error('Account is temporarily locked due to multiple failed login attempts');
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        await userService.handleFailedLogin(user);
        await LoginSecurityService.recordLoginAttempt({
          email,
          ipAddress: ip,
          userAgent,
          success: false,
          failureReason: 'invalid_password'
        });
        return null;
      }

      // Check user status
      if (!user.isActive) {
        await LoginSecurityService.recordLoginAttempt({
          email,
          ipAddress: ip,
          userAgent,
          success: false,
          failureReason: 'account_inactive'
        });
        throw new Error('Account is not active');
      }

      if (!user.isEmailVerified) {
        await LoginSecurityService.recordLoginAttempt({
          email,
          ipAddress: ip,
          userAgent,
          success: false,
          failureReason: 'email_not_verified'
        });
        throw new Error('Please verify your email before logging in');
      }

      // Successful login
      await LoginSecurityService.recordLoginAttempt({
        email,
        ipAddress: ip,
        userAgent,
        success: true
      });

      // Check concurrent sessions
      const sessionCheck = await SessionSyncService.checkConcurrentSessions(user.id);
      if (!sessionCheck.allowed) {
        // Enforce session limit by removing oldest session
        await SessionSyncService.enforceSessionLimit(user.id);
      }

      // Generate session ID for SSO
      const sessionId = SessionSyncService.generateSessionId();

      // Create session with device info
      await SessionSyncService.createSession(user, sessionId, { userAgent, ipAddress });

      // Generate tokens
      const tokens = await this.generateTokens(user, { userAgent, ipAddress });
      
      // Update login info
      await userService.handleSuccessfulLogin(user);

      return {
        success: true,
        user: user.toPublicData ? user.toPublicData() : {
          id: user.id,
          email: user.email,
          name: user.name,
          role: (user.roles?.[0] as UserRole) || UserRole.USER,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        tokens,
        sessionId
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred during login');
    }
  }

  /**
   * Generate access and refresh tokens (Refactored to use token.utils)
   */
  static async generateTokens(
    user: User,
    metadata?: TokenMetadata
  ): Promise<AuthTokens> {
    // Use centralized token generation
    const roles = await roleAssignmentService.getRoleNames(user.id);
    const tokens = tokenUtils.generateTokens(user, roles, 'neture.co.kr');

    // Note: RefreshTokenService integration can be done separately if needed
    // For now, using the centralized token generation

    return tokens;
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshTokens(
    refreshToken: string,
    metadata?: TokenMetadata
  ): Promise<AuthTokens | null> {
    try {
      // Verify refresh token
      const verifyResult = await refreshTokenService.verifyRefreshToken(refreshToken);

      if (!verifyResult.valid || !verifyResult.user) {
        return null;
      }

      const user = verifyResult.user;

      // Check if user is still active
      if (!user.isActive) {
        return null;
      }

      // Generate new tokens
      return await this.generateTokens(user, metadata);
    } catch (error) {
      // Error log removed
      return null;
    }
  }

  /**
   * Verify access token (Refactored to use token.utils)
   */
  static verifyAccessToken(token: string): AccessTokenPayload | null {
    return tokenUtils.verifyAccessToken(token);
  }

  /**
   * Logout user
   */
  static async logout(userId: string): Promise<void> {
    await refreshTokenService.revokeAllUserTokens(userId);
  }

  /**
   * Set authentication cookies (Refactored to use cookie.utils)
   */
  static setAuthCookies(req: Request, res: Response, tokens: AuthTokens): void {
    cookieUtils.setAuthCookies(req, res, tokens);
  }

  /**
   * Clear authentication cookies (Refactored to use cookie.utils)
   */
  static clearAuthCookies(req: Request, res: Response): void {
    cookieUtils.clearAuthCookies(req, res);
  }

  /**
   * Get request metadata
   */
  static getRequestMetadata(req: any): TokenMetadata {
    return {
      userAgent: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.connection?.remoteAddress || 'Unknown'
    };
  }
}