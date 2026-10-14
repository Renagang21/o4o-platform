export const GUIDE_PAGE_KEY = 'supplier.event-offer.editor';
export const SERVICE_KEY = 'neture';

// WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
// 대상 서비스 선택 옵션. backend의 TARGET_TO_EVENT_OFFER_KEY와 정합.
export type ProposeTarget = {
  key: string;
  label: string;
  enabled: boolean;
  hint?: string;
};
export const PROPOSE_TARGETS: ProposeTarget[] = [
  { key: 'kpa-society', label: 'KPA Society', enabled: true },
  { key: 'k-cosmetics', label: 'K-Cosmetics', enabled: true },
];

export const TARGET_LABEL: Record<string, string> = {
  'kpa-society': 'KPA Society',
  'k-cosmetics': 'K-Cosmetics',
  // event-offer service keys (status display용 fallback)
  'kpa-groupbuy': 'KPA Society',
  'k-cosmetics-event-offer': 'K-Cosmetics',
};

// WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
// 응답 service_key (kpa-groupbuy 등) → UI 라벨로 매핑.
export const EVENT_KEY_TO_LABEL: Record<string, string> = {
  'kpa-groupbuy': 'KPA Society',
  'k-cosmetics-event-offer': 'K-Cosmetics',
};

export const PROPOSAL_STATUS_MESSAGE: Record<string, string> = {
  created: '제안되었습니다.',
  already_proposed: '이미 제안된 상품입니다.',
  offer_not_found: '공급자 상품을 찾을 수 없습니다.',
  offer_not_owned: '권한이 없습니다.',
  org_unavailable: '대상 서비스의 조직 정보를 확인할 수 없습니다.',
  unsupported: '지원되지 않는 서비스입니다.',
  internal_error: '처리 중 오류가 발생했습니다.',
};

export type StatusTab = 'active' | 'ended' | 'all';

export interface OfferItem {
  id: string;
  offerId: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  unitPrice: number | null;
  productName: string;
  supplierName: string;
  totalQuantity: number | null;
  perOrderLimit: number | null;
  perStoreLimit: number | null;
}

export function formatPrice(value: number | null): string {
  if (value == null) return '-';
  return '₩' + value.toLocaleString('ko-KR');
}

export function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

export const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active: { label: '진행중', cls: 'bg-green-100 text-green-700' },
  ended: { label: '종료', cls: 'bg-slate-100 text-slate-500' },
  approved: { label: '승인됨', cls: 'bg-blue-100 text-blue-700' },
  pending: { label: '검토중', cls: 'bg-yellow-100 text-yellow-700' },
  // WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1
  rejected: { label: '반려', cls: 'bg-red-100 text-red-700' },
  canceled: { label: '취소', cls: 'bg-red-100 text-red-500' },
};

// WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1: 서버 에러 코드 → 사용자 메시지 매핑
export const PROPOSE_ERROR_MESSAGES: Record<string, string> = {
  ALREADY_PROPOSED: '이미 제안된 이벤트 상품입니다.',
  OFFER_NOT_OWNED: '해당 상품에 대한 권한이 없습니다.',
  OFFER_NOT_FOUND: '공급자 상품을 찾을 수 없습니다.',
  SUPPLIER_NOT_FOUND: '공급자 계정이 연결되어 있지 않습니다.',
  ORG_UNAVAILABLE: 'KPA 조직 정보를 확인할 수 없습니다. 관리자에게 문의하세요.',
  INVALID_PARAMS: '필수 정보가 누락되었습니다.',
};

export function extractErrorCode(err: unknown): string | null {
  const e = err as { response?: { data?: { error?: { code?: string } } } };
  return e?.response?.data?.error?.code ?? null;
}
