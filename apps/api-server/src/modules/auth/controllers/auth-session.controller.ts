/**
 * @core O4O_PLATFORM_CORE — Auth
 * Auth Session Controller: refresh, logout, logoutAll
 * Split from auth.controller.ts (WO-O4O-AUTH-CONTROLLER-SPLIT-V1)
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 */
import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { authenticationService } from '../../../services/authentication.service.js';
import logger from '../../../utils/logger.js';
import { monitoringMetrics } from '../../../common/monitoring/metrics.service.js';
import { isCrossOriginRequest } from './auth-helpers.js';

export class AuthSessionController extends BaseController {
  /**
   * POST /api/v1/auth/logout
   * Logout current session
   */
  static async logout(req: AuthRequest, res: Response): Promise<any> {
    const userId = req.user?.id;
    const sessionId = req.cookies?.sessionId;

    try {
      if (userId) {
        await authenticationService.logout(userId, sessionId);
      }

      authenticationService.clearAuthCookies(req, res);

      return BaseController.ok(res, {
        message: 'Logout successful',
      });
    } catch (error: any) {
      logger.error('[AuthSessionController.logout] Logout error', {
        error: error.message,
        userId,
      });

      // Still clear cookies even if error occurs
      authenticationService.clearAuthCookies(req, res);

      return BaseController.ok(res, {
        message: 'Logout successful',
      });
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token
   *
   * === Phase 2.5: Unified Error Response ===
   * All refresh failures return 401 with specific error codes.
   * Frontend should NOT retry on these errors - redirect to login instead.
   *
   * Error codes:
   * - NO_REFRESH_TOKEN: Token not provided in request
   * - REFRESH_TOKEN_INVALID: Token malformed, signature invalid, or from different server
   * - REFRESH_TOKEN_EXPIRED: Token has expired
   * - TOKEN_FAMILY_MISMATCH: Token rotation detected (possible theft)
   * - USER_NOT_FOUND: User does not exist or is inactive
   *
   * Response format:
   * - Success: { success: true, data: { accessToken, refreshToken, expiresIn } }
   * - Error: { success: false, error: "message", code: "ERROR_CODE", retryable: false }
   */
  static async refresh(req: Request, res: Response): Promise<any> {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      authenticationService.clearAuthCookies(req, res);
      return res.status(401).json({
        success: false,
        error: 'Refresh token not provided',
        code: 'NO_REFRESH_TOKEN',
        retryable: false,  // Phase 2.5: Frontend should NOT retry
      });
    }

    try {
      const tokens = await authenticationService.refreshTokens(refreshToken);

      // Phase 6-7: Cookie Auth Primary
      // Set new tokens in httpOnly cookies
      // Uses request origin for multi-domain cookie support
      authenticationService.setAuthCookies(req, res, tokens);

      // Response: Cookie is primary, JSON tokens for cross-origin or legacy support
      const isCrossOrigin = isCrossOriginRequest(req);
      const includeTokensInBody = req.body.includeLegacyTokens === true || isCrossOrigin;

      return BaseController.ok(res, {
        message: 'Token refreshed successfully',
        expiresIn: tokens.expiresIn || 900, // Default 15 minutes
        // Include tokens for cross-origin requests or when explicitly requested
        ...(includeTokensInBody && {
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
          },
        }),
      });
    } catch (error: any) {
      logger.error('[AuthSessionController.refresh] Token refresh error', {
        error: error.message,
        code: error.code,
      });

      // WO-O4O-MONITORING-IMPLEMENTATION-V1: Auth failure metric
      monitoringMetrics.recordAuthFailure(error.code || 'REFRESH_TOKEN_INVALID');

      // Phase 2.5: Always clear cookies on refresh failure
      authenticationService.clearAuthCookies(req, res);

      // Phase 2.5: Return specific error code for FE handling
      // All these errors are non-retryable - frontend should redirect to login
      const errorCode = error.code || 'REFRESH_TOKEN_INVALID';
      return res.status(401).json({
        success: false,
        error: error.message || 'Invalid or expired refresh token',
        code: errorCode,
        retryable: false,  // Phase 2.5: Frontend should NOT retry - redirect to login
      });
    }
  }

  /**
   * POST /api/v1/auth/logout-all
   * Logout from all devices
   */
  static async logoutAll(req: AuthRequest, res: Response): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    try {
      await authenticationService.logoutAll(userId);
      authenticationService.clearAuthCookies(req, res);

      return BaseController.ok(res, {
        message: 'Logged out from all devices',
      });
    } catch (error: any) {
      logger.error('[AuthSessionController.logoutAll] Logout all error', {
        error: error.message,
        userId,
      });

      authenticationService.clearAuthCookies(req, res);

      return BaseController.error(res, 'Failed to logout from all devices');
    }
  }
}
