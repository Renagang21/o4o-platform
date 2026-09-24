/**
 * 계정/권한 **표시** 계약
 *   WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1 §3-2 · §4 · §8
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 필요한가
 *
 *   Google-only 전환 후 Admin Header 가 `user.role` 을 "역할" 로 보여줬다. 그 값의 출처는
 *   backend 의 `roles[0]` 이고, role 조회에 정렬이 없어 **어느 role 이 담길지 보장되지 않았다.**
 *   그래서 `platform:super_admin` 을 포함해 11개 role 을 가진 관리자 화면에
 *   `kpa-branch:operator` 가 찍혔다. 권한 결함은 아니다(인가는 `roles[]` 배열 판정) —
 *   **표시 결함**이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 지키는 규칙
 *
 *   1. **DB/배열 순서로 대표 역할을 만들지 않는다.** 판정은 "보유 여부" 로만 한다.
 *   2. **전역 role 우선순위 표를 만들지 않는다**(§4-1). 서비스마다 role 의미가 달라서
 *      `super_admin > admin > operator` 같은 단일 서열을 강요할 수 없다. 여기서 정하는 것은
 *      **Admin surface 한 곳의 표시 규칙**뿐이다.
 *   3. **인가에 쓰지 않는다.** 인가는 `hasRequiredRoles` · `matchesRequiredRole` ·
 *      backend guard 가 `roles[]` 로 한다. 이 파일의 함수는 문자열만 만든다.
 *   4. `users.email` 은 **인증 키가 아니다.** Google `sub` → `linked_accounts` → `users.id` 가
 *      identity 축이다. 그래서 email 을 "로그인 계정/로그인 이메일" 로 표기하지 않는다.
 */

/** Admin 진입 기준 역할 — backend guard 와 같은 경계(`platform:super_admin`). */
export const ADMIN_SURFACE_ROLE = 'platform:super_admin';

/** 로그인 수단은 하나다(Google). 표시 문자열을 한 곳에서 관리한다. */
export const LOGIN_METHOD_LABEL = 'Google';

/**
 * Admin surface 의 **관리 권한 표시**.
 *
 * `platform:super_admin` 보유 → `'최고 관리자'`.
 * 그 외에는 **대표 역할을 지어내지 않고** `null` 을 돌려준다 — 현재 Admin 진입 경계가
 * `platform:super_admin` 하나이므로 실제로는 도달하지 않는 분기이고, 나중에 다른 역할이
 * Admin 에 들어오게 되면 그때 role catalog 와 backend 인가 정책을 근거로 규칙을 추가한다.
 * "아무 역할이나 하나 보여주기" 로 되돌아가지 않기 위해 의도적으로 null 이다.
 */
export function resolveAdminRoleLabel(roles: readonly string[] | undefined | null): string | null {
  if (!roles || roles.length === 0) return null;
  return roles.includes(ADMIN_SURFACE_ROLE) ? '최고 관리자' : null;
}

/**
 * 계정 표시 블록에 필요한 값 묶음. 의미가 섞이지 않도록 **키 이름에 의미를 박는다.**
 *
 * - `loginMethod`  : 로그인 수단(Google). 계정 주소가 아니다.
 * - `adminRole`    : 관리 권한 표시(없으면 null — 표시하지 않는다).
 * - `profileEmail` : `users.email` = 프로필/연락 이메일. **로그인 ID 가 아니다.**
 */
export interface AccountDisplayInfo {
  loginMethod: string;
  adminRole: string | null;
  profileEmail: string | null;
}

export function buildAccountDisplayInfo(user: unknown): AccountDisplayInfo {
  const u = user as { email?: unknown; roles?: unknown } | null | undefined;
  const roles = Array.isArray(u?.roles)
    ? (u?.roles as unknown[]).filter((r): r is string => typeof r === 'string')
    : [];
  return {
    loginMethod: LOGIN_METHOD_LABEL,
    adminRole: resolveAdminRoleLabel(roles),
    profileEmail: typeof u?.email === 'string' && u.email.length > 0 ? u.email : null,
  };
}
