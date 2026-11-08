import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * 저장된 정보 기준 "아직 입력하지 않은 필수 항목" (WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T4).
 * 판정은 서버가 한다 — profile 의 `missingProfileFields`, onboarding 의 `missingSettlementFields`.
 * 화면은 그 결과를 묶음 위치와 함께 보여 주기만 한다(규칙을 복제하지 않는다).
 */
export const SUPPLIER_PROFILE_GROUP_ANCHORS = {
  business: 'supplier-group-business',
  contact: 'supplier-group-contact',
  settlement: 'supplier-group-settlement',
  sales: 'supplier-group-sales',
} as const;

type GroupKey = keyof typeof SUPPLIER_PROFILE_GROUP_ANCHORS;

const FIELD_LABELS: Record<string, { label: string; group: GroupKey; purpose: string }> = {
  representativeName: { label: '대표자명', group: 'business', purpose: '공급자 정보' },
  managerName: { label: '담당자명', group: 'contact', purpose: '공급자 정보' },
  managerPhone: { label: '담당자 전화번호', group: 'contact', purpose: '공급자 정보' },
  settlementBankName: { label: '은행명', group: 'settlement', purpose: '정산' },
  settlementAccountNumber: { label: '계좌번호', group: 'settlement', purpose: '정산' },
  settlementAccountHolder: { label: '예금주', group: 'settlement', purpose: '정산' },
  taxInvoiceEmail: { label: '세금계산서 이메일', group: 'settlement', purpose: '정산' },
  validTaxInvoiceEmail: { label: '세금계산서 이메일 형식', group: 'settlement', purpose: '정산' },
};

export default function SupplierProfileChecklist({
  missingProfileFields,
  missingSettlementFields,
}: {
  missingProfileFields?: string[];
  /** 정산 조회 실패 · 이전 서버 응답이면 없다 — 그때는 정산 영역을 「확인하지 못함」으로 표시하고 전체 완료로 보지 않는다. */
  missingSettlementFields?: string[];
}) {
  const known = [...(missingProfileFields ?? []), ...(missingSettlementFields ?? [])].filter(
    (key) => FIELD_LABELS[key],
  );
  if (missingProfileFields === undefined && missingSettlementFields === undefined) return null;

  // 서버 판정을 받지 못한 영역(조회 실패 · 이전 응답)은 "입력 완료"로 보지 않는다.
  //   두 영역 판정이 모두 있을 때만 전체 완료를 표시한다.
  const unchecked = [
    missingProfileFields === undefined ? '공급자 정보' : null,
    missingSettlementFields === undefined ? '정산' : null,
  ].filter((v): v is string => v !== null);
  const uncheckedNote = unchecked.length > 0 ? (
    <p className="mt-1 text-xs text-gray-600" data-testid="supplier-checklist-unchecked">
      {unchecked.join(' · ')} 항목은 확인하지 못했습니다. 새로고침 후 다시 확인해 주세요.
    </p>
  ) : null;

  if (known.length === 0) {
    if (unchecked.length > 0) {
      const checked = missingProfileFields !== undefined ? '공급자 정보' : '정산';
      return (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="flex items-center gap-2 text-sm text-gray-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-gray-500" />
            {checked} 필수 항목은 모두 입력했습니다.
          </p>
          {uncheckedNote}
        </div>
      );
    }
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4">
        <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-600" />
        <p className="text-sm text-green-800">필수 항목을 모두 입력했습니다.</p>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="supplier-profile-checklist-title"
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4"
    >
      <h2
        id="supplier-profile-checklist-title"
        className="flex items-center gap-2 text-sm font-semibold text-amber-900"
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
        아직 입력하지 않은 필수 항목 {known.length}개
      </h2>
      <p className="mt-1 text-xs text-amber-800">저장된 정보 기준입니다. 항목을 누르면 입력 위치로 이동합니다.</p>
      {uncheckedNote}
      <ul className="mt-3 flex flex-wrap gap-2">
        {known.map((key) => {
          const field = FIELD_LABELS[key];
          return (
            <li key={key}>
              <a
                href={`#${SUPPLIER_PROFILE_GROUP_ANCHORS[field.group]}`}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
              >
                {field.label}
                <span className="text-amber-600">· {field.purpose}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
