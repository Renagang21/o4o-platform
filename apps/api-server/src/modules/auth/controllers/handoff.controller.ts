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
import {
  isPasswordSessionAllowed,
  PASSWORD_SESSION_NOT_ALLOWED_CODE,
  PASSWORD_SESSION_NOT_ALLOWED_MESSAGE,
} from '../../../common/auth/password-session.policy.js';
import { getService, getServiceOrigin, O4O_SERVICES } from '../../../config/service-catalog.js';
import { STORE_WORKSPACE_KEY, STORE_WORKSPACE_ORIGIN, isStoreWorkspaceExchangeOrigin } from '../../../config/store-workspace.js';
import { resolveAccessibleStores } from '../../../utils/service-tenant.resolver.js';
import { isHandoffWorkspace, type HandoffAuthMethod } from '../../../services/handoff-token.service.js';
import { isRepresentativeEntryTarget, isRepresentativeEntryExchangeOrigin } from '../../../config/representative-entry.js';
import { resolveAccountAccess } from '../../../common/auth/account-access.policy.js';
import {
  INITIAL_SESSION_EPOCH,
  isSessionScopeLive,
  readServiceSessionEpoch,
} from '../../../services/auth/service-session-epoch.js';
import { extractToken } from '../../../common/middleware/auth/auth-context.helpers.js';
import { verifyAccessToken } from '../../../utils/token.utils.js';
import logger from '../../../utils/logger.js';
import {
  defaultSemiFranchiseAccessResolver,
  semiFranchiseAccessKeyFor,
  serviceNotMemberMessage,
} from '../../../common/auth/service-login-eligibility.policy.js';
import type { SemiFranchiseServiceAccess } from '../../neture-pharmacy/services/semi-franchise-service-access.js';
import { toAccessDetails } from '../../neture-pharmacy/services/semi-franchise-service-access.js';

/**
 * WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1: 세미프랜차이즈 자격 (직접 로그인 gate 와 같은 기준).
 * 대상 서비스 membership 이 active 가 아닐 때만, 카탈로그 `semiFranchiseAccessKey` 가 있는 대상 서비스에 한해 조회한다.
 * 그 밖에는 null — 기존 membership 검사만 적용(기존 경로의 조회 · 응답 불변).
 * 독립 자격(카탈로그 `semiFranchiseAccessKey` 주석): KPA row 가 suspended · withdrawn 이어도 Neture 자격이 있으면
 * 통과한다. 통과 판정은 호출부의 지역 값일 뿐 — 세션에 싣는 memberships · roles 는 원장 그대로다.
 */
async function resolveHandoffSemiFranchiseAccess(
  userId: string,
  targetServiceKey: string | undefined,
  currentStatus: string | undefined,
): Promise<SemiFranchiseServiceAccess | null> {
  if (currentStatus === 'active') return null;
  const key = semiFranchiseAccessKeyFor(targetServiceKey);
  return key ? defaultSemiFranchiseAccessResolver(userId, key) : null;
}

/**
 * WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1 §6 — 폐기된 세션의 handoff 부활 차단.
 *
 * logout-all / family mismatch 는 `users.refreshTokenFamily` 를 null 로 만든다. 그 뒤에도 남은
 * access token(최대 15분)으로 handoff 를 발급·교환하면 exchange 가 새 family 를 만들어 세션이 되살아났다.
 * 모든 로그인 경로는 family 를 기록하므로(`persistRefreshTokenFamily` 계약) null family = 종료된 세션이다.
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8: 서비스 하나의 `logout` 은 더 이상 family 를
 * 비우지 않는다(다른 서비스 세션 유지). 따라서 여기서 막는 "폐기된 세션"은 logout-all · 도난 판정
 * 두 경우이며, 한 서비스에서 로그아웃한 뒤 다른 서비스로 handoff 하는 것은 **정상 동작**이다.
 */
/**
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (3차) — 서비스 단위 로그아웃의 옆길 차단.
 *
 * §8 은 refresh 경로만 막았다. 남은 구멍은 **긴 세션을 새로 만들어 주는 경로**였다:
 *
 *   ① 로그아웃 뒤에도 남은 access token(최대 15분)으로 handoff 를 새로 발급받을 수 있었다
 *   ② 로그아웃 **전에** 받아 둔 handoff 토큰을 로그아웃 뒤 TTL(60초) 안에 교환할 수 있었다
 *
 * 둘 다 "이미 로그아웃된 A 의 오래된 인증으로 시작한 이동" 이다. 반면 **살아 있는 B 세션에서
 * A 로 가는 이동은 정상**이므로 막지 않는다 — 판정 기준은 출발 서비스의 세대 하나다.
 *
 * `requireAuth` 에 넣지 않는다: 모든 API 요청에 DB 조회를 더하면 Core 경로 비용이 요청마다
 * 늘고, 막아야 하는 것은 짧은 인증으로 **긴 세션을 새로 만드는 일**이다.
 */
