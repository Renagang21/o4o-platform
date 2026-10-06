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
 *
 *   WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1: 카탈로그 `semiFranchiseAccessKey` 가 있는 게이트 서비스는
 *   위 판정에 더해 **Neture 기본 가입 active ∧ 그 세미프랜차이즈 가입 active** 도 통과시킨다
 *   (`evaluateServiceLoginAccess`). handoff 도 같은 세미프랜차이즈 판정을 쓴다.
 */
import { resolveCanonicalServiceKey } from '@o4o/security-core';
import { O4O_SERVICES } from '../../config/service-catalog.js';
import {
  resolveSemiFranchiseServiceAccess,
  SEMI_FRANCHISE_ACCESS_MESSAGES,
  toAccessDetails,
  type SemiFranchiseAccessDetails,
  type SemiFranchiseServiceAccess,
} from '../../modules/neture-pharmacy/services/semi-franchise-service-access.js';

/** (userId, 세미프랜차이즈 key) → 자격. 기본 구현은 `resolveSemiFranchiseServiceAccess(AppDataSource, …)`. */
export type SemiFranchiseAccessResolver = (userId: string, semiFranchiseKey: string) => Promise<SemiFranchiseServiceAccess>;

/** 기본 resolver — DB 연결은 실제 사용 시점에만 불러온다(정책 단위 테스트 격리). */
export const defaultSemiFranchiseAccessResolver: SemiFranchiseAccessResolver = async (userId, semiFranchiseKey) => {
  const { AppDataSource } = await import('../../database/connection.js');
  return resolveSemiFranchiseServiceAccess(AppDataSource, userId, semiFranchiseKey);
};

/** 세미프랜차이즈 자격 거절의 응답 문구. 대상이 아니면 기존 `SERVICE_NOT_MEMBER_MESSAGE`. */
export function serviceNotMemberMessage(serviceAccess?: SemiFranchiseAccessDetails): string {
  return (serviceAccess?.next && SEMI_FRANCHISE_ACCESS_MESSAGES[serviceAccess.next]) || SERVICE_NOT_MEMBER_MESSAGE;
}

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
  // `www.` 별칭은 같은 호스트로 본다(representative-entry 와 같은 규칙) — 별칭으로 게이트를 우회하지 못한다.
  const bare = host.startsWith('www.') ? host.slice(4) : host;
  const owners = O4O_SERVICES.filter((svc) =>
    [svc.domain, ...(svc.legacyDomains ?? [])].some((d) => d.toLowerCase() === bare),
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

/** 게이트 서비스의 Neture 세미프랜차이즈 이용 자격 key. 없으면 `null`. */
export function semiFranchiseAccessKeyFor(serviceKey: string | null | undefined): string | null {
  if (!serviceKey) return null;
  const key = resolveCanonicalServiceKey(serviceKey);
  return O4O_SERVICES.find((svc) => svc.key === key)?.semiFranchiseAccessKey ?? null;
}

export interface ServiceLoginAccess {
  allowed: boolean;
  /** 거절이고 세미프랜차이즈 자격 대상일 때만 — 응답 `serviceAccess` 로 내려간다(인증을 마친 본인에게만). */
  serviceAccess?: SemiFranchiseAccessDetails;
}

/**
 * 로그인 자격 전체 판정 — `isServiceLoginAllowed` 가 거절한 경우에만 세미프랜차이즈 자격을 DB 에서 확인한다.
 * 인증이 끝난 뒤에만 호출한다(파일 머리말).
 */
export async function evaluateServiceLoginAccess(
  resolveAccess: SemiFranchiseAccessResolver,
  userId: string,
  gateKey: string | null | undefined,
  roles: readonly string[] | null | undefined,
  memberships: readonly { serviceKey: string }[] | null | undefined,
): Promise<ServiceLoginAccess> {
  if (isServiceLoginAllowed(gateKey, roles, memberships)) return { allowed: true };
  const sfKey = semiFranchiseAccessKeyFor(gateKey);
  if (!sfKey) return { allowed: false };
  const access = await resolveAccess(userId, sfKey);
  return access.allowed ? { allowed: true } : { allowed: false, serviceAccess: toAccessDetails(access) };
}
