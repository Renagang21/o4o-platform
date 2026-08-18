/**
 * OPL(organization_product_listings) service_key 도출 SSOT
 *
 * WO-O4O-KPA-STORE-SERVICE-KEY-AND-PRODUCT-POLICY-CANONICALIZATION-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 확정 계약: OPL.service_key 는 **platform-level canonical key** 축이다.
 *   'kpa-society' / 'glycopharm' / 'k-cosmetics' / 'neture'
 *
 * 근거 (전수 census):
 *   - migration 20260411300000-NormalizeKpaServiceKeys 가 이미
 *     product_approvals · organization_product_listings 의 'kpa' → 'kpa-society' 를
 *     "표준 key" 로 명문화하고 운영 데이터를 정규화했다.
 *   - /pharmacy-products/apply 는 마운트 키를 canonical 로 변환해 기록한다
 *     (STORE_SERVICE_KEY_TO_APPROVAL_KEY: kpa→'kpa-society', cosmetics→'k-cosmetics').
 *   - product-approval-v2 가 approval.service_key 를 그대로 OPL 로 전파한다.
 *   - kpa-checkout 은 `opl.service_key = 'kpa-society'` 로 읽는다.
 *   - auto-listing 은 organization_service_enrollments.service_code(=canonical)를 복사한다.
 *   - service_audience_policies 도 canonical key 행만 존재한다.
 *
 * 따라서 enrollment→listing 경계에는 **변환이 필요 없다** (같은 축이다).
 * 변환이 필요한 축은 role-prefix('kpa' / 'cosmetics') 쪽이며, 그것이 필요한 곳은
 * packages/security-core 의 resolveCanonicalServiceKey / resolveRolePrefixFromCanonicalServiceKey
 * 를 쓴다. 로컬 하드코딩 맵을 다시 만들지 않는다.
 */
import { ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY } from '@o4o/security-core';
import { SERVICE_KEYS } from '../constants/service-keys.js';

/** OPL service_key 로 인정되는 canonical membership key (platform-level). */
export const LISTING_SERVICE_KEYS: readonly string[] = [
  SERVICE_KEYS.KPA_SOCIETY,
  SERVICE_KEYS.GLYCOPHARM,
  SERVICE_KEYS.NETURE,
  SERVICE_KEYS.K_COSMETICS,
];

/**
 * multi-membership 사용자의 결정적 우선순위.
 * 본 WO 범위 밖의 design 결정을 임시 대체한다 (종전 하드코딩이 'neture' 였으므로 neture 우선 유지).
 */
export const MULTI_MEMBERSHIP_PRIORITY: readonly string[] = [
  SERVICE_KEYS.NETURE,
  SERVICE_KEYS.KPA_SOCIETY,
  SERVICE_KEYS.GLYCOPHARM,
  SERVICE_KEYS.K_COSMETICS,
];

export interface MembershipLike {
  serviceKey?: string | null;
  status?: string | null;
}

/**
 * 활성 membership 집합에서 OPL 에 기록할 service_key 를 도출한다.
 * 도출 불가(활성 membership 0 / 진열 대상 서비스 아님)면 null — 호출자는 거부해야 한다.
 */
export function deriveListingServiceKeyFromMemberships(
  memberships: MembershipLike[] | undefined | null,
): string | null {
  const active = (memberships ?? []).filter((m) => m && m.status === 'active');
  if (active.length === 0) return null;

  if (active.length > 1) {
    for (const key of MULTI_MEMBERSHIP_PRIORITY) {
      if (active.some((m) => m.serviceKey === key)) return key;
    }
  }

  const first = active[0]?.serviceKey ?? null;
  return first && LISTING_SERVICE_KEYS.includes(first) ? first : null;
}

/**
 * WO-O4O-KCOS-ENROLLMENT-SERVICE-KEY-CANONICALIZATION-V1
 *
 * `organization_service_enrollments.service_code` 에 남아 있는 **role/product-level 별칭**.
 * 이 값들은 platform_services 에 등록돼 있으나 type='tool'(제품 도메인) 이며
 * 서비스 가입(enrollment) 축의 canonical key 가 아니다:
 *   'cosmetics' → canonical 'k-cosmetics' · 'kpa' → canonical 'kpa-society'
 *
 * 새 로컬 맵을 만들지 않고 security-core 의 SSOT(ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY)
 * 에서 그대로 파생한다. enrollment.service_code 를 **그대로 복사**하는 경로
 * (auto-listing 등)는 이 집합을 제외해야 OPL 에 비-canonical key 가 새로 생기지 않는다.
 */
export const NON_CANONICAL_ENROLLMENT_CODES: readonly string[] = Object.freeze(
  Object.keys(ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY),
);
