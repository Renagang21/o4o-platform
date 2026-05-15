/**
 * isStoreOwnerDual — dual-source store_owner 판정 helper
 *
 * WO-O4O-AUTH-UTILS-STORE-OWNER-DUAL-V1
 *
 * JWT가 stale인 경우 role_assignments 기반 역할이 누락될 수 있다.
 * contextFlag(e.g. user.isStoreOwner)를 fallback으로 사용하여
 * stale JWT에서도 store_owner를 정상 판정한다.
 *
 * @param roles         - user.roles (JWT payload)
 * @param storeOwnerRole - 서비스별 store_owner role string
 *                        e.g. 'kpa:store_owner', 'glycopharm:store_owner', 'cosmetics:store_owner'
 * @param contextFlag   - user.isStoreOwner 등 context에서 파생된 boolean (optional)
 *                        stale JWT 대응 fallback. 없으면 role 체크만 수행.
 *
 * @example
 * // KPA — stale JWT fallback 포함
 * isStoreOwnerDual(user.roles, 'kpa:store_owner', user.isStoreOwner)
 *
 * @example
 * // GlycoPharm — role only (context field 없음)
 * isStoreOwnerDual(user.roles, 'glycopharm:store_owner')
 *
 * @example
 * // 향후 확장 (instructor, supplier, partner 등 동일 패턴 적용 가능)
 * isStoreOwnerDual(user.roles, 'neture:supplier', user.isSupplier)
 */
export function isStoreOwnerDual(
  roles: string[],
  storeOwnerRole: string,
  contextFlag?: boolean,
): boolean {
  return roles.includes(storeOwnerRole) || contextFlag === true;
}