const SERVICE_SESSION_REVOKED_CODE = 'SERVICE_SESSION_REVOKED';

/**
 * 이 요청의 **출발 인증**. 값의 출처가 무엇인지가 핵심이다.
 *
 *   serviceKey    access token claim 이 있으면 **그것**(토큰이 증명한 값). 없으면 null.
 *   sessionEpoch  토큰 claim. 배포 전 토큰은 undefined.
 *
 * **Origin 을 쓰면 안 된다 — 우선순위로도, 대체값으로도.** 일반 HTTP 클라이언트는 Origin 을
 * 임의로 지정할 수 있으므로 Origin 은 출발 서비스를 증명하지 못한다.
 *   · claim 이 있을 때 Origin 을 우선하면: 토큰은 A 인데 Origin 만 B 라고 주장해 원장에 B 가
 *     적히고, A 로그아웃 뒤에도 교환이 통과한다(4차 리뷰).
 *   · claim 이 없을 때 Origin 으로 좁히면: A 로그아웃 뒤 claim 없는 토큰으로 `Origin: B` 를
 *     보내 **B 의 세대만** 검사받는다. B 에서 로그아웃한 적 없으면 통과한다(5차 리뷰).
 * 그래서 claim 없는 토큰은 null 로 두어 refresh 와 같은 **사용자 전체 최대 세대** 규칙을 따른다.
 *
 *   authMethod    WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 (최종 보완 1): 검증된 토큰의 `authMethod`
 *                 claim. 'password' 면 password, claim 이 없는 검증된 토큰은 Google 세션이다
 *                 (refresh 와 같은 해석). 토큰을 검증하지 못하면 password 로 둔다(fail-closed).
 *                 body · Origin · 계정의 Google 연결 여부로 정하지 않는다.
 */
function readCallerScope(req: Request): {
  serviceKey: string | null;
  sessionEpoch?: number;
  authMethod: HandoffAuthMethod;
} {
  const token = extractToken(req as never);
  const payload = token ? verifyAccessToken(token) : null;
  const authMethod: HandoffAuthMethod = payload && payload.authMethod !== 'password' ? 'google' : 'password';
  if (payload?.serviceKey) {
    return { serviceKey: payload.serviceKey, sessionEpoch: payload.sessionEpoch, authMethod };
  }
  return { serviceKey: null, sessionEpoch: undefined, authMethod };
}

/**
 * 원장에 적을 **출발**을 확정한다. 살아 있지 않으면 응답을 보내고 `null`.
 *
 * 값의 출처가 핵심이다:
 *   serviceKey    토큰이 증명한 서비스 — **Origin 주장으로 바꿀 수 없다**
 *   sessionEpoch  **토큰의 세대** (발급 시점의 현재 세대가 아니다).
 *                 현재 세대를 적으면 검사와 기록 사이에 로그아웃이 끼었을 때 원장에 새 세대가
 *                 적혀, 이미 로그아웃된 인증으로 시작한 handoff 가 교환에서 통과한다.
 *                 claim 이 없는 토큰은 검사를 통과했다는 사실이 "폐기 기록 0" 을 뜻하므로 초기 세대다.
 *
 * **발급 직전에** 부른다: 잘못된 입력(알 수 없는 대상 등)에 DB 를 쓰지 않고, 검사와 기록 사이
 * 간격도 가장 좁다.
 */
