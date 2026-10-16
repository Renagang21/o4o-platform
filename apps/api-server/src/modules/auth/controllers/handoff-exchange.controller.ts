import { getHandoffServiceAlias } from '../../../config/handoff-service-aliases.js';
import { getNetureMainMembershipStatus } from '../../neture/services/neture-main-membership.js';
import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { handoffTokenService } from '../../../services/handoff-token.service.js';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../entities/User.js';
import { roleAssignmentService } from '../services/role-assignment.service.js';
import * as tokenUtils from '../../../utils/token.utils.js';
import { readUserMembershipsWithMainAccess } from '../../../services/auth/auth-context.helper.js';
import {
  isSessionAuthMethodAllowed,
  sessionAuthMethodError,
} from '../../../common/auth/password-session.policy.js';
import { isStoreWorkspaceExchangeOrigin } from '../../../config/store-workspace.js';
import { resolveAccessibleStores } from '../../../utils/service-tenant.resolver.js';
import { type HandoffAuthMethod } from '../../../services/handoff-token.service.js';
import {
  isRepresentativeEntryTarget,
  isRepresentativeEntryExchangeOrigin,
} from '../../../config/representative-entry.js';
import { resolveAccountAccess } from '../../../common/auth/account-access.policy.js';
import { readServiceSessionEpoch } from '../../../services/auth/service-session-epoch.js';
import logger from '../../../utils/logger.js';
import { isBrowserSessionLive } from '../../../services/auth/browser-session.service.js';
import {
  SERVICE_SESSION_REVOKED_CODE,
  SESSION_REVOKED_CODE,
  SESSION_REVOKED_MESSAGE,
  hasLiveSession,
} from './handoff-source.helpers.js';

