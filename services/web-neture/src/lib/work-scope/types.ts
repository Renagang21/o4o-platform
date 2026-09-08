/**
 * Work Scope V0 — 계약 타입
 *
 * WO-O4O-WORK-SCOPE-CONTRACT-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Work Scope 란 무엇인가 (그리고 무엇이 아닌가)
 *
 *   Work Scope 는 **실행 컨텍스트**다 — "지금 어떤 공간을 대상으로 일하는가".
 *   권한 체계가 아니다. 신규 role · permission · membership 을 만들지 않는다.
 *
 *     기존 Auth / Membership / role_assignments  → 사용자가 무엇을 할 수 있는가 (권한)
 *     Work Scope                                 → 지금 어디를 대상으로 하는가 (컨텍스트)
 *
 *   따라서 Work Scope 는 **권한을 넓힐 수 없다.** 아래 WORKSPACE_ACCESS 의 역할
 *   집합은 전부 기존 route guard / layout guard 가 이미 쓰는 상수를 재사용하며,
 *   교집합으로만 좁힌다(§11 권한 없는 scope 차단).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * V0 범위
 *
 *   포함: 계약 타입 · route→workspace 매핑 · 순수 resolver · active scope 상태
 *   제외: AI 호출 · Local Agent 실행 · Computer Use · 파일 접근 · 개인정보 접근
 *         · DB 저장 · migration · 신규 permission 체계
 */

import {
  ADMIN_ROLES,
  OPERATOR_OR_ABOVE_ROLES,
  PARTNER_ACCESS_ROLES,
  SUPPLIER_ACCESS_ROLES,
  SUPPLIER_ROLES,
} from '../role-constants';

// ─── Workspace ───────────────────────────────────────────────────────────────

/**
 * 업무 공간. route 가 아니라 **업무 축**이다 (route 와 1:1 이 아니다 —
 * 예: `/seller/*` 와 `/store/*` 는 같은 'store' 축, `/admin-vault` 는 'admin' 축).
 */
export type Workspace =
  | 'home'
  | 'community'
  | 'store'
  | 'supplier'
  | 'partner'
  | 'operator'
  | 'admin';

// ─── Execution Mode ──────────────────────────────────────────────────────────

/**
 * 실행 위치. V0 는 **항상 'cloud'** 다.
 * 'local' / 'hybrid' 는 후속 Local Work Agent 를 위한 계약 자리이며,
 * 이번 WO 에서 local process 를 실행하지 않는다(§14).
 */
export type ExecutionMode = 'cloud' | 'local' | 'hybrid';

// ─── Status ──────────────────────────────────────────────────────────────────

/**
 * scope 확정 상태.
 *
 * 값 3개는 새로 만든 것이 아니라 백엔드 canonical resolver 의 계약을 그대로 따른 것이다 —
 * `apps/api-server/src/utils/store-organization.resolver.ts` (resolved / none / ambiguous).
 * 특히 'ambiguous' 는 **임의 선택 금지** 를 뜻한다(§6: 불확실하면 위험한 scope 를 고르지 않는다).
 */
export type WorkScopeStatus = 'resolved' | 'none' | 'ambiguous';

/** status 가 'resolved' 가 아닐 때의 사유 코드. */
export type WorkScopeReason =
  /** 미인증 — 로그인 필요 */
  | 'UNAUTHENTICATED'
  /** 해당 workspace 의 역할 없음 (기존 guard 와 동일 판정) */
  | 'ROLE_NOT_GRANTED'
  /** service_memberships(neture) 가 active 아님 */
  | 'MEMBERSHIP_NOT_ACTIVE'
  /**
   * 매장 식별자를 클라이언트에서 확정할 수 없음.
   * Neture 는 organization 미연결 서비스이며(docs/architecture/O4O-ORGANIZATION-ROLE-STANDARD-V1.md §4.4),
   * 매장 식별의 canonical 판정은 서버(store-organization.resolver.ts)에만 존재한다.
   */
  | 'STORE_IDENTITY_SERVER_ONLY';

// ─── Capability ──────────────────────────────────────────────────────────────

/**
 * V0 capability — **서술(descriptor)이지 권한이 아니다.**
 *
 * 조사 결과 프런트엔드에 사용자 단위 `can(...)` 추상화는 존재하지 않는다.
 * (`@o4o/capabilities` 는 매장 *기능* 등재부 — TABLET/SIGNAGE 등 — 로 축이 다르고,
 *  `@o4o/auth-client` 의 RBAC 훅은 어디서도 쓰이지 않는 dead layer 다.)
 * 그래서 새 권한 추상화를 만들지 않고, 기존 guard 가 이미 허용한 범위보다
 * **좁은** 서술만 둔다. 인가 판정에 이 값을 쓰지 않는다.
 */
export type WorkScopeCapability =
  | 'navigate'
  | 'read'
  | 'draft'
  /** V0 에서 부여되지 않는다 — Local Work Agent 계약 자리 (§12). */
  | 'local_read'
  | 'local_write'
  | 'browser';

