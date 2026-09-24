/**
 * Handoff Controller
 *
 * WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1
 * Cross-service SSO handoff via Redis-based single-use tokens.
 *
 * WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1 (2026-05-24):
 *   Identity V2 §7.2 해석 A 충족 — generateHandoff / exchangeHandoff 양쪽 모두
 *   target service 의 service_memberships.status === 'active' 검증을 수행한다.
 *   pending / rejected / suspended / withdrawn / 미가입 사용자가 Handoff 로
 *   대상 서비스 인증 토큰을 우회 획득하는 경로를 차단 (Service Join API 의
 *   pending 정책과 짝을 이루는 V2 정합 보강).
 *
 * WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-2 (2026-09-21):
 *   handoff 대상은 두 종류 — SERVICE(targetServiceKey · 기존 로직 불변) / WORKSPACE(targetWorkspace='store').
 *   Store workspace handoff 는 특정 서비스 membership 이 아니라 "Store 접근 가능 organization ≥ 1" 로 판단하고,
 *   exchange 는 store.neture.co.kr origin 에서만 허용한다. 가짜 serviceKey('store') 는 쓰지 않는다.
 *
 * WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1:
 *   대표 진입(targetServiceKey === REPRESENTATIVE_ENTRY_SERVICE_KEY) 만 membership 검사 대신
 *   활성 계정 + 대표 진입 origin 고정 + returnTo '/' 고정으로 판정한다. 다른 서비스 대상은 불변.
 *   모든 대상 공통: 폐기된 세션(refreshTokenFamily null)은 발급·교환 모두 401 HANDOFF_SESSION_REVOKED.
 *
 * Endpoints:
 * - POST /api/v1/auth/handoff       — Generate handoff token (requireAuth)
 * - POST /api/v1/auth/handoff/exchange — Exchange token for auth (public)
 * - GET  /api/v1/auth/services        — User's service catalog (requireAuth)
 */

import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { handoffTokenService } from '../../../services/handoff-token.service.js';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../entities/User.js';
import { roleAssignmentService } from '../services/role-assignment.service.js';
import * as tokenUtils from '../../../utils/token.utils.js';
import { persistRefreshTokenFamily } from '../../../services/auth/auth-context.helper.js';
import { setAuthCookies } from '../../../utils/cookie.utils.js';
import { getService, getServiceOrigin, O4O_SERVICES } from '../../../config/service-catalog.js';
import { STORE_WORKSPACE_KEY, STORE_WORKSPACE_ORIGIN, isStoreWorkspaceExchangeOrigin } from '../../../config/store-workspace.js';
import { resolveAccessibleStores } from '../../../utils/service-tenant.resolver.js';
import { isHandoffWorkspace } from '../../../services/handoff-token.service.js';
import { isRepresentativeEntryTarget, isRepresentativeEntryExchangeOrigin } from '../../../config/representative-entry.js';
import { resolveAccountAccess } from '../../../common/auth/account-access.policy.js';
import logger from '../../../utils/logger.js';

/**
 * WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1 §6 — 폐기된 세션의 handoff 부활 차단.
 *
 * logout / logout-all / family mismatch 는 `users.refreshTokenFamily` 를 null 로 만든다. 그 뒤에도 남은
 * access token(최대 15분)으로 handoff 를 발급·교환하면 exchange 가 새 family 를 만들어 세션이 되살아났다.
 * 모든 로그인 경로는 family 를 기록하므로(`persistRefreshTokenFamily` 계약) null family = 종료된 세션이다.
 */
const SESSION_REVOKED_CODE = 'HANDOFF_SESSION_REVOKED';
const SESSION_REVOKED_MESSAGE = '로그인 세션이 종료되었습니다. 다시 로그인해 주세요.';
function hasLiveSession(user: { refreshTokenFamily?: string | null } | null | undefined): boolean {
  return typeof user?.refreshTokenFamily === 'string' && user.refreshTokenFamily.length > 0;
}

