/**
 * Store Policy — 매장 소유권 판정 (canonical ownership axis)
 *
 * WO-O4O-KCOS-STORE-POLICY-OWNERSHIP-AXIS-FIX-V1
 *
 * 라우터에서 분리한 이유는 두 가지다.
 *   (1) 판정 축(=`organizations.id`)을 한 곳에서만 정의해 다시 섞이지 않게 한다.
 *   (2) `store-policy.routes.ts` 는 `@o4o/platform-core/*` subpath 를 import 해
 *       단위 테스트에서 로드할 수 없다. 판정 로직만 떼어내면 회귀 테스트가 가능하다.
 */

import type { DataSource } from 'typeorm';
import {
  isStoreOwner as resolveCanonicalStoreOwner,
  type StoreOwnerServiceKey,
} from '../../utils/store-owner.utils.js';
import {
  findStoreOrganizationCandidates,
  STORE_SERVICE_ORG_LINKAGE,
} from '../../utils/store-organization.resolver.js';

/**
 * slug 축 service_key → store_owner role 축 serviceKey.
 *
 * WO-O4O-KCOS-STORE-POLICY-OWNERSHIP-AXIS-FIX-V1 §5:
 *   새 로컬 매핑을 만들지 않는다. `STORE_SERVICE_ORG_LINKAGE`(공통 해석기 SSOT)의
 *   `slugKeys` 를 뒤집어 파생한다 — 두 축의 값이 갈라지면 여기도 자동으로 따라간다.
 */
const SLUG_SERVICE_KEY_TO_STORE_OWNER_SERVICE: ReadonlyMap<string, StoreOwnerServiceKey> = new Map(
  (
    Object.entries(STORE_SERVICE_ORG_LINKAGE) as Array<
      [StoreOwnerServiceKey, { readonly slugKeys: readonly string[] }]
    >
  ).flatMap(([ownerServiceKey, linkage]) =>
    linkage.slugKeys.map((slugKey) => [slugKey, ownerServiceKey] as [string, StoreOwnerServiceKey]),
  ),
);

/**
 * Resolve store ownership across services.
 *
 * WO-O4O-KCOS-STORE-POLICY-OWNERSHIP-AXIS-FIX-V1 §4/§5 — canonical ownership axis
 *
 *   이 라우터가 다루는 `storeId` 는 언제나 `platform_store_slugs.store_id`,
 *   즉 **`organizations.id`** 다. 하위 소비처(`organization_channels.organization_id`,
 *   `store_policies.store_id`, `payment_configs.store_id`, `slugService.changeSlug`)가
 *   모두 같은 축을 쓴다.
 *
 *   (구) 구현은 cosmetics 만 `cosmetics.cosmetics_stores.id`(매장 PK) 축으로 대조했다.
 *   프로덕션 실측: cosmetics slug 2건 모두 `store_id` 가 매장 PK 와 일치하지 않고
 *   (`organization_id` 와만 일치), 게다가 `cosmetics.cosmetics_stores` 에는
 *   `created_by_user_id` 컬럼 자체가 없어 쿼리가 42703 으로 throw → 정상 소유자도
 *   403 이 아니라 **500 INTERNAL_ERROR** 를 받았다.
 *   또 `kpa` / `pharmacy-hub` 는 분기 자체가 없어 활성 slug 13건 전부 항상 403 이었다.
 *
 *   → 판정을 공통 계약으로 통일한다. 새 SQL·새 id 매핑을 만들지 않는다.
 *     (1) role 게이트 : `utils/store-owner.utils.ts` (role_assignments SSOT)
 *     (2) 조직 후보   : `utils/store-organization.resolver.ts` (service-scoped)
 *     (3) 대상 확인   : 후보 organizationId 집합에 `storeId` 가 있는지
 *
 *   (3) 을 후보 집합 대조로 하는 이유: `resolveStoreOrganization()` 의 단일 선택은
 *   같은 서비스 조직이 2개 이상이면 ambiguous 로 막지만, 여기서는 대상 매장이
 *   slug 로 이미 특정되어 있어 임의 선택 위험이 없다.
 */
export async function isStoreOwner(
  dataSource: DataSource,
  storeId: string,
  serviceKey: string,
  userId: string,
): Promise<boolean> {
  const ownerServiceKey = SLUG_SERVICE_KEY_TO_STORE_OWNER_SERVICE.get(serviceKey);

  // 매장 소유 축이 없는 서비스(neture 등)는 판정 대상이 아니다.
  if (ownerServiceKey) {
    const { isOwner } = await resolveCanonicalStoreOwner(dataSource, userId, ownerServiceKey);
    if (isOwner) {
      const candidates = await findStoreOrganizationCandidates(dataSource, userId, ownerServiceKey);
      if (candidates.some((c) => c.organizationId === storeId)) {
        return true;
      }
    }
  }

  // Legacy(조직 생성자) 축 — glycopharm 기존 허용 범위를 좁히지 않기 위해 유지한다.
  // organizations.id 축이므로 id 축 혼용은 아니다. cosmetics 의 (존재하지 않는 컬럼을
  // 매장 PK 로 조회하던) 레거시 분기는 제거한다.
  if (serviceKey === 'glycopharm') {
    const rows = await dataSource.query(
      `SELECT 1 FROM organizations WHERE id = $1 AND created_by_user_id = $2 LIMIT 1`,
      [storeId, userId],
    );
    return rows.length > 0;
  }

  return false;
}

