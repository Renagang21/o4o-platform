/**
 * 서비스 로그인 자격 — 판정 한 곳
 *
 * WO-O4O-SERVICE-NOT-MEMBER-AUTH-CONTRACT-RESTORATION-V1
 *
 *   **인증 성공과 서비스 이용 자격은 다른 질문이다.**
 *     인증 실패(계정 없음 · 비밀번호 틀림 · Google 거절) → 각 수단의 인증 오류(`INVALID_CREDENTIALS` 등)
 *     인증 성공 + 로그인 자격 게이트 서비스의 membership 없음 → `SERVICE_NOT_MEMBER` (403, 세션 미발급)
 *   자격 판정은 반드시 인증이 끝난 뒤에 한다 — 인증 전에 판정하면 비밀번호를 몰라도 가입 여부가 드러난다.
 *
 *   이메일 · Google 로그인이 같은 함수를 쓴다. handoff 는 IDENTITY-V3 §7.4(target active membership 필수)가
 *   따로 정하며 이 함수의 대상이 아니다.
 *
 *   게이트 서비스는 `service-catalog` 의 `loginMembershipRequired` 한 곳에서만 정한다(서비스별 분기 금지).
 *   - membership row 는 **상태 불문** 통과(옛 로그인 계약과 같다) — 대기 · 반려 사용자도 로그인해 상태를 본다.
 *     이용 가능 여부(active)는 로그인 뒤 서비스 guard 가 판정한다.
 *   - `platform:super_admin` · `super_admin` 은 통과(옛 계약과 같다).
 *   - 가입 · role 을 만들거나 다른 서비스 membership 으로 대신 인정하지 않는다.
 */
import { resolveCanonicalServiceKey } from '@o4o/security-core';
import { O4O_SERVICES } from '../../config/service-catalog.js';

export const SERVICE_NOT_MEMBER_CODE = 'SERVICE_NOT_MEMBER';
export const SERVICE_NOT_MEMBER_MESSAGE =
  '이 계정은 이 서비스에 가입되어 있지 않습니다. 가입 또는 이용 신청 후 로그인할 수 있습니다.';

const PLATFORM_ADMIN_BYPASS_ROLES: readonly string[] = ['platform:super_admin', 'super_admin'];

/**
 * 요청 origin → 로그인 자격을 요구하는 서비스 키. 요구하지 않으면 `null`.
 *
 * 호스트가 다른 서비스의 `domain` · `legacyDomains` 와도 겹치면 어느 서비스 로그인인지 origin 만으로
 * 단정할 수 없으므로 판정하지 않는다(예: kpa-society.co.kr 은 kpa-branch `/kpa` 의 호스트이기도 하다).
 */
export function resolveLoginMembershipGateKey(origin: string | undefined | null): string | null {
  if (!origin) return null;
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
  const owners = O4O_SERVICES.filter(
    (svc) =>
      svc.domain.toLowerCase() === host ||
      (svc.legacyDomains ?? []).some((legacy) => legacy.toLowerCase() === host),
  );
  if (owners.length !== 1) return null;
  return owners[0].loginMembershipRequired ? owners[0].key : null;
}

/**
 * 인증된 사용자가 게이트 서비스에 로그인해도 되는가.
 *
 * @param gateKey     `resolveLoginMembershipGateKey` 결과. `null` 이면 항상 허용.
 * @param roles       세션 발급 시 DB 에서 읽은 역할
 * @param memberships 세션 발급 시 DB 에서 읽은 전체 membership(상태 불문)
 */
export function isServiceLoginAllowed(
  gateKey: string | null | undefined,
  roles: readonly string[] | null | undefined,
  memberships: readonly { serviceKey: string }[] | null | undefined,
): boolean {
  if (!gateKey) return true;
  if ((roles ?? []).some((r) => PLATFORM_ADMIN_BYPASS_ROLES.includes(r))) return true;
  const key = resolveCanonicalServiceKey(gateKey);
  return (memberships ?? []).some((m) => resolveCanonicalServiceKey(m.serviceKey) === key);
}
