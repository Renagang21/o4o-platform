import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AppDataSource } from '../database/connection';
import { User, UserStatus, UserRole } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';
import { Request, Response } from 'express';
import { SessionSyncService } from './sessionSyncService';

interface TokenPayload {
  id: string;
  userId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';
  private static readonly REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret';
  
  /**
   * Generate both access and refresh tokens
   */
  static async generateTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    };

    const accessToken = jwt.sign(
      payload,
      this.JWT_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      payload,
      this.REFRESH_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Create and store refresh token in database
   */
  static async createRefreshToken(
    user: User, 
    tokenFamily: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
    
    // Generate unique token
    const tokenValue = crypto.randomBytes(32).toString('hex');
    
    // Create refresh token entity
    const refreshToken = new RefreshToken();
    refreshToken.token = tokenValue;
    refreshToken.userId = user.id;
    refreshToken.user = user;
    refreshToken.family = tokenFamily;
    refreshToken.expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY_MS);
    refreshToken.userAgent = userAgent;
    refreshToken.ipAddress = ipAddress;
    
    await refreshTokenRepo.save(refreshToken);
    
    return tokenValue;
  }

  /**
   * Validate and rotate refresh token
   */
  static async rotateRefreshToken(
    oldToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthTokens | null> {
    const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
    const userRepo = AppDataSource.getRepository(User);
    
    // Find the old token
    const existingToken = await refreshTokenRepo.findOne({
      where: { token: oldToken, isRevoked: false },
      relations: ['user']
    });
    
    if (!existingToken || existingToken.expiresAt < new Date()) {
      // Token doesn't exist or expired
      return null;
    }
    
    // Check if token family is compromised
    const familyTokens = await refreshTokenRepo.find({
      where: { family: existingToken.family }
    });
    
    // If we find any revoked tokens in the family, revoke all
    if (familyTokens.some(t => t.isRevoked)) {
      await refreshTokenRepo.update(
        { family: existingToken.family },
        { isRevoked: true }
      );
      return null;
    }
    
    // Revoke old token
    existingToken.isRevoked = true;
    await refreshTokenRepo.save(existingToken);
    
    // Create new token with same family
    const newToken = await this.createRefreshToken(
      existingToken.user,
      existingToken.family,
      userAgent,
      ipAddress
    );
    
    // Generate new access token
    const tokens = await this.generateTokens(existingToken.user);
    
    return {
      accessToken: tokens.accessToken,
      refreshToken: newToken
    };
  }

  /**
   * Set auth cookies
   */
  static setAuthCookies(res: Response, tokens: AuthTokens): void {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      domain: process.env.COOKIE_DOMAIN || undefined // Enable cross-subdomain if set
    };
    
    // Set access token as httpOnly cookie
    res.cookie('accessToken', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

  /**
   * Clear auth cookies
   */
  static clearAuthCookies(res: Response): void {
    const cookieOptions = {
      domain: process.env.COOKIE_DOMAIN || undefined
    };
    
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
  }

  /**
   * Revoke all tokens for a user
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
    await refreshTokenRepo.update(
      { userId },
      { isRevoked: true }
    );
  }

  /**
   * Login user and return tokens
   */
  static async login(
    email: string,
    password: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ user: User; tokens: AuthTokens; sessionId: string } | null> {
    const userRepo = AppDataSource.getRepository(User);
    
    const user = await userRepo.findOne({
      where: { email },
      select: ['id', 'email', 'name', 'role', 'status', 'password', 'businessInfo']
    });
    
    if (!user || !user.password) {
      return null;
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return null;
    }
    
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error(`Account is ${user.status}`);
    }
    
    // Generate tokens
    const tokens = await this.generateTokens(user);
    
    // Create refresh token family
    const tokenFamily = crypto.randomBytes(16).toString('hex');
    const refreshToken = await this.createRefreshToken(
      user,
      tokenFamily,
      userAgent,
      ipAddress
    );
    
    // Update last login
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await userRepo.save(user);
    
    // Create SSO session
    const sessionId = SessionSyncService.generateSessionId();
    await SessionSyncService.createSession(user, sessionId);
    
    return {
      user,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken
      },
      sessionId
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Extract user agent and IP from request
   */
  static getRequestMetadata(req: Request): { userAgent?: string; ipAddress?: string } {
    return {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip || req.socket.remoteAddress
    };
  }
}