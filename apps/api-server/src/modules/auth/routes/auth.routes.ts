/**
 * @core O4O_PLATFORM_CORE — Auth
 * Core Routes: login, register, refresh, status, logout
 * Do not modify without CORE_CHANGE approval.
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 */
import { Router, type IRouter } from 'express';
import { AuthController, PasswordController, VerificationController } from '../controllers/index.js';
import { HandoffController } from '../controllers/handoff.controller.js';
import {
  validateDto,
} from '../../../common/middleware/validation.middleware.js';
import {
  requireAuth,
  optionalAuth,
} from '../../../common/middleware/auth.middleware.js';
import {
  LoginRequestDto,
  RegisterRequestDto,
  RefreshTokenRequestDto,
  PasswordResetRequestDto,
  PasswordResetDto,
  EmailVerificationDto,
} from '../dto/index.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

const router: IRouter = Router();

/**
 * ========================================
 * Authentication Routes (Public)
 * ========================================
 */

// POST /api/v1/auth/login - Login with email/password
router.post(
  '/login',
  validateDto(LoginRequestDto),
  asyncHandler(AuthController.login)
);

// POST /api/v1/auth/register - Register new user
router.post(
  '/register',
  validateDto(RegisterRequestDto),
  asyncHandler(AuthController.register)
);

// POST /api/v1/auth/signup - Alias for register (backward compatibility)
router.post(
  '/signup',
  validateDto(RegisterRequestDto),
  asyncHandler(AuthController.register)
);

// POST /api/v1/auth/check-email - Check email existence (multi-service registration UX)
// WO-O4O-AUTH-REGISTER-UX-IMPROVEMENT-V1
router.post(
  '/check-email',
  asyncHandler(AuthController.checkEmail)
);

// POST /api/v1/auth/refresh - Refresh access token
router.post(
  '/refresh',
  validateDto(RefreshTokenRequestDto),
  asyncHandler(AuthController.refresh)
);

/**
 * ========================================
 * Authentication Routes (Protected)
 * ========================================
 */

// GET /api/v1/auth/me - Get current user
router.get(
  '/me',
  requireAuth,
  asyncHandler(AuthController.me)
);

// PATCH /api/v1/auth/me/profile - Update pharmacist profile
// WO-KPA-PHARMACY-GATE-SIMPLIFICATION-V1
router.patch(
  '/me/profile',
  requireAuth,
  asyncHandler(AuthController.updateProfile)
);

// POST /api/v1/auth/logout - Logout current session
router.post(
  '/logout',
  requireAuth,
  asyncHandler(AuthController.logout)
);

// POST /api/v1/auth/logout-all - Logout from all devices
router.post(
  '/logout-all',
  requireAuth,
  asyncHandler(AuthController.logoutAll)
);

/**
 * ========================================
 * Service Handoff Routes
 * WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1
 * ========================================
 */

// POST /api/v1/auth/handoff - Generate handoff token for cross-service navigation
router.post(
  '/handoff',
  requireAuth,
  asyncHandler(HandoffController.generateHandoff)
);

// POST /api/v1/auth/handoff/exchange - Exchange handoff token for auth tokens (public)
router.post(
  '/handoff/exchange',
  asyncHandler(HandoffController.exchangeHandoff)
);

// GET /api/v1/auth/services - Get service catalog with user's membership status
router.get(
  '/services',
  requireAuth,
  asyncHandler(HandoffController.getServices)
);

/**
 * ========================================
 * Password Management Routes (Public)
 * ========================================
 */

// POST /api/v1/auth/forgot-password - Request password reset
router.post(
  '/forgot-password',
  validateDto(PasswordResetRequestDto),
  asyncHandler(PasswordController.forgotPassword)
);

// POST /api/v1/auth/reset-password - Reset password with token
router.post(
  '/reset-password',
  validateDto(PasswordResetDto),
  asyncHandler(PasswordController.resetPassword)
);

// POST /api/v1/auth/find-id - Find account by phone
router.post(
  '/find-id',
  asyncHandler(PasswordController.findId)
);

/**
 * ========================================
 * Email Verification Routes
 * ========================================
 */

// POST /api/v1/auth/verify-email - Verify email (POST)
router.post(
  '/verify-email',
  validateDto(EmailVerificationDto),
  asyncHandler(VerificationController.verifyEmail)
);

// GET /api/v1/auth/verify-email - Verify email (GET - for email links)
router.get(
  '/verify-email',
  asyncHandler(VerificationController.verifyEmailGet)
);

// POST /api/v1/auth/resend-verification - Resend verification email
router.post(
  '/resend-verification',
  requireAuth,
  asyncHandler(VerificationController.resendVerification)
);

/**
 * ========================================
 * Status/Info Routes (Public)
 * ========================================
 */

// GET /api/v1/auth/status - Check authentication status
router.get(
  '/status',
  optionalAuth,
  asyncHandler(AuthController.status)
);

// GET /api/v1/auth/verify - Alias for /status (backward compatibility)
router.get(
  '/verify',
  requireAuth,
  asyncHandler(AuthController.me)
);

export default router;
