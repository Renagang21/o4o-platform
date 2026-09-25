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
  GoogleLoginRequestDto,
  GoogleSignupRequestDto,
} from '../dto/index.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

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

// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
//   POST /google/link · GET /google/link/status 는 은퇴했다.
//   users.password 재인증을 전제로 한 전환기 경로이며, 세션은 이미 Google 연결에서만 나온다.

// WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1: Admin Google Bootstrap(전환기 1회용)은 은퇴했다.
//   목적이던 "기존 관리자 users.id 에 Google 연결"은 완료됐고 1회용이라 재사용 경로가 없다.
//   운영 env 에 플래그/코드가 없어 이미 fail-closed 로 닫혀 있었다.

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

// WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1: 이메일 인증 체인 은퇴.
//   토큰을 발급하는 주체가 없었다 — `requestEmailVerification` 의 호출부는 resend 엔드포인트
//   자기 자신뿐이었고 Google 가입 경로는 이 서비스를 부르지 않는다(IR §3-5).
//   Google 이 이미 이메일을 검증하므로 O4O 가 다시 검증할 근거도 없다.

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

// WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1: `/auth/verify` 은퇴 — `/auth/me` 와 **같은 핸들러**였고 소비처가 0이었다.
//   인증 상태 확인은 `/auth/status`(공개) · 계정 조회는 `/auth/me` 로 일원화한다.

export default router;
