/**
 * Membership Gate Helper — GlycoPharm
 *
 * WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1
 *
 * service_memberships canonical 출처 기반 서비스 진입 자격 판정.
 *   - users 인증 성공 + service_memberships(glycopharm).status === 'active' 일 때만 이용 가능
 *   - role_assignments 단독으로는 이용 가능 판정 금지
 *   - 'platform:super_admin' 만 예외
 */

export const SERVICE_KEY = 'glycopharm' as const;

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

export function isPlatformSuperAdmin(user: UserLike | null | undefined): boolean {
  if (!user?.roles) return false;
  return user.roles.includes(SUPER_ADMIN_ROLE);
}

export function isServiceAccessAllowed(
  user: UserLike | null | undefined,
  serviceKey: string = SERVICE_KEY,
): boolean {
  if (isPlatformSuperAdmin(user)) return true;
  return getServiceMembershipStatus(user, serviceKey) === 'active';
}
