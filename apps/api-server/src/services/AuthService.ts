import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import { User } from '../modules/auth/entities/User.js';
import { BusinessInfo } from '../types/user.js';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  AuthTokens,
  LoginRequest,
  LoginResponse,
  UserRole,
  UserStatus,
  CookieConfig
} from '../types/auth.js';
import { RefreshTokenService } from './RefreshTokenService.js';
import * as tokenUtils from '../utils/token.utils.js';
import * as cookieUtils from '../utils/cookie.utils.js';
import {
  InvalidCredentialsError,
  AccountLockedError,
  AccountInactiveError,
  UserNotFoundError
} from '../errors/AuthErrors.js';

/**
 * @deprecated Use AuthenticationService instead (apps/api-server/src/services/authentication.service.ts)
 *
 * This service is maintained for backward compatibility only.
 * New code should use the unified AuthenticationService.
 *
 * Migration guide:
 * - AuthService.login() -> authenticationService.login({ provider: 'email', credentials, ... })
 * - AuthService.generateTokens() -> tokenUtils.generateTokens()
 * - AuthService.verifyAccessToken() -> tokenUtils.verifyAccessToken()
 * - AuthService.refreshTokens() -> authenticationService.refreshTokens()
 */
class AuthService {
  private userRepository: Repository<User>;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private cookieConfig: CookieConfig['options'];