export class HandoffExchangeController extends BaseController {
  static async exchangeHandoff(req: Request, res: Response): Promise<any> {
    const { token } = req.body;

    if (!token) {
      return BaseController.error(
        res,
        'Handoff token is required',
        400,
        'VALIDATION_ERROR',
      );
    }

    try {
      // 1. Exchange handoff token (single-use, PostgreSQL)
      const payload = await handoffTokenService.exchangeToken(token);
      if (!payload) {
        return BaseController.error(
          res,
          'Handoff token is invalid or expired',
          401,
          'HANDOFF_TOKEN_INVALID',
        );
      }

      if (payload.targetServiceKey === 'pharmacy-hub') {
        return BaseController.error(
          res,
          'Service has been retired',
          410,
          'SERVICE_RETIRED',
        );
      }

      // 2. Load user from DB
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: payload.userId } });

      if (!user || !user.isActive) {
        return BaseController.error(
          res,
          'User not found or inactive',
          401,
          'INVALID_USER',
        );
      }

      if (
        resolveAccountAccess(user.status) !== 'normal' ||
        user.isEmailVerified === false
      ) {
        return BaseController.error(
          res,
          '이메일 확인과 계정 상태를 확인해 주세요.',
          403,
          'ACCOUNT_NOT_ACTIVE',
        );
      }

      // §6: 토큰 발급 뒤 60s 사이 logout 됐으면 교환으로 세션을 되살리지 않는다(모든 대상 공통).
      if (!hasLiveSession(user)) {
        logger.warn('[Handoff] Blocked exchange — session revoked', {
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

      // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (3차):
      //   위 검사는 **사용자 전체** family 만 본다. 서비스 하나의 로그아웃은 그 값을 유지하므로
      //   "발급 뒤 출발 서비스에서 로그아웃" 을 잡지 못했다 — 발급 시 원장에 남긴 출발 세대를
      //   현재 세대와 비교한다. 살아 있는 다른 서비스에서 온 정상 이동은 영향받지 않는다.
      //   `sourceSessionEpoch` 가 null = 이 컬럼 이전 발급분이므로 판정에서 제외한다(TTL 60초).
      //   `sourceSessionEpoch` 가 null = 이 컬럼 이전 발급분이므로 판정에서 제외한다(TTL 60초).
      //   `sourceServiceKey === 'unknown'` = 발급 때 범위를 못 정한 경우 → 최대 세대 규칙을 따른다.
      if (
        !(await isBrowserSessionLive(
          user.id,
          {
            serviceKey: payload.sourceServiceKey,
            sessionId: payload.sourceSessionId,
            tokenFamily: payload.sourceTokenFamily,
          },
          user.refreshTokenFamily,
        ))
      ) {
        logger.warn(
          '[Handoff] Blocked exchange — source service session revoked',
          {
            userId: user.id,
            sourceServiceKey: payload.sourceServiceKey,
          },
        );
        return BaseController.error(
          res,
          SESSION_REVOKED_MESSAGE,
          401,
          SERVICE_SESSION_REVOKED_CODE,
        );
      }

      // 3. Load fresh roles from role_assignments
      const roles = await roleAssignmentService.getRoleNames(user.id);

      // 4. Project verified main access while preserving independent service approvals.
      const memberships = await readUserMembershipsWithMainAccess(user.id);

      // §8-2: 대상 종류 판정 — WORKSPACE(store) 면 organization 축으로 재검증하고 origin 을 고정한다.
      //   토큰은 이미 원자적으로 소비됐으므로(단일 사용) 여기서 거부되면 재사용될 수 없다.
      if (payload.targetWorkspace !== undefined) {
        if (!isStoreWorkspaceExchangeOrigin(req.get('origin'))) {
          logger.warn(
            '[Handoff] Blocked exchange — workspace token from non-store origin',
            {
              userId: user.id,
              targetWorkspace: payload.targetWorkspace,
              reason: 'origin_mismatch',
            },
          );
          return BaseController.error(
            res,
            'Handoff token is invalid or expired',
            401,
            'HANDOFF_TOKEN_INVALID',
          );
        }
        const stores = await resolveAccessibleStores(AppDataSource, user.id);
        if (
          stores.length === 0 &&
          (await getNetureMainMembershipStatus(AppDataSource, user.id)) !==
            'active'
        ) {
          logger.warn(
            '[Handoff] Blocked exchange — no accessible store organization',
            {
              userId: user.id,
              targetWorkspace: payload.targetWorkspace,
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
        return HandoffExchangeController.issueHandoffSession(
          req,
          res,
          user,
          roles,
          memberships,
          {
            targetWorkspace: payload.targetWorkspace,
          },
          payload.sourceAuthMethod,
        );
      }

      // Alias tokens are consumed only by their exact receiver, then issue the existing account session.
      // Canonical Neture tokens still go through the representative-only origin/path contract below.
      const alias = getHandoffServiceAlias(payload.targetServiceKey);
      if (alias) {
        if (req.get('origin') !== alias.origin) {
          return BaseController.error(res, 'Handoff token is invalid or expired', 401, 'HANDOFF_TOKEN_INVALID');
        }
        return HandoffExchangeController.issueHandoffSession(
          req, res, user, roles, memberships, { targetServiceKey: alias.sessionServiceKey }, payload.sourceAuthMethod,
        );
      }

      // ── REPRESENTATIVE ENTRY RETURN (neture.co.kr) ──────────────────────────
      //   §5-2 / §5-3: membership 대신 (1) 수신 origin = 대표 진입 host 고정 (2) 계정 상태 DB 재확인.
      //   토큰은 이미 원자 소비됐으므로 여기서 거부되면 재사용될 수 없다. membership·role 은 읽기만 한다.
      if (isRepresentativeEntryTarget(payload.targetServiceKey)) {
        if (!isRepresentativeEntryExchangeOrigin(req.get('origin'))) {
          logger.warn(
            '[Handoff] Blocked exchange — representative entry token from non-entry origin',
            {
              userId: user.id,
              targetServiceKey: payload.targetServiceKey,
              reason: 'origin_mismatch',
            },
          );
          return BaseController.error(
            res,
            'Handoff token is invalid or expired',
            401,
            'HANDOFF_TOKEN_INVALID',
          );
        }
        if (resolveAccountAccess(user.status) !== 'normal') {
          logger.warn(
            '[Handoff] Blocked exchange — account not accessible for representative entry',
            {
              userId: user.id,
              reason: 'account_not_active',
            },
          );
          return BaseController.error(
            res,
            '이용할 수 없는 계정 상태입니다.',
            403,
            'ACCOUNT_NOT_ACTIVE',
          );
        }
        return HandoffExchangeController.issueHandoffSession(
          req,
          res,
          user,
          roles,
          memberships,
          {
            targetServiceKey: payload.targetServiceKey,
          },
          payload.sourceAuthMethod,
        );
      }

      // Preserve the account session without granting service membership or roles.
      return HandoffExchangeController.issueHandoffSession(
        req,
        res,
        user,
        roles,
        memberships,
        {
          targetServiceKey: payload.targetServiceKey,
        },
        payload.sourceAuthMethod,
      );
    } catch (err: any) {
      logger.error('[Handoff] Token exchange failed', err);
      return BaseController.error(
        res,
        'Handoff exchange failed',
        500,
        'HANDOFF_EXCHANGE_FAILED',
      );
    }
  }

  private static async issueHandoffSession(
    req: Request,
    res: Response,
    user: User,
    roles: string[],
    memberships: { serviceKey: string; status: string }[],
    target: { targetServiceKey?: string; targetWorkspace?: string },
    sourceAuthMethod: HandoffAuthMethod,
  ): Promise<any> {
    // 5. Generate auth tokens
    // WO-O4O-LOGOUT-ALL-TOKEN-INVALIDATION-V1:
    //   handoff 는 새 로그인이 아니라 기존 세션의 교차 서비스 승계다.
    //   새 family 를 발급하면 원 서비스 세션이 family mismatch 로 죽는다 → 기존 family 를 승계한다.
    //   (기존 family 가 없으면 새로 발급하고 아래에서 기록한다.)
    // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8:
    //   handoff 로 발급되는 토큰은 **대상 서비스의 세션**이다. 그 서비스에서 로그아웃하면
    //   이 토큰만 무효가 되고 원 서비스 세션은 살아 있어야 한다.
    //   WORKSPACE handoff(store)는 서비스가 아니므로 workspace 키를 그대로 쓴다.
    const sessionServiceKey =
      target.targetServiceKey ?? target.targetWorkspace ?? null;
    // 대상 서비스의 **현재 세대**를 새긴다. 원 서비스의 세대가 아니다 — handoff 로 만들어지는
    // 것은 대상 서비스의 세션이고, 그 서비스에서 로그아웃하면 이 토큰이 끊겨야 한다.
    const sessionEpoch = await readServiceSessionEpoch(
      user.id,
      sessionServiceKey,
    );

    // WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-4 · 최종 보완 1: 교환 세션은 **원장에 남은 출발 수단**을 승계한다.
    //   수단은 발급 시점에 검증된 access token claim 에서 온 값이다. 교환 시점의 Google 연결 여부 ·
    //   역할로 다시 추정하지 않는다 — 그 사이 Google 이 연결되거나 역할이 붙어도 비밀번호 세션이
    //   Google 세션으로 승격되지 않는다. NULL(컬럼 이전 발급분)은 원장 읽기에서 password 로 온다.
    //   **지금의 역할**로 Google 긍정 관리자 경계(Admin 화면 · platform:*)를 다시 본다.
    const authMethod = sourceAuthMethod;
    if (!isSessionAuthMethodAllowed(authMethod, sessionServiceKey, roles)) {
      const error = sessionAuthMethodError(authMethod);
      return BaseController.error(res, error.message, 403, error.code);
    }

    const tokens = tokenUtils.generateTokens(
      user,
      roles,
      'neture.co.kr',
      memberships,
      user.refreshTokenFamily ?? null,
      sessionServiceKey,
      sessionEpoch,
      authMethod,
    );
    // Handoff never writes a family: password revocation racing the exchange must win.

    // 6. Tokens in body only (localStorage-strategy services). No Set-Cookie — see class doc above.
    return BaseController.ok(res, {
      message: 'Handoff successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.firstName || '',
        roles,
        memberships,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
      ...target,
    });
  }
}
