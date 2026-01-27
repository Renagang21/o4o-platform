import { Router, type IRouter, type Request, type Response } from 'express';
import { validateDto } from '../../../common/middleware/validation.middleware.js';
import { ServiceLoginRequestDto } from '../dto/index.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { getAuthenticationService } from '../../../services/authentication.service.js';
import type { ServiceUserLoginRequest } from '../../../types/account-linking.js';
import { requireServiceUser, type ServiceAuthRequest } from '../../../common/middleware/auth.middleware.js';
import logger from '../../../utils/logger.js';

const router: IRouter = Router();

/**
 * ============================================================================
 * Service User Authentication Routes
 * Phase 1: Service User 인증 기반 (WO-AUTH-SERVICE-IDENTITY-PHASE1)
 * ============================================================================
 *
 * These routes handle authentication for Service Users (매장/서비스 사용자).
 * Service Users are authenticated via OAuth but:
 * - Do NOT create Platform User records
 * - Receive Service JWT (tokenType: 'service')
 * - Cannot access Admin/Operator APIs
 *
 * Base path: /api/v1/auth/service
 */

/**
 * POST /api/v1/auth/service/login
 *
 * Service User login via OAuth provider
 *
 * Request body:
 * {
 *   "credentials": {
 *     "provider": "google" | "kakao" | "naver",
 *     "oauthToken": "...", // OAuth access token or JSON profile (Phase 1)
 *     "serviceId": "neture" | "k-cosmetics" | ...,
 *     "storeId": "store_123" (optional)
 *   }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "user": { providerUserId, provider, email, displayName, serviceId, storeId },
 *   "tokens": { accessToken, refreshToken, expiresIn },
 *   "tokenType": "service"
 * }
 */
router.post(
  '/login',
  validateDto(ServiceLoginRequestDto),
  asyncHandler(async (req: Request, res: Response) => {
    const authService = getAuthenticationService();

    const loginRequest: ServiceUserLoginRequest = {
      credentials: req.body.credentials,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    };

    const result = await authService.handleServiceUserLogin(loginRequest);

    logger.info('Service user login successful', {
      provider: result.user.provider,
      serviceId: result.user.serviceId,
      email: result.user.email
    });

    res.json(result);
  })
);

/**
 * GET /api/v1/auth/service/status
 *
 * Check if service auth endpoint is available
 * Useful for health checks and feature detection
 */
router.get(
  '/status',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true,
      service: 'service-auth',
      version: 'phase1',
      providers: ['google', 'kakao', 'naver'],
      tokenType: 'service',
      message: 'Service User authentication is available'
    });
  })
);

/**
 * POST /api/v1/auth/service/refresh
 *
 * Refresh Service User tokens
 * Phase 1: Uses standard refresh mechanism (tokens are compatible)
 *
 * Note: In Phase 1, Service refresh tokens use the same mechanism
 * as Platform tokens. The tokenType in the new access token
 * will be determined by the original token's context.
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    const authService = getAuthenticationService();

    try {
      const tokens = await authService.refreshTokens(refreshToken);

      res.json({
        success: true,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn || 900
        }
      });
    } catch (error: any) {
      logger.warn('Service token refresh failed:', error.message);

      res.status(401).json({
        success: false,
        error: error.message,
        code: error.code || 'REFRESH_FAILED'
      });
    }
  })
);

/**
 * GET /api/v1/auth/service/me
 *
 * Get current Service User profile
 * Requires Service User authentication (tokenType: 'service')
 *
 * This endpoint demonstrates Guard verification:
 * - Platform tokens (tokenType: 'user') will be rejected
 * - Only Service tokens can access this endpoint
 */
router.get(
  '/me',
  requireServiceUser,
  asyncHandler(async (req: ServiceAuthRequest, res: Response) => {
    const serviceUser = req.serviceUser;
    const tokenPayload = req.tokenPayload;

    if (!serviceUser) {
      return res.status(401).json({
        success: false,
        error: 'Service user not found in request',
        code: 'SERVICE_USER_NOT_FOUND'
      });
    }

    logger.info('Service user profile accessed', {
      provider: serviceUser.provider,
      serviceId: serviceUser.serviceId,
      email: serviceUser.email
    });

    res.json({
      success: true,
      user: {
        providerUserId: serviceUser.providerUserId,
        provider: serviceUser.provider,
        email: serviceUser.email,
        displayName: serviceUser.displayName,
        profileImage: serviceUser.profileImage,
        serviceId: serviceUser.serviceId,
        storeId: serviceUser.storeId
      },
      tokenInfo: {
        tokenType: tokenPayload?.tokenType || 'service',
        serviceId: tokenPayload?.serviceId,
        storeId: tokenPayload?.storeId,
        expiresAt: tokenPayload?.exp ? new Date(tokenPayload.exp * 1000).toISOString() : null
      }
    });
  })
);

export default router;
