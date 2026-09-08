/**
 * Work Scope — store identity resolution (read-only)
 *
 * WO-O4O-WORK-SCOPE-STORE-RESOLUTION-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇을 하는가
 *
 *   프런트엔드 Work Scope 는 `organizationId` / `storeId` 를 스스로 만들 수 없다.
 *   이 모듈은 **현재 로그인 사용자 + canonical serviceKey + workspace** 만으로
 *   서버가 접근 가능한 매장 identity 를 확정해 준다.
 *
 *   판정 로직을 새로 만들지 않는다. 기존 두 SSOT 의 **조합**이 전부다:
 *     1. `utils/service-membership.ts`         — service_memberships active 판정
 *     2. `utils/store-organization.resolver.ts` — 매장 조직 확정(resolved/none/ambiguous)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 불변식
 *
 *   - **read-only.** 어떤 경로에서도 write 하지 않는다(조회 쿼리만).
 *   - **요청받은 serviceKey 를 그대로 믿지 않는다.** 항상 현재 사용자의 membership 을
 *     먼저 확인하고, 그 다음에야 매장 후보를 찾는다. 다른 서비스의 매장은 노출되지 않는다
 *     (후보 쿼리 자체가 serviceKey 로 스코프된다).
 *   - **임의 선택 금지.** 후보가 2개 이상이면 `ambiguous` 로 끝낸다. 첫 번째를 고르지 않는다.
 *   - **fallback 금지.** `resolved` 가 아니면 organizationId/storeId 는 null 이다.
 */

import type { DataSource } from 'typeorm';
import {
  resolveCanonicalServiceKey,
  resolveRolePrefixFromCanonicalServiceKey,
} from '@o4o/security-core';
import { getServiceMembershipStatusFromDb } from './service-membership.js';
import {
  STORE_SERVICE_ORG_LINKAGE,
  resolveStoreOrganization,
  type StoreOwnerServiceKey,
} from './store-organization.resolver.js';

// ─── 계약 ────────────────────────────────────────────────────────────────────

/**
 * 상태 3값은 `store-organization.resolver.ts` 계약을 그대로 승계한다.
 * 프런트 `WorkScopeStatus` 와도 같은 값이다 — 계층마다 다른 이름을 쓰지 않는다.
 */
export type WorkScopeStoreStatus = 'resolved' | 'none' | 'ambiguous';

/** 안정적인 reason code. 사람이 읽는 문장을 응답에 싣지 않는다. */
export type WorkScopeStoreReason =
  /** 해당 서비스의 active membership 이 없다. */
  | 'NO_SERVICE_MEMBERSHIP'
  /** membership 은 있으나 접근 가능한 매장 조직이 0개. */
  | 'NO_ACCESSIBLE_STORE'
  /** 접근 가능한 매장이 2개 이상 — 자동 선택 근거 없음(선택은 후속 Selector V1). */
  | 'MULTIPLE_ACCESSIBLE_STORES'
  /** 이 서비스는 매장 identity 축을 갖지 않는다(예: neture — organization 미연결). */
  | 'STORE_IDENTITY_NOT_SUPPORTED'
  /** store 의미가 없는 workspace(home/community/operator/admin/supplier/partner). */
  | 'WORKSPACE_NOT_STORE_SCOPED';

export interface WorkScopeStoreResolution {
  status: WorkScopeStoreStatus;
  /** 정규화된 canonical `service_memberships.service_key`. 요청값이 아니라 판정에 쓴 값이다. */
  serviceKey: string;
  workspace: string;
  /**
   * 조직 컨텍스트. `resolved` 일 때만 채워진다.
   *
   * 현재 저장구조에서 organizationId 와 storeId 는 **같은 `organizations.id` 값**이다
   * (`OrganizationStore` 가 `@Entity('organizations')` 확장 뷰). 그래도 두 필드를 합치지
   * 않는다 — Boundary Policy(F6)가 Store Ops=organizationId / Commerce=storeId 로
   * 경계 이름을 나눠 쓰고, 저장구조가 갈라져도 계약이 깨지지 않아야 한다.
   * 값을 동일시하는 판단은 **서버가 canonical 데이터를 근거로** 내린다(프런트가 아니라).
   */
  organizationId: string | null;
  storeId: string | null;
  reason: WorkScopeStoreReason | null;
}

/**
 * store identity 가 의미를 갖는 workspace.
 *
 * 나머지(home/community/operator/admin/supplier/partner)는 이 해석의 대상이 아니다.
 * supplier/partner 가 organization context 를 필요로 하는지는 별도 축이라 이번 범위 밖이다.
 */
