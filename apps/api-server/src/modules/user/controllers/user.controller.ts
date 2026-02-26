import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { BaseController } from '../../../common/base.controller.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../../auth/entities/User.js';
import { UpdateProfileDto, ChangePasswordDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';
import { env } from '../../../utils/env-validator.js';

/**
 * User Controller - NextGen Pattern
 *
 * Handles user profile and settings operations:
 * - Get profile
 * - Update profile
 * - Change password
 * - Get sessions
 * - Delete session
 * - Get profile completeness
 */
export class UserController extends BaseController {
  /**
   * GET /api/v1/users/profile
   * Get current user profile
   *
   * WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1: 이름 구조 확장
   * - firstName, lastName, nickname, displayName 필드 추가
   */
  static async getProfile(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: req.user.id },
        select: ['id', 'email', 'name', 'firstName', 'lastName', 'nickname', 'phone', 'avatar', 'status', 'createdAt', 'updatedAt'],
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      return BaseController.ok(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          nickname: user.nickname || null,
          displayName: user.displayName,  // 계산된 표시명
          phone: user.phone || null,
          avatar: user.avatar || null,
          status: user.status,
          roles: (user.roles || []).map((r: string) => ({ name: r })), // Phase3-E: dbRoles removed
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error('[UserController.getProfile] Error', {
        error: error.message,
        userId: req.user.id,
      });
      return BaseController.error(res, 'Failed to get profile');
    }
  }

  /**
   * PUT /api/v1/users/profile
   * Update current user profile
   *
   * WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1: 이름 구조 확장
   * - firstName, lastName, nickname 필드 지원 추가
   */
  static async updateProfile(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    const data = req.body as UpdateProfileDto;

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: req.user.id },
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Update fields
      if (data.name) user.name = data.name;
      if (data.firstName !== undefined) user.firstName = data.firstName;
      if (data.lastName !== undefined) user.lastName = data.lastName;
      if (data.nickname !== undefined) user.nickname = data.nickname;
      if (data.phone !== undefined) user.phone = data.phone;
      if (data.avatar !== undefined) user.avatar = data.avatar;

      // Email change requires verification (not implemented here)
      if (data.email && data.email !== user.email) {
        return BaseController.error(res, 'Email change requires verification', 400);
      }

      user.updatedAt = new Date();
      await userRepository.save(user);

      return BaseController.ok(res, {
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          nickname: user.nickname,
          displayName: user.displayName,  // 계산된 표시명
          phone: user.phone,
          avatar: user.avatar,
        },
      });
    } catch (error: any) {
      logger.error('[UserController.updateProfile] Error', {
        error: error.message,
        userId: req.user.id,
      });
      return BaseController.error(res, 'Failed to update profile');
    }
  }

  /**
   * PUT /api/v1/users/password
   * Change password
   */
  static async changePassword(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    const data = req.body as ChangePasswordDto;

    try {
      // Check password confirmation
      if (data.newPassword !== data.newPasswordConfirm) {
        return BaseController.error(res, 'Passwords do not match', 400);
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: req.user.id },
        select: ['id', 'password'],
      });

      if (!user || !user.password) {
        return BaseController.notFound(res, 'User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(data.currentPassword, user.password);
      if (!isValidPassword) {
        return BaseController.error(res, 'Current password is incorrect', 400);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(data.newPassword, env.getNumber('BCRYPT_ROUNDS', 12));
      user.password = hashedPassword;
      user.updatedAt = new Date();

      await userRepository.save(user);

      return BaseController.ok(res, {
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      logger.error('[UserController.changePassword] Error', {
        error: error.message,
        userId: req.user.id,
      });
      return BaseController.error(res, 'Failed to change password');
    }
  }

  /**
   * GET /api/v1/users/sessions
   * Get user sessions
   */
  static async getSessions(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    try {
      const { RefreshToken } = await import('../../auth/entities/RefreshToken.js');
      const sessionRepository = AppDataSource.getRepository(RefreshToken);

      const sessions = await sessionRepository.find({
        where: { userId: req.user.id },
        order: { createdAt: 'DESC' },
      });

      return BaseController.ok(res, {
        sessions: sessions.map(s => ({
          id: s.id,
          deviceId: s.deviceId || 'Unknown device',
          ipAddress: s.ipAddress,
          lastActiveAt: s.updatedAt || s.createdAt,
          createdAt: s.createdAt,
        })),
      });
    } catch (error: any) {
      logger.error('[UserController.getSessions] Error', {
        error: error.message,
        userId: req.user.id,
      });
      return BaseController.error(res, 'Failed to get sessions');
    }
  }

  /**
   * DELETE /api/v1/users/sessions/:sessionId
   * Delete a specific session
   */
  static async deleteSession(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    const { sessionId } = req.params;

    try {
      const { RefreshToken } = await import('../../auth/entities/RefreshToken.js');
      const sessionRepository = AppDataSource.getRepository(RefreshToken);

      const session = await sessionRepository.findOne({
        where: { id: sessionId, userId: req.user.id },
      });

      if (!session) {
        return BaseController.notFound(res, 'Session not found');
      }

      await sessionRepository.remove(session);

      return BaseController.ok(res, {
        message: 'Session deleted successfully',
      });
    } catch (error: any) {
      logger.error('[UserController.deleteSession] Error', {
        error: error.message,
        userId: req.user.id,
        sessionId,
      });
      return BaseController.error(res, 'Failed to delete session');
    }
  }

  /**
   * GET /api/v1/users/me/contact
   * Get current user's external contact settings
   * WO-NETURE-EXTERNAL-CONTACT-V1
   */
  static async getContactSettings(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: req.user.id },
        select: ['id', 'contactEnabled', 'kakaoOpenChatUrl', 'kakaoChannelUrl'],
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      return BaseController.ok(res, {
        contactEnabled: user.contactEnabled,
        kakaoOpenChatUrl: user.kakaoOpenChatUrl || null,
        kakaoChannelUrl: user.kakaoChannelUrl || null,
      });
    } catch (error: any) {
      logger.error('[UserController.getContactSettings] Error', {
        error: error.message,
        userId: req.user.id,
      });
      return BaseController.error(res, 'Failed to get contact settings');
    }
  }

  /**
   * PATCH /api/v1/users/me/contact
   * Update current user's external contact settings
   * WO-NETURE-EXTERNAL-CONTACT-V1
   */
  static async updateContactSettings(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    const { contactEnabled, kakaoOpenChatUrl, kakaoChannelUrl } = req.body;

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: req.user.id },
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Validate KakaoTalk URLs if provided
      if (kakaoOpenChatUrl !== undefined) {
        if (kakaoOpenChatUrl !== null && kakaoOpenChatUrl !== '') {
          // Basic URL validation for Kakao open chat
          if (!kakaoOpenChatUrl.startsWith('https://open.kakao.com/')) {
            return BaseController.error(res, 'Invalid Kakao Open Chat URL format', 400);
          }
        }
        user.kakaoOpenChatUrl = kakaoOpenChatUrl || undefined;
      }

      if (kakaoChannelUrl !== undefined) {
        if (kakaoChannelUrl !== null && kakaoChannelUrl !== '') {
          // Basic URL validation for Kakao channel
          if (!kakaoChannelUrl.startsWith('https://pf.kakao.com/')) {
            return BaseController.error(res, 'Invalid Kakao Channel URL format', 400);
          }
        }
        user.kakaoChannelUrl = kakaoChannelUrl || undefined;
      }

      if (typeof contactEnabled === 'boolean') {
        user.contactEnabled = contactEnabled;
      }

      user.updatedAt = new Date();
      await userRepository.save(user);

      return BaseController.ok(res, {
        message: 'Contact settings updated successfully',
        contactEnabled: user.contactEnabled,
        kakaoOpenChatUrl: user.kakaoOpenChatUrl || null,
        kakaoChannelUrl: user.kakaoChannelUrl || null,
      });
    } catch (error: any) {
      logger.error('[UserController.updateContactSettings] Error', {
        error: error.message,
        userId: req.user.id,
      });
      return BaseController.error(res, 'Failed to update contact settings');
    }
  }

  /**
   * GET /api/v1/users/profile/completeness
   * Get profile completeness percentage
   */
  static async getProfileCompleteness(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: req.user.id },
        select: ['id', 'email', 'name', 'phone', 'avatar'],
      });

      if (!user) {
        return BaseController.notFound(res, 'User not found');
      }

      // Calculate completeness
      const fields = {
        email: !!user.email,
        name: !!user.name,
        phone: !!user.phone,
        avatar: !!user.avatar,
      };

      const completed = Object.values(fields).filter(Boolean).length;
      const total = Object.keys(fields).length;
      const percentage = Math.round((completed / total) * 100);

      return BaseController.ok(res, {
        completeness: percentage,
        fields: {
          email: fields.email,
          name: fields.name,
          phone: fields.phone,
          avatar: fields.avatar,
        },
        missingFields: Object.entries(fields)
          .filter(([_, value]) => !value)
          .map(([key]) => key),
      });
    } catch (error: any) {
      logger.error('[UserController.getProfileCompleteness] Error', {
        error: error.message,
        userId: req.user.id,
      });
      return BaseController.error(res, 'Failed to calculate completeness');
    }
  }
}
