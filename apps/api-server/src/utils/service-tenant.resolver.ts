/**
 * Service Tenant Foundation — Service Identity · Store↔Service · Operator↔Service 해석기 (read-only)
 *
 * WO-O4O-SERVICE-TENANT-FOUNDATION-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇을 하는가
 *
 *   Service Workspace 화면(My Services)을 만들기 **전에** 세 관계를 흔들리지 않는 공통 기반으로 고정한다.
 *
 *     1 Store    : N Services   — `organization_service_enrollments` (UNIQUE(organization_id, service_code))
 *     1 Service  : N Stores     — 같은 junction 의 역방향
 *     1 Operator : N Services   — `role_assignments` 의 `{prefix}:operator|admin` + `service_memberships`
 *
 *   새 판정 로직·새 테이블·새 role 체계를 만들지 않는다. 기존 SSOT 의 **조합**이 전부다:
 *     - Service Identity   : `config/service-catalog.ts` `O4O_SERVICES` (= `platform_services.code` canonical 집합)
 *                            + `@o4o/security-core` `resolveCanonicalServiceKey` (role prefix 별칭 흡수)
 *     - Workspace 자격     : `config/service-catalog.ts` `workspace` (`getServiceWorkspaceCapability`)
 *     - Store 소유 판정    : `utils/store-organization.resolver.ts` (organization_members 활성 매장 역할)
 *     - Operator 판정      : `role_assignments`(is_active) + `utils/service-membership.ts`(active membership)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 불변식
 *
 *   - **read-only.** 조회 쿼리만. enrollment · membership · role 을 만들지 않는다.
 *   - **Service Identity ≠ Service Workspace.** `platform_services` 에 있다고 My Services 항목이 되지 않는다.
 *     노출 자격은 `workspaceAvailable` 이 별도로 말한다. 그리고 그 값은 **권한이 아니다** —
 *     접근은 각 서비스의 scope guard · membership guard 가 그대로 판정한다.
 *   - **별칭은 독립 서비스가 아니다.** enrollment.service_code 의 `kpa` / `cosmetics` 는 canonical key 로
 *     정규화되어 같은 서비스 1건으로 합쳐진다. canonical 집합 밖의 코드(예: 제품 도메인 키)는 서비스가 아니므로
 *     목록에 오르지 않는다.
 *   - **organizationId 를 그대로 믿지 않는다.** 요청자가 organization_members 에서 그 조직의 활성 매장 역할을
 *     갖지 않으면 enrollment 를 보지 않는다 (다른 매장의 서비스 목록 leakage 0).
 *   - **임의 선택 금지.** 조직이 지정되지 않았고 후보가 2개 이상이면 `ambiguous` 로 끝낸다
 *     (`work-scope-store-resolution.ts` 와 같은 계약 — 새 자동 선택 규칙을 만들지 않는다).
 *   - **active 와 inactive 를 구분한다.** inactive enrollment 는 목록에 남기되 `workspaceAvailable=false`.
 */

import type { DataSource } from 'typeorm';
import {
  resolveCanonicalServiceKey,
  resolveRolePrefixFromCanonicalServiceKey,
} from '@o4o/security-core';
import {
  getService,
  getServiceWorkspaceCapability,
  O4O_SERVICES,
  type ServiceWorkspaceMode,
} from '../config/service-catalog.js';
import { getServiceMembershipStatusFromDb } from './service-membership.js';
import {
  findAnyServiceStoreOrganizationCandidates,
  type StoreOrganizationCandidate,
} from './store-organization.resolver.js';

// ─── Service Identity ────────────────────────────────────────────────────────

export type ServiceIdentityKind =
  /** `O4O_SERVICES` 에 등록된 canonical key 그대로 */
  | 'canonical'
  /** role prefix 별칭 (`kpa` → `kpa-society`) — canonical 로 흡수된다 */
  | 'alias'
  /** canonical 집합 밖 — 서비스 identity 가 아니다 (제품 도메인 키 · 미등록 코드) */
  | 'unknown';

