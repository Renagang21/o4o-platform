/**
 * 공급자 프로필 · 정산 준비 상태 판정 — 순수 함수 (DB · 저장소 의존 없음).
 *
 * WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T4 · T5:
 *   같은 판정을 profile 응답(`missingProfileFields`)과 onboarding 응답(`missingSettlementFields`)이
 *   함께 쓰도록 한 곳에 둔다. 화면의 "미입력 필수 항목" 체크리스트가 서버 판정을 그대로 보여 준다.
 *   판정 규칙은 기존 `getMissingProfileFields` · `getMissingSettlementFields` 와 동일하다(동작 불변).
 */

export interface SupplierReadinessSource {
  representativeName?: string | null;
  managerName?: string | null;
  managerPhone?: string | null;
  settlementBankName?: string | null;
  settlementAccountNumber?: string | null;
  settlementAccountHolder?: string | null;
  taxInvoiceEmail?: string | null;
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 승인 후 보완 안내(정보성) — 승인 게이트가 아니다. */
export function missingProfileFieldsOf(supplier: SupplierReadinessSource): string[] {
  const missing: string[] = [];
  if (!supplier.representativeName?.trim()) missing.push('representativeName');
  if (!supplier.managerName?.trim()) missing.push('managerName');
  if (!supplier.managerPhone?.trim()) missing.push('managerPhone');
  return missing;
}

/** 실제 정산에 필요한 계좌 · 세금계산서 이메일. 증빙 파일은 선택. */
export function missingSettlementFieldsOf(supplier: SupplierReadinessSource): string[] {
  const missing: string[] = [];
  if (!supplier.settlementBankName?.trim()) missing.push('settlementBankName');
  if (!supplier.settlementAccountNumber?.trim()) missing.push('settlementAccountNumber');
  if (!supplier.settlementAccountHolder?.trim()) missing.push('settlementAccountHolder');
  if (!supplier.taxInvoiceEmail?.trim()) {
    missing.push('taxInvoiceEmail');
  } else if (!EMAIL_SHAPE.test(supplier.taxInvoiceEmail)) {
    missing.push('validTaxInvoiceEmail');
  }
  return missing;
}

/**
 * 공개 연락 전화번호 쓰기 값. 같은 입력을 `neture_suppliers.contact_phone` 과 `organizations.phone`
 * 두 곳에 쓰므로 정규화를 한 번만 한다. 빈 입력이면 supplier 는 '' , organization 은 null (기존 동작).
 */
export function contactPhoneWrite(value: string | null | undefined): { supplier: string; organization: string | null } {
  if (!value) return { supplier: '', organization: null };
  const digits = value.replace(/\D/g, '');
  return { supplier: digits, organization: digits };
}
