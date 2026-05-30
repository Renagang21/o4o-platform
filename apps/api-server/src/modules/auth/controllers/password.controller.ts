import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { PasswordResetService } from '../../../services/passwordResetService.js';
import { PasswordResetRequestDto, PasswordResetDto } from '../dto/index.js';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../../../entities/User.js';
import logger from '../../../utils/logger.js';
import { getServiceOrigins } from '../../../config/service-catalog.js';

/**
 * Password Controller - NextGen Pattern
 *
 * Handles password-related operations:
 * - Forgot password (request reset)
 * - Reset password (with token)
 * - Find ID (account lookup by phone)
 */
export class PasswordController extends BaseController {
  /**
   * Allowed origins for password reset email links.
   * WO-O4O-DOMAIN-SSOT-CANONICALIZATION-V1:
   *   Main service canonical origins are sourced from service-catalog SSOT.
   *   Non-catalog origins (admin sub-domain / localhost dev) are declared
   *   explicitly to preserve previous behavior.
   * WO-O4O-API-SERVER-AUTH-GLUCOSEVIEW-RESIDUE-CLEANUP-V1:
   *   'https://glucoseview.co.kr' allowed origin 제거 (GlucoseView 서비스 폐기).
   */
  private static readonly ALLOWED_ORIGINS = [
    ...getServiceOrigins(),
    'https://admin.neture.co.kr',
    'http://localhost:',
  ];

  /**
   * POST /api/v1/auth/forgot-password
   * Request password reset email
   */
  static async forgotPassword(req: Request, res: Response): Promise<any> {
    const { email, serviceKey, serviceUrl } = req.body as PasswordResetRequestDto;

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

      await PasswordResetService.requestPasswordReset(email, serviceKey, validatedServiceUrl);

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
    const { token, password, serviceKey } = req.body as PasswordResetDto;

    try {
      await PasswordResetService.resetPassword(token, password, serviceKey);

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