export interface ServiceIdentity {
  /** 정규화된 canonical key. `unknown` 이면 입력값 그대로 */
  serviceKey: string;
  serviceName: string;
  kind: ServiceIdentityKind;
  /** 입력 코드 (정규화 전) */
  sourceCode: string;
}

/**
 * 임의의 service code(enrollment.service_code · role prefix · 요청값)를 Service Identity 로 해석한다.
 * 새 매핑을 만들지 않는다 — security-core 의 별칭 SSOT 와 service-catalog 의 canonical 집합만 쓴다.
 */
export function resolveServiceIdentity(code: string): ServiceIdentity {
  const sourceCode = code ?? '';
  const canonical = resolveCanonicalServiceKey(sourceCode);
  const svc = getService(canonical);
  if (!svc) {
    return { serviceKey: sourceCode, serviceName: sourceCode, kind: 'unknown', sourceCode };
  }
  return {
    serviceKey: svc.key,
    serviceName: svc.nameKo ?? svc.name,
    kind: canonical === sourceCode ? 'canonical' : 'alias',
    sourceCode,
  };
}

// ─── Store ↔ Service ─────────────────────────────────────────────────────────

export type StoreServiceEnrollmentStatus = 'active' | 'inactive';

/**
 * 한 매장(organization)의 서비스 가입 1건.
 * junction 은 `organization_service_enrollments` 뿐이다 — 새 membership 테이블을 만들지 않는다.
 */
export interface StoreServiceMembership {
  organizationId: string;
  /** canonical service key */
  serviceKey: string;
  serviceName: string;
  enrollmentStatus: StoreServiceEnrollmentStatus;
  workspaceMode: ServiceWorkspaceMode;
  /**
   * 이 매장에서 이 서비스의 Store-facing Workspace 를 **노출할 자격**이 있는가.
   * = enrollment active AND catalog storeWorkspaceEnabled. 권한 SSOT 가 아니다.
   */
  workspaceAvailable: boolean;
}

export type StoreServiceResolutionStatus = 'resolved' | 'none' | 'ambiguous';

export type StoreServiceResolutionReason =
  /** 요청자가 어떤 매장 조직의 활성 매장 역할도 갖지 않는다 */
  | 'NO_ACCESSIBLE_STORE'
  /** 조직 미지정 + 접근 가능한 매장 2개 이상 — 자동 선택 근거 없음 */
  | 'MULTIPLE_ACCESSIBLE_STORES'
  /** 지정한 organizationId 가 요청자의 매장이 아니다 (존재 여부를 흘리지 않는다) */
  | 'NOT_STORE_MEMBER';

export interface StoreServiceResolution {
  status: StoreServiceResolutionStatus;
  organizationId: string | null;
  /** `resolved` 일 때만 채워진다. 순서는 canonical key 오름차순으로 결정적이다 */
  services: StoreServiceMembership[];
  reason: StoreServiceResolutionReason | null;
}

interface EnrollmentRow {
  organization_id: string;
  service_code: string;
  status: string | null;
}

/**
 * 한 조직의 enrollment 행을 canonical 서비스 단위로 접는다.
 * - 별칭 코드는 canonical 로 합쳐지고, 같은 서비스에 active 가 하나라도 있으면 active.
 * - canonical 집합 밖 코드는 버린다 (서비스 identity 가 아니다).
 */
export function foldEnrollmentsToStoreServices(
  organizationId: string,
  rows: EnrollmentRow[],
): StoreServiceMembership[] {
  const byKey = new Map<string, StoreServiceMembership>();
  for (const row of rows) {
    const identity = resolveServiceIdentity(row.service_code);
    if (identity.kind === 'unknown') continue;
    const capability = getServiceWorkspaceCapability(identity.serviceKey);
    const isActive = row.status === 'active';
    const prev = byKey.get(identity.serviceKey);
    const enrollmentStatus: StoreServiceEnrollmentStatus =
      isActive || prev?.enrollmentStatus === 'active' ? 'active' : 'inactive';
    byKey.set(identity.serviceKey, {
      organizationId,
      serviceKey: identity.serviceKey,
      serviceName: identity.serviceName,
      enrollmentStatus,
      workspaceMode: capability.workspaceMode,
      workspaceAvailable: enrollmentStatus === 'active' && capability.storeWorkspaceEnabled,
    });
  }
  return Array.from(byKey.values()).sort((a, b) => (a.serviceKey < b.serviceKey ? -1 : a.serviceKey > b.serviceKey ? 1 : 0));
}

