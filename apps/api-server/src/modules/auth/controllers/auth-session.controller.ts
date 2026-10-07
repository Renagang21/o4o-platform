/**
 * @core O4O_PLATFORM_CORE — Auth
 * Auth Session Controller: refresh, logout, logoutAll
 * Split from auth.controller.ts (WO-O4O-AUTH-CONTROLLER-SPLIT-V1)
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 */
import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { resolveSessionServiceKey } from '../../../utils/session-origin.js';
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
    // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8:
    //   **요청 origin 의 서비스 세션만** 서버에서 무효화한다. 본문 값을 믿지 않는다 —
    //   클라이언트가 serviceKey 를 지정할 수 있으면 남의 서비스 세션을 끊을 수 있다.
    const serviceKey = resolveSessionServiceKey(req.get('origin'));

    try {
      if (userId) {
        await authenticationService.logout(userId, serviceKey);
      }

      authenticationService.clearAuthCookies(req, res);

      return BaseController.ok(res, {
        message: 'Logout successful',
        // 서버측 무효화가 실제로 일어났는지 프런트·검증이 구분할 수 있게 밝힌다.
        scope: serviceKey ? { serviceKey, serverRevoked: true } : { serviceKey: null, serverRevoked: false },
      });
    } catch (error: any) {
      logger.error('[AuthSessionController.logout] Logout error', {
        error: error.message,
        userId,
        serviceKey,
      });

      // 쿠키는 그대로 지운다 — 브라우저가 이 인증을 계속 들고 있을 이유가 없다.
      authenticationService.clearAuthCookies(req, res);

      // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (3차 리뷰):
      //   **성공으로 응답하지 않는다.** 종전에는 서버측 폐기가 실패해도 'Logout successful' 을
      //   돌려줘서, 이미 발급된 refresh token 이 살아 있는데도 화면에는 로그아웃으로 보였다.
      //   프런트는 실패 시에도 로컬 세션을 정리하도록 이미 되어 있다(authClient.logout 의
      //   catch → finally), 그래서 오류를 돌려주는 것이 화면을 깨지 않고 사실을 전달한다.
      return BaseController.error(
        res,
        '로그아웃은 처리됐지만 서버 세션 종료에 실패했습니다. 모든 기기에서 로그아웃을 사용하세요.',
        500,
        'LOGOUT_REVOCATION_FAILED',
      );
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
