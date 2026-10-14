export type ApprovalCounts = {
  total: number;
  unrequested: number;
  pending: number;
  approved: number;
  rejected: number;
};
export type InventoryCounts = {
  lowStock: number;
  outOfStock: number;
  tracked: number;
};

/** 처리 필요 항목 — value > 0 일 때만 렌더된다. */
export type ActionItem = {
  key: string;
  label: string;
  value: number;
  unit: string;
  to: string;
  tone: 'red' | 'amber';
};

/**
 * WO-O4O-NETURE-SUPPLIER-ORDER-INVENTORY-SETTLEMENT-LOAD-ERROR-CONTRACT-V1:
 * 주문·재고·정산 조회 실패를 영역 단위로 구분한다. 단일 boolean 으로 뭉개면
 * 어느 영역이 실패했는지 알 수 없어 실패 영역만 골라낼 수 없다.
 */
export type OpsArea = 'orders' | 'inventory' | 'settlements';
export type OpsFailures = Record<OpsArea, boolean>;
export const NO_OPS_FAILURE: OpsFailures = {
  orders: false,
  inventory: false,
  settlements: false,
};
/** 조회 실패 영역의 수치 자리 표시 — 0 으로 대체하지 않는다. */
export const UNAVAILABLE = '—';
export const OPS_AREA_LABELS: Record<OpsArea, string> = {
  orders: '주문',
  inventory: '재고',
  settlements: '정산',
};

/**
 * WO-O4O-NETURE-SUPPLIER-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1:
 * 콘텐츠·유통 영역의 조회 실패를 영역 단위로 구분한다.
 * 주문·재고·정산(OpsFailures) 과는 별개 상태다.
 */
export type ContentDistributionFailures = {
  recruitments: boolean;
  storeDescriptions: boolean;
  marketTrials: boolean;
  eventOffers: boolean;
};
export const NO_CD_FAILURE: ContentDistributionFailures = {
  recruitments: false,
  storeDescriptions: false,
  marketTrials: false,
  eventOffers: false,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** 서비스 내 기존 표기와 동일: 1,234,567원 */
export function won(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`;
}

export function settled<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === 'fulfilled' ? r.value : fallback;
}

/** 공급자 승인 상태 라벨 — SupplierActivationGate 와 동일 어휘 */
export const SUPPLIER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '활성',
  PENDING: '승인 대기',
  REJECTED: '거절',
  INACTIVE: '정지',
};

/** 매장용 설명서 상태 라벨 — supplierStoreDescription 의 실제 status 모델 그대로 사용 */
export const STORE_DESC_STATUS_LABELS: Record<string, string> = {
  draft: '임시저장',
  needs_review: '검수 대기',
  revision_requested: '수정 요청',
  canonical: '매장 노출',
  hidden: '숨김',
  candidate: '후보',
  deprecated: '만료',
};

/** 유통참여형 펀딩 상태 라벨 — api/trial 의 TrialStatus 그대로 사용 */
export const TRIAL_STATUS_LABELS: Record<string, string> = {
  draft: '작성 중',
  submitted: '제출됨',
  recruiting: '모집 중',
  development: '개발 중',
  outcome_confirming: '결과 확인',
  fulfilled: '이행 완료',
  closed: '마감',
};

export function countBy<T>(
  items: T[],
  key: (item: T) => string,
): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

// 모든 경로는 canonical /supplier/* (사업자 정보는 사이드바 '설정' — 홈 바로가기에서는 제외)
// WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1: 상품 / 주문 / 콘텐츠 3축 진입.
export const QUICK_LINK_GROUPS = [
  {
    label: '상품',
    links: [
      { label: '상품 목록', path: '/supplier/products' },
      { label: '상품 등록', path: '/supplier/products/register' },
    ],
  },
  {
    label: '주문',
    links: [
      { label: '주문 현황', path: '/supplier/orders' },
      { label: '재고 관리', path: '/supplier/inventory' },
      { label: '정산 내역', path: '/supplier/settlements' },
    ],
  },
  {
    label: '콘텐츠',
    links: [
      { label: '콘텐츠 라이브러리', path: '/supplier/library' },
      { label: '매장용 상품 설명서', path: '/supplier/store-descriptions' },
      { label: '검수·게시 현황', path: '/supplier/store-materials-status' },
    ],
  },
];

// WO-O4O-NETURE-SUPPLIER-OPERATING-READINESS-CLOSEOUT-BATCH-V1:
//   라벨은 SupplierSpaceLayout 사이드바(canonical)와 동일 어휘를 사용한다.
//   검수·게시 현황(/supplier/store-materials-status) 진입점 누락도 함께 해소한다.
// WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1: 콘텐츠 축 = 사이드바 '콘텐츠' 그룹과 동일.
// WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §C·§D (2026-09-23):
//   '거래 상품 정보'·'공급 오퍼' quick link 는 상품 목록으로 접혔다.
export const CONTENT_LINKS = [
  { label: '콘텐츠 라이브러리', path: '/supplier/library' },
  { label: '매장용 상품 설명서', path: '/supplier/store-descriptions' },
  { label: '태블릿 화면 자료', path: '/supplier/tablet-screen-sets' },
  { label: '디지털 사이니지', path: '/supplier/signage' },
  { label: '검수·게시 현황', path: '/supplier/store-materials-status' },
];
