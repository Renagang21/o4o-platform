/**
 * @core O4O_PLATFORM_CORE — Auth
 * Core Routes: google login/signup/link, refresh, status, logout, handoff
 * Do not modify without CORE_CHANGE approval.
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 *
 * CORE_CHANGE: WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1 (2026-09-23)
 *   password 인증 경로(/login · /register · /signup · /check-email ·
 *   /forgot-password · /reset-password · /find-id)를 제거했다.
 *   인증 정본은 Google sub → users.id 하나다. email 은 인증 키가 아니다.
 */
import { Router, type IRouter } from 'express';
import {
  AuthSessionController,
  AuthAccountController,
  VerificationController,
} from '../controllers/index.js';
import { HandoffController } from '../controllers/handoff.controller.js';
import { GoogleAuthController } from '../controllers/google-auth.controller.js';
import {
  validateDto,
} from '../../../common/middleware/validation.middleware.js';
import {
  requireAuth,
  optionalAuth,
} from '../../../common/middleware/auth.middleware.js';
import {
  RefreshTokenRequestDto,
  EmailVerificationDto,
  GoogleLoginRequestDto,
  GoogleSignupRequestDto,
  GoogleLinkRequestDto,
  GoogleAdminBootstrapRequestDto,
} from '../dto/index.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { googleAdminBootstrapLimiter } from '../../../config/rate-limiters.config.js';

const router: IRouter = Router();

/**
 * ========================================
 * Authentication Routes (Public)
 * ========================================
 */

// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
//   POST /login · /register · /signup 은 은퇴했다. 로그인과 가입은 아래 Google 경로 하나다.
//   서비스 가입(membership)은 POST /auth/services/:serviceKey/join 이 담당한다.

// WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 (WO-2D): Google-only Signup/Login
// GET  /api/v1/auth/google/config  - 공개 Client ID + enabled (secret 없음)
// POST /api/v1/auth/google/login   - { idToken, serviceKey? } → 세션 | 404 GOOGLE_SIGNUP_REQUIRED
// POST /api/v1/auth/google/signup  - { idToken, consents } → users + linked_accounts → 세션
router.get('/google/config', asyncHandler(GoogleAuthController.config));
router.post(
  '/google/login',
  validateDto(GoogleLoginRequestDto),
  asyncHandler(GoogleAuthController.login)
);
router.post(
  '/google/signup',
  validateDto(GoogleSignupRequestDto),
  asyncHandler(GoogleAuthController.signup)
);

// WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1: 로그인된 계정에 Google Identity 명시 연결
// POST /api/v1/auth/google/link        - { idToken, currentPassword } → linked_accounts 1행 (users.password 재인증)
// GET  /api/v1/auth/google/link/status - { linked, passwordSet } (PII 없음)
router.post(
  '/google/link',
  requireAuth,
  validateDto(GoogleLinkRequestDto),
  asyncHandler(GoogleAuthController.link)
);
router.get(
  '/google/link/status',
  requireAuth,
  asyncHandler(GoogleAuthController.linkStatus)
);

// WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1 §15: 전환기 1회용 Admin Google Bootstrap
// POST /api/v1/auth/google/bootstrap-admin - { idToken, bootstrapCode }
//   세션을 요구할 수 없는 유일한 연결 경로(연결 전에는 그 계정으로 로그인 불가)이므로
//   env 플래그 + 일회용 코드로만 열리고(없으면 404), 대상 users.id 는 서버가 platform:super_admin 으로 결정한다.
//   성공 후에는 대상에 Google 연결이 존재하므로 재사용 불가(1회성). 세션 발급 없음.
router.post(
  '/google/bootstrap-admin',
  googleAdminBootstrapLimiter,
  validateDto(GoogleAdminBootstrapRequestDto),
  asyncHandler(GoogleAuthController.bootstrapAdmin)
);

// POST /api/v1/auth/refresh - Refresh access token
router.post(
  '/refresh',
  validateDto(RefreshTokenRequestDto),
  asyncHandler(AuthSessionController.refresh)
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
  asyncHandler(AuthAccountController.me)
);

// PATCH /api/v1/auth/me/profile - Update pharmacist profile
// WO-KPA-PHARMACY-GATE-SIMPLIFICATION-V1
router.patch(
  '/me/profile',
  requireAuth,
  asyncHandler(AuthAccountController.updateProfile)
);

// POST /api/v1/auth/logout - Logout current session
router.post(
  '/logout',
  requireAuth,
  asyncHandler(AuthSessionController.logout)
);

// POST /api/v1/auth/logout-all - Logout from all devices
router.post(
  '/logout-all',
  requireAuth,
  asyncHandler(AuthSessionController.logoutAll)
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

// POST /api/v1/auth/services/:serviceKey/join - Join or reactivate service membership
router.post(
  '/services/:serviceKey/join',
  requireAuth,
  asyncHandler(HandoffController.joinService)
);

// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
//   Password Management Routes(/forgot-password · /reset-password · /find-id)는 은퇴했다.
//   복구할 password 가 없고, 계정 접근 복구는 Google 계정 복구가 담당한다.

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
  asyncHandler(AuthAccountController.status)
);

// GET /api/v1/auth/verify - Alias for /status (backward compatibility)
router.get(
  '/verify',
  requireAuth,
  asyncHandler(AuthAccountController.me)
);

export default router;
