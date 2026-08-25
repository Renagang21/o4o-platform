/**
 * @core O4O_PLATFORM_CORE — Membership
 * Core Middleware: Membership-aware Service Scope Guard
 * Do not modify without CORE_CHANGE approval.
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 *
 * Membership-aware Service Scope Guard
 * WO-O4O-SERVICE-MEMBERSHIP-GUARD-V1
 * WO-O4O-BACKEND-MEMBERSHIP-GUARD-CANONICALIZATION-V1: removed service-prefix
 *   role bypass — role 만 있고 membership 없는 접근을 차단한다. frontend
 *   MembershipGate 와 동일 정책 (WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1).
 *
 * Wraps createServiceScopeGuard to add membership status verification.
 * Drop-in replacement: same API surface, same behavior + membership check.
 *
 * Chain: requireAuth → [membership check → scope check] → handler
 *
 * 접근 정책 (canonical):
 *   1. platform:super_admin + config.platformBypass=true → 통과 (운영/디버깅 최소 예외)
 *   2. service_memberships(serviceKey).status='active' + scope guard 통과 → 통과
 *   3. 그 외 → 403 (MEMBERSHIP_NOT_FOUND / MEMBERSHIP_NOT_ACTIVE)
 *
 * 제거된 bypass (V1 canonicalization):
 *   - service-prefix role (e.g., 'kpa:admin') 단독으로는 더 이상 bypass 하지 않는다.
 *     원래 WO-O4O-MEMBERSHIP-APPROVAL-API-403-FIX-V1 에서 "kpa:admin role 보유자는
 *     by definition 서비스 멤버" 라는 전제로 추가되었으나, canonical bootstrap seed 가
 *     모든 admin/operator 에게 정식 active membership 을 부여하면서 전제가 무효화됨.
 *     이제는 role 과 membership 이 모두 있어야 통과한다 (frontend 정책과 정렬).
 *
 * - security-core 수정 없음 (Frozen F1 준수)
 * - platform:super_admin은 platformBypass 설정에 따라 멤버십 검사 생략
 * - 멤버십 없음 → 403 MEMBERSHIP_NOT_FOUND
 * - 멤버십 비활성 → 403 MEMBERSHIP_NOT_ACTIVE
 * - 멤버십 active → 기존 scope guard로 위임
 *
 * CORE_CHANGE (F10 §3.2 "버그 수정") — WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1
 *   판정 **근거**를 JWT 스냅샷 단독 → JWT 사전검사 + DB 확정검사로 바꾼다.
 *   미들웨어 체인 · API 계약(응답 코드 MEMBERSHIP_NOT_FOUND / MEMBERSHIP_NOT_ACTIVE) ·
 *   엔티티 · 시그니처는 모두 그대로다. 정지 즉시성 0 이라는 결함 수정이다.
 */

import type { RequestHandler } from 'express';
import { createServiceScopeGuard, resolveCanonicalServiceKey } from '@o4o/security-core';
import type { ServiceScopeGuardConfig } from '@o4o/security-core';
import { AppDataSource } from '../../database/connection.js';
import { getServiceMembershipStatusFromDb } from '../../utils/service-membership.js';

// WO-O4O-BACKFILL-MIGRATION-CANONICAL-KEY-CONSISTENCY-V1:
//   scope serviceKey → service_memberships.service_key 매핑은 @o4o/security-core 의
//   resolveCanonicalServiceKey() SSOT 로 위임 (kpa→kpa-society, cosmetics→k-cosmetics,
//   기타 self-map). 로컬 const 정의 금지 — drift 재발 방지.
function resolveMembershipKey(scopeServiceKey: string): string {
  return resolveCanonicalServiceKey(scopeServiceKey);
}

/**
 * Create a membership-aware scope guard factory.
 *
 * Same signature as createServiceScopeGuard: returns (scope: string) => RequestHandler
 * Adds membership status check before delegating to the original scope guard.
 */
