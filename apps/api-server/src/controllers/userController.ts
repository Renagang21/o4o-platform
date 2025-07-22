import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { UserRole, AuthRequest } from '../types/auth';
import { AppDataSource } from '../database/connection';
import { User } from '../entities/User';

export class UserController {
  private authService: AuthService;

  constructor() {
    const userRepository = AppDataSource.getRepository(User);
    this.authService = new AuthService(userRepository);
  }

  // 현재 사용자 정보 조회
  async getProfile(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = await this.authService.getUserById(authReq.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          provider: user.provider,
          role: user.role,
          status: user.status,
          businessInfo: user.businessInfo,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  // 사용자 역할 업데이트 (관리자만)
  async updateUserRole(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!Object.values(UserRole).includes(role as UserRole)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role'
        });
      }

      const user = await this.authService.updateUserRole(userId, role);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user,
        message: `User role updated to ${role}`
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  // 비즈니스 정보 업데이트
  async updateBusinessInfo(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { businessInfo } = req.body;

      // 비즈니스 정보 유효성 검사
      if (!businessInfo.businessName || !businessInfo.businessType) {
        return res.status(400).json({
          success: false,
          message: 'Business name and type are required'
        });
      }

      const user = await this.authService.updateUserBusinessInfo(authReq.user.id, businessInfo);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user,
        message: 'Business information updated successfully'
      });
    } catch (error) {
      console.error('Update business info error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // 사용자 목록 조회 (관리자만)
  async getUsers(req: Request, res: Response) {
    try {
      const { role } = req.query;

      let users;
      if (role && Object.values(UserRole).includes(role as UserRole)) {
        users = await this.authService.getUsersByRole(role as UserRole);
      } else {
        // 모든 사용자 조회 로직을 추가할 수 있습니다
        return res.status(400).json({
          success: false,
          message: 'Role parameter is required'
        });
      }

      res.json({
        success: true,
        data: users,
        total: users.length
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // 사용자 정지 (관리자만)
  async suspendUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const user = await this.authService.suspendUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user,
        message: 'User suspended successfully'
      });
    } catch (error) {
      console.error('Suspend user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}