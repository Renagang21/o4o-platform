/**
 * 비밀번호 세션의 관리자 경계 — 판정 한 곳
 *
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-4 · §5-3 (사용자 확정 2026-09-29)
 *
 *   Admin · `platform:*` 진입은 **Google 전용을 유지**한다. 이메일·비밀번호는 서비스 회원용이다.
 *   이것은 화면 숨김이 아니라 **서버 판정**이다. 세 지점이 같은 함수를 쓴다:
 *
 *     로그인    `email-auth.service` — 관리자 화면 origin 이거나 `platform:*` 역할 보유자면 발급 거절
 *     갱신      `auth-token-session.service.refreshTokens` — 발급 뒤 역할이 붙었으면 회전 거절
 *     요청      `authentication.middleware` — 비밀번호 세션이 `platform:*` 역할을 가진 계정이면 거절
 *               (역할은 JWT 가 아니라 DB `role_assignments` 에서 다시 읽는다 — 발급 뒤 부여를 잡는다)
 *
 *   "비밀번호 세션" = 토큰 claim `authMethod: 'password'`. Google 세션에는 claim 이 없다.
 */
import { ADMIN_SURFACE_KEY } from '../../utils/session-origin.js';

export const PASSWORD_SESSION_NOT_ALLOWED_CODE = 'PASSWORD_SESSION_NOT_ALLOWED';
export const PASSWORD_SESSION_NOT_ALLOWED_MESSAGE =
  '관리자 계정은 Google 로그인만 사용할 수 있습니다. Google 로 다시 로그인해 주세요.';

/** 플랫폼 역할(`platform:super_admin` · `platform:admin` · `platform:operator` …) 판정 */
export function hasPlatformRole(roles: readonly string[] | null | undefined): boolean {
  return (roles ?? []).some((r) => typeof r === 'string' && r.startsWith('platform:'));
}

/**
 * 비밀번호 세션을 **발급·유지해도 되는가**.
 *
 * @param sessionServiceKey 세션 귀속 키(origin 파생). 관리자 화면(`admin`)이면 거절.
 * @param roles             DB 에서 읽은 현재 역할
 */
export function isPasswordSessionAllowed(
  sessionServiceKey: string | null | undefined,
  roles: readonly string[] | null | undefined,
): boolean {
  if (sessionServiceKey === ADMIN_SURFACE_KEY) return false;
  return !hasPlatformRole(roles);
}
