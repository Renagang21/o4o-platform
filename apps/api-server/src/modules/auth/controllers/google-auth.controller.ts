/**
 * @core O4O_PLATFORM_CORE — Auth
 * Google Auth Controller: Google-only Signup/Login endpoints
 * WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 (WO-2D) — 사용자 명시 WO 로 Core 예외 승인
 *
 * 응답 계약은 `AuthLoginController.login` 과 동일하다(쿠키 primary · cross-origin/legacy 는 body tokens ·
 * displayName · pendingPolicyAcceptances). 검증·조회·세션 발급은 전부 `googleAuthService` 가 담당한다.
 */
import { Request, Response } from 'express';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { getTrustedClientIp } from '../../../utils/trusted-client-ip.js';
import { BaseController } from '../../../common/base.controller.js';
import { authenticationService } from '../../../services/authentication.service.js';
import { policyAcceptanceService } from '../../policy-acceptance/policy-acceptance.service.js';
import { googleAuthService, GoogleAuthError, type GoogleAuthSession } from '../../../services/auth/google-auth.service.js';
import { GoogleIdTokenError } from '../../../services/auth/google-identity.service.js';
import { googleIdentityConfig } from '../../../config/google-identity.config.js';
import type {
  GoogleAdminBootstrapRequestDto,
  GoogleLinkRequestDto,
  GoogleLoginRequestDto,
  GoogleSignupRequestDto,
} from '../dto/index.js';
import logger from '../../../utils/logger.js';
import { monitoringMetrics } from '../../../common/monitoring/metrics.service.js';
import { isCrossOriginRequest } from './auth-helpers.js';
import { resolveExposableAccountStatus } from '../../../common/auth/account-access.policy.js';

/** 프런트 GIS 초기화용 공개 Client ID env(선택). 없으면 allowlist 첫 항목을 쓴다. secret 아님. */
export const GOOGLE_WEB_CLIENT_ID_ENV = 'GOOGLE_WEB_CLIENT_ID';

function resolveWebClientId(): string | null {
  const explicit = process.env[GOOGLE_WEB_CLIENT_ID_ENV]?.trim();
  if (explicit) return explicit;
  return googleIdentityConfig.allowedClientIds[0] ?? null;
}

export class GoogleAuthController extends BaseController {
  /**
   * GET /api/v1/auth/google/config
   * `{ enabled, clientId }` — allowlist 가 비어 있으면 enabled=false.
   */
  static async config(_req: Request, res: Response): Promise<any> {
    const clientId = resolveWebClientId();
    return BaseController.ok(res, {
      enabled: googleIdentityConfig.isConfigured() && !!clientId,
      clientId,
    });
  }

