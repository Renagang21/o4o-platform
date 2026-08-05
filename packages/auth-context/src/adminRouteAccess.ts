/**
 * AdminProtectedRoute 접근 판정 로직 (순수 함수).
 *
 * **WO-O4O-ADMIN-PROTECTED-ROUTE-ROLE-PERMISSION-SEMANTICS-V1**
 *
 * React·react-router 의존이 없는 별도 모듈로 둔다. 접근 판정은 보안 경계이므로
 * 컴포넌트를 렌더링하지 않고 단위 테스트로 고정할 수 있어야 한다.
 */

/** 관리자급으로 취급하는 역할 전체. */
export const ADMIN_LEVEL_ROLES: readonly string[] = [
  'admin',
  'administrator',
  'super_admin',
  'operator',
  'platform:super_admin',
];

/**
 * 서비스 접두 역할(`kpa:admin`, `neture:operator` 등)을 받아줄 수 있는 요구 역할.
 *
 * **WO-O4O-ADMIN-MENU-ROUTE-BACKEND-ACCESS-ALIGNMENT-V1**
 *
 * `ADMIN_LEVEL_ROLES` 에서 `platform:*` 을 뺀 집합이다.
 * `platform:super_admin` 은 **플랫폼 전역 관리자로 좁히려는** 선언이므로,
 * 여기에 서비스 단위 관리자(`kpa:admin`)를 끼워 넣으면 선언의 의미가 사라진다.
 * 실제로 백엔드도 이 화면들에서 서비스 역할을 403 으로 거부한다
 * (`bootstrap/membership-admin-guard.ts:30-34` — 플랫폼 전역 데이터라 서비스 경계가 없다).
 *
 * `admin` 을 포함하는 기존 선언은 여전히 서비스 접두 역할을 받아주므로 잠기는 사용자는 없다.
 */
const SERVICE_PREFIX_ACCEPTING_ROLES: readonly string[] = [
  'admin',
  'administrator',
  'super_admin',
  'operator',
];

/** `kpa:admin`, `neture:operator` 같은 서비스 접두 관리자급 역할인가. */
export const isServicePrefixedAdminRole = (role: string): boolean =>
  role.includes(':') && (role.endsWith(':admin') || role.endsWith(':operator'));

/**
 * 요구 역할 집합을 실제 판정 집합으로 확장한다.
 *
 * `admin` 은 `super_admin`·`operator`·`platform:*` 을 함께 허용한다(기존 계층 규칙 유지).
 *
 * **WO-O4O-ADMIN-MENU-ROUTE-BACKEND-ACCESS-ALIGNMENT-V1 — platform 역할은 확장 트리거가 아니다**
 *
 * platform 역할은 플랫폼 전역 관리자로 **좁히려는** 선언이므로, 그것이 들어 있다는 이유로
 * 더 넓은 legacy 역할(`super_admin`·`operator`)을 도로 열어서는 안 된다. 그래야 백엔드가
 * `['platform:super_admin']` 로 제한한 화면(회원·사용자 관리)의 프런트 경계를 백엔드와 맞출 수 있다.
 * 확장 트리거는 legacy `admin`·`super_admin` 쪽에만 둔다.
 *
 * **WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1**
 *
 * 확장 결과 집합에서 legacy `platform:admin` 을 제거했다(보유자 0 · 독립 권한 0).
 * 플랫폼 전역 관리자는 `platform:super_admin` 뿐이므로 판정 결과는 바뀌지 않는다.
 */
export const expandRequiredRoles = (requiredRoles: string[]): string[] => {
  const expanded = [...requiredRoles];
  const push = (role: string) => {
    if (!expanded.includes(role)) expanded.push(role);
  };

  if (requiredRoles.includes('admin')) {
    ['super_admin', 'operator', 'platform:super_admin'].forEach(push);
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

  const allowsServicePrefixed = expanded.some((required) =>
    SERVICE_PREFIX_ACCEPTING_ROLES.includes(required),
  );
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
