import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import { User } from '../entities/User';
import { BusinessInfo } from '../types/user';
import { 
  AccessTokenPayload, 
  RefreshTokenPayload, 
  AuthTokens, 
  LoginRequest, 
  LoginResponse,
  UserRole,
  UserStatus,
  CookieConfig 
} from '../types/auth';

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

  // JWT 토큰 생성
  async generateTokens(user: User, domain: string): Promise<AuthTokens> {
    const tokenFamily = uuidv4();
    
    // Access Token (15분)
    const accessTokenPayload: AccessTokenPayload = {
      userId: user.id,
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      domain,
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15분
      iat: Math.floor(Date.now() / 1000)
    };

    // Refresh Token (7일)
    const refreshTokenPayload: RefreshTokenPayload = {
      userId: user.id,
      sub: user.id,
      tokenVersion: 1,
      tokenFamily,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7일
      iat: Math.floor(Date.now() / 1000)
    };

    const accessToken = jwt.sign(accessTokenPayload, this.jwtSecret);
    const refreshToken = jwt.sign(refreshTokenPayload, this.jwtRefreshSecret);

    // 사용자 토큰 패밀리 업데이트
    user.refreshTokenFamily = tokenFamily;
    await this.userRepository.save(user);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15분 (초)
    };
  }

  // Access Token 검증
  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as AccessTokenPayload;
      
      // Return the payload with all required fields
      return {
        userId: payload.userId || payload.sub || '',
        email: payload.email || '',
        role: payload.role || UserRole.CUSTOMER,
        ...payload
      };
    } catch (error) {
      return null;
    }
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
      role: userData.role || UserRole.CUSTOMER
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
      console.error('Error getting user by id:', error);
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
      console.error('Error getting users by role:', error);
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

  // Set auth cookies
  setAuthCookies(res: Response, tokens: AuthTokens): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Access token cookie
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    // Refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

  // Clear auth cookies
  clearAuthCookies(res: Response): void {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('sessionId');
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

export const getAuthService = (): AuthService => {
  if (!authServiceInstance) {
    const { AppDataSource } = require('../database/connection');
    const { User } = require('../entities/User');
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