import { getHandoffServiceAlias, isCarePharmHandoffPath } from '../../../config/handoff-service-aliases.js';
import { getNetureMainMembershipStatus } from '../../neture/services/neture-main-membership.js';
import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { handoffTokenService } from '../../../services/handoff-token.service.js';
import { AppDataSource } from '../../../database/connection.js';
import {
  getService,
  getServiceOrigin,
} from '../../../config/service-catalog.js';
import {
  STORE_WORKSPACE_KEY,
  STORE_WORKSPACE_ORIGIN,
} from '../../../config/store-workspace.js';
import { resolveAccessibleStores } from '../../../utils/service-tenant.resolver.js';
import { isHandoffWorkspace } from '../../../services/handoff-token.service.js';
import { isRepresentativeEntryTarget } from '../../../config/representative-entry.js';
import logger from '../../../utils/logger.js';
import {
  SERVICE_SESSION_REVOKED_CODE,
  SESSION_REVOKED_CODE,
  SESSION_REVOKED_MESSAGE,
  hasLiveSession,
  isSafeReturnPath,
  resolveVerifiedHandoffSource,
} from './handoff-source.helpers.js';

export class HandoffIssuanceController extends BaseController {
  static async generateHandoff(req: Request, res: Response): Promise<any> {
    const { targetServiceKey, targetWorkspace, returnPath } = req.body;
    const user = (req as AuthRequest).user;

    if (!user) {
      return BaseController.error(
        res,
        'Authentication required',
        401,
        'AUTH_REQUIRED',
      );
    }
    if (!hasLiveSession(user as { refreshTokenFamily?: string | null })) {
      logger.warn('[Handoff] Blocked generation — session revoked', {
        userId: user.id,
        reason: 'session_revoked',
      });
      return BaseController.error(
        res,
        SESSION_REVOKED_MESSAGE,
        401,
        SESSION_REVOKED_CODE,
      );
    }

    // 위 검사는 **사용자 전체** family 만 본다 — 서비스 하나의 로그아웃은 그 값을 유지하므로
    // 여기서 출발 브라우저 세션을 따로 본다. 그러지 않으면 로그아웃된 서비스의 남은
    // access token 으로 수명이 긴 세션을 새로 얻는다.

    // §8-2: 대상 종류는 정확히 하나 — targetServiceKey(SERVICE) 또는 targetWorkspace(WORKSPACE)
    const hasServiceTarget =
      targetServiceKey !== undefined &&
      targetServiceKey !== null &&
      targetServiceKey !== '';
    const hasWorkspaceTarget =
      targetWorkspace !== undefined &&
      targetWorkspace !== null &&
      targetWorkspace !== '';
    if (hasServiceTarget && hasWorkspaceTarget) {
      return BaseController.error(
        res,
        'targetServiceKey and targetWorkspace are mutually exclusive',
        400,
        'VALIDATION_ERROR',
      );
    }
    if (!hasServiceTarget && !hasWorkspaceTarget) {
      return BaseController.error(
        res,
        'targetServiceKey is required',
        400,
        'VALIDATION_ERROR',
      );
    }
    if (hasWorkspaceTarget && !isHandoffWorkspace(targetWorkspace)) {
      return BaseController.error(
        res,
        `Unknown workspace: ${String(targetWorkspace)}`,
        400,
        'INVALID_WORKSPACE',
      );
    }

    // WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1: optional returnPath
    //   대표 홈에서 "내 매장"·"내 분회"처럼 대상 서비스의 특정 화면으로 바로 보내기 위한
    //   상대 경로. 대상 앱 basePath 기준 상대 경로만 허용한다 ('/' 로 시작, '//' 금지,
    //   scheme 불가 → open redirect 차단). 검증 실패는 무시하지 않고 400.
    let safeReturnPath: string | null = null;
    if (returnPath !== undefined && returnPath !== null && returnPath !== '') {
      if (!isSafeReturnPath(returnPath)) {
        return BaseController.error(
          res,
          'returnPath must be a relative path',
          400,
          'VALIDATION_ERROR',
        );
      }
      safeReturnPath = returnPath;
    }

    // ── WORKSPACE HANDOFF (store.neture.co.kr) ──────────────────────────────
    //   서비스 membership 이 아니라 Store 접근 가능 organization 으로 판단한다 (organization-first).
    if (hasWorkspaceTarget) {
      try {
        const stores = await resolveAccessibleStores(AppDataSource, user.id);
        if (
          stores.length === 0 &&
          (await getNetureMainMembershipStatus(AppDataSource, user.id)) !==
            'active'
        ) {
          logger.warn(
            '[Handoff] Blocked generation — no accessible store organization',
            {
              userId: user.id,
              targetWorkspace: STORE_WORKSPACE_KEY,
              reason: 'no_store',
            },
          );
          return BaseController.error(
            res,
            '메인 계정 확인 또는 내 매장 가입이 필요합니다.',
            403,
            'HANDOFF_TARGET_NO_MEMBERSHIP',
          );
        }

        const source = await resolveVerifiedHandoffSource(req, user.id);
        if (!source) {
          return BaseController.error(
            res,
            SESSION_REVOKED_MESSAGE,
            401,
            SERVICE_SESSION_REVOKED_CODE,
          );
        }
        const handoffToken = await handoffTokenService.generateToken(
          user.id,
          source.serviceKey,
          { kind: 'workspace', targetWorkspace: STORE_WORKSPACE_KEY },
          source.sessionEpoch,
          source.authMethod,
          source.sessionId,
          source.tokenFamily,
        );
        const targetUrl =
          `${STORE_WORKSPACE_ORIGIN}/handoff?token=${handoffToken}` +
          (safeReturnPath
            ? `&returnTo=${encodeURIComponent(safeReturnPath)}`
            : '');

        return BaseController.ok(res, {
          handoffToken,
          targetUrl,
          targetWorkspace: STORE_WORKSPACE_KEY,
        });
      } catch (err: any) {
        logger.error('[Handoff] Workspace token generation failed', err);
        return BaseController.error(
          res,
          'Failed to generate handoff token',
          500,
          'HANDOFF_GENERATION_FAILED',
        );
      }
    }

    // ── SERVICE HANDOFF (기존 로직 불변) ─────────────────────────────────────
    // Validate target service exists
    const alias = getHandoffServiceAlias(targetServiceKey);
    const targetService = getService(alias?.sessionServiceKey ?? targetServiceKey);
    if (!targetService) {
      return BaseController.error(
        res,
        `Unknown service: ${targetServiceKey}`,
        400,
        'INVALID_SERVICE',
      );
    }

    if (alias && !isCarePharmHandoffPath(safeReturnPath ?? '/')) {
      return BaseController.error(res, 'Invalid CarePharm handoff path', 400, 'VALIDATION_ERROR');
    }

    // ── REPRESENTATIVE ENTRY RETURN (O4O 홈 → neture.co.kr) ─────────────────
    //   WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1 §5-2:
    //   대표 진입 복귀는 neture membership 을 요구하지 않는다(O4O 계정 인증 ≠ 서비스 회원권).
    //   "아무 서비스 active membership" 도 자격으로 쓰지 않는다 — 자격은 활성 O4O 계정 + 살아 있는 세션뿐.
    //   계정 상태는 requireAuth 가 DB 기준으로 이미 판정했다(blocked 403 · restricted 는 이 경로 비허용).
    //   목적지는 대표 홈 '/' · My Home '/mypage' 와 열거된 복귀 맥락뿐이다. membership·role 생성 0.
    if (!alias && isRepresentativeEntryTarget(targetService.key)) {
      // Only representative home and the personal home, with a finite informational source.
      const representativePath = safeReturnPath || '/';
      if (
        !/^(?:\/|\/mypage(?:\?from=(?:store|study|community|funding|supplier|pharmacy|kpa|admin))?)$/.test(
          representativePath,
        )
      ) {
        return BaseController.error(
          res,
          'Invalid representative entry path',
          400,
          'VALIDATION_ERROR',
        );
      }
      try {
        const source = await resolveVerifiedHandoffSource(req, user.id);
        if (!source) {
          return BaseController.error(
            res,
            SESSION_REVOKED_MESSAGE,
            401,
            SERVICE_SESSION_REVOKED_CODE,
          );
        }
        const handoffToken = await handoffTokenService.generateToken(
          user.id,
          source.serviceKey,
          targetService.key,
          source.sessionEpoch,
          source.authMethod,
          source.sessionId,
          source.tokenFamily,
        );
        const targetOrigin =
          getServiceOrigin(targetService.key) ??
          `https://${targetService.domain}`;
        return BaseController.ok(res, {
          handoffToken,
          targetUrl: `${targetOrigin}/handoff?token=${handoffToken}&returnTo=${encodeURIComponent(representativePath)}`,
          targetService: {
            key: targetService.key,
            name: targetService.name,
            domain: targetService.domain,
          },
        });
      } catch (err: any) {
        logger.error(
          '[Handoff] Representative entry token generation failed',
          err,
        );
        return BaseController.error(
          res,
          'Failed to generate handoff token',
          500,
          'HANDOFF_GENERATION_FAILED',
        );
      }
    }

    try {
      // Authentication transport only: target API guards decide service access.
      // Nonmembers can view the introduction/application page without re-login.
      // 대표 진입·workspace 와 같은 출발 검사를 거친다 — 이 경로만 빠져 있으면 로그아웃된
      // 서비스의 남은 access token 으로 발급받고, 원장 세대가 null 이라 교환 검사도 건너뛴다.
      const source = await resolveVerifiedHandoffSource(req, user.id);
      if (!source) {
        return BaseController.error(
          res,
          SESSION_REVOKED_MESSAGE,
          401,
          SERVICE_SESSION_REVOKED_CODE,
        );
      }
      const handoffToken = await handoffTokenService.generateToken(
        user.id,
        source.serviceKey,
        targetServiceKey,
        source.sessionEpoch,
        source.authMethod,
        source.sessionId,
        source.tokenFamily,
      );

      // WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1:
      //   basePath 를 가진 서비스는 host 루트가 다른 서비스이므로 origin helper 로 base URL 을 만든다.
      //   (WO-O4O-KPA-BRANCH-SERVICE-CATALOG-AND-HANDOFF-ALIGNMENT-V1: kpa-branch → https://kpa.neture.co.kr/handoff)
      const targetOrigin =
        alias?.origin ?? getServiceOrigin(targetService.key) ??
        `https://${targetService.domain}`;
      const targetUrl =
        `${targetOrigin}/handoff?token=${handoffToken}` +
        (safeReturnPath
          ? `&returnTo=${encodeURIComponent(safeReturnPath)}`
          : '');

      return BaseController.ok(res, {
        handoffToken,
        targetUrl,
        targetService: {
          key: targetService.key,
          name: targetService.name,
          domain: targetService.domain,
        },
      });
    } catch (err: any) {
      logger.error('[Handoff] Token generation failed', err);
      return BaseController.error(
        res,
        'Failed to generate handoff token',
        500,
        'HANDOFF_GENERATION_FAILED',
      );
    }
  }
}
