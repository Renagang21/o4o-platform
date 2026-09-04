/**
 * 매장 태블릿 진열 관리 공통 타입
 * WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1
 *
 * backend 계약(/api/v1/store/tablets/*)의 snake_case 응답 형태를 그대로 유지한다.
 * 이 파일은 서비스 API client 의 타입을 대체하지 않고, Core 가 요구하는 최소 형태만 정의한다.
 */

export interface StoreTabletSummary {
  id: string;
  name: string;
  location?: string | null;
  is_active: boolean;
}

export interface StoreTabletDisplayItem {
  product_type: 'supplier' | 'local';
  product_id: string;
  sort_order: number;
  is_visible: boolean;
}

/**
 * 공개 태블릿 런타임 노출 판정 사유
 * WO-O4O-CROSS-SERVICE-MY-STORE-RUNTIME-CONTRACT-COMMONIZATION-V1 (축 B)
 *
 * backend `routes/platform/store-tablet-product-visibility.ts` 의 계약 그대로다.
 * 이 화면은 판정을 다시 계산하지 않고 서버가 붙여 준 값을 표시만 한다.
 */
export type TabletVisibilityReason =
  | 'visible'
  | 'service_scope_mismatch'
  | 'offer_inactive'
  | 'no_tablet_channel'
  | 'channel_not_approved'
  | 'not_linked_to_channel';

/** 사유 → 매장 경영자 안내 문구 (@o4o/tablet-screen-set-editor 와 같은 문구) */
export const TABLET_VISIBILITY_NOTICE: Record<string, string> = {
  no_tablet_channel: '매장에 태블릿 판매 채널이 없어 화면에 표시되지 않습니다.',
  channel_not_approved: '태블릿 판매 채널이 승인 대기 상태라 화면에 표시되지 않습니다.',
  not_linked_to_channel: '이 상품이 태블릿 판매 채널에 연결되어 있지 않아 화면에 표시되지 않습니다.',
  offer_inactive: '공급 상태(공급자·공급 상품 활성)가 아니어서 화면에 표시되지 않습니다.',
  service_scope_mismatch: '다른 서비스에서 등록된 상품이라 이 매장 화면에는 표시되지 않습니다.',
};

export const TABLET_VISIBILITY_FALLBACK_NOTICE =
  '현재 매장 노출 조건을 만족하지 않아 화면에 표시되지 않습니다.';

/** 매장 TABLET 채널 상태 — 서버 응답 그대로 */
export interface StoreTabletChannelState {
  hasTabletChannel: boolean;
  hasApprovedTabletChannel: boolean;
  tabletChannelStatus: string | null;
}

export interface StoreTabletPoolSupplierProduct {
  id: string;
  product_name: string;
  /** additive — 구버전 백엔드/서비스 중립 mount 응답에는 없을 수 있다 */
  tabletVisible?: boolean;
  tabletVisibilityReason?: TabletVisibilityReason | string;
}

/**
 * `/{service}/store/product-pool` 응답의 공급 상품 행 — 서비스 API client 공용.
 * KCos / GP client 가 같은 선언을 각자 들고 있던 것을 이 계약 하나로 모은다.
 */
export interface StoreTabletPoolSupplierProductRow {
  id: string;
  offer_id: string;
  product_name: string;
  retail_price: string;
  is_active: boolean;
  service_key: string;
  created_at: string;
  /** 공개 태블릿 노출 판정 — backend 가 붙여 준다(구버전 응답에는 없음) */
  tabletVisible?: boolean;
  tabletVisibilityReason?: TabletVisibilityReason | string;
}

export interface StoreTabletPoolLocalProduct {
  id: string;
  name: string;
}

export interface StoreTabletProductPool {
  supplierProducts: StoreTabletPoolSupplierProduct[];
  localProducts: StoreTabletPoolLocalProduct[];
  /** additive — 없으면 채널 배너를 표시하지 않는다(기존 화면과 동일) */
  tabletChannel?: StoreTabletChannelState | null;
}

/** 화면에서 다루는 진열 항목(상품명 해석 후) */
export interface TabletDisplayEntry {
  productType: 'supplier' | 'local';
  productId: string;
  productName: string;
  sortOrder: number;
  isVisible: boolean;
}

/** 저장 payload — 기존 saveTabletDisplays 계약과 동일 */
export interface TabletDisplaySaveInput {
  productType: 'supplier' | 'local';
  productId: string;
  sortOrder: number;
  isVisible?: boolean;
}

/** 상품 풀에서 선택 가능한 후보 */
export interface TabletPoolCandidate {
  id: string;
  name: string;
  type: 'supplier' | 'local';
  /** 공급 상품에만 붙는다. undefined = 서버가 판정을 주지 않았다(표시 없음). */
  tabletVisible?: boolean;
  /** tabletVisible === false 일 때 표시할 안내 문구 */
  visibilityNotice?: string | null;
}

/**
 * 서비스 API adapter — endpoint · request · response 는 서비스 소유다.
 * Core 는 함수 시그니처만 알고 URL 을 모른다.
 */
export interface StoreTabletDisplaysApi<TIdleItem> {
  fetchTablets: () => Promise<StoreTabletSummary[]>;
  fetchProductPool: (tabletId: string) => Promise<StoreTabletProductPool>;
  fetchTabletDisplays: (tabletId: string) => Promise<StoreTabletDisplayItem[]>;
  saveTabletDisplays: (tabletId: string, displays: TabletDisplaySaveInput[]) => Promise<unknown>;
  fetchTabletIdlePlaylist: (tabletId: string) => Promise<TIdleItem[]>;
  saveTabletIdlePlaylist: (tabletId: string, items: TIdleItem[]) => Promise<TIdleItem[]>;
}

/** 서비스별 문구 — 매장/약국 등 표현을 하나로 강제하지 않는다. */
export interface StoreTabletDisplaysLabels {
  pageTitle: string;
  subtitle: string;
  emptyTabletsTitle: string;
  emptyTabletsHint: string;
  idleDescription: string;
}

/** accent — Tailwind class 문자열 주입(두 서비스 모두 teal 이 기존값) */
export interface StoreTabletAccentClasses {
  icon: string;
  spinner: string;
  saveButton: string;
  idleSaveButton: string;
  tabActive: string;
  addButton: string;
  checkbox: string;
  select: string;
}

export const TABLET_TEAL_ACCENT: StoreTabletAccentClasses = {
  icon: 'text-teal-600',
  spinner: 'text-teal-600',
  saveButton:
    'bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/25',
  idleSaveButton: 'bg-teal-600 hover:bg-teal-700',
  tabActive: 'bg-teal-600 text-white',
  addButton: 'bg-teal-600 hover:bg-teal-700',
  checkbox: 'rounded border-slate-300 text-teal-600 focus:ring-teal-500',
  select: 'focus:ring-teal-500',
};

export const DEFAULT_TABLET_LABELS: StoreTabletDisplaysLabels = {
  pageTitle: '태블릿 진열 관리',
  subtitle: '태블릿에 표시할 상품을 구성합니다. 공급 상품과 자체 상품을 혼합할 수 있습니다.',
  emptyTabletsTitle: '등록된 태블릿이 없습니다',
  emptyTabletsHint: '매장에 태블릿을 먼저 등록해 주세요.',
  idleDescription:
    '매장이 일정 시간 사용되지 않을 때 태블릿이 자동으로 보여줄 이미지/영상 목록입니다. 고객이 화면을 터치하면 즉시 상품 안내 화면으로 돌아갑니다.',
};
