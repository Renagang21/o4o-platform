/**
 * 서브도메인 전체 운영자 화면 가드
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §4 (배포 2 전 경계 보정)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 필요한가
 *
 * API 는 `/suppliers/*` 를 `supplier:admin`, market-trial 운영자를 `funding:operator` 로 나눴다.
 * 그런데 화면은 `AdminRoute` · `OperatorRoute` 아래 있고 두 래퍼는 **Neture 역할 + Neture
 * membership** 을 요구한다. 그래서 `supplier:admin` + supplier membership 만 가진 계정은
 * 허용된 API 를 부를 자격이 있는데도 **화면에 들어갈 수 없다.**
 *
 * `renagang21@gmail.com` 은 Neture 역할도 갖고 있어 실브라우저 시험만으로는 이 결함이 보이지
 * 않는다 — Neture 역할로 통과해 버린다. 그래서 격리 테스트로 먼저 고정한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 판정
 *
 *   ① 그 서비스 범위를 갖췄으면 통과       role ∈ {key:admin, key:operator} AND membership(key)=active
 *   ② 아니면 **기존 Neture 가드에 위임**    (현행 동작 불변 — Neture 운영자는 그대로 통과)
 *
 * ②로 위임하는 이유: 이 화면들은 지금까지 Neture 운영자가 쓰고 있었다. 범위를 더하는 작업이지
 * 기존 접근을 걷어내는 작업이 아니다. 걷어내는 것은 별도 판단이다.
 *
 * **다른 서비스 범위는 통과시키지 않는다** — `funding:admin` 은 공급자 화면에 들어가지 못한다.
 * 개별 커뮤니티 운영자(`community_memberships.role='operator'`)도 서비스 전체 화면과 무관하다:
 * 그것은 개체 역할이며 `role_assignments` 에 없으므로 여기서 애초에 매칭되지 않는다.
 */
import type { ReactElement, ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';

/** 이 가드가 다루는 서브도메인 범위 키 (service_memberships.service_key 와 같은 값) */
export type SubdomainScopeKey = 'supplier' | 'funding' | 'community';

interface Props {
  serviceKey: SubdomainScopeKey;
  /** 범위를 갖추지 못했을 때 위임할 기존 가드 (AdminRoute · OperatorRoute) */
  fallbackGuard: (props: { children: ReactNode }) => ReactElement;
  children: ReactNode;
}

/**
 * 그 서비스의 **전체 운영자**인가.
 *
 * 역할과 membership 을 **함께** 본다 — 역할만 보면 정지·탈퇴된 회원이 역할을 들고 있는 동안
 * 통과하고(백엔드 membership guard 와 어긋난다), membership 만 보면 일반 회원이 운영 화면에 든다.
 */
export function hasSubdomainOperatorScope(
  user: { roles?: string[]; memberships?: { serviceKey: string; status: string }[] } | null | undefined,
  serviceKey: SubdomainScopeKey,
): boolean {
  if (!user) return false;
  const roles = user.roles ?? [];
  const hasRole = roles.includes(`${serviceKey}:admin`) || roles.includes(`${serviceKey}:operator`);
  if (!hasRole) return false;
  return (user.memberships ?? []).some((m) => m.serviceKey === serviceKey && m.status === 'active');
}

export function SubdomainOperatorRoute({ serviceKey, fallbackGuard: FallbackGuard, children }: Props) {
  const { user } = useAuth();

  if (hasSubdomainOperatorScope(user, serviceKey)) {
    return <>{children}</>;
  }

  // 범위가 없으면 기존 판정을 그대로 받는다 — 로딩·미로그인·MembershipGate 처리도 그쪽 계약이다.
  return <FallbackGuard>{children}</FallbackGuard>;
}
