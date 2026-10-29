export interface AdminSupplier {
  id: string;
  name: string;
  representativeName: string;
  status: string;
  email: string;
  businessNumber?: string;
  taxInvoiceEmail?: string;
  businessRegistrationDocumentId?: string | null;
  settlementBankName?: string | null;
  settlementAccountNumberMasked?: string | null;
  settlementAccountHolder?: string | null;
  settlementBankbookDocumentId?: string | null;
  settlementContactName?: string | null;
  settlementContactEmail?: string | null;
  mailOrderSalesStatus?: string | null;
  mailOrderSalesRegistrationNumber?: string | null;
  mailOrderSalesDocumentId?: string | null;
  createdAt: string;
  // WO-O4O-NETURE-OPERATOR-MEMBER-SUPPLIER-STATUS-VISIBILITY-V1:
  // backend(getAllSuppliers)는 userId 를 내려주나 타입에 누락돼 있던 것을 명시 (회원 목록 매핑용).
  userId?: string;
  // WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
  // 프로필 완성 상태의 단일 권위 — backend(getMissingProfileFields) 산출. 승인 게이트 아님. 프론트 재계산 금지.
  managerName?: string | null;
  managerPhone?: string | null;
  profileComplete?: boolean;
  missingProfileFields?: string[];
  /** @deprecated profileComplete 사용 */
  activationReady?: boolean;
  /** @deprecated missingProfileFields 사용 */
  missingActivationFields?: string[];
}

export interface SupplierApproveResult {
  success: boolean;
  code?: string;
  missingFields?: string[];
}

export interface SupplierGovernanceResult {
  success: boolean;
  code?: string;
  message?: string;
  blocked?: {
    activeOrderCount: number;
    unsettledCount: number;
    settlementInProgressCount: number;
  };
}

export interface GovernanceSupplier {
  id: string;
  name: string;
  status: string;
  lastStatusChangedAt: string | null;
  lastChangedBy: string | null;
  lastChangeReason: string | null;
  activeOrderCount: number;
  unsettledCount: number;
  hasActiveOrders: boolean;
  hasUnsettled: boolean;
  createdAt: string;
}

export interface SupplierListSummary {
  total: number;
  pending: number;
  active: number;
  rejected: number;
  inactive: number;
}

export interface SupplierPagedResult {
  items: AdminSupplier[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  summary: SupplierListSummary;
}

export interface SupplierBatchResultItem {
  id: string;
  status: 'success' | 'failed';
  error?: string;
}
export const PROFILE_FIELD_LABELS: Record<string, string> = {
  representativeName: '대표자명',
  managerName: '담당자명',
  managerPhone: '담당자 연락처',
};
export type RegulatedCategory =
  | 'general'
  | 'pharmaceutical'
  | 'quasi_drug'
  | 'medical_device'
  | 'health_functional_food'
  | 'food'
  | 'cosmetics'
  | 'other_regulated';

export type RegulatedCategoryStatus =
  | 'not_requested'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'needs_update'
  | 'suspended';

export interface SupplierRegulatedCategory {
  id: string;
  category: RegulatedCategory;
  status: RegulatedCategoryStatus;
  registrationNumber: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  evidenceDocument: {
    id: string;
    fileName: string;
    fileSize: number | null;
    mimeType: string | null;
    createdAt: string;
  } | null;
}
export const REGULATED_CATEGORY_LABELS: Record<RegulatedCategory, string> = {
  general: '일반 상품',
  pharmaceutical: '의약품',
  quasi_drug: '의약외품',
  medical_device: '의료기기',
  health_functional_food: '건강기능식품',
  food: '식품',
  cosmetics: '화장품',
  other_regulated: '기타 법정 관리 품목',
};

export const REGULATED_CATEGORY_ORDER: RegulatedCategory[] = [
  'general',
  'pharmaceutical',
  'quasi_drug',
  'medical_device',
  'health_functional_food',
  'food',
  'cosmetics',
  'other_regulated',
];

export const REGULATED_CATEGORY_STATUS_LABELS: Record<RegulatedCategoryStatus, string> = {
  not_requested: '미신청',
  submitted: '서류 제출',
  approved: '등록 가능',
  rejected: '반려',
  needs_update: '보완 필요',
  suspended: '사용 제한',
};
