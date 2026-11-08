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

/**
 * 대표자명 · 업태 · 종목의 정본은 Organization(`organizations.metadata.businessProfile`)이다.
 *
 * WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T9 (= WO-O4O-SUPPLIER-IDENTITY-...-CANONICALIZATION-V1 §L 실행):
 *   expand 단계 — 정본 값이 있으면 정본을, 없으면 옛 위치(`neture_suppliers` 컬럼)를 읽는다.
 *   쓰기는 정본과 옛 컬럼 양쪽에 한다. 옛 컬럼 삭제(contract)는 별도 WO 다.
 *   org 키 이름은 약국 분기와 같다: representativeName · businessType · businessCategory.
 */
export interface SupplierIdentityColumns {
  representativeName?: string | null;
  businessType?: string | null;
  businessItem?: string | null;
}

export interface SupplierIdentity {
  representativeName: string | null;
  businessType: string | null;
  businessItem: string | null;
}

function pick(canonical: unknown, legacy: string | null | undefined): string | null {
  if (typeof canonical === 'string' && canonical.trim()) return canonical;
  return legacy?.trim() ? legacy : null;
}

export function supplierIdentityOf(
  supplier: SupplierIdentityColumns,
  orgBusinessProfile?: Record<string, unknown> | null,
): SupplierIdentity {
  const p = orgBusinessProfile ?? {};
  return {
    representativeName: pick(p.representativeName, supplier.representativeName),
    businessType: pick(p.businessType, supplier.businessType),
    businessItem: pick(p.businessCategory, supplier.businessItem),
  };
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
