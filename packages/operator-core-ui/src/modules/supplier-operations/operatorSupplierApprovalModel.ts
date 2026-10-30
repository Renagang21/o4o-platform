import { type AdminSupplier, PROFILE_FIELD_LABELS } from './types';

// WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
// 프로필 완성 상태는 정보성 표시(정보 미완료 배지)로만 사용 — 승인 버튼을 비활성화하지 않는다.
export function profileMissingLabels(s: AdminSupplier): string[] {
  const missing = s.missingProfileFields ?? s.missingActivationFields ?? [];
  return missing.map((f) => PROFILE_FIELD_LABELS[f] || f);
}

// backend 단일 권위. 구버전 payload 대비 representativeName fallback.
export function isProfileComplete(s: AdminSupplier): boolean {
  return s.profileComplete ?? s.activationReady ?? !!s.representativeName;
}

// WO-O4O-NETURE-OPERATOR-SUPPLIER-BASIC-INFO-COMPLETION-V1:
// 운영자가 승인 전 직접 보완 가능한 기본 정보 필드 (backend PATCH 화이트리스트와 일치)
export interface SupplierEditForm {
  representativeName: string;
  managerName: string;
  managerPhone: string;
  businessNumber: string;
  taxInvoiceEmail: string;
}
export const EMPTY_EDIT_FORM: SupplierEditForm = {
  representativeName: '',
  managerName: '',
  managerPhone: '',
  businessNumber: '',
  taxInvoiceEmail: '',
};
export function toEditForm(s: AdminSupplier): SupplierEditForm {
  return {
    representativeName: s.representativeName || '',
    managerName: s.managerName || '',
    managerPhone: s.managerPhone || '',
    businessNumber: s.businessNumber || '',
    taxInvoiceEmail: s.taxInvoiceEmail || '',
  };
}

export const statusLabels: Record<string, string> = {
  PENDING: '승인대기',
  ACTIVE: '활성',
  REJECTED: '거절됨',
  INACTIVE: '비활성',
};

export const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
};

// 통신판매업 신고 상태 — 운영자 확인 항목 (ACTIVE 전환 차단 조건 아님)
export const mailOrderStatusLabels: Record<string, string> = {
  not_applicable: '해당 없음',
  reported: '신고 완료',
  pending: '확인 필요',
};

// 상태 필터 (기본 = 승인대기). value '' = 전체.
export const statusFilters: Array<{ value: string; label: string }> = [
  { value: 'PENDING', label: '승인대기' },
  { value: '', label: '전체' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'REJECTED', label: '거절됨' },
  { value: 'INACTIVE', label: '비활성' },
];

// WO-O4O-NETURE-SUPPLIER-ACTIVATION-DOCUMENT-GATE-RELAXATION-V1:
// ACTIVE 승인은 기본 사업자 정보만 필수. 사업자등록증/정산정보/통장사본/세금계산서 이메일은
// 판매 전·정산 전 필요 항목으로 분리(활성화 차단 아님).
export function getDeferredItems(supplier: AdminSupplier): { label: string; stage: string }[] {
  const items: { label: string; stage: string }[] = [];
  if (!supplier.businessRegistrationDocumentId) items.push({ label: '사업자등록증', stage: '판매 전' });
  if (!supplier.taxInvoiceEmail) items.push({ label: '세금계산서 이메일', stage: '정산 전' });
  if (!supplier.settlementBankName) items.push({ label: '은행명', stage: '정산 전' });
  if (!supplier.settlementAccountNumberMasked) items.push({ label: '계좌번호', stage: '정산 전' });
  if (!supplier.settlementAccountHolder) items.push({ label: '예금주', stage: '정산 전' });
  if (!supplier.settlementBankbookDocumentId) items.push({ label: '통장 사본', stage: '정산 전' });
  return items;
}
export function describeDeferred(items: { label: string; stage: string }[]): string {
  return ['판매 전', '정산 전']
    .map((stage) => {
      const labels = items.filter((i) => i.stage === stage).map((i) => i.label);
      return labels.length ? `${stage} 필요: ${labels.join(', ')}` : null;
    })
    .filter(Boolean)
    .join(' · ');
}
