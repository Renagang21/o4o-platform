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
 *
 * CORE_CHANGE: WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 (2026-09-29 사용자 승인)
 *   이메일·비밀번호 가입·로그인을 **새 경로**로 도입한다(/email/* · /password/* · /account/find-id).
 *   위에서 은퇴한 경로 이름은 되살리지 않는다 — 옛 구조(users.password · service_credentials ·
 *   서비스별 password 축)의 부활이 아니며, 계정은 여전히 users.id 하나다.
 *   Admin · platform:* 은 Google 전용을 유지한다(password-session.policy).
 */
import { Router, type IRouter } from 'express';
import {
  AuthSessionController,
  AuthAccountController,
} from '../controllers/index.js';
import { HandoffController } from '../controllers/handoff.controller.js';
import { GoogleAuthController } from '../controllers/google-auth.controller.js';
import { EmailAuthController } from '../controllers/email-auth.controller.js';
import { SocialAuthController } from '../controllers/social-auth.controller.js';
import { SocialStartDto,SocialProviderStartDto,SocialLinkStartDto,SocialProofDto,SocialSignupDto,SocialPasswordReauthDto,SocialConfirmDto } from '../dto/social-auth.dto.js';
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
  EmailSignupRequestDto,
  EmailLoginRequestDto,
  EmailAddressRequestDto,
  EmailTokenRequestDto,
  PasswordResetRequestDto,
  PasswordSetRequestDto,
  FindLoginIdRequestDto,
} from '../dto/index.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import {
  emailLoginLimiter,
  emailSignupLimiter,
  emailMailLimiter,
  emailTokenLimiter,
  findLoginIdLimiter,
  findLoginIdInputLimiter,
} from '../../../middleware/rateLimiter.js';
import { requireJsonBody } from '../../../middleware/require-json-body.middleware.js';

const router: IRouter = Router();

// CORE_CHANGE: WO-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1 (user-approved phase 4).
// New browser-bound routes. Retired /google/link and legacy passport routes stay retired.
router.get('/social/kakao/config',asyncHandler(SocialAuthController.config));
router.post('/social/kakao/start',requireJsonBody,emailTokenLimiter,validateDto(SocialStartDto),asyncHandler(SocialAuthController.startLogin));
router.get('/social/kakao/callback',asyncHandler(SocialAuthController.callback));
router.post('/social/kakao/complete',requireJsonBody,emailLoginLimiter,validateDto(SocialProofDto),asyncHandler(SocialAuthController.completeLogin));
router.post('/social/kakao/signup',requireJsonBody,emailSignupLimiter,validateDto(SocialSignupDto),asyncHandler(SocialAuthController.signup));
router.get('/social/accounts',requireAuth,asyncHandler(SocialAuthController.accounts));
router.post('/social/reauth/password',requireJsonBody,requireAuth,emailLoginLimiter,validateDto(SocialPasswordReauthDto),asyncHandler(SocialAuthController.reauthenticatePassword));
router.post('/social/reauth/start',requireJsonBody,requireAuth,emailTokenLimiter,validateDto(SocialProviderStartDto),asyncHandler(SocialAuthController.startReauthentication));
router.post('/social/reauth/complete',requireJsonBody,requireAuth,emailLoginLimiter,validateDto(SocialProofDto),asyncHandler(SocialAuthController.completeReauthentication));
router.post('/social/link/start',requireJsonBody,requireAuth,emailTokenLimiter,validateDto(SocialLinkStartDto),asyncHandler(SocialAuthController.startLink));
router.post('/social/link/verify',requireJsonBody,requireAuth,emailTokenLimiter,validateDto(SocialProofDto),asyncHandler(SocialAuthController.verifyLink));
router.post('/social/link/confirm',requireJsonBody,requireAuth,emailTokenLimiter,validateDto(SocialConfirmDto),asyncHandler(SocialAuthController.confirmLink));

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

// WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1: 이메일·비밀번호 가입·로그인
// POST /api/v1/auth/email/signup     - { email, password, name, phone, consents } → 계정 + 확인 메일 (세션 없음)
// POST /api/v1/auth/email/verify     - { token } → 이메일 확인 완료 (자동 로그인 없음)
// POST /api/v1/auth/email/resend     - { email } → 확인 메일 재발송 (존재 여부 비노출)
// POST /api/v1/auth/email/login      - { email, password } → 세션 (Google 로그인과 같은 응답 계약)
// POST /api/v1/auth/password/forgot  - { email } → 재설정 메일 (존재 여부 비노출)
// POST /api/v1/auth/password/reset   - { token, newPassword } → 새 비밀번호 + 전역 세션 폐기
// POST /api/v1/auth/account/find-id  - { name, phone } → 가린 이메일 힌트 | 일반 안내 (IP · 입력값 기준 제한 둘 다)
// 모두 JSON 본문만 받는다(requireJsonBody) — 교차 사이트 form 요청 방어
router.post('/email/signup', requireJsonBody, emailSignupLimiter, validateDto(EmailSignupRequestDto), asyncHandler(EmailAuthController.signup));
router.post('/email/verify', requireJsonBody, emailTokenLimiter, validateDto(EmailTokenRequestDto), asyncHandler(EmailAuthController.verify));
router.post('/email/resend', requireJsonBody, emailMailLimiter, validateDto(EmailAddressRequestDto), asyncHandler(EmailAuthController.resend));
router.post('/email/login', requireJsonBody, emailLoginLimiter, validateDto(EmailLoginRequestDto), asyncHandler(EmailAuthController.login));
router.post('/password/forgot', requireJsonBody, emailMailLimiter, validateDto(EmailAddressRequestDto), asyncHandler(EmailAuthController.forgot));
router.post('/password/reset', requireJsonBody, emailTokenLimiter, validateDto(PasswordResetRequestDto), asyncHandler(EmailAuthController.reset));
router.post('/account/find-id', requireJsonBody, findLoginIdLimiter, validateDto(FindLoginIdRequestDto), findLoginIdInputLimiter, asyncHandler(EmailAuthController.findId));

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

// POST /api/v1/auth/password - 로그인 사용자의 비밀번호 설정·변경 (WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1)
router.get('/password', requireAuth, asyncHandler(EmailAuthController.passwordStatus));
router.post(
  '/password',
  requireJsonBody,
  requireAuth,
  emailTokenLimiter,
  validateDto(PasswordSetRequestDto),
  asyncHandler(EmailAuthController.setPassword)
);

// POST /api/v1/auth/logout - Logout current session
router.post(
  '/logout',
  asyncHandler(AuthSessionController.prepareLogoutAuth),
  requireAuth,
  asyncHandler(AuthSessionController.logout)
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