export function createMembershipScopeGuard(
  config: ServiceScopeGuardConfig
): (scope: string) => RequestHandler {
  const originalGuard = createServiceScopeGuard(config);
  const membershipKey = resolveMembershipKey(config.serviceKey);

  return function requireScope(scope: string): RequestHandler {
    const scopeHandler = originalGuard(scope);

    return async (req, res, next) => {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({
          success: false, error: 'Authentication required', code: 'AUTH_REQUIRED',
        });
        return;
      }

      // Platform super_admin bypass (if config allows)
      // 본 bypass 만 canonical 예외로 유지. 서비스별 platformBypass 설정에 따라
      // 결정되며 (예: KPA 는 platformBypass=false 로 super_admin 도 차단), 별도 WO 로
      // 정책 변경 가능. 기타 모든 사용자는 service_memberships(active) 필수.
      if (config.platformBypass && user.roles?.includes('platform:super_admin')) {
        return scopeHandler(req, res, next);
      }

      // WO-O4O-AUTH-RBAC-STABILIZATION-V1: Legacy unprefixed role bypass removed.
      // All roles must now be prefixed (platform:*, neture:*, etc.).

      // WO-O4O-BACKEND-MEMBERSHIP-GUARD-CANONICALIZATION-V1:
      //   기존의 "service-prefix role 보유자 bypass" 를 제거했다. role 만 있고
      //   active membership 이 없는 사용자는 더 이상 통과하지 못한다 (frontend
      //   MembershipGate 와 동일 정책).
      //
      //   배경: 이전 WO-O4O-MEMBERSHIP-APPROVAL-API-403-FIX-V1 가 추가한 bypass 는
      //   "service-prefix role 보유자는 by definition 서비스 멤버" 라는 전제였으나,
      //   canonical bootstrap seed 가 모든 admin/operator 에게 정식 active membership 을
      //   부여하면서 전제가 무효화. 이제 role 과 membership 이 모두 있어야 한다.

      // ── 1단계: JWT 스냅샷 사전 검사 (빠른 거부) ────────────────────────
      // 토큰에 이미 "없음/비활성" 이 실려 있으면 DB 를 보지 않고 거부한다.
      const memberships: { serviceKey: string; status: string }[] = user.memberships || [];
      const membership = memberships.find((m: { serviceKey: string }) => m.serviceKey === membershipKey);

      if (!membership) {
        res.status(403).json({
          success: false,
          error: `No membership found for service: ${config.serviceKey}`,
          code: 'MEMBERSHIP_NOT_FOUND',
        });
        return;
      }

      if (membership.status !== 'active') {
        res.status(403).json({
          success: false,
          error: `Service membership is ${membership.status}. Active membership required.`,
          code: 'MEMBERSHIP_NOT_ACTIVE',
        });
        return;
      }

      // ── 2단계: DB 확정 검사 (정지 즉시성) ─────────────────────────────
      // WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1
      //
      // 1단계만 있던 시절, membership 판정 근거가 **JWT 스냅샷 하나**였다. 토큰은
      // 로그인/refresh 때만 갱신되므로 운영자가 회원을 정지시켜도 그 회원의 기존 토큰은
      // 만료될 때까지 계속 통과했다(즉시성 0 — 선행 WO
      // CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1 §10-2 잔여).
      //
      // 정본은 DB 다. 긍정 판정(=통과)일 때만 DB 를 확인하므로, 이미 거부된 요청에는
      // 질의가 늘지 않는다. `isStoreOwner()` 가 같은 정책으로 먼저 내려가 있고
      // (동 WO §4), 이 가드가 그 마지막 한 곳이다.
      //
      // 정지 시 refresh token 을 일괄 폐기하는 방식은 쓰지 않는다 — 토큰은 전역이라
      // 한 서비스의 정지가 다른 4개 서비스의 세션까지 끊는 cross-service fan-out 이 된다.
      //
      // DataSource 가 아직 초기화되지 않은 구간(부팅 직전·단위테스트)에서는 1단계 판정을
      // 그대로 쓴다. 이 구간에는 정지 즉시성 요구가 없고, DB 없이 fail-closed 하면
      // 부팅 중 요청이 전부 403 이 된다.
      if (AppDataSource.isInitialized) {
        const dbStatus = await getServiceMembershipStatusFromDb(
          AppDataSource,
          user.id ?? user.userId,
          membershipKey,
        ).catch(() => 'none' as const);

        if (dbStatus !== 'active') {
          res.status(403).json({
            success: false,
            error:
              dbStatus === 'none'
                ? `No membership found for service: ${config.serviceKey}`
                : `Service membership is ${dbStatus}. Active membership required.`,
            code: dbStatus === 'none' ? 'MEMBERSHIP_NOT_FOUND' : 'MEMBERSHIP_NOT_ACTIVE',
          });
          return;
        }
      }

      // Membership active → delegate to original scope guard
      return scopeHandler(req, res, next);
    };
  };
}