// ─── WorkScope ───────────────────────────────────────────────────────────────

export interface WorkScope {
  /**
   * canonical `service_memberships.service_key`.
   *
   * ⚠️ O4O 에는 같은 이름의 값 공간이 둘 있다 — role prefix('kpa','cosmetics')와
   * canonical membership key('kpa-society','k-cosmetics'). 여기 담는 값은 **후자**다.
   * 두 공간의 변환 SSOT 는 `packages/security-core/src/service-configs.ts`
   * (`resolveCanonicalServiceKey` / `resolveRolePrefixFromCanonicalServiceKey`) 이며,
   * Neture 는 self-map 이라 V0 에서는 변환이 필요 없다.
   */
  serviceKey: string;

  workspace: Workspace;

  /**
   * 조직 식별자. **V0 에서 항상 undefined 다.**
   * Neture 는 organization 미연결 서비스라 클라이언트가 확정할 근거가 없다.
   */
  organizationId?: string;

  /**
   * 매장 식별자. **V0 에서 항상 undefined 다.**
   *
   * canonical 축에서 storeId 는 `organizations.id` 와 **같은 값**이다
   * (`OrganizationStore` 는 `@Entity('organizations')` 확장 뷰).
   * 다만 Boundary Policy(F6)상 도메인별 경계 이름이 다르므로
   * (Store Ops=organizationId / Commerce=storeId) 필드는 분리해 둔다.
   * 확정은 서버 resolver 소관이며 클라이언트가 보낸 값은 신뢰되지 않는다.
   */
  storeId?: string;

  /** 우선순위 기준 대표 role (role_assignments 유래, `/auth/me` 경유). */
  role?: string;

  /** 서술용. 인가 판정에 쓰지 않는다. */
  capabilities: WorkScopeCapability[];

  /** V0 는 항상 'cloud'. */
  executionMode: ExecutionMode;

  status: WorkScopeStatus;

  /** status !== 'resolved' 인 이유. */
  reason?: WorkScopeReason;
}

// ─── Workspace 접근 정책 ─────────────────────────────────────────────────────

export interface WorkspaceAccessRule {
  /**
   * 이 workspace 를 활성화할 수 있는 역할. undefined = 역할 게이트 없음(공개 축).
   * **기존 guard 상수만 조합한다.** 새 역할 문자열을 여기서 만들지 않는다.
   */
  allowedRoles?: string[];
  /** `service_memberships(neture).status === 'active'` 요구 여부. */
  requireMembership: boolean;
  /** 매장 식별자가 있어야 의미가 성립하는 축인가. */
  requiresStoreIdentity: boolean;
}

/**
 * supplier 축의 **실효** 역할 집합.
 *
 * `/supplier/*` 는 route guard(SupplierRoute → SUPPLIER_ROLES)와
 * layout guard(SupplierSpaceLayout → SUPPLIER_ACCESS_ROLES)를 **둘 다** 통과해야 한다.
 * 따라서 실제로 쓸 수 있는 집합은 교집합이다. 상수를 베껴 적지 않고 교집합을 계산해
 * 원본이 바뀌어도 drift 가 생기지 않게 한다.
 */
const SUPPLIER_EFFECTIVE_ROLES: string[] = SUPPLIER_ROLES.filter((r) =>
  SUPPLIER_ACCESS_ROLES.includes(r),
);

/**
 * workspace → 접근 조건.
 *
 * 각 항목은 **현재 코드가 실제로 강제하는 것**을 그대로 옮긴 것이다:
 *   admin     AdminRoute(ADMIN_ROLES) + requireMembership 'neture'
 *   operator  OperatorRoute(OPERATOR_OR_ABOVE_ROLES) + requireMembership 'neture'
 *   supplier  SupplierRoute ∩ SupplierSpaceLayout + requireMembership 'neture'
 *   partner   PartnerSpaceLayout / PartnerAccountLayout (PARTNER_ACCESS_ROLES) — route guard 없음 → membership 미요구
 *   store     route guard 없음. 단 매장 식별자가 서버 전용이라 클라이언트에서 확정 불가
 *   community / home  공개
 */
export const WORKSPACE_ACCESS: Readonly<Record<Workspace, WorkspaceAccessRule>> = Object.freeze({
  home: { requireMembership: false, requiresStoreIdentity: false },
  community: { requireMembership: false, requiresStoreIdentity: false },
  store: { requireMembership: false, requiresStoreIdentity: true },
  supplier: {
    allowedRoles: SUPPLIER_EFFECTIVE_ROLES,
    requireMembership: true,
    requiresStoreIdentity: false,
  },
  partner: {
    allowedRoles: PARTNER_ACCESS_ROLES,
    requireMembership: false,
    requiresStoreIdentity: false,
  },
  operator: {
    allowedRoles: OPERATOR_OR_ABOVE_ROLES,
    requireMembership: true,
    requiresStoreIdentity: false,
  },
  admin: {
    allowedRoles: ADMIN_ROLES,
    requireMembership: true,
    requiresStoreIdentity: false,
  },
});
