import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { PasswordResetService } from '../../../services/passwordResetService.js';
import { PasswordResetRequestDto, PasswordResetDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';

/**
 * Password Controller - NextGen Pattern
 *
 * Handles password-related operations:
 * - Forgot password (request reset)
 * - Reset password (with token)
 */
export class PasswordController extends BaseController {
  /**
   * POST /api/v1/auth/forgot-password
   * Request password reset email
   */
  static async forgotPassword(req: Request, res: Response): Promise<any> {
    const { email } = req.body as PasswordResetRequestDto;

    try {
      await PasswordResetService.requestPasswordReset(email);

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
}
