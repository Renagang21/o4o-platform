import axios from 'axios';
import { AppDataSource } from '../database/connection';
import { User, UserRole, UserStatus } from '../entities/User';

const COMMON_CORE_AUTH_URL = process.env.COMMON_CORE_AUTH_URL || 'http://localhost:5000';

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  async handleUserFromToken(token: string): Promise<User | null> {
    try {
      // Common-Core 인증 서버에서 토큰 검증
      const authResponse = await axios.post(`${COMMON_CORE_AUTH_URL}/api/auth/verify`, {
        token: token
      });

      if (!authResponse.data.success) {
        return null;
      }

      const { userId, provider, provider_id } = authResponse.data.data;

      // O4O Platform에서 사용자 조회
      let user = await this.userRepository.findOne({ 
        where: { id: userId } 
      });

      // 사용자가 없으면 생성 (처음 로그인하는 소셜 사용자)
      if (!user) {
        user = await this.createUserFromSocialLogin(userId, provider, provider_id);
      }

      // 마지막 로그인 시간 업데이트
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);

      return user;
    } catch (error) {
      console.error('Auth service error:', error);
      return null;
    }
  }

  private async createUserFromSocialLogin(
    userId: string, 
    provider: string, 
    provider_id: string
  ): Promise<User> {
    const user = new User();
    user.id = userId; // Common-Core에서 제공하는 UUID 사용
    user.provider = provider;
    user.provider_id = provider_id;
    user.role = UserRole.CUSTOMER; // 기본값: 일반 고객
    user.status = UserStatus.APPROVED; // 소셜 로그인은 자동 승인
    user.lastLoginAt = new Date();
    user.approvedAt = new Date();
    user.approvedBy = 'system'; // 시스템 자동 승인

    return await this.userRepository.save(user);
  }

  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({ 
      where: { id: userId } 
    });
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;

    user.role = role;
    return await this.userRepository.save(user);
  }

  async updateUserBusinessInfo(userId: string, businessInfo: any): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;

    user.businessInfo = businessInfo;
    user.role = UserRole.BUSINESS; // 비즈니스 정보 등록 시 자동으로 비즈니스 사용자로 변경
    
    return await this.userRepository.save(user);
  }

  async suspendUser(userId: string): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;

    user.status = UserStatus.SUSPENDED;
    return await this.userRepository.save(user);
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    return await this.userRepository.find({ 
      where: { role },
      order: { createdAt: 'DESC' }
    });
  }
}