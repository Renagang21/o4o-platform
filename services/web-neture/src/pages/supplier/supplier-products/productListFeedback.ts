export type RecruitModalProduct = {
  masterId: string;
  name: string;
  regulatoryType?: string;
  distributionType?: string;
};

// WO-O4O-SUPPLIER-PRODUCT-APPROVAL-GATE-UX-MESSAGE-IMPROVEMENT-V1:
// submitForApproval 의 skipped[].reason(세분화된 reasonCode)을 상태/다음행동 문구로 변환.
// backend(evaluateGate)가 이미 reasonCode 를 세분화하여 반환 — frontend 는 표시만 정확히 한다.
export const APPROVAL_GATE_PROFILE_URL = '/mypage/business-profile';
type GateReasonDisplay = { status: string; nextAction: string; cta: boolean };
export const APPROVAL_GATE_REASON_DISPLAY: Record<string, GateReasonDisplay> = {
  SUPPLIER_CATEGORY_NOT_SELECTED: {
    status: '공급 예정 품목군에 아직 등록되지 않았습니다.',
    nextAction:
      '공급자 프로필 > 공급 예정 품목군에서 해당 품목군을 추가하고 필요한 증빙을 제출해 주세요.',
    cta: true,
  },
  SUPPLIER_CATEGORY_NOT_APPROVED: {
    status: '해당 품목군이 운영자 확인 대기 중입니다.',
    nextAction: '운영자 확인이 완료된 후 상품 승인 요청을 다시 진행해 주세요.',
    cta: true,
  },
  SUPPLIER_CATEGORY_NEEDS_UPDATE: {
    status: '해당 품목군 증빙에 보완이 필요합니다.',
    nextAction:
      '공급자 프로필 > 공급 예정 품목군에서 보완 요청 내용을 확인하고 증빙을 다시 제출해 주세요.',
    cta: true,
  },
  SUPPLIER_CATEGORY_REJECTED: {
    status: '해당 품목군 신청이 반려되었습니다.',
    nextAction: '반려 사유를 확인한 뒤 필요한 증빙을 보완하여 다시 제출해 주세요.',
    cta: true,
  },
  SUPPLIER_CATEGORY_SUSPENDED: {
    status: '해당 품목군이 정지 상태입니다.',
    nextAction: '운영자 확인 또는 문의가 필요합니다.',
    cta: true,
  },
  SUPPLIER_CATEGORY_UNRESOLVED: {
    status: '해당 상품의 품목군 상태를 확인할 수 없습니다.',
    nextAction: '상품의 규제/품목군 정보를 확인하거나 공급 예정 품목군 등록 상태를 확인해 주세요.',
    cta: true,
  },
  NO_ELIGIBLE_SERVICE_KEYS: {
    status: '이 상품을 노출할 수 있는 서비스 대상이 없습니다.',
    nextAction: '상품 편집에서 서비스 대상 또는 유통 설정을 확인해 주세요.',
    cta: false,
  },
  DRUG_SERVICE_NOT_PHARMACY_AUDIENCE: {
    status: '의약품 상품은 약국 대상 서비스에만 승인 요청할 수 있습니다.',
    nextAction: '상품 편집에서 서비스 대상 설정을 확인해 주세요.',
    cta: false,
  },
  ALREADY_REQUESTED_OR_DECIDED: {
    status: '이미 승인 요청 중이거나 승인/반려 처리된 상품입니다.',
    nextAction: '현재 승인 상태를 확인해 주세요.',
    cta: false,
  },
  // WO-O4O-NETURE-SUPPLIER-ACTIVATION-DOCUMENT-GATE-RELAXATION-V1: 판매 전 게이트(사업자등록증)
  SUPPLIER_BUSINESS_REGISTRATION_REQUIRED: {
    status: '사업자등록증이 제출되지 않아 판매 승인 요청을 할 수 없습니다.',
    nextAction: '공급자 프로필 > 사업자 정보에서 사업자등록증을 제출한 뒤 다시 요청해 주세요.',
    cta: true,
  },
};
export const APPROVAL_GATE_FALLBACK: GateReasonDisplay = {
  status: '승인 요청 조건을 충족하지 못했습니다.',
  nextAction: '상품 정보와 공급자 품목군 등록 상태를 확인해 주세요.',
  cta: false,
};
export type ApprovalSkippedItem = {
  id: string;
  reason: string;
  name: string;
  category: string;
  display: GateReasonDisplay;
};
export type ApprovalResultView = {
  submitted: number;
  total: number;
  errorCount: number;
  skipped: ApprovalSkippedItem[];
};

/**
 * WO-O4O-NETURE-SUPPLIER-DELETE-POLICY-AND-REVIEW-ROUNDTRIP-BATCH-V1:
 * 삭제 실패 사유를 사람 말로 요약한다. 서버 코드는 운영자 hard-delete 가드와 같은 계약이다.
 */
const BULK_DELETE_FAILURE_LABEL: Record<string, string> = {
  HAS_ACTIVE_LISTINGS: '매장 진열 중이라 삭제 불가',
  HAS_SERVICE_PRODUCTS: '서비스에 연결돼 삭제 불가',
  NOT_FOUND_OR_NOT_OWNED: '이미 삭제됐거나 권한 없음',
  NETWORK_ERROR: '통신 오류',
};

/**
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1:
 * 인라인 저장(batch update) 실패 사유 요약. 매핑에 없는 코드는 원문 유지.
 */
const SAVE_FAILURE_LABEL: Record<string, string> = {
  PRODUCT_NOT_FOUND: '상품을 찾을 수 없음',
  NOT_OWNED: '권한 없음',
  PRIVATE_REQUIRES_SELLER_IDS: '판매자 미지정으로 활성화 불가',
  SERVICE_REQUIRES_KEYS: '대상 서비스 미선택',
  PUBLIC_REQUIRES_DESCRIPTION: '상품 설명 필요',
  NETWORK_ERROR: '통신 오류',
  INTERNAL_ERROR: '서버 오류',
};

export function saveFailureSummary(failed: Array<{ id: string; error: string }>): string {
  const counts = new Map<string, number>();
  for (const f of failed) {
    const label = SAVE_FAILURE_LABEL[f.error] ?? f.error;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return `저장 실패 ${failed.length}건 (${Array.from(counts.entries())
    .map(([label, n]) => `${label} ${n}건`)
    .join(' · ')})`;
}

export function bulkDeleteFailureSummary(failed: Array<{ id: string; error: string }>): string {
  const counts = new Map<string, number>();
  for (const f of failed) {
    const label = BULK_DELETE_FAILURE_LABEL[f.error] ?? f.error;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, n]) => `${label} ${n}건`)
    .join(' · ');
}

export type ApprovalTab = 'all' | 'unrequested' | 'pending' | 'approved' | 'rejected';