async function resolveVerifiedHandoffSource(
  req: Request,
  userId: string,
): Promise<{ serviceKey: string; sessionEpoch: number; authMethod: HandoffAuthMethod } | null> {
  // claim 이 없는 배포 전 토큰도 **건너뛰지 않는다** — 건너뛰면 만료 전 최대 15분 동안
  // 로그아웃된 서비스의 인증으로 긴 세션을 얻을 수 있다(4차 리뷰 지적).
  const scope = readCallerScope(req);
  if (!(await isSessionScopeLive(userId, scope.serviceKey, scope.sessionEpoch))) {
    logger.warn('[Handoff] Blocked generation — service session revoked', {
      userId,
      serviceKey: scope.serviceKey ?? 'UNKNOWN_SCOPE',
    });
    return null; // 응답은 호출부가 한다 — BaseController.error 는 subclass 안에서만 쓸 수 있다.
  }
  return {
    serviceKey: scope.serviceKey ?? 'unknown',
    sessionEpoch: scope.sessionEpoch ?? INITIAL_SESSION_EPOCH,
    authMethod: scope.authMethod,
  };
}

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

    // 위 검사는 **사용자 전체** family 만 본다 — 서비스 하나의 로그아웃은 그 값을 유지하므로
    // 여기서 출발 서비스의 세대를 따로 본다. 그러지 않으면 로그아웃된 서비스의 남은
    // access token 으로 수명이 긴 세션을 새로 얻는다.

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

        const source = await resolveVerifiedHandoffSource(req, user.id);
        if (!source) {
          return BaseController.error(res, SESSION_REVOKED_MESSAGE, 401, SERVICE_SESSION_REVOKED_CODE);
        }
        const handoffToken = await handoffTokenService.generateToken(
          user.id,
          source.serviceKey,
          { kind: 'workspace', targetWorkspace: STORE_WORKSPACE_KEY },
          source.sessionEpoch,
          source.authMethod,
        );
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
        const source = await resolveVerifiedHandoffSource(req, user.id);
        if (!source) {
          return BaseController.error(res, SESSION_REVOKED_MESSAGE, 401, SERVICE_SESSION_REVOKED_CODE);
        }
        const handoffToken = await handoffTokenService.generateToken(
          user.id,
          source.serviceKey,
          targetService.key,
          source.sessionEpoch,
          source.authMethod,
        );
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
      const serviceMembership: { status: string }[] = await AppDataSource.query(
        `SELECT status FROM service_memberships
           WHERE user_id = $1 AND service_key = $2`,
        [user.id, targetServiceKey],
      );
      // WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1: active membership 이 없어도(row 의 suspended · withdrawn 포함 — 독립 자격)
      //   세미프랜차이즈 자격(Neture 기본 active ∧ 세미프랜차이즈 active)이 있으면 통과한다. 없으면 기존 검사 그대로.
      const sfAccess = await resolveHandoffSemiFranchiseAccess(user.id, targetServiceKey, serviceMembership[0]?.status);
      const targetMembership = sfAccess?.allowed ? [{ status: 'active' }] : serviceMembership;

      if (targetMembership.length === 0) {
        logger.warn('[Handoff] Blocked generation — no membership on target service', {
          userId: user.id,
          targetServiceKey,
          reason: 'no_membership',
          semiFranchiseNext: sfAccess?.next ?? undefined,
        });
        if (sfAccess) {
          const serviceAccess = toAccessDetails(sfAccess);
          return BaseController.forbidden(res, serviceNotMemberMessage(serviceAccess), 'HANDOFF_TARGET_NO_MEMBERSHIP', { serviceAccess });
        }
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

      // 대표 진입·workspace 와 같은 출발 검사를 거친다 — 이 경로만 빠져 있으면 로그아웃된
      // 서비스의 남은 access token 으로 발급받고, 원장 세대가 null 이라 교환 검사도 건너뛴다.
      const source = await resolveVerifiedHandoffSource(req, user.id);
      if (!source) {
        return BaseController.error(res, SESSION_REVOKED_MESSAGE, 401, SERVICE_SESSION_REVOKED_CODE);
      }
      const handoffToken = await handoffTokenService.generateToken(
        user.id,
        source.serviceKey,
        targetServiceKey,
        source.sessionEpoch,
        source.authMethod,
      );

      // WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1:
      //   basePath 를 가진 서비스는 host 루트가 다른 서비스이므로 origin helper 로 base URL 을 만든다.
      //   (WO-O4O-KPA-BRANCH-SERVICE-CATALOG-AND-HANDOFF-ALIGNMENT-V1: kpa-branch → https://kpa.neture.co.kr/handoff)
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
   * Returns tokens in body only — all handoff targets are localStorage-strategy services.
   * Does NOT set auth cookies: a `.neture.co.kr` cookie issued here would silently switch
   * the cookie-strategy admin-dashboard session to the handed-off user
   * (CHECK-O4O-URL-FIRST-CENSUS-V1 §19-1 · §21-2).
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

      // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (3차):
      //   위 검사는 **사용자 전체** family 만 본다. 서비스 하나의 로그아웃은 그 값을 유지하므로
      //   "발급 뒤 출발 서비스에서 로그아웃" 을 잡지 못했다 — 발급 시 원장에 남긴 출발 세대를
      //   현재 세대와 비교한다. 살아 있는 다른 서비스에서 온 정상 이동은 영향받지 않는다.
      //   `sourceSessionEpoch` 가 null = 이 컬럼 이전 발급분이므로 판정에서 제외한다(TTL 60초).
      //   `sourceSessionEpoch` 가 null = 이 컬럼 이전 발급분이므로 판정에서 제외한다(TTL 60초).
      //   `sourceServiceKey === 'unknown'` = 발급 때 범위를 못 정한 경우 → 최대 세대 규칙을 따른다.
      if (
        payload.sourceSessionEpoch !== null &&
        payload.sourceSessionEpoch !== undefined &&
        !(await isSessionScopeLive(
          user.id,
          payload.sourceServiceKey === 'unknown' ? null : payload.sourceServiceKey,
          payload.sourceSessionEpoch,
        ))
      ) {
        logger.warn('[Handoff] Blocked exchange — source service session revoked', {
          userId: user.id,
          sourceServiceKey: payload.sourceServiceKey,
        });
        return BaseController.error(res, SESSION_REVOKED_MESSAGE, 401, SERVICE_SESSION_REVOKED_CODE);
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
        }, payload.sourceAuthMethod);
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
        }, payload.sourceAuthMethod);
      }

      // ── SERVICE HANDOFF (기존 로직 불변) ────────────────────────────────────
      // WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1:
      //   target service active membership 재검증 (exchange 시점).
      //   generation 시점에 active 였더라도 60s TTL 사이에 status 가 변경됐을 수 있으므로
      //   exchange 시점에 다시 확인 (이중 안전판).
      // WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1: 세미프랜차이즈 자격도 exchange 시점에 다시 확인한다.
      const serviceMembership = memberships.find(m => m.serviceKey === payload.targetServiceKey);
      const sfAccess = await resolveHandoffSemiFranchiseAccess(user.id, payload.targetServiceKey, serviceMembership?.status);
      const targetMembership = sfAccess?.allowed
        ? { serviceKey: payload.targetServiceKey, status: 'active' }
        : serviceMembership;

      if (!targetMembership) {
        logger.warn('[Handoff] Blocked exchange — no membership on target service', {
          userId: user.id,
          targetServiceKey: payload.targetServiceKey,
          reason: 'no_membership',
          semiFranchiseNext: sfAccess?.next ?? undefined,
        });
        if (sfAccess) {
          const serviceAccess = toAccessDetails(sfAccess);
          return BaseController.forbidden(res, serviceNotMemberMessage(serviceAccess), 'HANDOFF_TARGET_NO_MEMBERSHIP', { serviceAccess });
        }
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
      }, payload.sourceAuthMethod);
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
    const sessionServiceKey = target.targetServiceKey ?? target.targetWorkspace ?? null;
    // 대상 서비스의 **현재 세대**를 새긴다. 원 서비스의 세대가 아니다 — handoff 로 만들어지는
    // 것은 대상 서비스의 세션이고, 그 서비스에서 로그아웃하면 이 토큰이 끊겨야 한다.
    const sessionEpoch = await readServiceSessionEpoch(user.id, sessionServiceKey);

    // WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-4 · 최종 보완 1: 교환 세션은 **원장에 남은 출발 수단**을 승계한다.
    //   수단은 발급 시점에 검증된 access token claim 에서 온 값이다. 교환 시점의 Google 연결 여부 ·
    //   역할로 다시 추정하지 않는다 — 그 사이 Google 이 연결되거나 역할이 붙어도 비밀번호 세션이
    //   Google 세션으로 승격되지 않는다. NULL(컬럼 이전 발급분)은 원장 읽기에서 password 로 온다.
    //   비밀번호 세션이면 **지금의 역할**로 관리자 경계(Admin 화면 · platform:*)를 다시 본다.
    const authMethod = sourceAuthMethod === 'google' ? null : ('password' as const);
    if (authMethod === 'password' && !isPasswordSessionAllowed(sessionServiceKey, roles)) {
      logger.warn('[Handoff] Blocked exchange — password session admin boundary', { userId: user.id });
      return BaseController.error(res, PASSWORD_SESSION_NOT_ALLOWED_MESSAGE, 403, PASSWORD_SESSION_NOT_ALLOWED_CODE);
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
    await persistRefreshTokenFamily(user.id, tokens.refreshToken);

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