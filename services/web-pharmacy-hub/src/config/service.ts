/**
 * Pharmacy-Hub Service Identity (SSOT — 프론트엔드)
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 *
 * 기존 서비스는 serviceKey 를 여러 파일에 하드코딩해 왔다(login/membershipGate/apiClient).
 * Pharmacy-Hub 는 시작부터 이 파일 하나만 참조한다 — drift 방지.
 *
 * SERVICE_KEY 는 backend 의 다음 축과 동일한 값이어야 한다:
 *   - SERVICE_KEYS.PHARMACY_HUB              (apps/api-server/src/constants/service-keys.ts)
 *   - O4O_SERVICES[].key = 'pharmacy-hub'    (apps/api-server/src/config/service-catalog.ts)
 *   - service_memberships.service_key        (가입/승인 축)
 *   - role prefix 'pharmacy-hub:'            (role_assignments 축, self-map)
 */

export const SERVICE_KEY = 'pharmacy-hub' as const;

/** 이벤트 오퍼 서비스 키 — 후속 이벤트 오퍼 WO 에서 사용 (현재 미연결) */
export const EVENT_OFFER_SERVICE_KEY = 'pharmacy-hub-event-offer' as const;

export const BRAND = {
  name: 'Pharmacy-Hub',
  nameKo: '파머시 허브',
  domain: 'pharmacyhub.co.kr',
  tagline: '약국 경영자를 위한 약국 전문 서비스',
} as const;

/**
 * 역할 진입점 (WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1)
 *
 * supplier 는 없다 — 공급자는 Pharmacy-Hub 회원이 아니라 Neture 에서만 활동한다
 * (WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1).
 * backend `PHARMACY_HUB_SCOPE_CONFIG.allowedRoles` 와 같은 표를 유지한다.
 */
export const ROLES = {
  admin: `${SERVICE_KEY}:admin`,
  storeOwner: `${SERVICE_KEY}:store_owner`,
  operator: `${SERVICE_KEY}:operator`,
} as const;

/**
 * 플랫폼 전역 최고 관리자 (WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1)
 *
 * backend `PHARMACY_HUB_SCOPE_CONFIG.platformBypass = true` 와 같은 계약이다.
 * K-Cosmetics / GlycoPharm / Neture 헤더도 동일하게 서비스 admin 과 함께 취급한다.
 */
export const PLATFORM_SUPER_ADMIN = 'platform:super_admin' as const;

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.admin]: '서비스 관리자',
  [ROLES.storeOwner]: '약국 경영자',
  [ROLES.operator]: '서비스 운영자',
};

/**
 * 역할 계층 (WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1)
 *
 * backend `PHARMACY_HUB_SCOPE_CONFIG.scopeRoleMapping`
 * (`apps/api-server/src/middleware/pharmacy-hub-scope.middleware.ts`) 와 **같은 표**여야 한다.
 * 프론트가 더 넓으면 화면은 열리고 API 는 403 이 되며, 더 좁으면 권한이 있는데도 막힌다.
 *
 * admin ⊃ operator. store_owner 는 사업자 신분이라 admin 이 대신하지 않는다.
 *
 * WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1:
 *   platform:super_admin 을 admin/operator 만족 역할로 추가한다(backend platformBypass 와 정렬).
 *   store_owner 는 사업자 신분이므로 플랫폼 관리자가 대신하지 않는다 —
 *   해당 API 는 본인 레코드 기준이라 메뉴만 열면 403 이 된다.
 */
export const ROLE_SCOPE_MAPPING: Record<string, readonly string[]> = {
  [ROLES.admin]: [ROLES.admin, PLATFORM_SUPER_ADMIN],
  [ROLES.operator]: [ROLES.operator, ROLES.admin, PLATFORM_SUPER_ADMIN],
  [ROLES.storeOwner]: [ROLES.storeOwner],
};

/** 보유 역할이 요구 역할을 만족하는가 (계층 포함) */
export function satisfiesRole(userRoles: readonly string[], requiredRole: string): boolean {
  const accepted = ROLE_SCOPE_MAPPING[requiredRole] ?? [requiredRole];
  return userRoles.some((r) => accepted.includes(r));
}
