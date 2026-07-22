/**
 * Tablet Kiosk Core — shared types
 *
 * WO-O4O-TABLET-KIOSK-PAGE-DEDUP-V1
 * WO-O4O-TABLET-IDLE-LAYER-V1 — IdlePlaylistItem 추가
 *
 * KPA / K-Cosmetics 가 동일하게 쓰던 type 정의를 공통 패키지로 추출.
 * `stock_quantity` 만 optional 처리하여 두 서비스 정의를 통합.
 */

export interface TabletProduct {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  images?: Array<{ url: string }>;
  category: string;
  // WO-O4O-TABLET-PRODUCT-TEXT-BUTTON-NO-IMAGE-V1: 규격·수량·제형·포장 (ProductMaster.specification).
  //   텍스트 버튼 2행 및 상세 규격 줄에 사용. 없으면 렌더하지 않음. additive — 미포함 서비스 무영향.
  specification?: string | null;
  /** Cosmetics 정의에는 필수, KPA 정의에는 부재 — Kiosk UI 자체에서는 미사용 */
  stock_quantity?: number;
  description?: string;
  short_description?: string;
  channel_price?: number;
  // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1: 진열 선택 콘텐츠(없으면 미포함/null). additive — 미사용 서비스 무영향.
  selectedContentId?: string | null;
  selectedContentTitle?: string | null;
  selectedContentHtml?: string | null;
  // WO-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1:
  //   선택 콘텐츠의 게시 가능(검수 완료) 번역만 { locale: { title?, html } } 형태로 전달(없으면 미포함/null).
  //   태블릿 상세에서 언어 버튼 + fallback(선택 언어 → 기본 선택콘텐츠 → 기본 설명)에 사용. 미포함 서비스 무영향.
  selectedContentTranslations?: Record<string, TabletContentTranslation> | null;
}

export interface TabletContentTranslation {
  title?: string;
  html: string;
}

export interface TabletProductsResponse {
  data: TabletProduct[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  /** Local products 가 함께 머지되어 내려오는 경우 (서비스/엔드포인트 의존) */
  localProducts?: unknown[];
}

export interface InterestSubmitResult {
  requestId: string;
  status: string;
  productName: string;
  createdAt: string;
}

export interface InterestStatusDetail {
  id: string;
  status: 'REQUESTED' | 'ACKNOWLEDGED' | 'COMPLETED' | 'CANCELLED';
  productName: string;
  customerName?: string;
  customerNote?: string;
  createdAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface TabletInterestSubmitBody {
  masterId: string;
  customerName?: string;
  customerNote?: string;
}

export type TabletProductsParams = {
  page?: number;
  limit?: number;
  category?: string;
  q?: string;
};

/**
 * Idle mode playlist item.
 *
 * Tablet 은 매장 interactive device 이며, idle mode 는 보조 상태(매장 대기 화면)다.
 * 본 패키지는 signage runtime/PlaybackEngine 을 사용하지 않고 자체 minimal player 만 제공.
 * - image: durationMs 후 다음 항목 (default 5000)
 * - video: onEnded 시 다음 항목 (durationMs 무시)
 * 모든 항목은 사용자 터치 시 즉시 idle exit.
 *
 * Runtime 정책: render-ready URL 저장. assetId 기반 lookup 미도입.
 */
export interface IdlePlaylistItem {
  // WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1: youtube/vimeo 추가(additive).
  //   image: durationMs 후 다음. video: onEnded 후 다음. youtube/vimeo: iframe loop(무음 자동재생),
  //   durationMs 지정 시 그 시간 후 다음 항목(미지정이면 단일 영상 반복).
  type: 'image' | 'video' | 'youtube' | 'vimeo';
  url: string;
  /** image 전용(youtube/vimeo 는 optional 순차 전환용). video 는 onEnded 로 자동 진행. default 5000ms */
  durationMs?: number;
}

/**
 * 자료함 image/video 자산 — IdlePlaylistEditor 의 "자료함에서 추가" 흐름이 사용.
 *
 * WO-O4O-TABLET-IDLE-MEDIA-LIBRARY-V1
 *
 * tablet-kiosk-core 는 fetch/저장 책임 미보유 — 서비스 wrapper 가 fetchLibraryAssets prop
 * 으로 store_library_items 또는 동등 자료함에서 image/video 만 필터링하여 주입한다.
 * 선택된 항목은 IdlePlaylistItem(type/url/durationMs) 으로 변환되어 playlist 에 저장된다.
 */
export interface LibraryAsset {
  /** 자료함 자산 식별자 (preview/key 용도. runtime 저장은 url 만) */
  id: string;
  title: string;
  type: 'image' | 'video';
  /** 재생용 URL. 외부 또는 매장 자체 호스팅 모두 허용 */
  url: string;
  /** thumbnail (선택, picker preview 용도). 미제공 시 url 사용. */
  thumbnail?: string;
  /** image 전용 default duration (선택). 미제공 시 picker 가 default 5000ms 적용. */
  durationMs?: number;
}

/**
 * 서비스 wrapper 가 주입하는 API 함수 집합.
 * (KPA = fetch 직접, Cosmetics = axios 인스턴스 — HTTP 클라이언트 차이는 wrapper 가 흡수)
 */
export interface TabletKioskApi {
  fetchProducts: (
    slug: string,
    params?: TabletProductsParams,
  ) => Promise<TabletProductsResponse>;
  submitInterest: (
    slug: string,
    body: TabletInterestSubmitBody,
  ) => Promise<InterestSubmitResult>;
  checkStatus: (
    slug: string,
    interestId: string,
  ) => Promise<InterestStatusDetail>;
  /**
   * WO-O4O-KPA-TABLET-KIOSK-CORE-SCREEN-CONSUMER-V1 (opt-in).
   * 적용된 Screen Set 을 읽어 sections 로 렌더한다. 미주입이거나 응답 mode='legacy' 면
   * 기존 /products + /idle 기반 동작 그대로. 미주입 서비스(예: K-Cosmetics)는 무영향.
   */
  fetchScreen?: (
    slug: string,
    // WO-O4O-TABLET-VIEWER-LANGUAGE-SELECT-AND-SPD-FALLBACK-V1: language = 이용자 선택 표시 언어(옵션).
    params?: { tabletId?: string; language?: string },
  ) => Promise<TabletScreenResponse | null>;
}

/**
 * 공개 /tablet/screen 응답 (WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-PUBLIC-RUNTIME-READ-V1).
 * mode='screen_set' 이면 sections 를 template 기준으로 렌더, 'legacy' 면 기존 경로 유지.
 */
export interface TabletScreenSection {
  blockType: string;
  sortOrder: number;
  data: Record<string, unknown>;
}
export interface TabletScreenResponse {
  mode: 'legacy' | 'screen_set';
  templateKey?: string;
  screenSet?: { id: string; name: string };
  sections?: TabletScreenSection[];
  tabletId?: string | null;
}

/**
 * content_list section 의 카드(서버 resolve 결과).
 * WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-SCHEMA-CONTRACT-V1 의 /tablet/screen 응답 계약.
 * 서버가 o4o_product_description / store_content item 을 viewer-ready 카드로 resolve 해 내려준다.
 * detail.html 은 반드시 ContentRenderer(DOMPurify) 로만 렌더한다(raw innerHTML 금지).
 */
export interface TabletContentCard {
  itemId: string;
  sourceType: string;
  sourceBadge: string;
  title: string;
  summary?: string;
  thumbnailUrl?: string | null;
  hasDetail: boolean;
  relatedProductName?: string | null;
  detail?: { html?: string };
}
