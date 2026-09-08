/**
 * resolveWorkScope — Work Scope V0 순수 resolver
 *
 * WO-O4O-WORK-SCOPE-CONTRACT-V0 §6
 *
 * 결정 순서(§6):
 *   1. 현재 route            → workspace
 *   2. 현재 로그인 사용자    → role
 *   3. 현재 service membership → 서비스 이용 가능 여부
 *   4. organization / store  → **서버 전용** (아래 참조)
 *   5. 사용자의 명시적 선택  → V0 에서는 route 진입이 곧 선택이다
 *   6. AI 후보 제안          → V0 범위 밖
 *
 * 판정은 전부 **기존 함수 재사용**이다. 새 권한 판정을 만들지 않는다:
 *   - 역할        `hasAnyRole` (@o4o/auth-utils) + lib/role-constants 의 기존 상수
 *   - 멤버십      `isServiceAccessAllowed` (@o4o/auth-utils, MembershipGate 와 동일 함수)
 *   - 대표 role   NETURE_ROLE_PRIORITY (config/dashboard)
 *
 * React 의존이 없는 순수 함수다 — 테스트·서버·에이전트 어디서든 같은 결과를 낸다.
 */

import { hasAnyRole, isServiceAccessAllowed, type UserLike } from '@o4o/auth-utils';
import { NETURE_ROLE_PRIORITY } from '../../config/dashboard';
import { SERVICE_KEY } from '../membershipGate';
import { resolveWorkspaceFromPath } from './routeWorkspaceMap';
import {
  WORKSPACE_ACCESS,
  type WorkScope,
  type WorkScopeCapability,
  type Workspace,
} from './types';

export interface ResolveWorkScopeInput {
  /** `location.pathname` (query·hash 제외). */
  pathname: string;
  /** `useAuth().user` — roles / memberships 만 사용한다. */
  user: UserLike | null | undefined;
  /** `useAuth().isAuthenticated`. */
  isAuthenticated: boolean;
  /** canonical service key. 기본값은 이 앱의 SSOT 상수. */
  serviceKey?: string;
}

/** 우선순위 기준 대표 role. 배열 순서에 의존하지 않는다. */
function resolvePrimaryRole(roles: string[]): string | undefined {
  return NETURE_ROLE_PRIORITY.find((r) => roles.includes(r));
}

/**
 * capability 서술.
 *
 * 기존 guard 가 이미 허용한 것보다 **넓어질 수 없다**. V0 는 로컬·브라우저 계열
 * capability 를 절대 부여하지 않는다(executionMode 가 항상 'cloud' 인 것과 짝).
 */
function describeCapabilities(resolved: boolean, roleGated: boolean): WorkScopeCapability[] {
  const caps: WorkScopeCapability[] = ['navigate', 'read'];
  // 'draft' 는 역할 게이트를 실제로 통과한 업무 축에서만. 공개 축(home/community)에는 없다.
  if (resolved && roleGated) caps.push('draft');
  return caps;
}

/**
 * 현재 route + 인증 상태로부터 Work Scope 를 만든다.
 *
 * 권한이 없으면 workspace 는 그대로 두되 `status`/`reason` 으로 **비활성**을 표시한다.
 * scope 를 임의로 다른 공간으로 바꾸지 않는다 — 그것은 route guard 의 몫이고,
 * Work Scope 가 화면 이동을 결정하지 않는다(§11: 기존 guard 동작 유지).
 */
export function resolveWorkScope(input: ResolveWorkScopeInput): WorkScope {
  const { pathname, user, isAuthenticated } = input;
  const serviceKey = input.serviceKey ?? SERVICE_KEY;

  const workspace: Workspace = resolveWorkspaceFromPath(pathname);
  const rule = WORKSPACE_ACCESS[workspace];
  const roles = user?.roles ?? [];
  const role = resolvePrimaryRole(roles);
  const roleGated = !!rule.allowedRoles;

  const base = {
    serviceKey,
    workspace,
    role,
    executionMode: 'cloud' as const,
    // organizationId / storeId 는 V0 에서 채우지 않는다 — 서버 전용 판정.
  };

  // 공개 축(home/community)은 미인증에서도 성립한다.
  const isPublic = !rule.allowedRoles && !rule.requireMembership && !rule.requiresStoreIdentity;

  if (!isAuthenticated || !user) {
    if (isPublic) {
      return { ...base, capabilities: describeCapabilities(true, false), status: 'resolved' };
    }
    return {
      ...base,
      capabilities: describeCapabilities(false, roleGated),
      status: 'none',
      reason: 'UNAUTHENTICATED',
    };
  }

  // 역할 — 기존 guard 와 동일한 상수·동일한 판정 함수.
  if (rule.allowedRoles && !hasAnyRole(roles, rule.allowedRoles)) {
    return {
      ...base,
      capabilities: describeCapabilities(false, roleGated),
      status: 'none',
      reason: 'ROLE_NOT_GRANTED',
    };
  }

  // 멤버십 — MembershipGate 와 동일 함수(platform:super_admin 은 내부에서 bypass).
  if (rule.requireMembership && !isServiceAccessAllowed(user, serviceKey)) {
    return {
      ...base,
      capabilities: describeCapabilities(false, roleGated),
      status: 'none',
      reason: 'MEMBERSHIP_NOT_ACTIVE',
    };
  }

  /*
   * 매장 축은 매장 식별자 없이는 성립하지 않는다.
   *
   * Neture 는 organization 미연결 서비스이고(O4O-ORGANIZATION-ROLE-STANDARD-V1 §4.4),
   * 매장 해석의 canonical 판정은 서버 `store-organization.resolver.ts` 에만 있다.
   * 그 resolver 의 원칙이 그대로 여기에도 적용된다 — **role 판정 ≠ organization 판정**.
   * store_owner role 이 있다고 클라이언트가 아무 매장이나 고르면 안 된다.
   * 따라서 화면은 열리되(guard 그대로) scope 는 확정되지 않는다.
   */
  if (rule.requiresStoreIdentity) {
    return {
      ...base,
      capabilities: describeCapabilities(false, roleGated),
      status: 'none',
      reason: 'STORE_IDENTITY_SERVER_ONLY',
    };
  }

  return {
    ...base,
    capabilities: describeCapabilities(true, roleGated),
    status: 'resolved',
  };
}
