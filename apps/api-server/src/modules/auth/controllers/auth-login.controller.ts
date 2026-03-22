/**
 * @core O4O_PLATFORM_CORE — Auth
 * Auth Login Controller: email/password login
 * Split from auth.controller.ts (WO-O4O-AUTH-CONTROLLER-SPLIT-V1)
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 */
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BaseController } from '../../../common/base.controller.js';
import { authenticationService } from '../../../services/authentication.service.js';
import { AppDataSource } from '../../../database/connection.js';
import type { LoginRequestDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';
import { RedisService } from '../../../services/redis.service.js';
import { monitoringMetrics } from '../../../common/monitoring/metrics.service.js';
import {
  isCrossOriginRequest,
  derivePharmacistQualification,
  deriveKpaMembershipContext,
} from './auth-helpers.js';

// Phase 5-B: Auth ↔ Infra Separation
// Auth 계층은 DB 상태 검사를 수행하지 않음.
// AppDataSource.isInitialized 체크는 Health Check에서만 수행.
// @see docs/architecture/auth-infra-separation.md

/**
 * Classify error for observability
 */
function classifyAuthError(error: Error): string {
  const msg = error.message?.toLowerCase() || '';
  if (msg.includes('jwt_secret') || msg.includes('jwt_refresh_secret')) {
    return 'jwt-config-missing';
  }
  if (msg.includes('database') || msg.includes('connection') || msg.includes('typeorm') || msg.includes('repository')) {
    return 'db-connection-failed';
  }
  if (msg.includes('timeout')) {
    return 'timeout';
  }
  return 'unknown';
}

export class AuthLoginController extends BaseController {
  /**
   * POST /api/v1/auth/login
   * Login with email/password
   *
   * Phase 6-7: Cookie Auth Primary
   * - httpOnly cookies are the primary authentication method
   * - JSON body tokens are optional (for legacy client support)
   * - Pass includeLegacyTokens: true in request body to receive tokens in response
   * - Cross-origin requests automatically receive tokens in response body
   */
  static async login(req: Request, res: Response): Promise<any> {
    const { email, password, deviceId, includeLegacyTokens } = req.body as LoginRequestDto & { includeLegacyTokens?: boolean };
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

    // Cross-origin requests need tokens in response body since cookies won't work
    const isCrossOrigin = isCrossOriginRequest(req);
    const includeTokensInBody = includeLegacyTokens || isCrossOrigin;

    // Phase 5-B: Auth ↔ Infra Separation
    // Auth는 DB 상태를 검사하지 않음. DB 실패 시 자연스럽게 500 반환.
    // 503은 Health Check의 책임. Auth는 인증 판단만 담당.
    // @see docs/architecture/auth-infra-separation.md

    try {
      const result = await authenticationService.login({
        provider: 'email',
        credentials: { email, password },
        ipAddress,
        userAgent,
      });

      // Phase 6-7: Cookie Auth Primary
      // Set httpOnly cookies as primary authentication method
      // Uses request origin for multi-domain cookie support
      authenticationService.setAuthCookies(req, res, result.tokens, result.sessionId);

      // Enrich user data with activityType + kpaMembership (same as /auth/me)
      const loginUser = result.user as Record<string, unknown>;
      try {
        const qualification = await derivePharmacistQualification(result.user.id);
        loginUser.pharmacistRole = qualification.pharmacistRole;
        loginUser.pharmacistFunction = qualification.pharmacistFunction;
        loginUser.isStoreOwner = qualification.isStoreOwner;
      } catch { /* non-critical */ }
      try {
        const [profile] = await AppDataSource.query(
          `SELECT activity_type FROM kpa_pharmacist_profiles WHERE user_id = $1 LIMIT 1`,
          [result.user.id]
        );
        loginUser.activityType = profile?.activity_type || null;
      } catch { loginUser.activityType = null; }
      try {
        const kpaMembership = await deriveKpaMembershipContext(result.user.id);
        loginUser.kpaMembership = kpaMembership;
      } catch { /* non-critical */ }

      // WO-O4O-NAME-NORMALIZATION-V1: displayName 추가
      loginUser.displayName =
        (result.user.lastName || result.user.firstName)
          ? `${result.user.lastName || ''}${result.user.firstName || ''}`.trim()
          : result.user.name || result.user.email?.split('@')[0] || '사용자';

      // Response: Cookie is primary, JSON tokens for cross-origin or legacy support
      return BaseController.ok(res, {
        message: 'Login successful',
        user: result.user,
        // Include tokens for cross-origin requests or when explicitly requested
        ...(includeTokensInBody && {
          tokens: {
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresIn: result.tokens.expiresIn,
          },
        }),
      });
    } catch (error: any) {
      // P1 Fix: Enhanced error logging with classification
      const errorTag = classifyAuthError(error);
      logger.error('[AuthLoginController.login] Login error', {
        error: error.message,
        name: error.name,
        code: error.code,
        tag: errorTag,
        email,
        stack: error.stack?.split('\n').slice(0, 3).join(' | '),
      });

      // WO-O4O-MONITORING-IMPLEMENTATION-V1: Auth failure metric
      monitoringMetrics.recordAuthFailure(error.code || 'UNKNOWN');

      // Handle specific auth errors with specific error codes
      if (error.code === 'INVALID_CREDENTIALS') {
        // WO-O4O-AUTH-PASSWORD-SYNC-V1: Issue syncToken for password reset flow
        try {
          const syncToken = uuidv4();
          const redis = RedisService.getInstance();
          await redis.set(
            `password-sync:${syncToken}`,
            JSON.stringify({ email, createdAt: Date.now() }),
            300, // 5 minutes TTL
          );
          return res.status(401).json({
            success: false,
            error: '비밀번호가 일치하지 않습니다.',
            code: 'PASSWORD_MISMATCH',
            passwordSyncAvailable: true,
            syncToken,
          });
        } catch (syncErr) {
          logger.warn('[AuthLoginController.login] Failed to generate syncToken', syncErr);
          return BaseController.unauthorized(res, error.message, 'PASSWORD_MISMATCH');
        }
      }
      if (error.code === 'INVALID_USER') {
        return BaseController.unauthorized(res, error.message, error.code);
      }
      if (error.code === 'ACCOUNT_NOT_ACTIVE' || error.code === 'ACCOUNT_LOCKED') {
        return BaseController.forbidden(res, error.message, error.code);
      }
      if (error.code === 'TOO_MANY_ATTEMPTS') {
        return BaseController.error(res, error.message, 429);
      }

      // Phase 5-B: Auth ↔ Infra Separation
      // Auth는 503을 반환하지 않음. 인프라 문제는 500으로 처리.
      // Cloud Run이 Health Check를 통해 인스턴스 상태를 관리.
      return BaseController.error(res, 'Login failed');
    }
  }
}
