import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { PasswordResetService } from '../../../services/passwordResetService.js';
import { PasswordResetRequestDto, PasswordResetDto } from '../dto/index.js';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../../../entities/User.js';
import logger from '../../../utils/logger.js';

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