/**
 * WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1: returnPath 안전 검증.
 * '/' 로 시작하는 단일 슬래시 상대 경로만 허용. 길이 상한·제어문자·백슬래시 거부.
 */
function isSafeReturnPath(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > 512) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//') || value.startsWith('/\\')) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(value)) return false;
  return true;
}

/**
 * Detect source service from the exact Origin hostname.
 * WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1:
 *   study.neture.co.kr includes the string "neture.co.kr", so substring matching would
 *   misclassify the independent Lecture service as Neture. Origin is host-level data;
 *   compare hostnames exactly. Services sharing one host (e.g. basePath tenants) keep
 *   the catalog's first-host match because Origin headers do not carry a path.
 */
function detectSourceServiceKey(origin: string): string {
  try {
    const originHost = new URL(origin).hostname.toLowerCase();
    const sourceService = O4O_SERVICES.find((svc) => svc.domain.toLowerCase() === originHost);
    return sourceService?.key ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export class HandoffController extends BaseController {
  /**
   * POST /api/v1/auth/handoff
   *
   * Generate a handoff token for cross-service navigation.
   * Requires authentication. The token is stored in Redis (60s TTL, single-use).
   */
  static async generateHandoff(req: Request, res: Response): Promise<any> {
    const { targetServiceKey, targetWorkspace, returnPath } = req.body;
    const user = (req as AuthRequest).user;

    if (!user) {
      return BaseController.error(res, 'Authentication required', 401, 'AUTH_REQUIRED');
    }
    if (!hasLiveSession(user as { refreshTokenFamily?: string | null })) {
      logger.warn('[Handoff] Blocked generation — session revoked', { userId: user.id, reason: 'session_revoked' });
      return BaseController.error(res, SESSION_REVOKED_MESSAGE, 401, SESSION_REVOKED_CODE);
    }

    // §8-2: 대상 종류는 정확히 하나 — targetServiceKey(SERVICE) 또는 targetWorkspace(WORKSPACE)
    const hasServiceTarget = targetServiceKey !== undefined && targetServiceKey !== null && targetServiceKey !== '';
    const hasWorkspaceTarget = targetWorkspace !== undefined && targetWorkspace !== null && targetWorkspace !== '';
    if (hasServiceTarget && hasWorkspaceTarget) {
      return BaseController.error(res, 'targetServiceKey and targetWorkspace are mutually exclusive', 400, 'VALIDATION_ERROR');
    }
    if (!hasServiceTarget && !hasWorkspaceTarget) {
      return BaseController.error(res, 'targetServiceKey is required', 400, 'VALIDATION_ERROR');
    }
    if (hasWorkspaceTarget && !isHandoffWorkspace(targetWorkspace)) {
      return BaseController.error(res, `Unknown workspace: ${String(targetWorkspace)}`, 400, 'INVALID_WORKSPACE');
    }

    // WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1: optional returnPath
    //   대표 홈에서 "내 매장"·"내 분회"처럼 대상 서비스의 특정 화면으로 바로 보내기 위한
    //   상대 경로. 대상 앱 basePath 기준 상대 경로만 허용한다 ('/' 로 시작, '//' 금지,
    //   scheme 불가 → open redirect 차단). 검증 실패는 무시하지 않고 400.
    let safeReturnPath: string | null = null;
    if (returnPath !== undefined && returnPath !== null && returnPath !== '') {
      if (!isSafeReturnPath(returnPath)) {
        return BaseController.error(res, 'returnPath must be a relative path', 400, 'VALIDATION_ERROR');
      }
      safeReturnPath = returnPath;
    }

    // ── WORKSPACE HANDOFF (store.neture.co.kr) ──────────────────────────────
    //   서비스 membership 이 아니라 Store 접근 가능 organization 으로 판단한다 (organization-first).
    if (hasWorkspaceTarget) {
      try {
        const stores = await resolveAccessibleStores(AppDataSource, user.id);
        if (stores.length === 0) {
          logger.warn('[Handoff] Blocked generation — no accessible store organization', {
            userId: user.id,
            targetWorkspace: STORE_WORKSPACE_KEY,
            reason: 'no_store',
          });
          return BaseController.error(res, '접근 가능한 매장이 없습니다.', 403, 'HANDOFF_TARGET_NO_MEMBERSHIP');
        }

        const sourceServiceKey = detectSourceServiceKey(req.get('origin') || '');
        const handoffToken = await handoffTokenService.generateToken(user.id, sourceServiceKey, {
          kind: 'workspace',
          targetWorkspace: STORE_WORKSPACE_KEY,
        });
        const targetUrl =
          `${STORE_WORKSPACE_ORIGIN}/handoff?token=${handoffToken}` +
          (safeReturnPath ? `&returnTo=${encodeURIComponent(safeReturnPath)}` : '');

        return BaseController.ok(res, {
          handoffToken,
          targetUrl,
          targetWorkspace: STORE_WORKSPACE_KEY,
        });
      } catch (err: any) {
        logger.error('[Handoff] Workspace token generation failed', err);
        return BaseController.error(res, 'Failed to generate handoff token', 500, 'HANDOFF_GENERATION_FAILED');
      }
    }

    // ── SERVICE HANDOFF (기존 로직 불변) ─────────────────────────────────────
    // Validate target service exists
    const targetService = getService(targetServiceKey);
    if (!targetService) {
      return BaseController.error(res, `Unknown service: ${targetServiceKey}`, 400, 'INVALID_SERVICE');
    }

    // ── REPRESENTATIVE ENTRY RETURN (O4O 홈 → neture.co.kr) ─────────────────
    //   WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1 §5-2:
    //   대표 진입 복귀는 neture membership 을 요구하지 않는다(O4O 계정 인증 ≠ 서비스 회원권).
    //   "아무 서비스 active membership" 도 자격으로 쓰지 않는다 — 자격은 활성 O4O 계정 + 살아 있는 세션뿐.
    //   계정 상태는 requireAuth 가 DB 기준으로 이미 판정했다(blocked 403 · restricted 는 이 경로 비허용).
    //   목적지는 대표 홈 '/' 고정 — 범용 redirect 를 만들지 않는다. membership·role 생성 0.
    if (isRepresentativeEntryTarget(targetService.key)) {
      if (safeReturnPath && safeReturnPath !== '/') {
        return BaseController.error(res, 'returnPath must be / for representative entry', 400, 'VALIDATION_ERROR');
      }
      try {
        const sourceServiceKey = detectSourceServiceKey(req.get('origin') || '');
        const handoffToken = await handoffTokenService.generateToken(user.id, sourceServiceKey, targetService.key);
        const targetOrigin = getServiceOrigin(targetService.key) ?? `https://${targetService.domain}`;
        return BaseController.ok(res, {
          handoffToken,
          targetUrl: `${targetOrigin}/handoff?token=${handoffToken}&returnTo=${encodeURIComponent('/')}`,
          targetService: { key: targetService.key, name: targetService.name, domain: targetService.domain },
        });
      } catch (err: any) {
        logger.error('[Handoff] Representative entry token generation failed', err);
        return BaseController.error(res, 'Failed to generate handoff token', 500, 'HANDOFF_GENERATION_FAILED');
      }
    }

    try {
      // WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1:
      //   target service active membership 검증 (generation 시점).
      //   미가입 / pending / rejected / suspended / withdrawn 모두 차단.
      const targetMembership: { status: string }[] = await AppDataSource.query(
        `SELECT status FROM service_memberships
           WHERE user_id = $1 AND service_key = $2`,
        [user.id, targetServiceKey],
      );

      if (targetMembership.length === 0) {
        logger.warn('[Handoff] Blocked generation — no membership on target service', {
          userId: user.id,
          targetServiceKey,
          reason: 'no_membership',
        });
        return BaseController.error(
          res,
          '대상 서비스에 가입되어 있지 않습니다.',
          403,
          'HANDOFF_TARGET_NO_MEMBERSHIP',
        );
      }

      const targetStatus = targetMembership[0].status;

      if (targetStatus === 'withdrawn') {
        logger.warn('[Handoff] Blocked generation — withdrawn membership on target service', {
          userId: user.id,
          targetServiceKey,
          membershipStatus: targetStatus,
          reason: 'withdrawn',
        });
        return BaseController.error(
          res,
          '탈퇴한 서비스는 Handoff 로 접근할 수 없습니다.',
          403,
          'HANDOFF_TARGET_WITHDRAWN',
        );
      }

      if (targetStatus !== 'active') {
        logger.warn('[Handoff] Blocked generation — non-active membership on target service', {
          userId: user.id,
          targetServiceKey,
          membershipStatus: targetStatus,
          reason: 'not_active',
        });
        return BaseController.error(
          res,
          '대상 서비스 가입이 아직 승인되지 않았습니다.',
          403,
          'HANDOFF_TARGET_NOT_ACTIVE',
        );
      }

      const sourceServiceKey = detectSourceServiceKey(req.get('origin') || '');

      const handoffToken = await handoffTokenService.generateToken(
        user.id,
        sourceServiceKey,
        targetServiceKey,
      );

      // WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1:
      //   basePath 를 가진 서비스(kpa-branch = kpa-society.co.kr/kpa)는 host 루트가
      //   다른 서비스이므로 origin helper 로 base URL 을 만든다.
      const targetOrigin = getServiceOrigin(targetService.key) ?? `https://${targetService.domain}`;
      const targetUrl =
        `${targetOrigin}/handoff?token=${handoffToken}` +
        (safeReturnPath ? `&returnTo=${encodeURIComponent(safeReturnPath)}` : '');

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
      return BaseController.error(res, 'Failed to generate handoff token', 500, 'HANDOFF_GENERATION_FAILED');
    }
  }

  /**
   * POST /api/v1/auth/handoff/exchange
   *
   * Exchange a handoff token for authentication tokens.
   * Public endpoint — the handoff token itself acts as authentication.
   * Sets cookies for the target domain (auto-detected from Origin header).
   * Also returns tokens in body for localStorage-strategy services.
   */
  static async exchangeHandoff(req: Request, res: Response): Promise<any> {
    const { token } = req.body;

    if (!token) {
      return BaseController.error(res, 'Handoff token is required', 400, 'VALIDATION_ERROR');
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

      // 2. Load user from DB
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: payload.userId } });

      if (!user || !user.isActive) {
        return BaseController.error(res, 'User not found or inactive', 401, 'INVALID_USER');
      }

      // §6: 토큰 발급 뒤 60s 사이 logout 됐으면 교환으로 세션을 되살리지 않는다(모든 대상 공통).
      if (!hasLiveSession(user)) {
        logger.warn('[Handoff] Blocked exchange — session revoked', { userId: user.id, reason: 'session_revoked' });
        return BaseController.error(res, SESSION_REVOKED_MESSAGE, 401, SESSION_REVOKED_CODE);
      }

      // 3. Load fresh roles from role_assignments
      const roles = await roleAssignmentService.getRoleNames(user.id);

      // 4. Load fresh memberships from service_memberships
      const memberships: { serviceKey: string; status: string }[] =
        await AppDataSource.query(
          `SELECT service_key AS "serviceKey", status FROM service_memberships WHERE user_id = $1`,
          [user.id],
        );

      // §8-2: 대상 종류 판정 — WORKSPACE(store) 면 organization 축으로 재검증하고 origin 을 고정한다.
      //   토큰은 이미 원자적으로 소비됐으므로(단일 사용) 여기서 거부되면 재사용될 수 없다.
      if (payload.targetWorkspace !== undefined) {
        if (!isStoreWorkspaceExchangeOrigin(req.get('origin'))) {
          logger.warn('[Handoff] Blocked exchange — workspace token from non-store origin', {
            userId: user.id,
            targetWorkspace: payload.targetWorkspace,
            reason: 'origin_mismatch',
          });
          return BaseController.error(res, 'Handoff token is invalid or expired', 401, 'HANDOFF_TOKEN_INVALID');
        }
        const stores = await resolveAccessibleStores(AppDataSource, user.id);
        if (stores.length === 0) {
          logger.warn('[Handoff] Blocked exchange — no accessible store organization', {
            userId: user.id,
            targetWorkspace: payload.targetWorkspace,
            reason: 'no_store',
          });
          return BaseController.error(res, '접근 가능한 매장이 없습니다.', 403, 'HANDOFF_TARGET_NO_MEMBERSHIP');
        }
        return HandoffController.issueHandoffSession(req, res, user, roles, memberships, {
          targetWorkspace: payload.targetWorkspace,
        });
      }

      // ── REPRESENTATIVE ENTRY RETURN (neture.co.kr) ──────────────────────────
      //   §5-2 / §5-3: membership 대신 (1) 수신 origin = 대표 진입 host 고정 (2) 계정 상태 DB 재확인.
      //   토큰은 이미 원자 소비됐으므로 여기서 거부되면 재사용될 수 없다. membership·role 은 읽기만 한다.
      if (isRepresentativeEntryTarget(payload.targetServiceKey)) {
        if (!isRepresentativeEntryExchangeOrigin(req.get('origin'))) {
          logger.warn('[Handoff] Blocked exchange — representative entry token from non-entry origin', {
            userId: user.id,
            targetServiceKey: payload.targetServiceKey,
            reason: 'origin_mismatch',
          });
          return BaseController.error(res, 'Handoff token is invalid or expired', 401, 'HANDOFF_TOKEN_INVALID');
        }
        if (resolveAccountAccess(user.status) !== 'normal') {
          logger.warn('[Handoff] Blocked exchange — account not accessible for representative entry', {
            userId: user.id,
            reason: 'account_not_active',
          });
          return BaseController.error(res, '이용할 수 없는 계정 상태입니다.', 403, 'ACCOUNT_NOT_ACTIVE');
        }
        return HandoffController.issueHandoffSession(req, res, user, roles, memberships, {
          targetServiceKey: payload.targetServiceKey,
        });
      }

      // ── SERVICE HANDOFF (기존 로직 불변) ────────────────────────────────────
      // WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1:
      //   target service active membership 재검증 (exchange 시점).
      //   generation 시점에 active 였더라도 60s TTL 사이에 status 가 변경됐을 수 있으므로
      //   exchange 시점에 다시 확인 (이중 안전판).
      const targetMembership = memberships.find(
        m => m.serviceKey === payload.targetServiceKey,
      );

      if (!targetMembership) {
        logger.warn('[Handoff] Blocked exchange — no membership on target service', {
          userId: user.id,
          targetServiceKey: payload.targetServiceKey,
          reason: 'no_membership',
        });
        return BaseController.error(
          res,
          '대상 서비스에 가입되어 있지 않습니다.',
          403,
          'HANDOFF_TARGET_NO_MEMBERSHIP',
        );
      }

      if (targetMembership.status === 'withdrawn') {
        logger.warn('[Handoff] Blocked exchange — withdrawn membership on target service', {
          userId: user.id,
          targetServiceKey: payload.targetServiceKey,
          membershipStatus: targetMembership.status,
          reason: 'withdrawn',
        });
        return BaseController.error(
          res,
          '탈퇴한 서비스는 Handoff 로 접근할 수 없습니다.',
          403,
          'HANDOFF_TARGET_WITHDRAWN',
        );
      }

      if (targetMembership.status !== 'active') {
        logger.warn('[Handoff] Blocked exchange — non-active membership on target service', {
          userId: user.id,
          targetServiceKey: payload.targetServiceKey,
          membershipStatus: targetMembership.status,
          reason: 'not_active',
        });
        return BaseController.error(
          res,
          '대상 서비스 가입이 아직 승인되지 않았습니다.',
          403,
          'HANDOFF_TARGET_NOT_ACTIVE',
        );
      }

      return HandoffController.issueHandoffSession(req, res, user, roles, memberships, {
        targetServiceKey: payload.targetServiceKey,
      });
    } catch (err: any) {
      logger.error('[Handoff] Token exchange failed', err);
      return BaseController.error(res, 'Handoff exchange failed', 500, 'HANDOFF_EXCHANGE_FAILED');
    }
  }

  /**
   * exchange 공통 후반부 (SERVICE / WORKSPACE 동일): 토큰 발급 · family 승계 · 쿠키 · body.
   */
  private static async issueHandoffSession(
    req: Request,
    res: Response,
    user: User,
    roles: string[],
    memberships: { serviceKey: string; status: string }[],
    target: { targetServiceKey?: string; targetWorkspace?: string },
  ): Promise<any> {
    // 5. Generate auth tokens
    // WO-O4O-LOGOUT-ALL-TOKEN-INVALIDATION-V1:
    //   handoff 는 새 로그인이 아니라 기존 세션의 교차 서비스 승계다.
    //   새 family 를 발급하면 원 서비스 세션이 family mismatch 로 죽는다 → 기존 family 를 승계한다.
    //   (기존 family 가 없으면 새로 발급하고 아래에서 기록한다.)
    const tokens = tokenUtils.generateTokens(
      user,
      roles,
      'neture.co.kr',
      memberships,
      user.refreshTokenFamily ?? null,
    );
    await persistRefreshTokenFamily(user.id, tokens.refreshToken);

    // 6. Set cookies (domain auto-detected from Origin header via getCookieDomainFromOrigin)
    setAuthCookies(req, res, tokens);

    // 7. Always include tokens in body (for localStorage-strategy services)
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

  /**
   * POST /api/v1/auth/services/:serviceKey/join
   *
   * Join or reactivate a service membership.
   * Requires authentication.
   */
  static async joinService(req: Request, res: Response): Promise<any> {
    const user = (req as AuthRequest).user;
    const { serviceKey } = req.params;

    if (!user) {
      return BaseController.error(res, 'Authentication required', 401, 'AUTH_REQUIRED');
    }

    // Validate service exists
    const service = getService(serviceKey);
    if (!service) {
      return BaseController.error(res, `Unknown service: ${serviceKey}`, 400, 'INVALID_SERVICE');
    }

    if (!service.joinEnabled) {
      return BaseController.error(res, 'This service does not accept new memberships', 400, 'JOIN_DISABLED');
    }

    try {
      // Check existing membership
      const existing: { id: string; status: string }[] = await AppDataSource.query(
        `SELECT id, status FROM service_memberships WHERE user_id = $1 AND service_key = $2`,
        [user.id, serviceKey],
      );

      // WO-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1 (2026-05-23):
      //   Option β — instant active 우회 제거. 모든 신규/재신청은 pending 으로 생성.
      //   운영자 승인을 거쳐야 active 가 된다 (Register 흐름과 정합).
      //   IR-O4O-SERVICE-SWITCHER-DEPRECATION-AUDIT-V1 §3.3 의 service_memberships
      //   생성 경로 비대칭 (Switcher Join 만 instant active) 해소.
      if (existing.length > 0) {
        const current = existing[0];

        // WO-O4O-HANDOFF-INACTIVE-MEMBERSHIP-BLOCK-V1 + WO-O4O-SM-WITHDRAWN-STATUS-CANONICAL-ALIGNMENT-V1:
        //   withdrawn 은 보안 정책 — 차단 유지.
        if (current.status === 'withdrawn') {
          logger.warn('[Handoff] Blocked reactivation of withdrawn membership', {
            userId: user.id,
            serviceKey,
          });
          return BaseController.error(
            res,
            '이 서비스는 탈퇴 처리된 상태입니다. 다시 이용하려면 가입 신청을 진행하세요.',
            403,
            'MEMBERSHIP_WITHDRAWN',
          );
        }

        if (current.status === 'active') {
          // 이미 active — 변경 없음, alreadyActive 알림만 반환
          return BaseController.ok(res, {
            serviceKey,
            serviceName: service.name,
            status: 'active',
            alreadyActive: true,
            message: '이미 가입된 서비스입니다.',
          });
        }

        if (current.status === 'pending') {
          // 이미 신청 중 — 변경 없음
          return BaseController.ok(res, {
            serviceKey,
            serviceName: service.name,
            status: 'pending',
            pendingApproval: true,
            requestSubmitted: false,
            message: '가입 신청이 이미 접수되어 운영자 승인 대기 중입니다.',
          });
        }

        // rejected / suspended → pending 으로 재신청 (active 직접 전환 금지)
        await AppDataSource.query(
          `UPDATE service_memberships SET status = 'pending', updated_at = NOW() WHERE id = $1`,
          [current.id],
        );
      } else {
        // 신규 → pending 으로 가입 신청 (instant active 금지)
        await AppDataSource.query(
          `INSERT INTO service_memberships (user_id, service_key, status, created_at, updated_at)
           VALUES ($1, $2, 'pending', NOW(), NOW())`,
          [user.id, serviceKey],
        );
      }

      return BaseController.ok(res, {
        serviceKey,
        serviceName: service.name,
        status: 'pending',
        pendingApproval: true,
        requestSubmitted: true,
        message: '가입 신청이 접수되었습니다. 운영자 승인 후 이용 가능합니다.',
      });
    } catch (err: any) {
      logger.error('[Handoff] Service join failed', err);
      return BaseController.error(res, 'Failed to join service', 500, 'SERVICE_JOIN_FAILED');
    }
  }

  /**
   * GET /api/v1/auth/services
   *
   * Returns the service catalog with user's membership status.
   * Requires authentication.
   */
  static async getServices(req: Request, res: Response): Promise<any> {
    const user = (req as AuthRequest).user;

    if (!user) {
      return BaseController.error(res, 'Authentication required', 401, 'AUTH_REQUIRED');
    }

    try {
      // Load user's service memberships
      const memberships: { serviceKey: string; status: string }[] =
        await AppDataSource.query(
          `SELECT service_key AS "serviceKey", status FROM service_memberships WHERE user_id = $1`,
          [user.id],
        );

      const membershipMap = new Map(
        memberships.map(m => [m.serviceKey, m.status]),
      );

      // Build service catalog with membership status
      // WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1: nameKo · basePath 추가 (additive).
      //   대표 홈이 서비스 한글명과 실제 진입 URL(basePath 포함)을 catalog 에서 얻는다.
      const services = O4O_SERVICES.map(svc => ({
        key: svc.key,
        name: svc.name,
        nameKo: svc.nameKo ?? svc.name,
        domain: svc.domain,
        basePath: svc.basePath ?? '',
        description: svc.description,
        joinEnabled: svc.joinEnabled,
        membership: membershipMap.has(svc.key)
          ? { status: membershipMap.get(svc.key)! }
          : null,
      }));

      return BaseController.ok(res, { services });
    } catch (err: any) {
      logger.error('[Handoff] Service catalog query failed', err);
      return BaseController.error(res, 'Failed to load services', 500, 'SERVICE_CATALOG_ERROR');
    }
  }
}