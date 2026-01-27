import { Router, type IRouter, type Request, type Response } from 'express';
import { validateDto } from '../../../common/middleware/validation.middleware.js';
import { GuestTokenIssueRequestDto, GuestUpgradeRequestDto } from '../dto/index.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { getAuthenticationService } from '../../../services/authentication.service.js';
import type { GuestTokenIssueRequest, GuestUpgradeRequest, ServiceLoginCredentials } from '../../../types/account-linking.js';
import { requireGuestUser, type GuestAuthRequest } from '../../../common/middleware/auth.middleware.js';
import logger from '../../../utils/logger.js';

const router: IRouter = Router();

/**
 * ============================================================================
 * Guest Authentication Routes
 * Phase 3: Guest 인증 (WO-AUTH-SERVICE-IDENTITY-PHASE3-QR-GUEST-DEVICE)
 * ============================================================================
 *
 * These routes handle authentication for Guest Users (QR/Kiosk/Signage entry).
 * Guest Users:
 * - Receive Guest JWT (tokenType: 'guest')
 * - Short-lived tokens (2 hours, no refresh)
 * - No database user record
 * - Can be upgraded to Service User
 *
 * Base path: /api/v1/auth/guest
 */

/**
 * POST /api/v1/auth/guest/issue
 *
 * Issue a Guest token for QR/Kiosk/Signage entry
 *
 * Request body:
 * {
 *   "serviceId": "kpa-pharmacy",
 *   "storeId": "store_123" (optional),
 *   "deviceId": "kiosk_001" (optional),
 *   "entryType": "qr" | "kiosk" | "signage" | "web"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "guestSessionId": "guest_1234567890_abc123",
 *   "tokens": { "accessToken": "...", "expiresIn": 7200 },
 *   "tokenType": "guest",
 *   "context": { "serviceId", "storeId", "deviceId", "entryType" }
 * }
 */
router.post(
  '/issue',
  validateDto(GuestTokenIssueRequestDto),
  asyncHandler(async (req: Request, res: Response) => {
    const authService = getAuthenticationService();

    const issueRequest: GuestTokenIssueRequest = {
      serviceId: req.body.serviceId,
      storeId: req.body.storeId,
      deviceId: req.body.deviceId,
      entryType: req.body.entryType,
      metadata: {
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        ...req.body.metadata
      }
    };

    const result = await authService.issueGuestToken(issueRequest);

    logger.info('Guest token issued', {
      guestSessionId: result.guestSessionId,
      serviceId: result.context.serviceId,
      entryType: result.context.entryType
    });

    res.json(result);
  })
);

/**
 * POST /api/v1/auth/guest/upgrade
 *
 * Upgrade Guest token to Service User token via OAuth
 *
 * This is NOT a "login" - it's a session upgrade that preserves
 * guest activity (cart, browsing history, etc.)
 *
 * Request body:
 * {
 *   "guestToken": "current_guest_jwt",
 *   "credentials": {
 *     "provider": "google" | "kakao" | "naver",
 *     "oauthToken": "...",
 *     "serviceId": "kpa-pharmacy",
 *     "storeId": "store_123" (optional)
 *   }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "user": { providerUserId, provider, email, displayName, serviceId },
 *   "tokens": { accessToken, refreshToken, expiresIn },
 *   "tokenType": "service",
 *   "previousGuestSessionId": "guest_xxx",
 *   "activityPreserved": true
 * }
 */
router.post(
  '/upgrade',
  validateDto(GuestUpgradeRequestDto),
  asyncHandler(async (req: Request, res: Response) => {
    const authService = getAuthenticationService();

    const upgradeRequest: GuestUpgradeRequest = {
      guestToken: req.body.guestToken,
      credentials: req.body.credentials as ServiceLoginCredentials,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    };

    const result = await authService.upgradeGuestToServiceUser(upgradeRequest);

    logger.info('Guest upgraded to Service User', {
      previousGuestSessionId: result.previousGuestSessionId,
      provider: result.user.provider,
      serviceId: result.user.serviceId,
      activityPreserved: result.activityPreserved
    });

    res.json(result);
  })
);

/**
 * GET /api/v1/auth/guest/status
 *
 * Check if guest auth endpoint is available
 * Useful for health checks and feature detection
 */
router.get(
  '/status',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true,
      service: 'guest-auth',
      version: 'phase3',
      entryTypes: ['qr', 'kiosk', 'signage', 'web'],
      tokenType: 'guest',
      features: {
        issueToken: true,
        upgradeToService: true,
        activityPreservation: true
      },
      message: 'Guest authentication is available'
    });
  })
);

/**
 * GET /api/v1/auth/guest/me
 *
 * Get current Guest session info
 * Requires Guest authentication (tokenType: 'guest')
 *
 * This endpoint demonstrates Guard verification:
 * - Platform tokens (tokenType: 'user') will be rejected
 * - Service tokens (tokenType: 'service') will be rejected
 * - Only Guest tokens can access this endpoint
 */
router.get(
  '/me',
  requireGuestUser,
  asyncHandler(async (req: GuestAuthRequest, res: Response) => {
    const guestUser = req.guestUser;
    const tokenPayload = req.tokenPayload;

    if (!guestUser) {
      return res.status(401).json({
        success: false,
        error: 'Guest user not found in request',
        code: 'GUEST_USER_NOT_FOUND'
      });
    }

    logger.info('Guest session accessed', {
      guestSessionId: guestUser.guestSessionId,
      serviceId: guestUser.serviceId,
      deviceId: guestUser.deviceId
    });

    res.json({
      success: true,
      guest: {
        guestSessionId: guestUser.guestSessionId,
        serviceId: guestUser.serviceId,
        storeId: guestUser.storeId,
        deviceId: guestUser.deviceId
      },
      tokenInfo: {
        tokenType: tokenPayload?.tokenType || 'guest',
        serviceId: tokenPayload?.serviceId,
        storeId: tokenPayload?.storeId,
        expiresAt: tokenPayload?.exp ? new Date(tokenPayload.exp * 1000).toISOString() : null
      }
    });
  })
);

export default router;
