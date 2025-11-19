import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticationService } from '../services/authentication.service.js';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { AuthProvider, OAuthProfile } from '../types/account-linking.js';
import logger from '../utils/logger.js';

/**
 * Unified Authentication Routes
 *
 * This router consolidates all authentication endpoints from:
 * - /api/auth (basic auth)
 * - /api/auth-v2 (cookie-based auth)
 * - /api/auth/unified (unified auth)
 * - /api/auth/social (social auth)
 *
 * New endpoints use a consistent API and centralized service.
 */
const router: Router = Router();

/**
 * Helper: Extract request metadata
 */
function getRequestMetadata(req: Request) {
  return {
    userAgent: req.headers['user-agent'] || 'Unknown',
    ipAddress: req.ip || req.socket.remoteAddress || 'Unknown'
  };
}

/**
 * Helper: Validate request
 */
function validateRequest(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array()
    });
    return false;
  }
  return true;
}

/**
 * POST /api/v1/auth/login
 * Unified login endpoint (supports both email and OAuth)
 */
router.post(
  '/login',
  body('provider').isIn(['email', 'google', 'kakao', 'naver']).withMessage('Invalid provider'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!validateRequest(req, res)) return;

    const { provider, email, password, oauthProfile } = req.body;
    const { userAgent, ipAddress } = getRequestMetadata(req);

    try {
      let result;

      if (provider === 'email') {
        if (!email || !password) {
          return res.status(400).json({
            success: false,
            message: 'Email and password are required'
          });
        }

        result = await authenticationService.login({
          provider: 'email',
          credentials: { email, password },
          ipAddress,
          userAgent
        });
      } else {
        if (!oauthProfile || !oauthProfile.id || !oauthProfile.email) {
          return res.status(400).json({
            success: false,
            message: 'OAuth profile is required'
          });
        }

        result = await authenticationService.login({
          provider: provider as AuthProvider,
          oauthProfile: oauthProfile as OAuthProfile,
          ipAddress,
          userAgent
        });
      }

      // Set authentication cookies
      authenticationService.setAuthCookies(res, result.tokens, result.sessionId);

      res.json(result);
    } catch (error: any) {
      logger.error('Login error:', error);

      if (error.code === 'INVALID_CREDENTIALS') {
        return res.status(401).json({
          success: false,
          message: error.message,
          code: error.code
        });
      }

      if (error.code === 'ACCOUNT_NOT_ACTIVE' || error.code === 'ACCOUNT_LOCKED') {
        return res.status(403).json({
          success: false,
          message: error.message,
          code: error.code,
          details: error.details
        });
      }

      res.status(500).json({
        success: false,
        message: 'Login failed',
        code: 'INTERNAL_ERROR'
      });
    }
  })
);

/**
 * POST /api/v1/auth/email/login
 * Email/password login (convenience endpoint)
 */
router.post(
  '/email/login',
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!validateRequest(req, res)) return;

    const { email, password } = req.body;
    const { userAgent, ipAddress } = getRequestMetadata(req);

    const result = await authenticationService.login({
      provider: 'email',
      credentials: { email, password },
      ipAddress,
      userAgent
    });

    authenticationService.setAuthCookies(res, result.tokens, result.sessionId);

    res.json(result);
  })
);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    const tokens = await authenticationService.refreshTokens(refreshToken);

    if (!tokens) {
      authenticationService.clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    authenticationService.setAuthCookies(res, tokens);

    res.json({
      success: true,
      tokens
    });
  })
);

/**
 * POST /api/v1/auth/logout
 * Logout (current session)
 */
router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const sessionId = req.cookies.sessionId;

    if (userId) {
      await authenticationService.logout(userId, sessionId);
    }

    authenticationService.clearAuthCookies(res);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  })
);

/**
 * POST /api/v1/auth/logout-all
 * Logout from all devices
 */
router.post(
  '/logout-all',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED'
      });
    }

    await authenticationService.logoutAll(userId);

    authenticationService.clearAuthCookies(res);

    res.json({
      success: true,
      message: 'Logged out from all devices'
    });
  })
);

/**
 * GET /api/v1/auth/me
 * Get current user
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED'
      });
    }

    const user = await authenticationService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      user: user.toPublicData()
    });
  })
);

/**
 * GET /api/v1/auth/status
 * Check authentication status
 */
router.get(
  '/status',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authenticated = !!req.user;

    res.json({
      authenticated,
      user: authenticated && req.user ? req.user.toPublicData?.() || req.user : null
    });
  })
);

/**
 * POST /api/v1/auth/forgot-password
 * Request password reset
 */
router.post(
  '/forgot-password',
  body('email').isEmail().withMessage('Valid email is required'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!validateRequest(req, res)) return;

    const { email } = req.body;

    await authenticationService.requestPasswordReset(email);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  })
);

/**
 * POST /api/v1/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!validateRequest(req, res)) return;

    const { token, password } = req.body;

    await authenticationService.resetPassword(token, password);

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  })
);

/**
 * POST /api/v1/auth/verify-token
 * Verify access token
 */
router.post(
  '/verify-token',
  body('token').notEmpty().withMessage('Token is required'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!validateRequest(req, res)) return;

    const { token } = req.body;

    const payload = authenticationService.verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    res.json({
      success: true,
      payload,
      valid: true
    });
  })
);

export default router;
