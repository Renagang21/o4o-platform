/**
 * AdminProtectedRoute 접근 판정 로직 (순수 함수).
 *
 * **WO-O4O-ADMIN-PROTECTED-ROUTE-ROLE-PERMISSION-SEMANTICS-V1**
 *
 * React·react-router 의존이 없는 별도 모듈로 둔다. 접근 판정은 보안 경계이므로
 * 컴포넌트를 렌더링하지 않고 단위 테스트로 고정할 수 있어야 한다.
 */

/** 서비스 접두 역할(`kpa:admin`, `neture:operator` 등)을 받아줄 수 있는 관리자급 요구 역할. */
export const ADMIN_LEVEL_ROLES: readonly string[] = [
  'admin',
  'administrator',
  'super_admin',
  'operator',
  'platform:admin',
  'platform:super_admin',
];

/** `kpa:admin`, `neture:operator` 같은 서비스 접두 관리자급 역할인가. */
export const isServicePrefixedAdminRole = (role: string): boolean =>
  role.includes(':') && (role.endsWith(':admin') || role.endsWith(':operator'));

/**
 * 요구 역할 집합을 실제 판정 집합으로 확장한다.
 *
 * `admin` 은 `super_admin`·`operator`·`platform:*` 을 함께 허용한다(기존 계층 규칙 유지).
 */
export const expandRequiredRoles = (requiredRoles: string[]): string[] => {
  const expanded = [...requiredRoles];
  const push = (role: string) => {
    if (!expanded.includes(role)) expanded.push(role);
  };

  if (requiredRoles.includes('admin') || requiredRoles.includes('platform:admin')) {
    ['super_admin', 'operator', 'platform:admin', 'platform:super_admin'].forEach(push);
  }
  if (requiredRoles.includes('super_admin')) push('platform:super_admin');

  return expanded;
};

/**
 * 역할 하나가 요구 집합을 만족하는지 판정한다.
 *
 * 기존 구현은 `role.endsWith(':admin') || role.endsWith(':operator')` 를 **요구 역할과 무관하게**
 * 무조건 통과시켰다. 그 결과 `requiredRoles={['seller']}` 같은 선언이 무의미해져
 * `kpa:admin` 이 판매자 전용 화면까지 들어갔다.
 *
 * 이제 서비스 접두 역할은 **요구 집합이 관리자급 접근을 요구할 때만** 받아준다.
 * 관리자 화면(`['admin']` 계열 — 선언 대다수)의 통과 대상은 그대로이므로 기존 사용자가 잠기지 않는다.
 */
export const matchesRequiredRole = (role: string, requiredRoles: string[]): boolean => {
  const expanded = expandRequiredRoles(requiredRoles);
  if (expanded.includes(role)) return true;

  const allowsServicePrefixed = expanded.some((required) => ADMIN_LEVEL_ROLES.includes(required));
  return allowsServicePrefixed && isServicePrefixedAdminRole(role);
};

/**
 * user 객체에서 역할 문자열을 모두 뽑는다.
 * `user.role` / `user.activeRole.name` / `user.roles[]`(문자열·객체 혼재) 를 모두 본다.
 */
export const collectUserRoles = (user: unknown): string[] => {
  const u = user as { role?: unknown; activeRole?: { name?: unknown }; roles?: unknown } | null | undefined;
  const roles: string[] = [];

  if (typeof u?.role === 'string') roles.push(u.role);
  if (typeof u?.activeRole?.name === 'string') roles.push(u.activeRole.name);
  if (Array.isArray(u?.roles)) {
    for (const entry of u.roles as unknown[]) {
      if (typeof entry === 'string') roles.push(entry);
      else if (typeof (entry as { name?: unknown })?.name === 'string') {
        roles.push((entry as { name: string }).name);
      }
    }
  }

  return roles;
};

/** 사용자가 요구 역할을 만족하는가. */
export const hasRequiredRoles = (user: unknown, requiredRoles: string[]): boolean =>
  collectUserRoles(user).some((role) => matchesRequiredRole(role, requiredRoles));

/**
 * permission 판정.
 *
 * **백엔드 인증 응답이 `user.permissions` 를 채우지 않는다**(전 저장소 확인, 2026-08-04).
 * 따라서 지금 이 검사를 그대로 강제하면 **모든 사용자가 잠긴다.** permission 공급 체계를 새로 만드는 것은
 * 이 WO 범위 밖이므로, 데이터가 있을 때만 실검사하고 없으면 관리자 역할 게이트로 되돌아간다.
 *
 * - `user.permissions` 가 채워지면 → 선언된 permission 을 **실제로** 요구한다 (기존 선언들이 자동 활성화)
 * - 비어 있으면 → 종전과 동일하게 관리자급 역할 게이트로만 판정한다
 *
 * 이 fallback 은 영구 정책이 아니다. permission 공급은 후속 과제다.
 */
export const hasRequiredPermissions = (user: unknown, requiredPermissions: string[]): boolean => {
  const granted = (user as { permissions?: unknown } | null | undefined)?.permissions;

  if (Array.isArray(granted) && granted.length > 0) {
    return requiredPermissions.every((permission) => granted.includes(permission));
  }

  // permission 데이터 부재 — 관리자 대시보드 역할 게이트로 대체한다.
  return collectUserRoles(user).some(
    (role) => ADMIN_LEVEL_ROLES.includes(role) || isServicePrefixedAdminRole(role),
  );
};
