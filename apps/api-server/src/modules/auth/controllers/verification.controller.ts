import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { PasswordResetService } from '../../../services/passwordResetService.js';
import { EmailVerificationDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';

/**
 * Verification Controller - NextGen Pattern
 *
 * Handles email verification operations
 */
export class VerificationController extends BaseController {
  /**
   * POST /api/v1/auth/verify-email
   * Verify email with token (POST)
   */
  static async verifyEmail(req: Request, res: Response): Promise<any> {
    const { token } = req.body as EmailVerificationDto;

    try {
      await PasswordResetService.verifyEmail(token);

      return BaseController.ok(res, {
        message: 'Email has been verified successfully',
      });
    } catch (error: any) {
      logger.error('[VerificationController.verifyEmail] Error', {
        error: error.message,
      });

      let errorCode = 'VERIFICATION_FAILED';
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('expired')) {
        errorCode = 'TOKEN_EXPIRED';
      } else if (errorMessage.includes('invalid')) {
        errorCode = 'INVALID_TOKEN';
      } else if (errorMessage.includes('already verified')) {
        errorCode = 'ALREADY_VERIFIED';
      }

      return BaseController.error(res, error.message || 'Failed to verify email', 400);
    }
  }

  /**
   * GET /api/v1/auth/verify-email
   * Verify email with token (GET - for email links)
   */
  static async verifyEmailGet(req: Request, res: Response): Promise<any> {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return BaseController.error(res, 'Verification token is required', 400);
    }

    try {
      await PasswordResetService.verifyEmail(token);

      return BaseController.ok(res, {
        message: 'Email has been verified successfully',
      });
    } catch (error: any) {
      logger.error('[VerificationController.verifyEmailGet] Error', {
        error: error.message,
      });

      return BaseController.error(res, error.message || 'Failed to verify email', 400);
    }
  }

  /**
   * POST /api/v1/auth/resend-verification
   * Resend verification email (authenticated)
   */
  static async resendVerification(req: AuthRequest, res: Response): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    try {
      await PasswordResetService.requestEmailVerification(userId);

      return BaseController.ok(res, {
        message: 'Verification email has been sent',
      });
    } catch (error: any) {
      logger.error('[VerificationController.resendVerification] Error', {
        error: error.message,
        userId,
      });

      return BaseController.error(res, error.message || 'Failed to send verification email', 400);
    }
  }
}
