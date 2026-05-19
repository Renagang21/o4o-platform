/**
 * Membership Gate — Shared Helper
 * (buildPlatformUser import 없음 — 순환 방지)
 *
 * WO-O4O-MEMBERSHIPGATE-SHARED-INSTANCE-V1
 *
 * 4개 서비스(KPA / Neture / GlycoPharm / K-Cosmetics) 공통 runtime gating 로직.
 *
 * 정책:
 *   - users 인증 성공 + service_memberships.status === 'active' 일 때만 서비스 이용 가능
 *   - role_assignments 단독으로는 서비스 이용 가능 판정 금지
 *   - 'platform:super_admin' 만 예외 (backend membership-guard.middleware.ts 와 정렬)
 *
 * 사용법:
 *   서비스별 lib/membershipGate.ts 에서 이 파일을 re-export 하고
 *   SERVICE_KEY 상수를 서비스별로 선언한다.
 *
 * 미포함:
 *   - SERVICE_KEY 상수 (서비스별 선언)
 *   - React 컴포넌트 (서비스별 UI 차이 유지)
 *   - redirect/onboarding CTA (서비스별 정책 유지)
 */

import type { ApiUser } from './types.js';

// ─── Canonical Membership Status ───────────────────────────────────────────

/**
 * service_memberships.status 의 canonical enum.
 *
 * 'none': membership row 없음 또는 알 수 없는 status (보수적 fallback — 차단 측 안전).
 * 'inactive': legacy 값. 이 enum 에 포함하지 않으며 switch default 에서 'none' 으로 처리.
 */
export type MembershipStatus =
  | 'active'
  | 'pending'
  | 'rejected'
  | 'suspended'
  | 'withdrawn'
  | 'none';

// ─── Structural Interfaces ──────────────────────────────────────────────────

/** service_memberships row 의 최소 구조 */
export interface MembershipLike {
  serviceKey: string;
  status: string;
}

/** 멤버십 체크에 필요한 user 최소 구조 */
export interface UserLike {
  roles?: string[];
  memberships?: MembershipLike[] | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SUPER_ADMIN_ROLE = 'platform:super_admin' as const;

// ─── Pure Helper Functions ───────────────────────────────────────────────────

/**
 * memberships 배열에서 serviceKey 의 status 를 정규화된 enum 으로 반환.
 *
 * - row 없음 → 'none'
 * - 알 수 없는 status (legacy 'inactive' 포함) → 'none' (보수적 차단)
 *
 * @param user   - 인증된 사용자 객체 (또는 null/undefined)
 * @param serviceKey - 대상 서비스 키 (e.g., 'kpa-society', 'neture', 'glycopharm', 'k-cosmetics')
 */
export function getServiceMembershipStatus(
  user: UserLike | null | undefined,
  serviceKey: string,
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
      // legacy 'inactive' 및 알 수 없는 값 → 'none' 으로 fallback (차단 측 안전)
      return 'none';
  }
}

/**
 * normalizeMemberships — API 응답 user 객체에서 memberships 배열 정규화
 *
 * WO-O4O-AUTH-STATUS-RUNTIME-CANONICALIZATION-V1:
 *   `(apiUser as any).memberships || []` 패턴을 타입-안전하게 대체.
 *   Array 검증 포함 — 비배열·null·undefined 모두 [] 반환.
 *
 * @param apiUser - `memberships` 필드를 포함할 수 있는 API user 객체
 */
export function normalizeMemberships(apiUser: ApiUser): MembershipLike[] {
  const raw = apiUser.memberships;
  if (Array.isArray(raw)) return raw as MembershipLike[];
  return [];
}

/**
 * platform:super_admin 예외 판정.
 *
 * backend membership-guard.middleware.ts 의 platformBypass 와 동일 기준.
 * 오직 'platform:super_admin' 만 예외. 서비스 prefixed admin 은 해당 없음.
 *
 * 주의: KPA SCOPE_CONFIG 는 platformBypass: false 이지만,
 *       frontend MembershipGate 는 동일하게 platform:super_admin 을 bypass 처리한다.
 *       백엔드와 프론트엔드 일관성을 위해 공통 함수로 통일.
 */
export function isPlatformSuperAdmin(user: UserLike | null | undefined): boolean {
  if (!user?.roles) return false;
  return user.roles.includes(SUPER_ADMIN_ROLE);
}

/**
 * 서비스 진입 허용 여부 (runtime gate 최종 판정).
 *
 * - platform:super_admin → 항상 허용
 * - membership status === 'active' → 허용
 * - 그 외 → 차단
 *
 * @param user      - 인증된 사용자 객체
 * @param serviceKey - 대상 서비스 키
 */
export function isServiceAccessAllowed(
  user: UserLike | null | undefined,
  serviceKey: string,
): boolean {
  if (isPlatformSuperAdmin(user)) return true;
  return getServiceMembershipStatus(user, serviceKey) === 'active';
}
