/**
 * 세미프랜차이즈 서비스 이용 자격 — 직접 로그인 · handoff 공용
 *
 * WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1 / DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §17
 *
 * 카탈로그 `semiFranchiseAccessKey` 를 가진 서비스(현재 kpa-society = pharmacy.neture.co.kr → 'pharmacy')는
 * 그 서비스 membership 이 없어도 **내 매장(약국) 신청 active ∧ 그 세미프랜차이즈 가입 active** 인 약국 조직의
 * owner/admin/manager 이면 이용 자격이 있다(약국 조직 하나라도 두 조건을 함께 만족해야 한다).
 *
 *   - service_memberships · role 을 만들지 않는다(읽기만).
 *   - 다른 서비스 가입(기존 kpa-society 가입)을 Neture 자격으로 재해석하지 않는다 — 이 함수는 Neture 원장만 본다.
 *   - 거절 시 안내용 상태(`next`)를 함께 돌려준다 — 이미 인증을 마친 본인에게만 내려가는 값이다.
 */
import { PHARMACY_STORE_MEMBER_ROLES } from '../constants.js';

type Exec = { query: (sql: string, params?: unknown[]) => Promise<any[]> };

/** 거절 사유 = 다음에 할 일. 화면은 이 값으로 안내 문구와 신청 링크를 고른다. */
export type SemiFranchiseAccessNext =
  | 'apply_pharmacy' // 내 매장(약국) 신청 없음 · 반려 · 종료 → 약국 가입 신청
  | 'pharmacy_pending' // 내 매장(약국) 신청 승인 대기
  | 'pharmacy_suspended' // 내 매장(약국) 신청 정지
  | 'apply_semi_franchise' // 내 매장(약국) active, 세미프랜차이즈 가입 없음 · 반려 · 종료 → 가입 신청
  | 'semi_franchise_pending' // 세미프랜차이즈 가입 승인 대기
  | 'semi_franchise_suspended'; // 세미프랜차이즈 가입 정지

export interface SemiFranchiseServiceAccess {
  semiFranchiseKey: string;
  allowed: boolean;
  /** 안내 기준 약국 조직(가장 진행된 조직)의 내 매장(약국) 신청 상태. 없으면 null */
  pharmacyMembershipStatus: string | null;
  /** 같은 조직의 세미프랜차이즈 가입 상태. 없으면 null */
  semiFranchiseMembershipStatus: string | null;
  /** allowed=false 일 때만 */
  next: SemiFranchiseAccessNext | null;
}

/** 클라이언트에 내려가는 안정 필드(서버가 선별한 값만). */
export type SemiFranchiseAccessDetails = Omit<SemiFranchiseServiceAccess, 'allowed'>;

const STATUS_RANK: Record<string, number> = { active: 0, pending: 1, suspended: 2, rejected: 3, terminated: 4 };
const rank = (s: string | null) => (s === null ? 9 : STATUS_RANK[s] ?? 8);

export const SEMI_FRANCHISE_ACCESS_MESSAGES: Record<SemiFranchiseAccessNext, string> = {
  apply_pharmacy: '약국 서비스는 내 매장(약국) 신청 승인과 pharmacy 세미프랜차이즈 가입 승인 후 이용할 수 있습니다. 내 매장(약국) 신청을 먼저 해 주세요.',
  pharmacy_pending: '내 매장(약국) 신청 승인을 기다리고 있습니다. 승인 후 pharmacy 세미프랜차이즈 가입을 신청할 수 있습니다.',
  pharmacy_suspended: '내 매장(약국) 이용이 정지된 상태입니다. 운영자에게 문의해 주세요.',
  apply_semi_franchise: 'pharmacy 세미프랜차이즈 가입 승인 후 이용할 수 있습니다. 세미프랜차이즈 가입을 신청해 주세요.',
  semi_franchise_pending: 'pharmacy 세미프랜차이즈 가입 승인을 기다리고 있습니다.',
  semi_franchise_suspended: 'pharmacy 세미프랜차이즈 가입이 정지된 상태입니다. 운영자에게 문의해 주세요.',
};

export function nextForStatuses(basic: string | null, semi: string | null): SemiFranchiseAccessNext | null {
  if (basic === 'pending') return 'pharmacy_pending';
  if (basic === 'suspended') return 'pharmacy_suspended';
  if (basic !== 'active') return 'apply_pharmacy';
  if (semi === 'active') return null;
  if (semi === 'pending') return 'semi_franchise_pending';
  if (semi === 'suspended') return 'semi_franchise_suspended';
  return 'apply_semi_franchise';
}

/**
 * 조직별 (기본, 세미프랜차이즈) 상태 → 자격 · 안내 기준 조직 선택.
 * 자격 = 두 상태가 함께 active 인 조직이 하나라도 있음. 안내는 기본 → 세미프랜차이즈 순으로 가장 진행된 조직 기준.
 */
export function decideSemiFranchiseAccess(
  semiFranchiseKey: string,
  rows: readonly { basic: string | null; semi: string | null }[],
): SemiFranchiseServiceAccess {
  if (rows.some((r) => r.basic === 'active' && r.semi === 'active')) {
    return { semiFranchiseKey, allowed: true, pharmacyMembershipStatus: 'active', semiFranchiseMembershipStatus: 'active', next: null };
  }
  const best = [...rows].sort((a, b) => rank(a.basic) - rank(b.basic) || rank(a.semi) - rank(b.semi))[0];
  const basic = best?.basic ?? null;
  const semi = basic === 'active' ? best?.semi ?? null : null;
  return {
    semiFranchiseKey,
    allowed: false,
    pharmacyMembershipStatus: basic,
    semiFranchiseMembershipStatus: semi,
    next: nextForStatuses(basic, semi),
  };
}

export async function resolveSemiFranchiseServiceAccess(
  exec: Exec,
  userId: string,
  semiFranchiseKey: string,
): Promise<SemiFranchiseServiceAccess> {
  const rows = await exec.query(
    `SELECT npm.status AS basic, sfm.status AS semi
       FROM organization_members om
       JOIN neture_pharmacy_memberships npm ON npm.organization_id = om.organization_id
       LEFT JOIN semi_franchises sf ON sf.key = $2 AND sf.status = 'active'
       LEFT JOIN semi_franchise_memberships sfm
         ON sfm.organization_id = om.organization_id AND sfm.semi_franchise_id = sf.id
      WHERE om.user_id = $1 AND om.role = ANY($3::text[]) AND om.left_at IS NULL
        AND EXISTS (SELECT 1 FROM users u WHERE u.id = $1 AND u."isEmailVerified" = true AND u."isActive" = true AND u.status IN ('active','approved'))
        AND NOT EXISTS (SELECT 1 FROM service_memberships main WHERE main.user_id = $1 AND main.service_key = 'neture' AND main.status IN ('suspended','withdrawn'))`,
    [userId, semiFranchiseKey, [...PHARMACY_STORE_MEMBER_ROLES]],
  );
  return decideSemiFranchiseAccess(semiFranchiseKey, rows);
}

export function toAccessDetails(access: SemiFranchiseServiceAccess): SemiFranchiseAccessDetails {
  const { allowed: _allowed, ...details } = access;
  return details;
}
