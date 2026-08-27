/**
 * Buyer Organization Resolver — B2B 주문 확정의 매장(조직) 권위 판정
 *
 * WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1 (결함 O1)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 이 파일이 존재하는가
 *
 *   `POST /store/cart/:serviceKey/items` 는 body 의 `organizationId` 를 그대로
 *   `store_cart_items.organizationId` 에 저장했고, B2B confirm 은 그 값을
 *   **권위처럼** 사용해 `checkout_orders.sellerOrganizationId` 로 승격했다.
 *   즉 클라이언트가 보낸 조직 식별자가 서버 검증 없이 주문 소유 축이 되었다.
 *
 *   canonical 계약:
 *     client organizationId = **선택값(hint)**
 *     server validation      = **권위(authority)**
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 판정 규칙 (WO §7)
 *
 *   접근 가능 조직 0개                       → `none`      (STORE_ORGANIZATION_NOT_FOUND)
 *   1개 + 선택 없음                          → `resolved`  (서버 자동 확정)
 *   1개 + 그 조직 선택                       → `resolved`
 *   N개 + 접근 가능한 조직 선택              → `resolved`  (다중 조직 사용자를 차단하지 않는다)
 *   N개 + 선택 없음                          → `ambiguous` (AMBIGUOUS_STORE_ORGANIZATION)
 *   선택했으나 접근 불가 조직                → `forbidden` (FOREIGN_STORE_ORGANIZATION, 403)
 *
 * 새 identity/organization framework 를 만들지 않는다. 후보 집합은 기존 canonical SSOT
 * `utils/store-organization.resolver.ts` 를 그대로 재사용한다(그 위의 selection-validation
 * helper 만 이 파일이 더한다).
 */

import type { DataSource } from 'typeorm';
import {
  findStoreOrganizationCandidates,
  findAnyServiceStoreOrganizationCandidates,
  type StoreOrganizationCandidate,
  type StoreOwnerServiceKey,
} from './store-organization.resolver.js';

/**
 * cart serviceKey(platform-level) → 매장 조직 연결 축(product-level).
 *
 * `STORE_SERVICE_ORG_LINKAGE` 는 product-level 키를 쓴다. cart/confirm 경계는
 * platform-level 키(`kpa-society` 등)를 쓰므로 여기서만 변환한다.
 * 매핑이 없는 serviceKey(예: `neture`)는 서비스 스코프 없는 후보 집합으로 판정한다 —
 * **허용 집합을 넓히지 않기 위해** 조직 소속 자체(organization_members)는 반드시 확인한다.
 */
const CART_SERVICE_TO_STORE_ORG_KEY: Readonly<Record<string, StoreOwnerServiceKey>> = Object.freeze({
  glycopharm: 'glycopharm',
  'kpa-society': 'kpa',
  kpa: 'kpa',
  'k-cosmetics': 'cosmetics',
  cosmetics: 'cosmetics',
  'pharmacy-hub': 'pharmacy-hub',
});

export type BuyerOrganizationResolution =
  | { status: 'resolved'; organizationId: string; candidateCount: number }
  | { status: 'none'; organizationId: null; candidateCount: 0 }
  | { status: 'ambiguous'; organizationId: null; candidateCount: number }
  | { status: 'forbidden'; organizationId: null; candidateCount: number };

async function loadCandidates(
  dataSource: DataSource,
  userId: string,
  serviceKey: string,
): Promise<StoreOrganizationCandidate[]> {
  const mapped = CART_SERVICE_TO_STORE_ORG_KEY[serviceKey];
  return mapped
    ? findStoreOrganizationCandidates(dataSource, userId, mapped)
    : findAnyServiceStoreOrganizationCandidates(dataSource, userId);
}

/**
 * 구매 주체(userId)가 이 serviceKey 에서 사용할 수 있는 매장 조직을 확정한다.
 *
 * @param requestedOrganizationId 클라이언트가 **선택**한 조직(hint). 권위가 아니다.
 */
export async function resolveBuyerOrganization(
  dataSource: DataSource,
  userId: string,
  serviceKey: string,
  requestedOrganizationId?: string | null,
): Promise<BuyerOrganizationResolution> {
  const candidates = await loadCandidates(dataSource, userId, serviceKey);
  const requested = requestedOrganizationId?.trim() || null;

  if (requested) {
    // 선택값은 **서버 후보 집합 안에 있을 때만** 유효하다. 밖이면 타인 조직 스푸핑.
    const hit = candidates.find((c) => c.organizationId === requested);
    if (hit) {
      return { status: 'resolved', organizationId: hit.organizationId, candidateCount: candidates.length };
    }
    return { status: 'forbidden', organizationId: null, candidateCount: candidates.length };
  }

  if (candidates.length === 0) return { status: 'none', organizationId: null, candidateCount: 0 };
  if (candidates.length === 1) {
    return { status: 'resolved', organizationId: candidates[0].organizationId, candidateCount: 1 };
  }
  // 다중 조직 사용자를 차단하지 않는다 — 어느 매장으로 주문할지 **선택**을 요구할 뿐이다.
  return { status: 'ambiguous', organizationId: null, candidateCount: candidates.length };
}

/**
 * "이 조직을 이 사용자가 이 서비스에서 쓸 수 있는가" 만 판정하는 경량 검사.
 *
 * cart write 경계(`POST /cart/:serviceKey/items`)용 — 조직 지정이 **없으면 통과**한다
 * (조직 없이 담는 기존 흐름을 막지 않는다). 지정했으면 반드시 서버가 검증한다.
 */
export async function isBuyerOrganizationAllowed(
  dataSource: DataSource,
  userId: string,
  serviceKey: string,
  organizationId: string,
): Promise<boolean> {
  const candidates = await loadCandidates(dataSource, userId, serviceKey);
  return candidates.some((c) => c.organizationId === organizationId);
}