  /** POST /api/v1/auth/google/login — `{ idToken, serviceKey? }` */
  static async login(req: Request, res: Response): Promise<any> {
    const { idToken, serviceKey, includeLegacyTokens } = req.body as GoogleLoginRequestDto;
    try {
      const session = await googleAuthService.login({
        idToken,
        ...(serviceKey && { serviceKey }),
        ipAddress: getTrustedClientIp(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
      });
      return GoogleAuthController.respondWithSession(req, res, session, includeLegacyTokens, 'Login successful');
    } catch (error) {
      return GoogleAuthController.handleError(res, error, 'login');
    }
  }

  /** POST /api/v1/auth/google/signup — `{ idToken, consents: { terms, privacy, marketing? } }` */
  static async signup(req: Request, res: Response): Promise<any> {
    const { idToken, consents, includeLegacyTokens } = req.body as GoogleSignupRequestDto;
    try {
      const session = await googleAuthService.signup({
        idToken,
        consents,
        ipAddress: getTrustedClientIp(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
      });
      return GoogleAuthController.respondWithSession(req, res, session, includeLegacyTokens, 'Signup successful', 201);
    } catch (error) {
      return GoogleAuthController.handleError(res, error, 'signup');
    }
  }

  /**
   * POST /api/v1/auth/google/link — `{ idToken, currentPassword }` (requireAuth)
   * WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1: 대상 user 는 세션에서만. 세션은 새로 발급하지 않는다.
   */
  static async link(req: AuthRequest, res: Response): Promise<any> {
    const userId = req.user?.id;
    if (!userId) {
      return BaseController.unauthorized(res, 'Authentication required', 'AUTH_REQUIRED');
    }
    const { idToken, currentPassword } = req.body as GoogleLinkRequestDto;
    try {
      const result = await googleAuthService.link({
        userId,
        idToken,
        currentPassword,
        ipAddress: getTrustedClientIp(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
      });
      return BaseController.ok(res, result);
    } catch (error) {
      return GoogleAuthController.handleError(res, error, 'link');
    }
  }

  /**
   * POST /api/v1/auth/google/bootstrap-admin — `{ idToken, bootstrapCode }` (세션 없음 · 전환기 1회용)
   * WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1 §15. 대상은 서버가 `platform:super_admin` 으로 결정하고,
   * env 플래그 + 일회용 코드가 모두 맞을 때만 열린다. 세션은 발급하지 않는다(연결 후 Google 로 로그인).
   */
  static async bootstrapAdmin(req: Request, res: Response): Promise<any> {
    const { idToken, bootstrapCode } = req.body as GoogleAdminBootstrapRequestDto;
    try {
      const result = await googleAuthService.bootstrapAdminLink({
        idToken,
        bootstrapCode,
        ipAddress: getTrustedClientIp(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
      });
      // userId 는 서버 판정 결과 확인용으로만 돌려준다(세션·토큰 없음).
      return BaseController.ok(res, { linked: result.linked });
    } catch (error) {
      return GoogleAuthController.handleError(res, error, 'link');
    }
  }

  /** GET /api/v1/auth/google/link/status — `{ linked, passwordSet }` (requireAuth · PII 없음) */
  static async linkStatus(req: AuthRequest, res: Response): Promise<any> {
    const userId = req.user?.id;
    if (!userId) {
      return BaseController.unauthorized(res, 'Authentication required', 'AUTH_REQUIRED');
    }
    try {
      return BaseController.ok(res, await googleAuthService.getLinkStatus(userId));
    } catch (error) {
      return GoogleAuthController.handleError(res, error, 'link');
    }
  }

  private static async respondWithSession(
    req: Request,
    res: Response,
    session: GoogleAuthSession,
    includeLegacyTokens: boolean | undefined,
    message: string,
    status: 200 | 201 = 200,
  ): Promise<any> {
    authenticationService.setAuthCookies(req, res, session.tokens);

    const user = session.user;
    // name 은 NULL 허용 — /auth/login 과 같은 우선순위로 null-safe 하게 만든다.
    user.displayName =
      (user.name as string | null | undefined)
      || `${(user.lastName as string) || ''}${(user.firstName as string) || ''}`.trim()
      || (user.email as string | undefined)?.split('@')[0]
      || '사용자';
    try {
      user.pendingPolicyAcceptances = await policyAcceptanceService.getPendingForUser(String(user.id));
    } catch { user.pendingPolicyAcceptances = []; }

    const includeTokensInBody = includeLegacyTokens || isCrossOriginRequest(req);
    const body = {
      message,
      user,
      isNewUser: session.isNewUser,
      ...(session.serviceMembership && { serviceMembership: session.serviceMembership }),
      ...(includeTokensInBody && {
        tokens: {
          accessToken: session.tokens.accessToken,
          refreshToken: session.tokens.refreshToken,
          expiresIn: session.tokens.expiresIn,
        },
      }),
    };
    return status === 201 ? BaseController.created(res, body) : BaseController.ok(res, body);
  }

  private static handleError(res: Response, error: unknown, op: 'login' | 'signup' | 'link'): any {
    const err = error as Error & { code?: string; reason?: string; statusCode?: number; details?: { status?: unknown } };
    monitoringMetrics.recordAuthFailure(err.code || 'UNKNOWN');

    if (error instanceof GoogleIdTokenError) {
      // reason 은 로그에만 — 클라이언트에는 단일 code 로 응답한다(allowlist 상태 노출 최소화).
      logger.warn(`[GoogleAuthController.${op}] ID token rejected`, { reason: error.reason });
      return BaseController.unauthorized(res, 'Google 인증에 실패했습니다.', error.code);
    }
    if (error instanceof GoogleAuthError) {
      return BaseController.error(res, error.message, error.statusCode, error.code);
    }
    if (err.code === 'ACCOUNT_NOT_ACTIVE') {
      const accountStatus = resolveExposableAccountStatus(err.details?.status);
      return BaseController.forbidden(res, err.message, err.code, accountStatus ? { accountStatus } : undefined);
    }

    logger.error(`[GoogleAuthController.${op}] unexpected error`, {
      error: err.message,
      name: err.name,
      code: err.code,
      stack: err.stack?.split('\n').slice(0, 3).join(' | '),
    });
    return BaseController.error(res, op === 'login' ? 'Login failed' : op === 'signup' ? 'Signup failed' : 'Google link failed');
  }
}