export interface ResolveStoreServicesInput {
  /** **세션에서 얻은** 사용자 id */
  userId: string;
  /** 지정 시 그 조직만 본다 (소유 검증 후). 미지정 시 접근 가능한 매장이 정확히 1개일 때만 해석한다 */
  organizationId?: string | null;
}

function pickOrganization(
  candidates: StoreOrganizationCandidate[],
  requested: string | null | undefined,
): { organizationId: string } | { deny: StoreServiceResolution } {
  if (candidates.length === 0) {
    return { deny: { status: 'none', organizationId: null, services: [], reason: 'NO_ACCESSIBLE_STORE' } };
  }
  if (requested) {
    const owned = candidates.some((c) => c.organizationId === requested);
    if (!owned) {
      return { deny: { status: 'none', organizationId: null, services: [], reason: 'NOT_STORE_MEMBER' } };
    }
    return { organizationId: requested };
  }
  if (candidates.length > 1) {
    return {
      deny: { status: 'ambiguous', organizationId: null, services: [], reason: 'MULTIPLE_ACCESSIBLE_STORES' },
    };
  }
  return { organizationId: candidates[0].organizationId };
}

/**
 * 현재 매장의 가입 서비스 목록 (1 Store : N Services).
 *
 * 판정 순서 — 순서가 곧 보안 계약이다:
 *   1. 요청자의 활성 매장 조직 후보 (organization_members · 서비스 조건 없음 — 조직 소유 판정 축)
 *   2. organizationId 지정 시 후보에 포함될 것 / 미지정 시 후보가 정확히 1개일 것
 *   3. 그 조직의 enrollment 전부 → canonical 접기 → Workspace metadata 부착
 */
export async function resolveStoreServices(
  dataSource: DataSource,
  input: ResolveStoreServicesInput,
): Promise<StoreServiceResolution> {
  const { userId } = input;
  if (!userId) {
    return { status: 'none', organizationId: null, services: [], reason: 'NO_ACCESSIBLE_STORE' };
  }

  const candidates = await findAnyServiceStoreOrganizationCandidates(dataSource, userId);
  const picked = pickOrganization(candidates, input.organizationId);
  if ('deny' in picked) return picked.deny;

  const rows = (await dataSource.query(
    `SELECT organization_id, service_code, status
       FROM organization_service_enrollments
      WHERE organization_id = $1
      ORDER BY service_code`,
    [picked.organizationId],
  )) as EnrollmentRow[];

  return {
    status: 'resolved',
    organizationId: picked.organizationId,
    services: foldEnrollmentsToStoreServices(picked.organizationId, rows),
    reason: null,
  };
}

/**
 * 한 서비스에 가입한 매장 조직 id 목록 (1 Service : N Stores) — 운영자·admin 용 역방향 조회.
 *
 * 호출 측이 서비스 scope guard 를 먼저 통과했어야 한다 (이 함수는 권한을 판정하지 않는다).
 * 별칭 코드로 기록된 enrollment 도 같은 서비스로 본다.
 */
export async function listEnrolledStoreOrganizationIds(
  dataSource: DataSource,
  serviceKey: string,
  options: { includeInactive?: boolean } = {},
): Promise<Array<{ organizationId: string; enrollmentStatus: StoreServiceEnrollmentStatus }>> {
  const identity = resolveServiceIdentity(serviceKey);
  if (identity.kind === 'unknown') return [];
  const codes = enrollmentCodesFor(identity.serviceKey);

  const rows = (await dataSource.query(
    `SELECT organization_id, service_code, status
       FROM organization_service_enrollments
      WHERE service_code = ANY($1::text[])
      ORDER BY organization_id`,
    [codes],
  )) as EnrollmentRow[];

  const byOrg = new Map<string, StoreServiceEnrollmentStatus>();
  for (const row of rows) {
    const prev = byOrg.get(row.organization_id);
    byOrg.set(row.organization_id, row.status === 'active' || prev === 'active' ? 'active' : 'inactive');
  }
  return Array.from(byOrg.entries())
    .filter(([, status]) => options.includeInactive || status === 'active')
    .map(([organizationId, enrollmentStatus]) => ({ organizationId, enrollmentStatus }));
}

