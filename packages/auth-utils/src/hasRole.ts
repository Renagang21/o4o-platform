export function hasRole(userRoles: string[], role: string): boolean {
  return userRoles.includes(role);
}

export function hasAnyRole(userRoles: string[], roles: readonly string[]): boolean {
  return roles.some(r => userRoles.includes(r));
}

/**
 * WO-O4O-OPERATOR-MENU-COMMONIZATION-V1
 * serviceKey 기반 운영자-이상 권한 판정.
 * platform:super_admin, {serviceKey}:admin, {serviceKey}:operator 중 하나라도 있으면 true.
 */
export function isOperatorOrAbove(roles: string[], serviceKey: string): boolean {
  return roles.some(
    r => r === 'platform:super_admin' || r === `${serviceKey}:admin` || r === `${serviceKey}:operator`,
  );
}

/**
 * WO-O4O-OPERATOR-MENU-COMMONIZATION-V1
 * serviceKey 기반 관리자-이상 권한 판정.
 * platform:super_admin, {serviceKey}:admin 중 하나라도 있으면 true.
 */
export function isAdminOrAbove(roles: string[], serviceKey: string): boolean {
  return roles.some(
    r => r === 'platform:super_admin' || r === `${serviceKey}:admin`,
  );
}
