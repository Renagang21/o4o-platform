/**
 * Pharmacy-Hub 자가 가입 역할 (SSOT)
 *
 * WO-O4O-PHARMACYHUB-PHARMACIST-MEMBER-AND-STORE-OWNER-MODEL-CLOSURE-V1
 * 정본: docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md §4
 *
 * 자가 가입 유형은 둘뿐이다:
 *   member      — 일반 약사 회원. 서비스 회원 자격만 가진다(커뮤니티·교육·콘텐츠).
 *   store_owner — 약국 경영자. 위에 **매장 경영 capability** 가 더해진 유일한 유형이다.
 *
 * 여기에 들어가면 **안 되는** 것:
 *   - supplier — 공급자는 Pharmacy-Hub 회원이 아니다. Neture 공급자 원장이 유일한 축이다
 *     (WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1).
 *   - operator / admin / 강사 / 커뮤니티 운영자 — 자가 신청 경로가 없다. 사후 role grant 뿐이다.
 *   - 약사 "자격" 을 뜻하는 역할 — 자격은 role 이 아니라 profile 축(kpa_pharmacist_profiles)이다
 *     (KPA 선례: 20260326300000-DeactivateQualificationRoles).
 *
 * 소비처는 가입 write-path 2곳뿐이다: 공통 Core(AuthRegisterController) + 래퍼(PharmacyHubJoinController).
 * 목록 사본을 만들지 않는다 — 한쪽만 열려 우회 가입이 생긴 전례가 있다.
 */
export const PHARMACY_HUB_SIGNUP_ROLES = ['member', 'store_owner'] as const;

export type PharmacyHubSignupRole = (typeof PHARMACY_HUB_SIGNUP_ROLES)[number];

/** 사용자에게 보이는 가입 유형 이름 (프론트 ROLE_LABELS 와 같은 어휘) */
export const PHARMACY_HUB_SIGNUP_ROLE_LABEL: Record<PharmacyHubSignupRole, string> = {
  member: '약사 회원',
  store_owner: '약국 경영자',
};

export function isPharmacyHubSignupRole(value: unknown): value is PharmacyHubSignupRole {
  return typeof value === 'string' && (PHARMACY_HUB_SIGNUP_ROLES as readonly string[]).includes(value);
}
