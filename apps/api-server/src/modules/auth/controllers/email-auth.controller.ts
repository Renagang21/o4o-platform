import { signupPolicyKeyFromOrigin } from '../../../services/auth/signup-policy.service.js';
import { PolicyAcceptanceError } from '../../policy-acceptance/policy-acceptance.service.js';
/**
 * @core O4O_PLATFORM_CORE — Auth
 * Email Auth Controller: 이메일·비밀번호 가입 · 확인 · 로그인 · 재설정 · 아이디 찾기
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 — 사용자 명시 WO 로 Core 예외 승인
 *
 * 로그인 응답 계약은 `GoogleAuthController` 와 같다(쿠키 primary · cross-origin/legacy 는 body tokens ·
 * displayName · pendingPolicyAcceptances). 판정·저장은 전부 `emailAuthService` 가 한다.
 *
 * 로그 규칙: 요청 본문(비밀번호 · 토큰 · 이메일)을 로그에 싣지 않는다. 오류 로그는 code · name 만.
 */
import { Request, Response } from 'express';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { resolveSessionServiceKey } from '../../../utils/session-origin.js';
import { resolveLoginMembershipGateKey } from '../../../common/auth/service-login-eligibility.policy.js';
import { getTrustedClientIp } from '../../../utils/trusted-client-ip.js';
import { BaseController } from '../../../common/base.controller.js';
import { authenticationService } from '../../../services/authentication.service.js';
import { policyAcceptanceService } from '../../policy-acceptance/policy-acceptance.service.js';
import { demoAccountService } from '../../../services/auth/demo-account.service.js';
import {
  emailAuthService,
  EmailAuthError,
  GENERIC_MAIL_NOTICE,
  FIND_ID_GENERIC_NOTICE,
} from '../../../services/auth/email-auth.service.js';
import type {
  EmailSignupRequestDto,
  EmailLoginRequestDto,
  EmailAddressRequestDto,
  EmailTokenRequestDto,
  PasswordResetRequestDto,
  PasswordSetRequestDto,
  FindLoginIdRequestDto,
} from '../dto/index.js';
import logger from '../../../utils/logger.js';
import { monitoringMetrics } from '../../../common/monitoring/metrics.service.js';
import { isCrossOriginRequest } from './auth-helpers.js';
import { resolveExposableAccountStatus } from '../../../common/auth/account-access.policy.js';

type Op = 'signup' | 'login' | 'resend' | 'verify' | 'forgot' | 'reset' | 'set' | 'findId';

function meta(req: Request) {
  return {
    ipAddress: getTrustedClientIp(req),
    userAgent: req.headers['user-agent'] || 'Unknown',
    // 세션 귀속·메일 링크 origin 은 요청 origin 에서만 파생한다(본문 값 아님).
    sessionServiceKey: resolveSessionServiceKey(req.get('origin')),
  };
}

export class EmailAuthController extends BaseController {
  /** POST /api/v1/auth/email/signup — 계정 생성 + 확인 메일 (세션 없음) */
  static async signup(req: Request, res: Response): Promise<any> {
    const body = req.body as EmailSignupRequestDto;
    try {
      const result = await emailAuthService.signup({ ...body, ...meta(req), policyServiceKey: signupPolicyKeyFromOrigin(req.get('origin')) });
      return BaseController.created(res, {
        message: '확인 메일을 보냈습니다. 메일의 링크를 열면 가입이 완료됩니다.',
        maskedEmail: result.maskedEmail,
        mailSent: result.mailSent,
      });
    } catch (error) {
      return EmailAuthController.handleError(res, error, 'signup');
    }
  }

  /** POST /api/v1/auth/email/resend — 존재 여부 비노출 */
  static async resend(req: Request, res: Response): Promise<any> {
    const { email } = req.body as EmailAddressRequestDto;
    try {
      await emailAuthService.resendVerification(email, meta(req));
    } catch (error) {
      EmailAuthController.logUnexpected('resend', error);
    }
    return BaseController.ok(res, { message: GENERIC_MAIL_NOTICE });
  }

  /** POST /api/v1/auth/email/verify — `{ token }` → 확인 완료 (자동 로그인 없음) */
  static async verify(req: Request, res: Response): Promise<any> {
    const { token } = req.body as EmailTokenRequestDto;
    try {
      const result = await emailAuthService.verifyEmail(token);
      return BaseController.ok(res, {
        message: '이메일 확인이 완료되었습니다. 이제 로그인할 수 있습니다.',
        maskedEmail: result.maskedEmail,
      });
    } catch (error) {
      return EmailAuthController.handleError(res, error, 'verify');
    }
  }