  constructor(userRepository: Repository<User>) {
    this.userRepository = userRepository;
    
    // JWT 시크릿 필수 환경변수 검증
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }
    
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    
    // CLAUDE.md 정책 기반 쿠키 설정
    this.cookieConfig = {
      domain: '.neture.co.kr',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7일
    };
  }

  // 사용자 로그인 (Updated signature)
  async login(email: string, password: string, userAgent: string, ipAddress: string): Promise<LoginResponse & { sessionId: string }> {
    const domain = 'neture.co.kr';

    // 사용자 조회
    const user = await this.userRepository.findOne({ 
      where: { email, isActive: true } 
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // 계정 잠금 확인
    if (user.isLocked) {
      throw new Error('Account is temporarily locked. Please try again later.');
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      throw new Error('Invalid credentials');
    }

    // 로그인 성공 처리
    await this.handleSuccessfulLogin(user);

    // 토큰 생성
    const tokens = await this.generateTokens(user, domain);

    // Generate session ID for SSO
    const sessionId = uuidv4();

    return {
      success: true,
      user: user.toPublicData(),
      tokens,
      sessionId
    };
  }

  // JWT 토큰 생성 (Refactored to use token.utils)
  async generateTokens(user: User, domain: string): Promise<AuthTokens> {
    // Use centralized token generation
    const tokens = tokenUtils.generateTokens(user, domain);

    // Extract token family from refresh token for backward compatibility
    const tokenFamily = tokenUtils.getTokenFamily(tokens.refreshToken);

    // 사용자 토큰 패밀리 업데이트
    if (tokenFamily) {
      user.refreshTokenFamily = tokenFamily;
      await this.userRepository.save(user);
    }

    return tokens;
  }

  // Access Token 검증 (Refactored to use token.utils)
  verifyAccessToken(token: string): AccessTokenPayload | null {
    return tokenUtils.verifyAccessToken(token);
  }

  // Refresh Token으로 새 토큰 발급
  async refreshTokens(refreshToken: string, domain: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as RefreshTokenPayload;
      
      const user = await this.userRepository.findOne({
        where: { 
          id: payload.sub, 
          isActive: true,
          refreshTokenFamily: payload.tokenFamily 
        }
      });

      if (!user) {
        throw new Error('Invalid refresh token');
      }

      // 새 토큰 생성 (Refresh Token Rotation)
      return await this.generateTokens(user, domain);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  // 사용자 로그아웃 (토큰 무효화)
  async logout(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      // 토큰 패밀리 무효화
      user.refreshTokenFamily = null;
      await this.userRepository.save(user);
    }
  }

  // 비밀번호 해시화
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // 사용자 생성
  async createUser(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    permissions?: string[];
  }): Promise<User> {
    const hashedPassword = await this.hashPassword(userData.password);
    
    const user = this.userRepository.create({
      ...userData,
      password: hashedPassword,
      role: userData.role || UserRole.USER
    });

    return await this.userRepository.save(user);
  }

  // 역할별 기본 권한
  private getDefaultPermissions(role: UserRole): string[] {
    const permissions = {
      customer: ['read:products', 'create:orders', 'read:own_orders'],
      seller: ['read:products', 'create:products', 'update:own_products', 'read:own_orders', 'read:analytics'],
      supplier: ['create:products', 'update:own_products', 'read:inventory', 'manage:inventory'],
      manager: ['read:all', 'manage:store', 'read:analytics'],
      admin: ['*'] // 모든 권한
    };

    return permissions[role] || permissions.customer;
  }

  // 로그인 실패 처리
  private async handleFailedLogin(user: User): Promise<void> {
    user.loginAttempts += 1;
    
    // 5회 실패 시 30분 잠금
    if (user.loginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30분
    }
    
    await this.userRepository.save(user);
  }

  // 로그인 성공 처리
  private async handleSuccessfulLogin(user: User): Promise<void> {
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    
    await this.userRepository.save(user);
  }

  // 쿠키 설정 반환
  getCookieConfig(): CookieConfig {
    return {
      name: 'refreshToken',
      options: this.cookieConfig
    };
  }

  // === 추가된 메서드들 (Phase 2) ===

  // 사용자 ID로 조회
  async getUserById(id: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({ where: { id } });
    } catch (error) {
      // Error log removed
      return null;
    }
  }

  // 사용자 역할 변경
  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.update(userId, { role });
    const updatedUser = await this.getUserById(userId);
    if (!updatedUser) {
      throw new Error('Failed to update user role');
    }
    
    return updatedUser;
  }

  // 비즈니스 정보 업데이트
  async updateUserBusinessInfo(userId: string, businessInfo: BusinessInfo): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.update(userId, { businessInfo });
    const updatedUser = await this.getUserById(userId);
    if (!updatedUser) {
      throw new Error('Failed to update business info');
    }
    
    return updatedUser;
  }

  // 역할별 사용자 목록 조회
  async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      return await this.userRepository.find({ 
        where: { role, isActive: true },
        select: ['id', 'email', 'firstName', 'lastName', 'name', 'role', 'status', 'createdAt']
      });
    } catch (error) {
      // Error log removed
      return [];
    }
  }

  // 사용자 계정 정지
  async suspendUser(userId: string): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.update(userId, { 
      isActive: false, 
      status: UserStatus.SUSPENDED 
    });
    
    const suspendedUser = await this.getUserById(userId);
    if (!suspendedUser) {
      throw new Error('Failed to suspend user');
    }
    
    return suspendedUser;
  }

  // Request metadata extraction
  getRequestMetadata(req: Request): { userAgent: string; ipAddress: string } {
    const userAgent = req.get('user-agent') || 'unknown';
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    return { userAgent, ipAddress };
  }

  // Rotate refresh token (refresh token rotation)
  async rotateRefreshToken(refreshToken: string, userAgent: string, ipAddress: string): Promise<AuthTokens | null> {
    try {
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as RefreshTokenPayload;
      
      const user = await this.userRepository.findOne({
        where: { 
          id: payload.sub || payload.userId, 
          isActive: true,
          refreshTokenFamily: payload.tokenFamily 
        }
      });

      if (!user) {
        return null;
      }

      // Generate new tokens with rotation
      const domain = 'neture.co.kr'; // Default domain
      return await this.generateTokens(user, domain);
    } catch (error) {
      return null;
    }
  }

  // Set auth cookies (Refactored to use cookie.utils)
  setAuthCookies(req: Request, res: Response, tokens: AuthTokens): void {
    cookieUtils.setAuthCookies(req, res, tokens);
  }

  // Clear auth cookies (Refactored to use cookie.utils)
  clearAuthCookies(req: Request, res: Response): void {
    cookieUtils.clearAuthCookies(req, res);
  }

  // Revoke all user tokens
  async revokeAllUserTokens(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.refreshTokenFamily = null;
      await this.userRepository.save(user);
    }
  }
}

// Export the class
export { AuthService };

// Create singleton instance
let authServiceInstance: AuthService | null = null;

export const getAuthService = async (): Promise<AuthService> => {
  if (!authServiceInstance) {
    const { AppDataSource } = await import('../database/connection.js');
    const { User } = await import('../modules/auth/entities/User.js');
    const userRepository = AppDataSource.getRepository(User);
    authServiceInstance = new AuthService(userRepository);
  }
  return authServiceInstance;
};

// Export singleton instance for backward compatibility
export const authService = new Proxy({} as AuthService, {
  get(_target, prop, receiver) {
    const service = getAuthService();
    return Reflect.get(service, prop, receiver);
  }
});