/** canonical key 와 그 role-prefix 별칭 — enrollment.service_code 로 등장할 수 있는 코드 집합 */
function enrollmentCodesFor(canonicalKey: string): string[] {
  const prefix = resolveRolePrefixFromCanonicalServiceKey(canonicalKey);
  return prefix === canonicalKey ? [canonicalKey] : [canonicalKey, prefix];
}

// ─── Operator ↔ Service ──────────────────────────────────────────────────────

export type OperatorScopeLevel = 'admin' | 'operator';

/**
 * 한 운영자가 운영 가능한 서비스 1건.
 * 근거는 `role_assignments`(`{prefix}:admin` ⊃ `{prefix}:operator`) 와 `service_memberships`(active) 뿐이다 —
 * 서비스별 scope guard 의 접근 정책(role + membership 둘 다 필요)과 같은 결합이다.
 */
export interface OperatorServiceMembership {
  /** canonical service key */
  serviceKey: string;
  serviceName: string;
  /** 보유 최고 scope. admin 은 operator 를 포함한다 (기존 scopeRoleMapping 계층) */
  scope: OperatorScopeLevel;
  workspaceMode: ServiceWorkspaceMode;
  /** = catalog operatorWorkspaceEnabled. 권한 SSOT 가 아니다 — 실제 접근은 `require{Service}Scope` */
  workspaceAvailable: boolean;
}

interface OperatorRoleRow {
  role: string;
}

/**
 * 현재 사용자가 운영자로 참여하는 서비스 목록 (1 Operator : N Services).
 *
 *   1. role_assignments(is_active) 중 `{prefix}:admin` / `{prefix}:operator` — prefix 는 catalog canonical key 에서
 *      security-core 역매핑으로 파생한다 (로컬 prefix 맵 금지)
 *   2. 그 서비스의 service_memberships 가 active 일 것 (membership guard 와 동일 정책 — role 만으로는 운영자가 아니다)
 *
 *   `platform:super_admin` 의 platformBypass 는 guard 의 예외이지 "운영하는 서비스" 가 아니므로 여기서 부여하지 않는다.
 */
export async function resolveOperatorServices(
  dataSource: DataSource,
  userId: string,
): Promise<OperatorServiceMembership[]> {
  if (!userId) return [];

  const rows = (await dataSource.query(
    `SELECT role
       FROM role_assignments
      WHERE user_id = $1
        AND is_active = true
        AND (role LIKE '%:admin' OR role LIKE '%:operator')
      ORDER BY role`,
    [userId],
  )) as OperatorRoleRow[];
  if (rows.length === 0) return [];

  const scopeByKey = new Map<string, OperatorScopeLevel>();
  for (const svc of O4O_SERVICES) {
    const prefix = resolveRolePrefixFromCanonicalServiceKey(svc.key);
    const hasAdmin = rows.some((r) => r.role === `${prefix}:admin`);
    const hasOperator = rows.some((r) => r.role === `${prefix}:operator`);
    if (hasAdmin) scopeByKey.set(svc.key, 'admin');
    else if (hasOperator) scopeByKey.set(svc.key, 'operator');
  }

  const result: OperatorServiceMembership[] = [];
  for (const [serviceKey, scope] of scopeByKey) {
    const membership = await getServiceMembershipStatusFromDb(dataSource, userId, serviceKey);
    if (membership !== 'active') continue;
    const identity = resolveServiceIdentity(serviceKey);
    const capability = getServiceWorkspaceCapability(serviceKey);
    result.push({
      serviceKey,
      serviceName: identity.serviceName,
      scope,
      workspaceMode: capability.workspaceMode,
      workspaceAvailable: capability.operatorWorkspaceEnabled,
    });
  }
  return result.sort((a, b) => (a.serviceKey < b.serviceKey ? -1 : a.serviceKey > b.serviceKey ? 1 : 0));
}
