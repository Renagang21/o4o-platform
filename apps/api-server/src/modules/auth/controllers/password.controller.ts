import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { BaseController } from '../../../common/base.controller.js';
import { PasswordResetService } from '../../../services/passwordResetService.js';
import { PasswordResetRequestDto, PasswordResetDto } from '../dto/index.js';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../../../entities/User.js';
import logger from '../../../utils/logger.js';
import { RedisService } from '../../../services/redis.service.js';
import { authenticationService } from '../../../services/authentication.service.js';
import { roleAssignmentService } from '../services/role-assignment.service.js';
import * as tokenUtils from '../../../utils/token.utils.js';

/**
 * Password Controller - NextGen Pattern
 *
 * Handles password-related operations:
 * - Forgot password (request reset)
 * - Reset password (with token)
 * - Find ID (account lookup by phone)
 */
export class PasswordController extends BaseController {
  /** Allowed origins for password reset email links */
  private static readonly ALLOWED_ORIGINS = [
    'https://neture.co.kr',
    'https://glycopharm.co.kr',
    'https://glucoseview.co.kr',
    'https://k-cosmetics.o4o.com',
    'https://kpa-society.o4o.com',
    'https://admin.neture.co.kr',
    'http://localhost:',
  ];

  /**
   * POST /api/v1/auth/forgot-password
   * Request password reset email
   */
  static async forgotPassword(req: Request, res: Response): Promise<any> {
    const { email, serviceUrl } = req.body as PasswordResetRequestDto & { serviceUrl?: string };

    try {
      // Validate serviceUrl against whitelist
      let validatedServiceUrl: string | undefined;
      if (serviceUrl) {
        const isAllowed = PasswordController.ALLOWED_ORIGINS.some(
          (origin) => serviceUrl.startsWith(origin),
        );
        if (isAllowed) {
          validatedServiceUrl = serviceUrl;
        }
      }

      await PasswordResetService.requestPasswordReset(email, validatedServiceUrl);

      // Always return success to prevent email enumeration
      return BaseController.ok(res, {
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error: any) {
      logger.error('[PasswordController.forgotPassword] Error', {
        error: error.message,
        email,
      });

      // Still return success to prevent email enumeration
      return BaseController.ok(res, {
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   * Reset password with token
   */
  static async resetPassword(req: Request, res: Response): Promise<any> {
    const { token, password } = req.body as PasswordResetDto;

    try {
      await PasswordResetService.resetPassword(token, password);

      return BaseController.ok(res, {
        message: 'Password has been reset successfully',
      });
    } catch (error: any) {
      logger.error('[PasswordController.resetPassword] Error', {
        error: error.message,
      });

      return BaseController.error(res, error.message || 'Failed to reset password', 400);
    }
  }

  /**
   * POST /api/v1/auth/password-sync
   * WO-O4O-AUTH-PASSWORD-SYNC-V1
   *
   * Change password using a syncToken issued during PASSWORD_MISMATCH.
   * Sets new password, generates auth tokens, and logs the user in.
   */
  static async passwordSync(req: Request, res: Response): Promise<any> {
    const { email, syncToken, newPassword } = req.body;

    if (!email || !syncToken || !newPassword) {
      return BaseController.error(res, 'email, syncToken, newPassword are required', 400, 'VALIDATION_ERROR');
    }

    if (newPassword.length < 6) {
      return BaseController.error(res, '비밀번호는 6자 이상이어야 합니다.', 400, 'VALIDATION_ERROR');
    }

    try {
      // 1. Validate syncToken from Redis (single-use)
      const redis = RedisService.getInstance();
      const tokenData = await redis.get(`password-sync:${syncToken}`);
      if (!tokenData) {
        return BaseController.error(res, '토큰이 만료되었거나 유효하지 않습니다.', 401, 'SYNC_TOKEN_INVALID');
      }

      const parsed = JSON.parse(tokenData);
      if (parsed.email !== email) {
        return BaseController.error(res, '토큰이 유효하지 않습니다.', 401, 'SYNC_TOKEN_INVALID');
      }

      // Consume token (single-use)
      await redis.del(`password-sync:${syncToken}`);

      // 2. Load user
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { email } });
      if (!user || !user.isActive) {
        return BaseController.error(res, '사용자를 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
      }

      // 3. Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      user.password = hashedPassword;
      user.loginAttempts = 0;
      user.lockedUntil = null as any;
      await userRepo.save(user);

      // 4. Load roles and memberships
      const roles = await roleAssignmentService.getRoleNames(user.id);
      const memberships: { serviceKey: string; status: string }[] =
        await AppDataSource.query(
          `SELECT service_key AS "serviceKey", status FROM service_memberships WHERE user_id = $1`,
          [user.id],
        );

      // 5. Generate auth tokens
      const tokens = tokenUtils.generateTokens(user, roles, 'neture.co.kr', memberships);

      // 6. Set cookies
      authenticationService.setAuthCookies(req, res, tokens);

      logger.info('[PasswordController.passwordSync] Password changed and logged in', {
        userId: user.id,
        email: user.email,
      });

      // 7. Return success with tokens (for localStorage-strategy services)
      return BaseController.ok(res, {
        message: 'Password changed successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name || '',
          roles,
          memberships,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      });
    } catch (error: any) {
      logger.error('[PasswordController.passwordSync] Error', {
        error: error.message,
        email,
      });
      return BaseController.error(res, 'Password sync failed', 500, 'PASSWORD_SYNC_FAILED');
    }
  }

  /**
   * POST /api/v1/auth/find-id
   * Find account by phone number
   */
  static async findId(req: Request, res: Response): Promise<any> {
    const { phone } = req.body;

    try {
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { phone } });

      if (!user) {
        return BaseController.ok(res, { found: false });
      }

      // Mask email for privacy
      const [local, domain] = user.email.split('@');
      const maskedLocal = local.length <= 3
        ? `${local[0]}***`
        : `${local.substring(0, 3)}***`;
      const maskedEmail = `${maskedLocal}@${domain}`;

      return BaseController.ok(res, {
        found: true,
        maskedEmail,
        createdAt: user.createdAt,
      });
    } catch (error: any) {
      logger.error('[PasswordController.findId] Error', { error: error.message });
      return BaseController.ok(res, { found: false });
    }
  }
}