export const STORE_SCOPED_WORKSPACES: readonly string[] = ['store'];

/** `STORE_SERVICE_ORG_LINKAGE` 에 매장 연결 계약이 있는 서비스인가(= role prefix 공간). */
function isStoreCapableService(rolePrefix: string): rolePrefix is StoreOwnerServiceKey {
  return Object.prototype.hasOwnProperty.call(STORE_SERVICE_ORG_LINKAGE, rolePrefix);
}

function deny(
  serviceKey: string,
  workspace: string,
  reason: WorkScopeStoreReason,
  status: WorkScopeStoreStatus = 'none',
): WorkScopeStoreResolution {
  return { status, serviceKey, workspace, organizationId: null, storeId: null, reason };
}

// ─── 해석 ────────────────────────────────────────────────────────────────────

export interface ResolveWorkScopeStoreInput {
  /** **세션에서 얻은** 사용자 id. 클라이언트가 보낸 값을 넣지 않는다. */
  userId: string;
  /** 요청 serviceKey. role prefix 든 canonical 이든 받아서 canonical 로 정규화한다. */
  serviceKey: string;
  workspace: string;
}

/**
 * 현재 사용자의 매장 scope 를 해석한다.
 *
 * 판정 순서(권한 경계 §14) — 순서가 곧 보안 계약이다:
 *   1. workspace 가 store 축인가              → 아니면 조회 자체를 하지 않는다
 *   2. serviceKey canonical 정규화
 *   3. **해당 서비스의 active membership 인가** → 아니면 매장 후보를 보지 않는다
 *   4. 그 서비스가 매장 축을 갖는가
 *   5. 서비스 스코프가 걸린 매장 후보 확정     → 1개만 resolved
 */
export async function resolveWorkScopeStore(
  dataSource: DataSource,
  input: ResolveWorkScopeStoreInput,
): Promise<WorkScopeStoreResolution> {
  const { userId, workspace } = input;

  // 1. store 축이 아니면 아무 것도 조회하지 않는다(불필요한 노출·질의 0).
  if (!STORE_SCOPED_WORKSPACES.includes(workspace)) {
    return deny(resolveCanonicalServiceKey(input.serviceKey ?? ''), workspace, 'WORKSPACE_NOT_STORE_SCOPED');
  }

  // 2. canonical 정규화 — 이후 모든 판정과 응답은 이 값을 쓴다.
  const serviceKey = resolveCanonicalServiceKey(input.serviceKey ?? '');

  if (!userId || !serviceKey) {
    return deny(serviceKey, workspace, 'NO_SERVICE_MEMBERSHIP');
  }

  // 3. membership 이 먼저다. 알 수 없는 serviceKey 도 여기서 fail-closed 된다.
  const membershipStatus = await getServiceMembershipStatusFromDb(dataSource, userId, serviceKey);
  if (membershipStatus !== 'active') {
    return deny(serviceKey, workspace, 'NO_SERVICE_MEMBERSHIP');
  }

  // 4. 매장 축이 없는 서비스(neture 등)는 여기서 끝난다.
  //    이때 서비스 조건 없는 후보 조회(findAnyServiceStoreOrganizationCandidates)로
  //    넘어가면 **다른 서비스의 매장이 새어나간다**. 그 경로를 쓰지 않는다.
  const rolePrefix = resolveRolePrefixFromCanonicalServiceKey(serviceKey);
  if (!isStoreCapableService(rolePrefix)) {
    return deny(serviceKey, workspace, 'STORE_IDENTITY_NOT_SUPPORTED');
  }

  // 5. 기존 canonical resolver 에 위임. 후보 쿼리가 serviceKey 로 스코프된다.
  const resolution = await resolveStoreOrganization(dataSource, userId, rolePrefix);

  if (resolution.status === 'ambiguous') {
    return deny(serviceKey, workspace, 'MULTIPLE_ACCESSIBLE_STORES', 'ambiguous');
  }
  if (resolution.status === 'none' || !resolution.organizationId) {
    return deny(serviceKey, workspace, 'NO_ACCESSIBLE_STORE');
  }

  return {
    status: 'resolved',
    serviceKey,
    workspace,
    organizationId: resolution.organizationId,
    // 같은 canonical 값이지만 계약상 별도 필드다(위 organizationId 주석 참조).
    storeId: resolution.organizationId,
    reason: null,
  };
}
