/**
 * 세미프랜차이즈 이용 자격 안내 — pharmacy.neture.co.kr(kpa-society) 화면용
 *
 * WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1
 *
 * 이 호스트는 kpa-society membership 이 없어도 **Neture 약국 기본 가입 active ∧ pharmacy 세미프랜차이즈
 * 가입 active** 이면 이용할 수 있다. 판정은 서버가 한다(로그인 · handoff · 아래 조회 API 가 같은 판정).
 * 이 파일은 서버가 돌려준 `next` 를 안내 링크로 바꾸는 매핑과 조회만 갖는다 — 상태를 직접 판정하지 않는다.
 *
 * 가입 · 신청 화면은 내 매장(store.neture.co.kr, web-store) 에 있다 — 서비스 간 링크라 절대 URL 이다.
 */

export interface SemiFranchiseServiceAccess {
  semiFranchiseKey: string | null;
  allowed: boolean;
  pharmacyMembershipStatus: string | null;
  semiFranchiseMembershipStatus: string | null;
  next: string | null;
  message: string | null;
}

export interface SemiFranchiseAccessLink {
  label: string;
  href: string;
}

const STORE_ORIGIN = 'https://store.neture.co.kr';

/** next → 다음 할 일 링크. 정지는 신청으로 풀리지 않으므로 링크 없이 문구(운영자 문의)만 보인다. */
const ACCESS_LINKS: Record<string, SemiFranchiseAccessLink> = {
  apply_pharmacy: { label: 'Neture 약국 가입 신청', href: `${STORE_ORIGIN}/start-pharmacy` },
  pharmacy_pending: { label: '약국 가입 상태 확인', href: `${STORE_ORIGIN}/start-pharmacy` },
  apply_semi_franchise: { label: '세미프랜차이즈 가입 신청', href: `${STORE_ORIGIN}/store/pharmacy/semi-franchises` },
  semi_franchise_pending: { label: '세미프랜차이즈 가입 상태 확인', href: `${STORE_ORIGIN}/store/pharmacy/semi-franchises` },
};

export function semiFranchiseAccessLink(next: string | null | undefined): SemiFranchiseAccessLink | null {
  return (next && ACCESS_LINKS[next]) || null;
}

/** `authClient.api` (baseURL = /api/v1) */
type GetApi = { get: (url: string) => Promise<{ data?: unknown }> };

/** 본인 자격 조회. 실패 · 형식 불일치는 null(= 기존 membership 판정만 적용 — 차단 쪽으로 닫힌다). */
export async function fetchSemiFranchiseServiceAccess(
  api: GetApi,
  serviceKey: string,
): Promise<SemiFranchiseServiceAccess | null> {
  try {
    const res = await api.get(`/neture/pharmacy/service-access/${encodeURIComponent(serviceKey)}`);
    const data = (res?.data as { data?: unknown } | undefined)?.data as Partial<SemiFranchiseServiceAccess> | undefined;
    if (!data || typeof data.allowed !== 'boolean') return null;
    return {
      semiFranchiseKey: typeof data.semiFranchiseKey === 'string' ? data.semiFranchiseKey : null,
      allowed: data.allowed,
      pharmacyMembershipStatus: data.pharmacyMembershipStatus ?? null,
      semiFranchiseMembershipStatus: data.semiFranchiseMembershipStatus ?? null,
      next: typeof data.next === 'string' ? data.next : null,
      message: typeof data.message === 'string' ? data.message : null,
    };
  } catch {
    return null;
  }
}
