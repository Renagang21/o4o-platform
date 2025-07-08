import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Repository } from 'typeorm';
import { User } from '../entities/User';
import { 
  AccessTokenPayload, 
  RefreshTokenPayload, 
  AuthTokens, 
  LoginRequest, 
  LoginResponse,
  UserRole,
  CookieConfig 
} from '../types/auth';

export class AuthService {
  private userRepository: Repository<User>;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private cookieConfig: CookieConfig;

  constructor(userRepository: Repository<User>) {
    this.userRepository = userRepository;
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
    
    // CLAUDE.md 정책 기반 쿠키 설정
    this.cookieConfig = {
      domain: '.neture.co.kr',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
      path: '/'
    };
  }

  // 사용자 로그인
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    const { email, password, domain = 'neture.co.kr' } = loginData;

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

    return {
      success: true,
      user: user.toPublicData(),
      tokens
    };
  }

  // JWT 토큰 생성
  async generateTokens(user: User, domain: string): Promise<AuthTokens> {
    const tokenFamily = uuidv4();
    
    // Access Token (15분)
    const accessTokenPayload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      permissions: user.permissions,
      domain,
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15분
      iat: Math.floor(Date.now() / 1000)
    };

    // Refresh Token (7일)
    const refreshTokenPayload: RefreshTokenPayload = {
      sub: user.id,
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
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as AccessTokenPayload;
      
      // 사용자 존재 및 활성 상태 확인
      const user = await this.userRepository.findOne({
        where: { id: payload.sub, isActive: true }
      });

      if (!user) {
        throw new Error('User not found or inactive');
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
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
      role: userData.role || 'customer',
      permissions: userData.permissions || this.getDefaultPermissions(userData.role || 'customer')
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
    return this.cookieConfig;
  }
}