  /** POST /api/v1/auth/email/login — `{ email, password }` → 세션 */
  static async login(req: Request, res: Response): Promise<any> {
    const { email, password, includeLegacyTokens } = req.body as EmailLoginRequestDto;
    try {
      const session = await emailAuthService.login({
        email,
        password,
        ...meta(req),
        loginMembershipGateKey: resolveLoginMembershipGateKey(req.get('origin')),
      });
      authenticationService.setAuthCookies(req, res, session.tokens);

      const user = session.user;
      user.displayName =
        (user.name as string | null | undefined) ||
        `${(user.lastName as string) || ''}${(user.firstName as string) || ''}`.trim() ||
        (user.email as string | undefined)?.split('@')[0] ||
        '사용자';
      try {
        // enforced pending — 서버 게이트와 같은 값(Demo 계정은 약관 화면 대상이 아니다).
        user.pendingPolicyAcceptances = await policyAcceptanceService.getEnforcedPendingForUser(String(user.id));
      } catch {
        user.pendingPolicyAcceptances = [];
      }
      // WO-O4O-DEMO-LOGIN-ENTRY-AND-EXPERIENCE-UX-V1: Demo 배지 · 안내용 (판정 정본 demo_accounts.user_id · 실패 시 isDemo:false).
      user.demo = await demoAccountService.getDemoMetadata(String(user.id));

      const includeTokensInBody = includeLegacyTokens || isCrossOriginRequest(req);
      return BaseController.ok(res, {
        message: 'Login successful',
        user,
        isNewUser: false,
        ...(includeTokensInBody && {
          tokens: {
            accessToken: session.tokens.accessToken,
            refreshToken: session.tokens.refreshToken,
            expiresIn: session.tokens.expiresIn,
          },
        }),
      });
    } catch (error) {
      return EmailAuthController.handleError(res, error, 'login');
    }
  }

  /** POST /api/v1/auth/password/forgot — 존재 여부 비노출 */
  static async forgot(req: Request, res: Response): Promise<any> {
    const { email } = req.body as EmailAddressRequestDto;
    try {
      await emailAuthService.requestPasswordReset(email, meta(req));
    } catch (error) {
      EmailAuthController.logUnexpected('forgot', error);
    }
    return BaseController.ok(res, { message: GENERIC_MAIL_NOTICE });
  }

  /** POST /api/v1/auth/password/reset — `{ token, newPassword }` → 새 비밀번호 + 전역 세션 폐기 */
  static async reset(req: Request, res: Response): Promise<any> {
    const { token, newPassword } = req.body as PasswordResetRequestDto;
    try {
      await emailAuthService.resetPassword(token, newPassword);
      return BaseController.ok(res, {
        message: '비밀번호를 바꿨습니다. 새 비밀번호로 다시 로그인해 주세요. 다른 기기의 로그인도 모두 끝났습니다.',
      });
    } catch (error) {
      return EmailAuthController.handleError(res, error, 'reset');
    }
  }

  /** POST /api/v1/auth/password — 로그인 사용자의 비밀번호 설정·변경 (requireAuth) */
  static async setPassword(req: AuthRequest, res: Response): Promise<any> {
    const userId = req.user?.id;
    if (!userId) return BaseController.unauthorized(res);
    const { currentPassword, newPassword } = req.body as PasswordSetRequestDto;
    try {
      await emailAuthService.setPasswordForUser(String(userId), { currentPassword, newPassword });
      authenticationService.clearAuthCookies(req, res);
      return BaseController.ok(res, { message: '비밀번호를 저장했습니다.' });
    } catch (error) {
      return EmailAuthController.handleError(res, error, 'set');
    }
  }

  static async passwordStatus(req: AuthRequest, res: Response): Promise<any> {
    if (!req.user?.id) return BaseController.unauthorized(res);
    try {
      return BaseController.ok(res, await emailAuthService.getPasswordStatus(String(req.user.id)));
    } catch (error) {
      return EmailAuthController.handleError(res, error, 'set');
    }
  }

  /** POST /api/v1/auth/account/find-id — `{ name, phone }` → 가린 이메일 힌트 | 일반 안내 */
  static async findId(req: Request, res: Response): Promise<any> {
    const { name, phone } = req.body as FindLoginIdRequestDto;
    try {
      const result = await emailAuthService.findLoginId({ name, phone });
      return BaseController.ok(res, {
        found: result.found,
        maskedEmail: result.maskedEmail,
        message: result.found
          ? '가입한 이메일(로그인 아이디)의 일부입니다. 비밀번호가 기억나지 않으면 비밀번호 찾기를 이용해 주세요.'
          : FIND_ID_GENERIC_NOTICE,
      });
    } catch (error) {
      EmailAuthController.logUnexpected('findId', error);
      return BaseController.error(res, '아이디 찾기를 처리하지 못했습니다.');
    }
  }

  private static logUnexpected(op: Op, error: unknown): void {
    const err = error as Error & { code?: string };
    logger.error(`[EmailAuthController.${op}] unexpected error`, { name: err?.name, code: err?.code, error: err?.message });
  }

  private static handleError(res: Response, error: unknown, op: Op): any {
    const err = error as Error & { code?: string; details?: { status?: unknown } };
    if (op === 'login') monitoringMetrics.recordAuthFailure(err.code || 'UNKNOWN');

    if (error instanceof PolicyAcceptanceError) return BaseController.error(res, error.message, error.httpStatus, error.code);
    if (error instanceof EmailAuthError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
        // WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1: 세미프랜차이즈 자격 상태(인증을 마친 본인에게만, 서버 선별 필드)
        ...(error.serviceAccess ? { serviceAccess: error.serviceAccess } : {}),
      });
    }
    if (err.code === 'SESSION_CHANGED_RETRY_LOGIN') {
      return BaseController.error(res, err.message, 409, err.code);
    }
    if (err.code === 'ACCOUNT_NOT_ACTIVE') {
      const accountStatus = resolveExposableAccountStatus(err.details?.status);
      return BaseController.forbidden(res, err.message, err.code, accountStatus ? { accountStatus } : undefined);
    }
    EmailAuthController.logUnexpected(op, error);
    return BaseController.error(res, op === 'login' ? 'Login failed' : op === 'signup' ? 'Signup failed' : 'Request failed');
  }
}
