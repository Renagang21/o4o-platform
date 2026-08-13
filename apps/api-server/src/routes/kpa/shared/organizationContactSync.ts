/**
 * WO-O4O-KPA-APPROVAL-ORGANIZATION-CONTACT-WRITE-ALIGNMENT-V1
 *
 * KPA 회원 승인 시 `users.businessInfo` → `organizations` 로 **주소 · 약국 전화**를
 * 옮기는 write 계약. 읽기 키 해석은 직전 WO 의 공통 resolver
 * (`businessInfoRead.resolveKpaBusinessContact`) 를 그대로 재사용한다.
 *
 * 이 모듈이 정하는 것은 "**어떤 값을 쓸지**" 가 아니라 "**써도 되는지**" 이다.
 *
 * 계약:
 *   1. 신규 organization 초기화 — 대상 컬럼이 비어 있으면 resolver 값으로 채운다.
 *   2. 기존 organization 보완 — **유효한 기존 값은 절대 덮어쓰지 않는다.**
 *      운영자가 `PATCH /operator/members/:userId` · 매장 정보 화면에서 직접 고친 값이
 *      승인·재활성화만으로 가입 시점 값으로 되돌아가면 안 된다.
 *   3. 공백(`''` · 공백문자열)은 **값 부재**로 취급한다 — 기존 컬럼이 공백이면 채우고,
 *      resolver 값이 공백이면 쓰지 않는다.
 *   4. 채울 값이 없으면 **임의 값을 만들지 않는다** (빈 문자열·placeholder write 금지).
 *   5. 대표 전화(`businessInfo.phone`)는 **약국 전화가 아니다.** 약국 전화 컬럼에 섞지 않는다.
 *      (기존 구현은 `metadata.pharmacy_phone || biz.phone` 로 두 의미를 합쳤다 — 제거.)
 *
 * 범위 밖: `business_number` · `metadata`(taxInvoiceEmail 등) write 는 기존 동작을 유지한다.
 * 이 모듈은 순수 함수이며 DB 접근·migration·backfill 을 수행하지 않는다.
 */

import { resolveKpaBusinessContact } from './businessInfoRead.js';

/** 값이 실제로 존재하는 문자열일 때만 채택한다 (공백 = 부재). */
function present(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** `organizations` 에서 읽어온 현재 연락처 상태 (컬럼 원문). */
export interface ExistingOrganizationContact {
  address?: unknown;
  /** jsonb — `{ zipCode, baseAddress, detailAddress }` */
  address_detail?: unknown;
  phone?: unknown;
}

/** 구조화 주소 (organizations.address_detail 및 businessInfo.storeAddress 공용 shape). */
export interface OrganizationAddressDetail {
  zipCode?: string;
  baseAddress?: string;
  detailAddress?: string;
}

export interface OrganizationContactSyncPlan {
  /** 채울 값. null = **쓰지 않는다** (기존 값 보존 또는 원천 부재). */
  address: string | null;
  addressDetail: OrganizationAddressDetail | null;
  phone: string | null;
  /** 셋 중 하나라도 쓸 것이 있는가 — false 면 UPDATE 자체를 생략한다. */
  hasChanges: boolean;
}

const EMPTY_PLAN: OrganizationContactSyncPlan = {
  address: null,
  addressDetail: null,
  phone: null,
  hasChanges: false,
};

/**
 * 승인 시점의 `businessInfo` 와 현재 organization 상태로부터 write plan 을 만든다.
 *
 * @param businessInfo `users.businessInfo` 원문
 * @param existing     현재 organization row (신규 생성 직후면 전 컬럼 비어 있음 / 조회 실패면 null)
 */
export function planKpaOrganizationContactSync(
  businessInfo: unknown,
  existing: ExistingOrganizationContact | null,
): OrganizationContactSyncPlan {
  const contact = resolveKpaBusinessContact(businessInfo);

  const existingAddress = present(existing?.address);
  const existingPhone = present(existing?.phone);
  const existingDetailRaw =
    existing?.address_detail && typeof existing.address_detail === 'object'
      ? (existing.address_detail as Record<string, unknown>)
      : null;

  // ── 주소 (scalar) ────────────────────────────────────────────────
  // organizations.address 는 "기본 + 상세" 를 합친 표시용 단일 문자열이다 (기존 계약 유지).
  const composedAddress = [contact.address, contact.address2]
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    .join(' ')
    .trim();
  const address = existingAddress ? null : (composedAddress || null);

  // ── 주소 (구조화) ────────────────────────────────────────────────
  // 키 단위 보완: 기존 유효 값이 있으면 그 키는 건드리지 않는다.
  const resolvedDetail: OrganizationAddressDetail = {};
  const zipCode = present(existingDetailRaw?.zipCode) ? null : contact.zipCode;
  const baseAddress = present(existingDetailRaw?.baseAddress) ? null : contact.address;
  const detailAddress = present(existingDetailRaw?.detailAddress) ? null : contact.address2;
  if (zipCode) resolvedDetail.zipCode = zipCode;
  if (baseAddress) resolvedDetail.baseAddress = baseAddress;
  if (detailAddress) resolvedDetail.detailAddress = detailAddress;
  const addressDetail = Object.keys(resolvedDetail).length > 0 ? resolvedDetail : null;

  // ── 약국 전화 ────────────────────────────────────────────────────
  // 대표 전화(businessInfo.phone) 로의 fallback 은 두지 않는다 (의미가 다르다).
  const phone = existingPhone ? null : contact.pharmacyPhone;

  const plan: OrganizationContactSyncPlan = {
    address,
    addressDetail,
    phone,
    hasChanges: Boolean(address || addressDetail || phone),
  };

  return plan.hasChanges ? plan : { ...EMPTY_PLAN };
}
