import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { User } from '../entities/User.js';
import { 
  AccessTokenPayload, 
  AuthTokens, 
  LoginRequest, 
  LoginResponse,
  UserRole
} from '../types/auth.js';
import { UserService } from './UserService.js';
import { RefreshTokenService } from './RefreshTokenService.js';
import { SessionSyncService } from './sessionSyncService.js';
import { LoginSecurityService } from './LoginSecurityService.js';

interface TokenMetadata {
  userAgent?: string;
  ipAddress?: string;
}

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
      const user = await UserService.getUserByEmail(email);
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
      if (UserService.isAccountLocked(user)) {
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
      const isValidPassword = await UserService.comparePassword(password, user.password);
      if (!isValidPassword) {
        await UserService.handleFailedLogin(user);
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
      await UserService.handleSuccessfulLogin(user);

      return {
        success: true,
        user: user.toPublicData ? user.toPublicData() : {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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
   * Generate access and refresh tokens
   */
  static async generateTokens(
    user: User, 
    metadata?: TokenMetadata
  ): Promise<AuthTokens> {
    // Generate access token
    const accessTokenPayload: AccessTokenPayload = {
      userId: user.id,
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      domain: 'neture.co.kr',
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      iat: Math.floor(Date.now() / 1000)
    };

    const accessToken = jwt.sign(accessTokenPayload, this.JWT_SECRET);
    
    // Generate refresh token via RefreshTokenService
    const tokenFamily = RefreshTokenService.generateTokenFamily();
    const refreshToken = await RefreshTokenService.generateRefreshToken(
      user,
      tokenFamily,
      metadata
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshTokens(
    refreshToken: string,
    metadata?: TokenMetadata
  ): Promise<AuthTokens | null> {
    try {
      // Rotate refresh token
      const rotationResult = await RefreshTokenService.rotateRefreshToken(
        refreshToken,
        metadata
      );

      if (!rotationResult) {
        return null;
      }

      // Verify the new refresh token
      const payload = await RefreshTokenService.verifyRefreshToken(rotationResult.token);
      if (!payload) {
        return null;
      }

      // Get user
      const user = await UserService.getUserById(payload.userId);
      if (!user || !user.isActive) {
        return null;
      }

      // Generate new access token
      const accessTokenPayload: AccessTokenPayload = {
        userId: user.id,
        sub: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        domain: 'neture.co.kr',
        exp: Math.floor(Date.now() / 1000) + (15 * 60),
        iat: Math.floor(Date.now() / 1000)
      };

      const accessToken = jwt.sign(accessTokenPayload, this.JWT_SECRET);

      return {
        accessToken,
        refreshToken: rotationResult.refreshToken,
        expiresIn: 15 * 60
      };
    } catch (error) {
      // Error log removed
      return null;
    }
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as AccessTokenPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Logout user
   */
  static async logout(userId: string): Promise<void> {
    await RefreshTokenService.revokeAllUserTokens(userId);
  }

  /**
   * Set authentication cookies
   */
  static setAuthCookies(res: Response, tokens: AuthTokens): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN;

    const baseCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      ...(cookieDomain && { domain: cookieDomain })
    };

    // Access token cookie
    res.cookie('accessToken', tokens.accessToken, {
      ...baseCookieOptions,
      maxAge: tokens.expiresIn * 1000 // Convert to milliseconds
    });

    // Refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      ...baseCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

  /**
   * Clear authentication cookies
   */
  static clearAuthCookies(res: Response): void {
    const cookieDomain = process.env.COOKIE_DOMAIN;
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      ...(cookieDomain && { domain: cookieDomain })
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('sessionId', cookieOptions);
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