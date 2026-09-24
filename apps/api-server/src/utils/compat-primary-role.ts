/**
 * compatibility scalar(`role`) 계산 — **결정적**이고 의미 없는 대표값
 *   WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1 §3-2 · §7-B
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 값의 성격
 *
 *   JWT `role` claim 과 `/auth/me` 의 `user.role` 은 **compatibility 필드**다.
 *   인가는 `roles[]` 배열 전체로 한다(census 결과 이 스칼라를 보는 권한 판정 코드 0).
 *   과거에는 `roles[0]` 이었고 role 조회에 정렬이 없어 **요청마다 값이 달라질 수 있었다** —
 *   로그와 화면이 흔들렸다(11개 role 보유자에게 임의의 1개가 찍힘).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 `sort()` 가 아닌가
 *
 *   비교 함수 없는 `Array.prototype.sort()` 는 UTF-16 코드 단위로 정렬하며, 의도를
 *   코드로 드러내지 않는다(SonarQube reliability 규칙도 이를 지적한다).
 *   `localeCompare` 는 **로케일에 의존**하므로 "결정적" 이라는 이 함수의 목적과 상충한다.
 *   그래서 정렬을 쓰지 않고 **코드 단위 비교의 최소값**을 직접 고른다 — 로케일·정렬 구현과
 *   무관하게 같은 입력에서 항상 같은 출력이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 주의
 *
 *   반환값은 "대표 역할" 이 **아니다.** 서비스마다 role 의미가 달라 전역 서열을 만들지 않는다
 *   (§4-1). 사용자에게 보여줄 권한 표시는 **보유 여부**로 정한다
 *   (`@o4o/auth-context` 의 `resolveAdminRoleLabel`).
 */
export const COMPAT_ROLE_FALLBACK = 'user';

export function compatPrimaryRole(roles: readonly string[] | undefined | null): string {
  if (!roles || roles.length === 0) return COMPAT_ROLE_FALLBACK;
  let min = roles[0];
  for (const role of roles) {
    if (role < min) min = role;
  }
  return min || COMPAT_ROLE_FALLBACK;
}
