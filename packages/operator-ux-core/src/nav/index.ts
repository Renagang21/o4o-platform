/**
 * Nav visibility helpers
 *
 * WO-O4O-COMMON-MENU-VISIBILITY-POLICY-IMPL-V1
 *
 * 정책:
 *   operator/admin 계정은 모든 contextual nav 메뉴를 본다.
 *   일반 사용자는 visibleWhen 조건에 따라 필터링한다.
 */

/**
 * 역할 배열에서 해당 서비스의 admin 또는 operator 여부를 판정한다.
 *
 * @param roles    user.roles 배열
 * @param prefix   서비스 역할 접두어 (예: 'neture', 'glycopharm', 'kpa', 'k-cosmetics')
 */
export function isAdminOrOperator(roles: string[], prefix: string): boolean {
  return roles.some(
    (r) =>
      r === `${prefix}:admin` ||
      r === `${prefix}:operator` ||
      r === 'platform:super_admin',
  );
}
