/**
 * Membership Gate Helper — KPA Society
 *
 * WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1
 *
 * service_memberships canonical 출처 기반 서비스 진입 자격 판정.
 *
 * 정책:
 *   - users 인증 성공 + 해당 service 의 service_memberships 가 'active' 일 때만 서비스 이용 가능
 *   - role_assignments 단독으로는 서비스 이용 가능 판정 금지 (role 만 있고 membership 없으면 차단)
 *   - 'platform:super_admin' 만 예외 (backend membership-guard.middleware.ts 와 정렬)
 */

export const SERVICE_KEY = 'kpa-society' as const;

export type MembershipStatus =
  | 'active'
  | 'pending'
  | 'rejected'
  | 'suspended'
  | 'withdrawn'
  | 'none';

const SUPER_ADMIN_ROLE = 'platform:super_admin';

export interface MembershipLike {
  serviceKey: string;
  status: string;
}

export interface UserLike {
  roles?: string[];
  memberships?: MembershipLike[] | null;
}

/**
 * memberships 배열에서 serviceKey 의 status 를 정규화된 enum 으로 반환.
 * 알 수 없는 status 값은 'none' 으로 fallback (보수적 — 차단 측 안전).
 */
export function getServiceMembershipStatus(
  user: UserLike | null | undefined,
  serviceKey: string = SERVICE_KEY,
): MembershipStatus {
  if (!user) return 'none';
  const ms = user.memberships ?? [];
  const m = ms.find((x) => x?.serviceKey === serviceKey);
  if (!m) return 'none';
  switch (m.status) {
    case 'active':
    case 'pending':
    case 'rejected':
    case 'suspended':
    case 'withdrawn':
      return m.status;
    default:
      return 'none';
  }
}

/**
 * super_admin 예외 판정. backend membership-guard.middleware.ts 의
 * platformBypass 와 동일 기준 (오직 'platform:super_admin' 만).
 *
 * 주의: 'kpa:admin' / 'kpa:operator' 등 service-prefixed role 은
 * bypass 하지 않는다 — WO 정책상 role 만 있고 membership 없으면 이용 불가.
 */
export function isPlatformSuperAdmin(user: UserLike | null | undefined): boolean {
  if (!user?.roles) return false;
  return user.roles.includes(SUPER_ADMIN_ROLE);
}

/**
 * 서비스 진입 허용 여부.
 *   - super_admin → 항상 허용
 *   - membership status === 'active' → 허용
 *   - 그 외 → 차단
 */
export function isServiceAccessAllowed(
  user: UserLike | null | undefined,
  serviceKey: string = SERVICE_KEY,
): boolean {
  if (isPlatformSuperAdmin(user)) return true;
  return getServiceMembershipStatus(user, serviceKey) === 'active';
}
