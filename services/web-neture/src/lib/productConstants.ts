/**
 * Product Badge/Label Constants — Single Source of Truth
 *
 * WO-NETURE-SUPPLIER-OPERATOR-PRODUCT-LIST-STRUCTURE-ALIGNMENT-V1
 * WO-NETURE-SUPPLIER-PRODUCT-VISIBILITY-STATUS-UX-ALIGNMENT-V1
 *
 * 공급자/운영자/상세패널에서 동일한 용어·색상으로 상품 상태를 표시하기 위한 공통 상수.
 */

// ─── Distribution Type ───

export const DISTRIBUTION_TYPE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  PUBLIC: { label: '전체 공개', bg: 'bg-blue-50', text: 'text-blue-700' },
  SERVICE: { label: '서비스', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  PRIVATE: { label: '비공개', bg: 'bg-slate-100', text: 'text-slate-500' },
};

export const DISTRIBUTION_TYPE_LABELS: Record<string, string> = {
  PUBLIC: '전체 공개',
  SERVICE: '서비스',
  PRIVATE: '비공개',
};

// ─── Approval Status ───

export const APPROVAL_STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: '대기', bg: 'bg-amber-50', text: 'text-amber-700' },
  approved: { label: '승인', bg: 'bg-green-50', text: 'text-green-700' },
  rejected: { label: '반려', bg: 'bg-red-50', text: 'text-red-600' },
  none: { label: '미요청', bg: 'bg-slate-100', text: 'text-slate-500' },
};

// ─── Regulatory Type ───

export const REGULATORY_TYPE_LABELS: Record<string, string> = {
  HEALTH_FUNCTIONAL: '건강기능식품',
  MEDICAL_DEVICE: '의료기기',
  DRUG: '의약품',
  QUASI_DRUG: '의약외품',
  COSMETIC: '화장품',
  GENERAL: '기타',
};

export const REGULATORY_TYPE_BADGE: Record<string, { bg: string; text: string }> = {
  HEALTH_FUNCTIONAL: { bg: 'bg-amber-50', text: 'text-amber-700' },
  MEDICAL_DEVICE: { bg: 'bg-blue-50', text: 'text-blue-700' },
  DRUG: { bg: 'bg-red-50', text: 'text-red-700' },
  QUASI_DRUG: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  COSMETIC: { bg: 'bg-violet-50', text: 'text-violet-700' },
  GENERAL: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

// ─── Visibility Status (WO-NETURE-SUPPLIER-PRODUCT-VISIBILITY-STATUS-UX-ALIGNMENT-V1) ───

export type VisibilityStatusKey = 'INACTIVE' | 'PRIVATE' | 'REJECTED' | 'PENDING' | 'VISIBLE';

export const VISIBILITY_STATUS: Record<VisibilityStatusKey, {
  label: string;
  bg: string;
  text: string;
  description: string;
}> = {
  INACTIVE: {
    label: '비활성',
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    description: '비활성 상태라 운영자 화면에 노출되지 않습니다.',
  },
  PRIVATE: {
    label: '비공개',
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    description: '유통 타입이 비공개라 운영자 화면에 노출되지 않습니다.',
  },
  REJECTED: {
    label: '반려됨',
    bg: 'bg-red-50',
    text: 'text-red-600',
    description: '서비스 승인이 반려되었습니다. 수정 후 재요청해 주세요.',
  },
  PENDING: {
    label: '승인 대기',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    description: '서비스 승인 대기 중입니다. 승인되면 운영자 화면에 노출됩니다.',
  },
  VISIBLE: {
    label: '노출 가능',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    description: '공개·활성 상태이므로 운영자 화면에 노출됩니다.',
  },
};

// ─── Supply Policy (WO-NETURE-SUPPLIER-PRODUCT-LIST-STRUCTURE-REFINE-V1) ───

/** 통합 유통 정책 배지 목록 산정 */
export function getSupplyPolicyBadges(product: {
  isPublic?: boolean;
  distributionType?: string | null;
  serviceKeys?: string[] | null;
  allowedSellerIds?: string[] | null;
}): Array<{ label: string; bg: string; text: string }> {
  const badges: Array<{ label: string; bg: string; text: string }> = [];
  const isPublic = product.isPublic ?? product.distributionType === 'PUBLIC';
  const keys = (product.serviceKeys || []).filter((k) => k !== 'neture');
  const hasSellers = product.allowedSellerIds && product.allowedSellerIds.length > 0;

  if (isPublic) badges.push({ label: '전체공개', bg: 'bg-emerald-50', text: 'text-emerald-700' });
  if (keys.length > 0) badges.push({ label: '서비스', bg: 'bg-blue-50', text: 'text-blue-700' });
  if (hasSellers) badges.push({ label: '판매자모집', bg: 'bg-amber-50', text: 'text-amber-700' });
  // WO-NETURE-PRODUCT-LIST-COLUMN-LABEL-AND-DESCRIPTION-REFINE-V1:
  // '비공개' → '정책 미설정' (어떤 유통 정책도 지정되지 않은 상태를 명확히 표현)
  if (badges.length === 0) badges.push({ label: '정책 미설정', bg: 'bg-slate-100', text: 'text-slate-400' });

  return badges;
}

// KPA 우선 서비스 표기명 매핑
const SERVICE_DISPLAY: Record<string, string> = {
  'kpa-society': 'KPA',
  'glycopharm': 'GlycoPharm',
  'k-cosmetics': 'K-Cosmetics',
};

/** KPA 우선 서비스 표기 */
export function getServiceDisplay(serviceKeys: string[] | null | undefined): string | null {
  const keys = (serviceKeys || []).filter((k) => k !== 'neture');
  if (keys.length === 0) return null;

  // KPA 우선 정렬
  const sorted = [...keys].sort((a, b) => {
    if (a === 'kpa-society') return -1;
    if (b === 'kpa-society') return 1;
    return 0;
  });

  const first = SERVICE_DISPLAY[sorted[0]] || sorted[0];
  const rest = sorted.length - 1;
  return rest > 0 ? `${first} +${rest}` : first;
}

/**
 * 운영자 노출 상태 산정.
 * 우선순위: inactive > private > rejected > pending > visible
 */
export function getVisibilityStatus(product: {
  isActive: boolean;
  distributionType: string;
  serviceApprovals?: Array<{ serviceKey: string; status: string }> | null;
}): VisibilityStatusKey {
  if (!product.isActive) return 'INACTIVE';
  if (product.distributionType === 'PRIVATE') return 'PRIVATE';

  const approvals = (product.serviceApprovals || []).filter(a => a.serviceKey !== 'neture');
  const hasRejected = approvals.some(a => a.status === 'rejected');
  if (hasRejected) return 'REJECTED';

  const hasApproved = approvals.some(a => a.status === 'approved');
  const hasPending = approvals.some(a => a.status === 'pending');
  if (hasPending && !hasApproved) return 'PENDING';

  return 'VISIBLE';
}
