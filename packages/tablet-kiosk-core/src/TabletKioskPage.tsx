/**
 * TabletKioskPage — In-Store Tablet Kiosk View (canonical)
 *
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
 * WO-O4O-TABLET-INTERACTIVE-UX-ALIGN-V1
 * WO-O4O-TABLET-KIOSK-PAGE-DEDUP-V1
 * WO-O4O-TABLET-RUNTIME-REDUCER-V1 — useState 9개 분산 → useReducer 단일 runtime state
 * WO-O4O-TABLET-IDLE-LAYER-V1 — 'idle' 모드 + inactivity detection + idle overlay 추가
 * WO-O4O-KPA-TABLET-PUBLIC-INFO-UX-PRIVACY-INPUT-REMOVAL-V1 —
 *   태블릿 V1 = 공용 안내 화면. 상품 상세의 개인정보 입력(이름/요청사항) 제거,
 *   상담 요청 버튼은 기본 미노출(매장이 명시적으로 showConsultationButton=true 로 opt-in 시에만 렌더),
 *   상세 최종 행동은 "이 화면을 직원에게 보여주세요" 안내로 정리.
 *   개인정보 입력·상담 접수는 태블릿 V1 범위 밖 — 후속 모바일 앱/PWA 또는 O4O 소비자 관리 기능에서 별도 설계.
 *   submitInterest/submitted/status polling 흐름은 후속 호환을 위해 남기되 기본 UI 에서는 접근 불가.
 *
 * 성격: 매장 내 공용 안내 device.
 *   ─ "쇼핑몰"이 아니라 "매장 안내 디바이스"이다.
 *   ─ 결제/장바구니/주문 흐름 없음. 고객을 식별하지 않는다(입력/로그인/상담 접수 없음).
 *   ─ 상품 상세의 최종 행동은 "직원에게 이 화면 보여주기"로 마무리한다.
 *   ─ idle 은 보조 상태(매장 대기 화면)다. signage 처럼 항상 재생되는 구조 아님.
 *     사용자 터치 시 즉시 interactive 우선.
 *   ─ 향후 확장 가능 영역(별도 WO):
 *       · AI 설명 / 추천 영역
 *       · consultation / waiting / promotion 템플릿
 *       · QR / 블로그 / 콘텐츠 연결
 *
 * 구조:
 * ├─ 상품 그리드 (TABLET 채널 상품 — Supplier + Local 혼합)
 * ├─ 상품 상세 오버레이 ("직원에게 이 화면 보여주기" 안내로 마무리)
 * ├─ (opt-in) 상담 요청 / 요청 상태 추적 — showConsultationButton=true 인 매장 한정, 개인정보 입력 없음
 * └─ Idle overlay (fullscreen, 자체 minimal player — signage runtime 미사용)
 *
 * - Layout/Header 없음 (전체화면 kiosk mode)
 * - 인증 불필요
 * - 제출 후 3초 polling으로 상태 추적
 * - 2분 idle 후 자동 리셋 (submitted COMPLETED/CANCELLED → browse)
 * - 미조작 N초 후 idle 진입 (browse/detail 한정 — submitted/error 제외)
 *
 * 주입 영역 (서비스 wrapper 책임):
 * - api: HTTP 호출 함수 3종 (KPA = fetch, Cosmetics = axios 등 wrapper 가 흡수)
 * - showQrBadge: KPA QR 접속 진입 시 배지 표시 (서비스별 진입 패턴 차이)
 * - idlePlaylist + idleTimeoutMs: idle 활성화 (opt-in, undefined 면 idle 비활성화)
 *
 * Runtime state 구조 (WO-O4O-TABLET-RUNTIME-REDUCER-V1):
 *   - 단일 RuntimeState + useReducer (이전: useState 9개 분산)
 *   - reducer 는 순수 함수, side-effect (polling/idle reset/inactivity timer)는 useEffect 에서 수행
 *   - 향후 consultation / waiting 모드는 Mode 타입 + Action 만 추가하면 됨 (별도 WO)
 *   - 타이밍(3초 polling / 2분 auto-reset) 그대로 유지
 *
 * 외부 export 정책: 본 컴포넌트와 props 만. RuntimeState/Action 은 내부 전용.
 */

import { useEffect, useReducer, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
// WO-O4O-KPA-TABLET-PRODUCT-DESCRIPTION-RICH-RENDER-V1: canonical 상품설명 HTML 안전 렌더(DOMPurify)
import { ContentRenderer, hasStoreDescriptionMarkup } from '@o4o/content-editor';
// WO-O4O-KPA-TABLET-TEMPLATE-THREE-PATTERNS-V1: 화면 QR 을 실제 스캔 가능한 코드로 렌더(client-side SVG, 백엔드/entity 무추가).
//   기존 qr_guide 카드의 텍스트 안내(도메인)를 실제 QR 로 승격 + 대기 영상형 hero QR chip.
import { QRCodeSVG } from 'qrcode.react';
import type {
  TabletProduct,
  TabletContentTranslation,
  InterestStatusDetail,
  TabletKioskApi,
  IdlePlaylistItem,
  TabletScreenResponse,
  TabletContentCard,
} from './types';
// WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1: idle 대기화면 YouTube/Vimeo embed.
import { toIdleEmbedUrl } from './idleMedia';

// WO-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1:
//   선택 콘텐츠에 게시 가능(검수 완료) 번역이 있으면 상세에서 언어 버튼으로 전환.
//   라벨은 기존 다국어 상품 파일럿과 동일 집합. 미지원 locale 은 코드 그대로 표기(안전).
const LOCALE_LABELS: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
  vi: 'Tiếng Việt',
  th: 'ภาษาไทย',
  id: 'Bahasa',
};
const localeLabel = (code: string): string => LOCALE_LABELS[code] ?? code.toUpperCase();

// ── Display & view types (internal) ──

/**
 * Tablet runtime mode.
 * 'idle' 은 보조 상태(매장 대기 화면). signage 처럼 항상 재생되는 구조가 아니라
 *  inactivity timer 만료 시 진입, 사용자 터치 시 즉시 'browse' 로 복귀.
 */
type Mode = 'browse' | 'detail' | 'submitted' | 'error' | 'idle';

/** idle 진입이 허용된 mode (polling/error 중 진입 금지) */
const IDLE_ENTERABLE_MODES: ReadonlyArray<Mode> = ['browse', 'detail'];

/** image 항목 default 노출 시간 */
const DEFAULT_IDLE_IMAGE_DURATION_MS = 5000;

interface DisplayProduct {
  id: string;
  masterId?: string;
  type: 'supplier' | 'local';
  name: string;
  price?: number;
  priceDisplay?: string;
  description?: string;
  summary?: string;
  category?: string;
  imageUrl?: string;
  // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1: 진열 선택 콘텐츠(있으면 상세를 이 콘텐츠로 표시).
  selectedContentTitle?: string | null;
  selectedContentHtml?: string | null;
  // WO-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1: 게시 가능 번역(locale → {title?, html}).
  selectedContentTranslations?: Record<string, TabletContentTranslation> | null;
}

// ── Reducer (internal) ──

interface RuntimeState {
  mode: Mode;
  products: DisplayProduct[];
  loading: boolean;
  /** 가장 최근 에러 메시지. truthy 면 (mode !== 'submitted' 일 때) error view 가 표시됨. */
  errorMessage: string | null;
  submitting: boolean;
  selectedProduct: DisplayProduct | null;
  interestId: string | null;
  interestStatus: InterestStatusDetail | null;
}

type Action =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; products: DisplayProduct[] }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'SELECT_PRODUCT'; product: DisplayProduct }
  /** detail → browse (selectedProduct 클리어, interest 상태는 손대지 않음) */
  | { type: 'BACK_TO_BROWSE' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; requestId: string }
  | { type: 'SUBMIT_ERROR'; message: string }
  | { type: 'STATUS_UPDATE'; status: InterestStatusDetail }
  /** submitted/auto-reset → browse (모든 transient state 초기화) */
  | { type: 'RESET_TO_BROWSE' }
  /** error view 의 "다시 시도": errorMessage 만 클리어 + browse 모드로 복귀.
   *  selectedProduct/interestId 등은 보존 (기존 동작 유지) */
  | { type: 'CLEAR_ERROR' }
  /** Inactivity timer 만료 → idle. browse/detail 에서만 진입 허용. */
  | { type: 'IDLE_ENTER' }
  /** 사용자 터치/keyboard interaction → idle 종료. 항상 browse 로 복귀하며
   *  selectedProduct + customer 입력 클리어 (이전 detail 컨텍스트 폐기). */
  | { type: 'IDLE_EXIT' };

const initialState: RuntimeState = {
  mode: 'browse',
  products: [],
  loading: true,
  errorMessage: null,
  submitting: false,
  selectedProduct: null,
  interestId: null,
  interestStatus: null,
};

function reducer(state: RuntimeState, action: Action): RuntimeState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true };
    case 'LOAD_SUCCESS':
      return { ...state, loading: false, products: action.products };
    case 'LOAD_ERROR':
      // 기존 동작: setError(...) + setLoading(false) 만. mode 전환 없음.
      // render 단계에서 (errorMessage && mode !== 'submitted') 가 error view 진입 조건.
      return { ...state, loading: false, errorMessage: action.message };
    case 'SELECT_PRODUCT':
      return { ...state, mode: 'detail', selectedProduct: action.product };
    case 'BACK_TO_BROWSE':
      return {
        ...state,
        mode: 'browse',
        selectedProduct: null,
      };
    case 'SUBMIT_START':
      return { ...state, submitting: true };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        mode: 'submitted',
        submitting: false,
        interestId: action.requestId,
      };
    case 'SUBMIT_ERROR':
      return {
        ...state,
        mode: 'error',
        submitting: false,
        errorMessage: action.message,
      };
    case 'STATUS_UPDATE':
      return { ...state, interestStatus: action.status };
    case 'RESET_TO_BROWSE':
      return {
        ...state,
        mode: 'browse',
        selectedProduct: null,
        interestId: null,
        interestStatus: null,
        errorMessage: null,
      };
    case 'CLEAR_ERROR':
      // 기존 error view "다시 시도" 동작 그대로: errorMessage 만 클리어 + mode=browse.
      // selectedProduct/interestId 등 transient 는 보존.
      return { ...state, mode: 'browse', errorMessage: null };
    case 'IDLE_ENTER':
      // submitted polling 중 / error / 이미 idle 인 경우 진입 차단 (no-op)
      if (!IDLE_ENTERABLE_MODES.includes(state.mode)) return state;
      return { ...state, mode: 'idle' };
    case 'IDLE_EXIT':
      // 사용자 터치 → 새 고객 사용 시작 가정. 이전 detail 컨텍스트 폐기.
      return {
        ...state,
        mode: 'browse',
        selectedProduct: null,
      };
    default:
      return state;
  }
}

// ── Pure helpers ──

// WO-O4O-KPA-TABLET-PRODUCT-DETAIL-DESIGN-AND-QR-V1: 가격 표기 정규화.
//   local 상품은 price_display 가 "12000.00" 같은 원시 문자열이라 그대로 노출됐다.
//   숫자/숫자문자열이면 천단위 + '원', 숫자로 못 읽으면 '' 반환(호출부에서 원문/‘가격 문의’ 폴백).
function formatPrice(price: number | string | null | undefined): string {
  if (price == null) return '';
  const n = typeof price === 'string' ? Number(price.replace(/[^0-9.\-]/g, '')) : price;
  if (!Number.isFinite(n)) return '';
  return Math.round(n).toLocaleString('ko-KR') + '원';
}
/** 상품의 표시 가격 텍스트: 숫자면 "12,000원", 비숫자 라벨이면 그 라벨, 없으면 '가격 문의'. */
function productPriceText(p: { price?: number; priceDisplay?: string }): string {
  return formatPrice(p.price ?? p.priceDisplay) || p.priceDisplay || '가격 문의';
}

// WO-O4O-KPA-TABLET-TEMPLATE-USABILITY-REFINE-V1:
// WO-O4O-KPA-TABLET-DEMO-ALL-TEMPLATES-AND-CORNER-QR-V1: QR 카드를 헤더 우상단 QR 로 통일하면서
//   도메인 보조표기(shortHost)를 제거 — 미사용.

function mapSupplierProduct(p: TabletProduct): DisplayProduct {
  return {
    id: p.id,
    masterId: p.id,
    type: 'supplier',
    name: p.name,
    price: p.channel_price || p.sale_price || p.price,
    description: p.description,
    summary: p.short_description,
    category: p.category,
    imageUrl: p.images?.[0]?.url,
    selectedContentTitle: p.selectedContentTitle,
    selectedContentHtml: p.selectedContentHtml,
    selectedContentTranslations: p.selectedContentTranslations,
  };
}

function mapLocalProduct(p: any): DisplayProduct {
  return {
    id: p.id,
    type: 'local',
    name: p.name,
    priceDisplay: p.price_display,
    description: p.description,
    summary: p.summary,
    category: p.category,
    imageUrl: p.thumbnail_url || p.images?.[0],
    selectedContentTitle: p.selectedContentTitle,
    selectedContentHtml: p.selectedContentHtml,
    selectedContentTranslations: p.selectedContentTranslations,
  };
}

// ── Component ──

export interface TabletKioskPageProps {
  /** HTTP 호출 함수 3종 (서비스 wrapper 가 주입) */
  api: TabletKioskApi;
  /** QR 코드로 진입했는지 표시 (KPA 한정 — Cosmetics 는 false) */
  showQrBadge?: boolean;
  /**
   * Idle mode 활성화 여부.
   * undefined(또는 0) → idle 비활성화 (기존 동작 유지, inactivity timer 등록 안 함).
   * 양수 → 미조작 N ms 후 idle 진입. browse/detail 에서만 진입 허용.
   * 권장 30000~90000.
   */
  idleTimeoutMs?: number;
  /**
   * Idle 화면에서 재생할 playlist. 빈 배열도 허용 (기본 안내 placeholder 표시).
   * 본 패키지는 자체 minimal player 만 제공 (signage runtime 미사용).
   */
  idlePlaylist?: IdlePlaylistItem[];
  /**
   * 매장 전시 설정(WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1, opt-in).
   * undefined / 각 필드 undefined 면 기존 동작 유지(전부 표시, idle 기본 5s).
   * 가격/QR/상담버튼 노출 + idle 전환 시간을 매장이 제어.
   */
  displaySettings?: TabletKioskDisplaySettings;
  /**
   * slug 직접 주입(opt-in). 미지정 시 `useParams().slug` 사용(기존 동작).
   * 라우트 밖 임베드(예: 관리자 미리보기 모달)에서 Router 중첩 없이 slug 를 넘길 때 사용.
   * WO-O4O-KPA-TABLET-PREVIEW-V1.
   */
  slug?: string;
  /**
   * Screen 직접 주입(opt-in). WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1.
   * 지정 시 api.fetchScreen 을 호출하지 않고 이 sections 로 렌더(저장 전 draft 미리보기).
   * mode='screen_set' 인 응답만 의미 있음. 상품은 여전히 api.fetchProducts(slug) 로 조회.
   * 미지정 서비스/경로는 기존 동작(fetchScreen) 그대로.
   */
  previewScreen?: TabletScreenResponse | null;
  /**
   * embedded(미리보기 모달) 모드. WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1.
   * true 면 root/모달을 position:fixed(뷰포트 전체화면) 대신 position:absolute(부모 박스 채움)로 렌더.
   * 부모는 position:relative; overflow:hidden 컨테이너를 제공해야 한다. 미지정=기존 전체화면 kiosk.
   */
  embedded?: boolean;
}

export interface TabletKioskDisplaySettings {
  showPrice?: boolean;
  showQr?: boolean;
  showConsultationButton?: boolean;
  autoSlideSeconds?: number;
  idleSlideSeconds?: number;
}

export function TabletKioskPage({
  api,
  showQrBadge = false,
  idleTimeoutMs,
  idlePlaylist,
  displaySettings,
  slug: slugProp,
  previewScreen,
  embedded = false,
}: TabletKioskPageProps) {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const slug = slugProp ?? routeSlug;
  // WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: embedded 면 root/모달의 position:fixed → absolute(부모 박스 채움).
  const rootStyle = embedded ? { ...styles.fullscreen, position: 'absolute' as const } : styles.fullscreen;
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    mode,
    products,
    loading,
    errorMessage,
    submitting,
    selectedProduct,
    interestId,
    interestStatus,
  } = state;

  // Side-effect refs (reducer 외부에서 관리 — polling interval, auto-reset timeout)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Browse 자동 넘김 (WO-O4O-KPA-TABLET-BROWSE-AUTO-SLIDE-V1)
  //   displaySettings.autoSlideSeconds>0 + browse + 제품 2개+ 일 때만 현재 강조 카드를 순환.
  //   미주입/0/1개 → 타이머 없음(기존 동작). KCos 등 미주입 서비스 무영향.
  const [browseIndex, setBrowseIndex] = useState(0);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  // WO-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1:
  //   상세에서 선택한 표시 언어(null = 기본 선택콘텐츠/기본 설명). 상품이 바뀌면 기본으로 리셋.
  const [detailLocale, setDetailLocale] = useState<string | null>(null);
  useEffect(() => {
    setDetailLocale(null);
  }, [selectedProduct?.id]);

  // WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-RUNTIME-V1:
  //   content_list 카드 상세(모달). product detail(reducer) 와 독립 — 콘텐츠 카드는 상품이 아니므로
  //   기존 상품 상세 흐름을 건드리지 않고 경량 오버레이로 표시. detail.html 은 ContentRenderer 로만 렌더.
  const [openContentCard, setOpenContentCard] = useState<TabletContentCard | null>(null);
  const autoSlideSeconds = displaySettings?.autoSlideSeconds ?? 0;

  useEffect(() => {
    if (mode !== 'browse' || autoSlideSeconds <= 0 || products.length <= 1) return;
    const t = setInterval(() => {
      setBrowseIndex((i) => (i + 1) % products.length);
    }, autoSlideSeconds * 1000);
    return () => clearInterval(t);
  }, [mode, autoSlideSeconds, products.length]);

  // products 변경 시 인덱스 범위 보정
  useEffect(() => {
    if (browseIndex >= products.length) setBrowseIndex(0);
  }, [products.length, browseIndex]);

  // 강조 카드가 화면 안에 보이도록 스크롤(자동 넘김 활성 + browse 일 때만)
  useEffect(() => {
    if (mode !== 'browse' || autoSlideSeconds <= 0 || products.length <= 1) return;
    cardRefs.current[browseIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [browseIndex, mode, autoSlideSeconds, products.length]);

  // Load products (supplier + local merged)
  useEffect(() => {
    if (!slug) return;
    dispatch({ type: 'LOAD_START' });
    api.fetchProducts(slug, { limit: 50 })
      .then((res) => {
        const suppliers = res.data.map(mapSupplierProduct);
        const locals = ((res.localProducts as any[] | undefined) || []).map(mapLocalProduct);
        dispatch({ type: 'LOAD_SUCCESS', products: [...suppliers, ...locals] });
      })
      .catch((e) => dispatch({ type: 'LOAD_ERROR', message: e.message }));
  }, [slug, api]);

  // WO-O4O-KPA-TABLET-KIOSK-CORE-SCREEN-CONSUMER-V1:
  //   적용된 Screen Set 을 opt-in 으로 읽는다. api.fetchScreen 미주입이거나 응답 mode='legacy'
  //   → screen=null → 기존 /products+/idle 동작 그대로. 미주입 서비스(K-Cosmetics 등) 무영향.
  const [fetchedScreen, setFetchedScreen] = useState<TabletScreenResponse | null>(null);
  useEffect(() => {
    // WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: previewScreen 주입 시 fetch 생략(draft sections 사용).
    if (previewScreen) return;
    if (!slug || !api.fetchScreen) return;
    let cancelled = false;
    api.fetchScreen(slug)
      .then((s) => { if (!cancelled) setFetchedScreen(s && s.mode === 'screen_set' ? s : null); })
      .catch(() => { if (!cancelled) setFetchedScreen(null); });
    return () => { cancelled = true; };
  }, [slug, api, previewScreen]);
  // 주입 우선(previewScreen) → 없으면 fetch 결과. mode='screen_set' 인 것만 유효.
  const screen = (previewScreen && previewScreen.mode === 'screen_set') ? previewScreen : fetchedScreen;

  // Screen Set sections → 화면 요소(코너 설명 / QR 안내 / 대기 미디어). screen=null 이면 전부 미적용(legacy).
  const screenSections = screen?.sections ?? [];
  const cornerInfo = (() => {
    const d = screenSections.find((x) => x.blockType === 'corner_description')?.data as any;
    return d && (d.title || d.body) ? { title: String(d.title ?? ''), body: String(d.body ?? '') } : null;
  })();
  const qrGuide = (() => {
    const d = screenSections.find((x) => x.blockType === 'qr_guide')?.data as any;
    return d && (d.label || d.url) ? { label: String(d.label ?? ''), url: String(d.url ?? '') } : null;
  })();
  const screenIdleItems = (() => {
    const items = (screenSections.find((x) => x.blockType === 'idle_media')?.data as any)?.items;
    return Array.isArray(items) ? (items as IdlePlaylistItem[]) : null;
  })();
  // WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-RUNTIME-V1:
  //   서버(/tablet/screen)가 resolve 한 content_list 카드. o4o 표준 설명서/매장 제작 콘텐츠를
  //   상품 record 없이도 코너 콘텐츠 카드로 노출. viewer 는 서버 카드 data 만 소비(재조회 없음).
  const contentCards = (() => {
    const items = (screenSections.find((x) => x.blockType === 'content_list')?.data as any)?.items;
    return Array.isArray(items) ? (items as TabletContentCard[]) : [];
  })();

  // WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-APPLY-V1:
  //   templateKey 별 공개 레이아웃 분기. product_focus = 상품 영역 전면 배치 + 코너 설명 축약 헤더 + QR 하단 보조.
  //   기본(corner_information_basic_v1) 및 legacy(screen=null)는 기존 레이아웃 불변.
  //   새 block 을 요구하지 않고 기존 sections 를 다르게 배치만 한다(§4).
  const templateKey = screen?.templateKey ?? 'corner_information_basic_v1';
  const isProductFocus = templateKey === 'product_focus';
  // WO-O4O-KPA-TABLET-TEMPLATE-THREE-PATTERNS-V1: 신규 3 템플릿 레이아웃 분기(기존 sections 재배치, 새 block 없음).
  //   product_grid_qr = 제품 진열형(축약 헤더 + 밀집 그리드 + 하단 QR)  → isProductLayout 에 포함.
  //   corner_overview_qr = 코너 소개형(코너 설명 + 콘텐츠 + QR, 상품 그리드 생략).
  //   idle_touch_video = 대기 영상형(상단 hero 영상 + 한/영 터치 유도 + QR chip).
  const isProductGrid = templateKey === 'product_grid_qr';
  const isCornerOverview = templateKey === 'corner_overview_qr';
  const isIdleTouch = templateKey === 'idle_touch_video';
  const isProductLayout = isProductFocus || isProductGrid; // 축약 헤더 + 하단 QR 배너
  const hideProductsBody = isCornerOverview; // 코너 소개형: 설명·콘텐츠·QR 중심 → 상품 그리드 생략

  // Submit interest request
  // WO-O4O-KPA-TABLET-PUBLIC-INFO-UX-PRIVACY-INPUT-REMOVAL-V1:
  //   태블릿 V1 은 개인정보를 받지 않는다. 상담 opt-in(showConsultationButton=true) 매장에서만
  //   버튼이 노출되며, 이때도 이름/요청사항 없이 관심(masterId)만 전송한다.
  const handleSubmitInterest = async () => {
    if (!slug || !selectedProduct) return;
    if (selectedProduct.type === 'local') return; // Local products cannot create interest

    dispatch({ type: 'SUBMIT_START' });
    try {
      const result = await api.submitInterest(slug, {
        masterId: selectedProduct.masterId || selectedProduct.id,
      });
      dispatch({ type: 'SUBMIT_SUCCESS', requestId: result.requestId });
    } catch (e: any) {
      dispatch({
        type: 'SUBMIT_ERROR',
        message: e.message || '관심 요청 생성에 실패했습니다.',
      });
    }
  };

  // Poll for status after submit (3s interval, 기존 타이밍 유지)
  useEffect(() => {
    if (mode !== 'submitted' || !slug || !interestId) return;

    const poll = () => {
      api.checkStatus(slug, interestId)
        .then((status) => dispatch({ type: 'STATUS_UPDATE', status }))
        .catch(() => {});
    };
    poll();
    pollRef.current = setInterval(poll, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [mode, slug, interestId, api]);

  // Auto-reset after COMPLETED/CANCELLED (2 min, 기존 타이밍 유지)
  useEffect(() => {
    if (!interestStatus) return;
    if (interestStatus.status === 'COMPLETED' || interestStatus.status === 'CANCELLED') {
      idleRef.current = setTimeout(() => {
        dispatch({ type: 'RESET_TO_BROWSE' });
        if (pollRef.current) clearInterval(pollRef.current);
      }, 120_000);
    }
    return () => {
      if (idleRef.current) clearTimeout(idleRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interestStatus?.status]);

  // 사용자 트리거 reset (submitted "처음으로" 버튼)
  const handleResetToBrowse = () => {
    dispatch({ type: 'RESET_TO_BROWSE' });
    if (pollRef.current) clearInterval(pollRef.current);
  };

  // ── Inactivity detection → IDLE_ENTER (WO-O4O-TABLET-IDLE-LAYER-V1) ──
  // idleTimeoutMs 가 양수일 때만 활성화. browse/detail 에서만 timer 등록.
  // 사용자 interaction(pointerdown/keydown) 시:
  //   - mode === 'idle': 즉시 IDLE_EXIT (overlay 의 onPointerDown 과 별개로 안전망)
  //   - 그 외: timer 재설정
  // submitted/error 에서는 timer 등록 안 함 → polling 중 idle 진입 불가능 (WO 명시).
  useEffect(() => {
    if (!idleTimeoutMs || idleTimeoutMs <= 0) return;

    const isIdleEnterable = IDLE_ENTERABLE_MODES.includes(mode);
    let timer: ReturnType<typeof setTimeout> | null = null;

    const armTimer = () => {
      if (timer) clearTimeout(timer);
      if (isIdleEnterable) {
        timer = setTimeout(() => {
          dispatch({ type: 'IDLE_ENTER' });
        }, idleTimeoutMs);
      }
    };

    const handleInteraction = () => {
      if (mode === 'idle') {
        dispatch({ type: 'IDLE_EXIT' });
        // exit 후 mode='browse' → 다음 effect cycle 에서 timer 재등록됨
        return;
      }
      if (isIdleEnterable) {
        armTimer();
      }
    };

    armTimer();
    window.addEventListener('pointerdown', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [idleTimeoutMs, mode]);

  const statusLabels: Record<string, { label: string; color: string; message: string }> = {
    REQUESTED: { label: '요청 접수됨', color: '#eab308', message: '직원이 곧 확인합니다. 잠시 기다려주세요.' },
    ACKNOWLEDGED: { label: '직원 확인 중', color: '#3b82f6', message: '직원이 요청을 확인했습니다. 곧 안내드리겠습니다.' },
    COMPLETED: { label: '완료', color: '#22c55e', message: '안내가 완료되었습니다. 감사합니다!' },
    CANCELLED: { label: '취소됨', color: '#ef4444', message: '요청이 취소되었습니다.' },
  };

  // ── Error view ──
  if (mode === 'error' || (errorMessage && mode !== 'submitted')) {
    return (
      <div style={rootStyle}>
        <div style={styles.centerMessage}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>!</div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>오류 발생</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>{errorMessage}</p>
          <button onClick={() => dispatch({ type: 'CLEAR_ERROR' })} style={styles.primaryBtn}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // ── Submitted view ──
  if (mode === 'submitted') {
    const st = interestStatus ? statusLabels[interestStatus.status] : statusLabels.REQUESTED;
    const isDone = interestStatus?.status === 'COMPLETED' || interestStatus?.status === 'CANCELLED';
    return (
      <div style={rootStyle}>
        <div style={styles.centerMessage}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: st.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: st.color }} />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
            {st.label}
          </h2>
          <p style={{ color: '#64748b', fontSize: '16px', marginBottom: '32px' }}>
            {st.message}
          </p>
          {interestStatus?.productName && (
            <div style={{ textAlign: 'center', maxWidth: '400px', margin: '0 auto 24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
              <span style={{ fontSize: '15px', color: '#334155' }}>{interestStatus.productName}</span>
            </div>
          )}
          {isDone && (
            <button onClick={handleResetToBrowse} style={styles.primaryBtn}>
              처음으로
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Detail view ──
  if (mode === 'detail' && selectedProduct) {
    const isLocal = selectedProduct.type === 'local';

    // WO-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1:
    //   선택 콘텐츠에 게시 가능 번역이 있으면 언어 버튼 노출. 표시 우선순위:
    //   선택 언어 번역 → 기본 선택콘텐츠(selectedContentHtml) → 기존 제품 설명(description/summary).
    //   고객 화면에는 "콘텐츠 없음" 같은 내부 문구를 노출하지 않는다(버튼/안내만).
    const translations = selectedProduct.selectedContentTranslations || null;
    const localeKeys = translations ? Object.keys(translations) : [];
    const activeTranslation = detailLocale && translations ? translations[detailLocale] ?? null : null;
    const showLangSwitch = localeKeys.length > 0;

    return (
      <div style={rootStyle}>
        {/* WO-O4O-KPA-TABLET-PRODUCT-DETAIL-DESIGN-AND-QR-V1: 상단 헤더 = 뒤로 · 코너명 · QR(항상 표시).
            QR = 현재 코너 콘텐츠의 모바일 화면(screen-set QR). 다른 손님이 자기 휴대전화로 이어서 볼 수 있게 상세에도 유지. */}
        <div style={styles.detailHeader}>
          <button onClick={() => dispatch({ type: 'BACK_TO_BROWSE' })} style={styles.detailHeaderBack} aria-label="뒤로">← 뒤로</button>
          <span style={styles.detailHeaderCorner}>{cornerInfo?.title || '상품 안내'}</span>
          {qrGuide?.url ? (
            <div style={styles.detailHeaderQr}>
              <div style={styles.detailQrText}>
                <span style={styles.detailQrTitle}>휴대전화로 이어서 보기</span>
                <span style={styles.detailQrDesc}>QR을 스캔하세요</span>
              </div>
              <QrImage url={qrGuide.url} size={60} />
            </div>
          ) : <span aria-hidden style={{ width: 1 }} />}
        </div>

        {/* 본문 2단: 왼쪽 이미지(≈40%) · 오른쪽 정보(≈60%).
            inline 스타일만 쓰는 패키지라 media query 대신 flexWrap + flexBasis 로 반응형 —
            넓은 태블릿에선 좌우 2단, 좁은 폭(모바일)에선 자동으로 세로 적층된다. */}
        <div style={styles.detailBody}>
          {/* 왼쪽: 상품 이미지 + 분류 배지 */}
          <div style={styles.detailImageCol}>
            <div style={styles.detailImageBox}>
              {selectedProduct.imageUrl ? (
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' as const }} />
              ) : (
                <div style={{ fontSize: '64px', color: '#cbd5e1' }}>📦</div>
              )}
            </div>
            {selectedProduct.category && (
              <span style={styles.categoryBadge}>{selectedProduct.category}</span>
            )}
          </div>

          {/* 오른쪽: 상품명 · 가격 · 설명 · 안내 */}
          <div style={styles.detailInfoCol}>
            <h2 style={styles.detailName}>{selectedProduct.name}</h2>
            {displaySettings?.showPrice !== false && (
              <p style={styles.detailPrice}>{productPriceText(selectedProduct)}</p>
            )}
            {/* WO-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1:
                게시 가능 번역이 있으면 언어 버튼(기본 + locale별) 노출. 다인종/다언어 고객 응대용.
                번역 생성 기능은 여기서 만들지 않는다(기존 검수 완료 번역만 표시). */}
            {showLangSwitch && (
              <div style={styles.langSwitch}>
                <button
                  onClick={() => setDetailLocale(null)}
                  style={detailLocale === null ? { ...styles.langBtn, ...styles.langBtnActive } : styles.langBtn}
                >
                  기본
                </button>
                {localeKeys.map((code) => (
                  <button
                    key={code}
                    onClick={() => setDetailLocale(code)}
                    style={detailLocale === code ? { ...styles.langBtn, ...styles.langBtnActive } : styles.langBtn}
                  >
                    {localeLabel(code)}
                  </button>
                ))}
              </div>
            )}

            {/* WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1 (+ MULTILINGUAL BRIDGE):
                우선순위 = 선택 언어 번역 → 기본 선택콘텐츠 → 기존 제품 description/summary.
                선택 콘텐츠 삭제/연결 해제 시 백엔드가 null 로 폴백. */}
            {activeTranslation ? (
              <>
                {(activeTranslation.title || selectedProduct.selectedContentTitle) && (
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '4px 0 8px' }}>
                    {activeTranslation.title || selectedProduct.selectedContentTitle}
                  </h3>
                )}
                <ContentRenderer
                  html={activeTranslation.html}
                  style={{ fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}
                />
              </>
            ) : selectedProduct.selectedContentHtml ? (
              <>
                {selectedProduct.selectedContentTitle && (
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '4px 0 8px' }}>
                    {selectedProduct.selectedContentTitle}
                  </h3>
                )}
                <ContentRenderer
                  html={selectedProduct.selectedContentHtml}
                  style={{ fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}
                />
              </>
            ) : (
              <>
                {/* WO-O4O-TABLET-CONTENT-RENDERER-VARIANT-FIX-V1: 이 슬롯은 섞인다 —
                    O4O 상품이면 SPD STORE canonical(설명서), local 상품이면 매장 입력 설명.
                    설명서(sd-*)일 때만 공통 디자인 시스템을 태우고, 그 경우 인라인 글자 크기·색을
                    주지 않는다(15px 이 sd-hero h1 32~44px 과 충돌). 그 외는 기존 렌더 그대로. */}
                {selectedProduct.description && (
                  <ContentRenderer
                    html={selectedProduct.description}
                    variant={hasStoreDescriptionMarkup(selectedProduct.description) ? 'store-description' : undefined}
                    style={
                      hasStoreDescriptionMarkup(selectedProduct.description)
                        ? { margin: '0 0 8px' }
                        : { fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 8px' }
                    }
                  />
                )}
                {selectedProduct.summary && (
                  <ContentRenderer
                    html={selectedProduct.summary}
                    style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px' }}
                  />
                )}
              </>
            )}

            {/* 최종 행동 안내 (WO-O4O-KPA-TABLET-PUBLIC-INFO-UX-PRIVACY-INPUT-REMOVAL-V1
                / WO-O4O-KPA-TABLET-CORNER-PRODUCT-GUIDE-UX-AND-CHROME-OPERABILITY-V1)
                태블릿 V1 = 공용 안내 화면. 개인정보 입력/상담 접수 대신 "직원에게 이 화면 보여주기"로 마무리한다.
                버튼처럼 보이되 접수 동작이 없는 UI 를 피하고, 안내(info) 영역으로 고정한다(click/submit handler 없음). */}
            {isLocal ? (
              <div style={styles.guideNoteLocal}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#92400e', margin: 0 }}>매장에서 직접 안내하는 상품입니다</p>
                <p style={{ fontSize: '14px', color: '#b45309', margin: '4px 0 0' }}>자세한 내용은 이 화면을 직원에게 보여주세요.</p>
              </div>
            ) : (
              <div style={styles.guideNote}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#0369a1', margin: 0 }}>궁금하신 점이 있나요?</p>
                <p style={{ fontSize: '14px', color: '#0284c7', margin: '4px 0 0' }}>이 화면을 직원에게 보여주세요. 직원이 상품을 더 쉽게 안내할 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div style={styles.actionBar}>
          <button
            onClick={() => dispatch({ type: 'BACK_TO_BROWSE' })}
            style={styles.backBtn}
          >
            돌아가기
          </button>
          {/* WO-O4O-KPA-TABLET-PUBLIC-INFO-UX-PRIVACY-INPUT-REMOVAL-V1:
              상담 요청 버튼은 기본 미노출. 매장이 showConsultationButton=true 로 명시적으로 켠 경우에만
              노출한다(개인정보 입력 없이 관심만 전송). displaySettings 미주입(예: 기본 wrapper)이면 노출하지 않는다. */}
          {!isLocal && displaySettings?.showConsultationButton === true && (
            <button
              onClick={handleSubmitInterest}
              disabled={submitting}
              style={{ ...styles.interestBtn, opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? '요청 중...' : '직원에게 안내 요청'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Idle overlay (mode === 'idle' 인 경우만 마운트, 다른 view 위에 z-index 로 덮음) ──
  // 별도 view 렌더링 분기로 두지 않고 마지막 browse render 와 함께 처리하면
  // browse → idle 전환 시 unmount/remount 비용 없이 자연스러움. 다만 본 컴포넌트는
  // 각 mode 별 early-return 구조이므로 idle 도 별도 분기로 처리.
  if (mode === 'idle') {
    return (
      <IdleOverlay
        items={screenIdleItems ?? idlePlaylist ?? []}
        onUserInteraction={() => dispatch({ type: 'IDLE_EXIT' })}
        defaultDurationMs={displaySettings?.idleSlideSeconds ? displaySettings.idleSlideSeconds * 1000 : undefined}
      />
    );
  }

  // ── Browse view ──
  return (
    <div style={rootStyle}>
      {/* WO-O4O-KPA-TABLET-TEMPLATE-THREE-PATTERNS-V1 — 대기 영상형(idle_touch_video):
          상단 hero 영상(idle_media 첫 항목) + 한/영 터치 유도 오버레이 + QR chip. 그 아래로 기존
          섹션(코너 설명/콘텐츠/상품)이 이어져 터치 탐색이 가능하다. */}
      {isIdleTouch && (
        <IdleTouchHero
          items={screenIdleItems}
          qrUrl={qrGuide?.url}
          qrLabel={qrGuide?.label}
        />
      )}

      {/* Header — screen_set 코너 설명 있으면 그 제목/설명, 없으면 기본(legacy).
          product_focus / product_grid_qr(§3.4): 코너 설명은 축약 헤더 → subtitle 생략, compact 패딩.
          WO-O4O-KPA-TABLET-TEMPLATE-USABILITY-REFINE-V1(§5.1·§5.6):
            제목/설명을 좌우 1행(space-between)에서 세로 스택으로 변경 → 제목이 좁은 폭에 눌려
            글자 단위로 세로로 깨지던 문제 해소. 제목 wordBreak:keep-all(한글 단어 보존),
            설명은 별도 문단으로 줄폭/줄간격 확보. clamp() 로 화면 폭 대응. */}
      <div style={isProductLayout ? styles.headerCompact : styles.header}>
        <div style={styles.headerMain}>
          <div style={styles.headerTexts}>
            <div style={styles.headerTitleRow}>
              <h1 style={isProductLayout ? styles.cornerTitleCompact : styles.cornerTitle}>{cornerInfo?.title || '매장 상품 안내'}</h1>
            </div>
            {/* legacy(코너 설명 미주입: GP/KCos 등)는 짧은 안내 힌트만 헤더 subtitle 로 유지 */}
            {!isProductLayout && !cornerInfo?.body && (
              <p style={styles.cornerHint}>궁금한 상품을 터치해 설명을 확인해 보세요</p>
            )}
          </div>
          {/* WO-O4O-KPA-TABLET-DEMO-ALL-TEMPLATES-AND-CORNER-QR-V1: 코너 메인 QR 을 헤더 우상단에 고정.
              모든 템플릿에서 항상 보인다(product 레이아웃에서 하단으로 밀려 안 보이던 결함 해소).
              url 은 서버가 Screen Set public_qr_slug 로 도출(임의 URL 아님).
              idle 은 상단 hero 에 QR chip 이 이미 있어 헤더 QR 은 생략. qrGuide 없으면(legacy) 기존 텍스트 배지 유지. */}
          {qrGuide?.url && !isIdleTouch && displaySettings?.showQr !== false ? (
            <div style={styles.headerQr}>
              <div style={styles.headerQrText}>
                <span style={styles.headerQrTitle}>휴대전화로 보기</span>
                <span style={styles.headerQrDesc}>QR 스캔</span>
              </div>
              <QrImage url={qrGuide.url} size={60} />
            </div>
          ) : (showQrBadge && displaySettings?.showQr !== false && (
            <span style={styles.qrBadge}>QR 코드로 접속</span>
          ))}
        </div>
      </div>

      {/* 코너 설명 섹션 — 코너 제목(header)과 시각적으로 구분된 별도 섹션.
          실제 코너 설명(screen_set corner_description)이 있을 때만 렌더. 긴 문단은 자체 스크롤로
          화면 상단을 독점하지 않게 제한(§5.6). product 레이아웃(축약 헤더)은 설명 섹션 생략. */}
      {!isProductLayout && cornerInfo?.body && (
        <div style={styles.cornerDescSection}>
          <span style={styles.cornerDescLabel}>코너 안내</span>
          {/* WO-O4O-KPA-TABLET-STANDARD-EDITOR-UNIFY-V1: 코너 설명은 표준 편집기(RichTextEditor) 산출 HTML.
              평문 <p>{body}</p> 는 React 이스케이프로 태그가 글자로 보였다 → 기존 ContentRenderer 로 렌더.
              sanitize 는 ContentRenderer(DOMPurify sanitizeRichHtml)가 담당 — raw innerHTML 신규 사용 없음.
              (상품 상세가 이미 쓰는 계약과 동일: types.ts "ContentRenderer 로만 렌더") */}
          <ContentRenderer html={cornerInfo.body} variant="guide" style={styles.cornerBody} />
        </div>
      )}

      {/* WO-O4O-KPA-TABLET-KIOSK-CORE-SCREEN-CONSUMER-V1: qr_guide 안내(screen_set 전용, 있을 때만).
          기본 템플릿은 상단, product_focus 는 하단 보조 배너로 이동(§3.4).
          WO-O4O-KPA-TABLET-TEMPLATE-USABILITY-REFINE-V1(§5.3·§5.4):
            "라벨 + https://... 원문" 나열 → QR 카드(아이콘 + 행동유도 문구 + 짧은 도메인)로 정비.
            전체 URL 대신 shortHost() 도메인만 보조 표기. 데이터(config label/url)는 변경하지 않음. */}
      {/* WO-O4O-KPA-TABLET-DEMO-ALL-TEMPLATES-AND-CORNER-QR-V1:
          상단 전용 QR 카드 제거 → 헤더 우상단 고정 QR 로 통일(모든 템플릿 일관). */}

      {/* WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-RUNTIME-V1: content_list 카드 섹션(§5.1·§5.3).
          product_list(상품 record)와 분리된 "코너 콘텐츠" 카드 목록. 서버 resolve 카드만 소비.
          items 있을 때만 렌더 → 상품 0건이어도 화면이 실사용 가능(§5.4). 상세는 하단 모달(ContentRenderer). */}
      {contentCards.length > 0 && (
        // WO-O4O-KPA-TABLET-TEMPLATE-DESIGN-REFINE-V1: 제품 집중/진열형은 제품을 먼저 보이게 flex order 로 재정렬.
        //   (상품 집중형·제품 진열형인데 제품이 콘텐츠 카드 아래로 밀려 이름과 어긋났다.)
        <div style={{ ...styles.contentListSection, order: isProductLayout ? 6 : 4 }}>
          <span style={styles.contentListLabel}>코너 콘텐츠</span>
          <div style={styles.contentGrid}>
            {contentCards.map((c) => {
              const clickable = c.hasDetail && !!c.detail?.html;
              return (
                <div
                  key={c.itemId}
                  onClick={clickable ? () => setOpenContentCard(c) : undefined}
                  style={clickable ? styles.contentCard : { ...styles.contentCard, cursor: 'default' }}
                >
                  {c.thumbnailUrl && (
                    <div style={styles.contentThumbArea}>
                      <img src={c.thumbnailUrl} alt="" style={styles.productImg} />
                    </div>
                  )}
                  <div style={styles.contentCardBody}>
                    <span style={styles.contentBadge}>{c.sourceBadge}</span>
                    <span style={styles.contentCardTitle}>{c.title}</span>
                    {c.summary && <span style={styles.contentCardSummary}>{c.summary}</span>}
                    {c.relatedProductName && <span style={styles.contentCardRelated}>{c.relatedProductName}</span>}
                    {clickable && <span style={styles.contentCardMore}>자세히 보기 ›</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WO-O4O-KPA-TABLET-TEMPLATE-THREE-PATTERNS-V1: 코너 소개형(corner_overview_qr)은 상품 그리드 생략
          → 코너 설명 + 콘텐츠 카드 + QR 중심의 정적 안내 화면(§3.2). 그 외 템플릿은 기존대로 상품 노출. */}
      {!hideProductsBody && (
      // WO-O4O-KPA-TABLET-TEMPLATE-DESIGN-REFINE-V1: 제품 템플릿은 제품(order 4)이 콘텐츠(order 6)보다 먼저.
      <div style={{ ...styles.body, order: isProductLayout ? 4 : 5 }}>
        {loading ? (
          <div style={styles.centerMessage}>
            <p style={{ color: '#94a3b8' }}>상품을 불러오는 중...</p>
          </div>
        ) : products.length === 0 ? (
          // WO-O4O-KPA-TABLET-TEMPLATE-USABILITY-REFINE-V1(§5.5) / -CONTENT-LIST-BLOCK-RUNTIME-V1(§5.4):
          //   빈 화면 한 줄 → 카드형 empty state. 단, content_list 카드가 있으면 이미 화면이 차므로
          //   상품 empty state 를 표시하지 않는다(과도한 빈 강조 방지).
          contentCards.length > 0 ? null : (
          <div style={styles.emptyWrap}>
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon} aria-hidden>🗂️</div>
              <p style={styles.emptyTitle}>이 코너의 상품을 준비 중입니다</p>
              <p style={styles.emptyDesc}>코너 안내를 확인하시고, 필요한 제품은 직원에게 문의해 주세요.</p>
            </div>
          </div>
          )
        ) : (
          <div style={isProductFocus ? styles.gridFocus : styles.grid}>
            {products.map((p, idx) => {
              const highlighted = autoSlideSeconds > 0 && products.length > 1 && idx === browseIndex;
              return (
              <div
                key={`${p.type}-${p.id}`}
                ref={(el) => { cardRefs.current[idx] = el; }}
                onClick={() => { setBrowseIndex(idx); dispatch({ type: 'SELECT_PRODUCT', product: p }); }}
                style={highlighted ? { ...styles.productCard, outline: '3px solid #14b8a6', outlineOffset: '2px', transform: 'scale(1.02)' } : styles.productCard}
              >
                <div style={isProductFocus ? styles.productImgAreaFocus : styles.productImgArea}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={styles.productImg} />
                  ) : (
                    <div style={{ fontSize: '32px', color: '#cbd5e1' }}>📦</div>
                  )}
                </div>
                <div style={styles.productInfo}>
                  <span style={styles.productName}>{p.name}</span>
                  {displaySettings?.showPrice !== false && (
                    <span style={styles.productPrice}>
                      {productPriceText(p)}
                    </span>
                  )}
                </div>
                {p.type === 'local' && (
                  <div style={styles.localBadge}>자체</div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* product 레이아웃(product_focus / product_grid_qr, §3.4): qr_guide 는 하단 보조 배너로 배치(있을 때만).
          기본/코너 소개형은 상단에서 이미 렌더됨.
          WO-O4O-KPA-TABLET-TEMPLATE-USABILITY-REFINE-V1: 상단 카드와 동일 정비(도메인만, 원문 URL 미노출). */}
      {/* WO-O4O-KPA-TABLET-DEMO-ALL-TEMPLATES-AND-CORNER-QR-V1:
          하단 보조 QR 배너 제거 → 헤더 우상단 고정 QR 로 통일(제품 템플릿에서 QR 이 스크롤 아래로 밀려 안 보이던 결함 해소). */}

      {/* WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-RUNTIME-V1: content_list 카드 상세(모달).
          detail.html 은 ContentRenderer(DOMPurify)로만 렌더 — raw innerHTML 금지. */}
      {openContentCard && (
        <div style={embedded ? { ...styles.contentModalOverlay, position: 'absolute' as const } : styles.contentModalOverlay} onClick={() => setOpenContentCard(null)} role="presentation">
          <div style={styles.contentModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.contentModalHeader}>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px', minWidth: 0 }}>
                <span style={styles.contentBadge}>{openContentCard.sourceBadge}</span>
                <h2 style={styles.contentModalTitle}>{openContentCard.title}</h2>
                {openContentCard.relatedProductName && (
                  <span style={styles.contentCardRelated}>{openContentCard.relatedProductName}</span>
                )}
              </div>
              <button onClick={() => setOpenContentCard(null)} style={styles.contentModalClose} aria-label="닫기">✕</button>
            </div>
            {/* WO-O4O-TABLET-CONTENT-RENDERER-VARIANT-FIX-V1: 이 슬롯도 섞인다 —
                sourceType='o4o_product_description' 이어도 sd-* 설명서(OTC)와 평문 설명(e약은요)이
                모두 온다. 그래서 sourceType 이 아니라 마크업으로 판별한다. */}
            <div style={styles.contentModalBody}>
              {hasStoreDescriptionMarkup(openContentCard.detail?.html) ? (
                <ContentRenderer html={openContentCard.detail?.html ?? ''} variant="store-description" />
              ) : (
                <ContentRenderer
                  html={openContentCard.detail?.html ?? ''}
                  style={{ fontSize: '15px', color: '#334155', lineHeight: 1.65 }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Idle Overlay (internal, minimal player) ───────────────────────────────────
// 자체 minimal player. signage runtime 을 import 하지 않음.
//   - image: durationMs (default 5000) 후 다음 항목
//   - video: onEnded 시 다음 항목
//   - youtube/vimeo: iframe 무음 자동재생 + loop. durationMs 지정 시 그 시간 후 다음 항목(미지정=단일 반복)
//   - 빈 playlist: "화면을 터치해주세요" placeholder
//   - 컨테이너 onPointerDown → IDLE_EXIT (window-level handler 와 이중 안전망)
//   - iframe(youtube/vimeo)은 pointer 이벤트를 삼키므로 투명 tap-catcher 를 위에 덮어 터치 복귀 보장.

// WO-O4O-KPA-TABLET-TEMPLATE-THREE-PATTERNS-V1:
//   화면 QR = 그 화면(코너 안내)을 여는 스캔 가능한 QR. qr_guide.url(운영자 설정)을 client-side SVG 로 렌더.
//   백엔드/entity/저장 모델 무추가 — 이미 존재하는 qr_guide.url 만 소비. url 없으면 렌더 안 함(호출부 fallback).
function QrImage({ url, size = 72 }: { url: string; size?: number }) {
  if (!url) return null;
  return (
    <div style={styles.qrImageBox}>
      <QRCodeSVG value={url} size={size} bgColor="#ffffff" fgColor="#0f172a" level="M" />
    </div>
  );
}

// WO-O4O-KPA-TABLET-TEMPLATE-THREE-PATTERNS-V1 — 대기 영상형 hero.
//   idle_media 첫 항목을 상단 배너 영상/이미지로 재생(브라우즈 모드, 단일 loop) + 한/영 터치 유도 오버레이 + QR chip.
//   오버레이는 pointerEvents:none 으로 하단 콘텐츠 터치를 막지 않는다. 항목 없으면 안내 문구만.
/** 하단 안내 바용 약한 터치 아이콘(WO-O4O-KPA-TABLET-IDLE-TOUCH-HINT-BAR-V1).
 *  이 패키지는 인라인 스타일만 쓰므로(@keyframes 주입 없음) 애니메이션 대신 정적 아이콘을 쓴다. */
function TouchHintIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.9 }} aria-hidden>
      <path d="M9 11V6a2 2 0 1 1 4 0v5" />
      <path d="M13 11V9a2 2 0 1 1 4 0v2" />
      <path d="M17 11v-.5a2 2 0 1 1 4 0V15a6 6 0 0 1-6 6h-2a7 7 0 0 1-7-7v-3a2 2 0 1 1 4 0" />
    </svg>
  );
}

function IdleTouchHero({ items, qrUrl, qrLabel }: { items: IdlePlaylistItem[] | null; qrUrl?: string; qrLabel?: string }) {
  const first = items && items.length > 0 ? items[0] : null;
  const embedUrl =
    first && (first.type === 'youtube' || first.type === 'vimeo') ? toIdleEmbedUrl(first.url) : null;
  return (
    <div style={styles.heroWrap}>
      {first?.type === 'image' && <img src={first.url} alt="" style={styles.heroMedia} draggable={false} />}
      {first?.type === 'video' && (
        <video src={first.url} autoPlay muted loop playsInline style={styles.heroMedia} />
      )}
      {(first?.type === 'youtube' || first?.type === 'vimeo') && embedUrl && (
        <iframe
          src={embedUrl}
          title="대기화면 영상"
          allow="autoplay; encrypted-media; picture-in-picture"
          style={styles.heroMedia}
        />
      )}
      {!first && <div style={styles.heroPlaceholder} aria-hidden />}
      {/* WO-O4O-KPA-TABLET-IDLE-TOUCH-HINT-BAR-V1:
          영상/이미지가 있으면 **중앙 대형 안내를 쓰지 않는다** — 광고·홍보 영상을 가리기 때문.
          대신 하단의 얇은 반투명 보조 안내 바만 얹는다(영상 전체는 계속 터치 영역: pointerEvents:none).
          중앙 대형 안내는 미디어가 아예 없을 때의 **기본 대체 화면**으로만 남긴다. */}
      {first ? (
        <div style={styles.heroHintBar}>
          <TouchHintIcon />
          <span style={styles.heroHintKo}>화면을 터치하여 자세히 보세요</span>
          <span style={styles.heroHintEn}>Touch to explore</span>
        </div>
      ) : (
        <div style={styles.heroOverlay}>
          <span style={styles.heroTouchKo}>화면을 터치하세요</span>
          <span style={styles.heroTouchEn}>Touch to start</span>
        </div>
      )}
      {qrUrl && (
        <div style={styles.heroQr}>
          <QrImage url={qrUrl} size={64} />
          <span style={styles.heroQrText}>{qrLabel || 'QR로 같은 화면 보기'}</span>
        </div>
      )}
    </div>
  );
}

interface IdleOverlayProps {
  items: IdlePlaylistItem[];
  onUserInteraction: () => void;
  /** 항목별 durationMs 미지정 시 적용할 매장 전시 설정 기본 전환 시간(ms). 미지정 시 5s. */
  defaultDurationMs?: number;
}

function IdleOverlay({ items, onUserInteraction, defaultDurationMs }: IdleOverlayProps) {
  const [index, setIndex] = useState(0);
  const safeIndex = items.length > 0 ? index % items.length : 0;
  const current = items.length > 0 ? items[safeIndex] : null;

  // 자동 진행:
  //   - image: durationMs → defaultDurationMs → 패키지 기본값
  //   - youtube/vimeo: durationMs 지정 시에만(미지정이면 iframe loop 로 단일 반복 — V1 허용)
  //   - video: onEnded 로 진행(여기서 타이머 없음)
  useEffect(() => {
    if (!current || items.length <= 1) return;
    let ms: number | null = null;
    if (current.type === 'image') {
      ms = current.durationMs ?? defaultDurationMs ?? DEFAULT_IDLE_IMAGE_DURATION_MS;
    } else if (current.type === 'youtube' || current.type === 'vimeo') {
      ms = current.durationMs ?? null;
    }
    if (ms == null) return;
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ms);
    return () => clearTimeout(t);
  }, [current, items.length, defaultDurationMs]);

  const embedUrl =
    current && (current.type === 'youtube' || current.type === 'vimeo')
      ? toIdleEmbedUrl(current.url)
      : null;

  return (
    <div
      style={styles.idleOverlay}
      onPointerDown={onUserInteraction}
      role="presentation"
    >
      {!current && (
        <div style={styles.idleEmpty}>
          <span style={{ fontSize: '20px', color: '#cbd5e1' }}>
            화면을 터치해주세요
          </span>
        </div>
      )}
      {current?.type === 'image' && (
        <img src={current.url} alt="" style={styles.idleMedia} draggable={false} />
      )}
      {current?.type === 'video' && (
        <video
          src={current.url}
          autoPlay
          muted
          playsInline
          /* WO-O4O-KPA-TABLET-IDLE-VIDEO-URL-ONLY-V1:
             단일 항목이면 onEnded 의 (0+1)%1=0 → setIndex(0) 이 같은 값이라 리렌더가 없어
             영상이 끝난 뒤 멈춰 있었다. 항목이 1개일 때는 loop 로 계속 재생한다.
             (2개 이상이면 loop 시 onEnded 가 안 와 순환이 멈추므로 기존 onEnded 유지) */
          loop={items.length <= 1}
          onEnded={() => {
            if (items.length > 1) setIndex((i) => (i + 1) % items.length);
          }}
          style={styles.idleMedia}
        />
      )}
      {(current?.type === 'youtube' || current?.type === 'vimeo') && (
        embedUrl ? (
          <div style={styles.idleEmbedWrap}>
            <iframe
              src={embedUrl}
              title="대기화면 영상"
              allow="autoplay; encrypted-media; picture-in-picture"
              style={styles.idleEmbed}
            />
            {/* iframe 이 터치를 삼키므로 투명 캐처로 터치 → idle 종료(상품 안내로 복귀) */}
            <div
              style={styles.idleTapCatcher}
              onPointerDown={onUserInteraction}
              role="presentation"
            />
          </div>
        ) : (
          <div style={styles.idleEmpty}>
            <span style={{ fontSize: '16px', color: '#cbd5e1' }}>
              화면을 터치해주세요
            </span>
          </div>
        )
      )}
      {/* WO-O4O-KPA-TABLET-IDLE-VIDEO-URL-ONLY-V1: 영상이 재생될 때만 하단의 작은 터치 안내.
          중앙 대형 문구는 쓰지 않는다(광고·홍보 영상을 가림). pointerEvents:none 이라
          화면 전체가 그대로 터치 영역(iframe 은 idleTapCatcher 가 처리). */}
      {current && (
        <div style={styles.heroHintBar}>
          <TouchHintIcon />
          <span style={styles.heroHintKo}>화면을 터치하여 자세히 보세요</span>
          <span style={styles.heroHintEn}>Touch to explore</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fullscreen: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  // WO-O4O-KPA-TABLET-TEMPLATE-USABILITY-REFINE-V1(§5.1·§5.6):
  //   제목/설명을 세로 스택으로. 좌우 space-between 1행 배치 시 제목이 눌려 글자 단위로
  //   세로로 깨지던 문제 해소. 제목은 headerTitleRow(가로)에서 badge 와 나란히, 설명은 아래 문단.
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: 'clamp(12px, 2vw, 18px) clamp(16px, 3vw, 28px)',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  // WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-APPLY-V1: product_focus 축약 헤더(코너 설명 최소화, 상품 영역 우선).
  headerCompact: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: 'clamp(8px, 1.4vw, 12px) clamp(16px, 3vw, 28px)',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  // 제목 + QR 배지 행(가로, 좁으면 wrap). 제목이 전체 폭을 확보해 세로 깨짐 없음.
  headerTitleRow: {
    display: 'flex',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: '8px',
  },
  // WO-O4O-KPA-TABLET-DEMO-ALL-TEMPLATES-AND-CORNER-QR-V1: 헤더 = 제목(좌) + QR(우상단 고정)
  headerMain: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
  },
  headerTexts: { minWidth: 0, flex: 1 },
  headerQr: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 10px 6px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    flexShrink: 0,
  },
  headerQrText: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' },
  headerQrTitle: { fontSize: 'clamp(11px, 1.3vw, 13px)', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' },
  headerQrDesc: { fontSize: 'clamp(9px, 1vw, 11px)', color: '#64748b', whiteSpace: 'nowrap' },
  cornerTitle: {
    fontSize: 'clamp(18px, 2.4vw, 26px)',
    fontWeight: 700,
    lineHeight: 1.25,
    margin: 0,
    // 한글 단어가 글자 단위로 쪼개지지 않도록(피/부/관/리 방지). 필요 시 단어 경계에서만 줄바꿈.
    wordBreak: 'keep-all',
    overflowWrap: 'break-word',
  },
  cornerTitleCompact: {
    fontSize: 'clamp(16px, 1.8vw, 19px)',
    fontWeight: 700,
    lineHeight: 1.25,
    margin: 0,
    wordBreak: 'keep-all',
    overflowWrap: 'break-word',
  },
  cornerBody: {
    fontSize: 'clamp(13px, 1.5vw, 15px)',
    color: '#475569',
    lineHeight: 1.65,
    margin: 0,
    maxWidth: '70ch',
    wordBreak: 'keep-all',
    overflowWrap: 'break-word',
  },
  // legacy(코너 설명 미주입) 헤더 안내 힌트 — 코너 설명 섹션과 구분되는 짧은 보조문구.
  cornerHint: {
    fontSize: 'clamp(13px, 1.5vw, 14px)',
    color: '#94a3b8',
    lineHeight: 1.5,
    margin: 0,
  },
  // 코너 설명 섹션 — 제목(header)과 시각적으로 구분(다른 배경 + 라벨 + 상단 구분선).
  //   긴 문단이 화면 상단을 독점하지 않도록 maxHeight + 자체 스크롤(§5.6).
  cornerDescSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: 'clamp(12px, 2vw, 18px) clamp(16px, 3vw, 28px)',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
    maxHeight: '30vh',
    overflowY: 'auto',
  },
  cornerDescLabel: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: '#94a3b8',
  },
  qrBadge: {
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    padding: '2px 8px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  // WO-O4O-KPA-TABLET-TEMPLATE-USABILITY-REFINE-V1(§5.2): minmax(min(px,100%),1fr) 로 아주 좁은 폭에서도
  //   한 열이 화면 밖으로 넘치지 않게(가로 overflow 방지). 폭에 따라 1~n 열 자연 대응.
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
    gap: '12px',
  },
  // WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-APPLY-V1: product_focus 상품 그리드(더 큰 타일 = 상품 전면 배치).
  gridFocus: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
    gap: '16px',
  },
  productCard: {
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'border-color 0.15s, transform 0.1s',
  },
  productImgArea: {
    height: '140px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  // WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-APPLY-V1: product_focus 는 이미지 영역을 더 크게(상품 강조).
  productImgAreaFocus: {
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  productImg: {
    maxHeight: '100%',
    maxWidth: '100%',
    objectFit: 'contain' as const,
  },
  productInfo: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  productName: {
    fontSize: '14px',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  productPrice: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#2563eb',
  },
  localBadge: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: '#f59e0b',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
  },
  // Detail view
  detailImageArea: {
    height: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    flexShrink: 0,
  },
  detailInfo: {
    padding: '24px',
    flex: 1,
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontSize: '13px',
    fontWeight: 500,
  },
  // ── WO-O4O-KPA-TABLET-PRODUCT-DETAIL-DESIGN-AND-QR-V1: 상품 상세 2단 + QR ──
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    padding: '12px 20px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  detailHeaderBack: {
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#334155',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
  detailHeaderCorner: {
    flex: 1,
    minWidth: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  detailHeaderQr: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 10px 6px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    flexShrink: 0,
  },
  detailQrText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  detailQrTitle: { fontSize: '12.5px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' },
  detailQrDesc: { fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' },
  detailBody: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    gap: '24px',
    padding: '24px',
    maxWidth: '1180px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  detailImageCol: {
    flex: '1 1 300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  detailImageBox: {
    width: '100%',
    aspectRatio: '4 / 3',
    maxHeight: '420px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    border: '1px solid #eef2f7',
    padding: '16px',
    boxSizing: 'border-box',
  },
  detailInfoCol: {
    flex: '2 1 360px',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  detailName: {
    fontSize: '26px',
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1.3,
    margin: '0 0 6px',
    wordBreak: 'keep-all',
  },
  detailPrice: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#2563eb',
    margin: '0 0 18px',
  },
  actionBar: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px',
    backgroundColor: '#fff',
    borderTop: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  backBtn: {
    padding: '14px 24px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#334155',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    flex: 1,
  },
  interestBtn: {
    padding: '14px 24px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#f59e0b',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    flex: 2,
  },
  // WO-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1: 언어 선택 버튼(터치 대응 min 44px)
  langSwitch: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    margin: '0 0 16px',
  },
  langBtn: {
    minHeight: '44px',
    padding: '8px 16px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#fff',
    color: '#334155',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  langBtnActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
  },
  primaryBtn: {
    padding: '14px 24px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  centerMessage: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    textAlign: 'center' as const,
    padding: '48px',
  },
  // "직원에게 보여주기" 안내 영역 (info, 접수 동작 없음 — click/submit handler 미부착)
  guideNote: {
    padding: '14px 16px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    margin: '16px 0',
  },
  guideNoteLocal: {
    padding: '14px 16px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    margin: '16px 0',
  },
  // WO-O4O-KPA-TABLET-TEMPLATE-USABILITY-REFINE-V1(§5.4): QR 안내 카드(상단/하단 공통 셸).
  //   아이콘 + 행동유도 문구 + 짧은 도메인. 좁은 폭에서 도메인이 아래로 wrap(overflow 방지).
  qrCard: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    padding: 'clamp(10px, 1.6vw, 14px) clamp(16px, 3vw, 28px)',
    backgroundColor: '#eff6ff',
    borderBottom: '1px solid #dbeafe',
    flexShrink: 0,
  },
  qrCardBottom: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    padding: 'clamp(10px, 1.6vw, 14px) clamp(16px, 3vw, 28px)',
    backgroundColor: '#eff6ff',
    borderTop: '1px solid #dbeafe',
    flexShrink: 0,
  },
  qrCardIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    flexShrink: 0,
  },
  qrCardText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
    flex: 1,
  },
  qrCardTitle: {
    fontSize: 'clamp(14px, 1.6vw, 16px)',
    fontWeight: 700,
    color: '#1e3a8a',
  },
  qrCardDesc: {
    fontSize: 'clamp(12px, 1.4vw, 13px)',
    color: '#3b6fb5',
    lineHeight: 1.5,
    wordBreak: 'keep-all',
    overflowWrap: 'break-word',
  },
  qrCardDomain: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#2563eb',
    backgroundColor: '#fff',
    border: '1px solid #dbeafe',
    borderRadius: '6px',
    padding: '4px 10px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  // WO-O4O-KPA-TABLET-TEMPLATE-THREE-PATTERNS-V1: 실제 QR 이미지 박스(흰 배경 여백 → 스캔 안정성).
  qrImageBox: {
    backgroundColor: '#ffffff',
    padding: '6px',
    borderRadius: '8px',
    border: '1px solid #dbeafe',
    lineHeight: 0,
    flexShrink: 0,
  },
  // 대기 영상형(idle_touch_video) hero — 상단 배너 영상 + 터치 유도 + QR chip.
  heroWrap: {
    position: 'relative',
    width: '100%',
    height: 'clamp(180px, 34vh, 360px)',
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    flexShrink: 0,
    borderBottom: '1px solid #e2e8f0',
  },
  heroMedia: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    border: 'none',
    display: 'block',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    textAlign: 'center',
    pointerEvents: 'none',
    background: 'linear-gradient(0deg, rgba(15,23,42,0.45) 0%, rgba(15,23,42,0.05) 40%, rgba(15,23,42,0.15) 100%)',
  },
  // WO-O4O-KPA-TABLET-IDLE-TOUCH-HINT-BAR-V1: 미디어가 있을 때의 하단 보조 안내 바.
  //   영상 위에 얇게 얹히고(높이 ≈ hero 의 10%), pointerEvents:none 이라 영상 전체가 터치 영역으로 남는다.
  //   위쪽으로 투명해지는 그라디언트라 영상 경계가 딱딱하게 잘리지 않는다.
  //   (기본 = 하단. 광고 자막이 하단에 있는 경우를 위한 '상단 안내' 변형은 실제 요구 확인 시 추가.)
  heroHintBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 'clamp(26px, 10%, 40px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    padding: '0 12px',
    overflow: 'hidden',
    pointerEvents: 'none',
    background: 'linear-gradient(0deg, rgba(15,23,42,0.72) 0%, rgba(15,23,42,0.5) 65%, rgba(15,23,42,0) 100%)',
  },
  heroHintKo: {
    fontSize: 'clamp(11px, 1.5vw, 15px)',
    fontWeight: 700,
    color: '#ffffff',
    whiteSpace: 'nowrap',
    textShadow: '0 1px 6px rgba(0,0,0,0.5)',
  },
  heroHintEn: {
    fontSize: 'clamp(9px, 1.05vw, 12px)',
    fontWeight: 500,
    color: '#cbd5e1',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
  },
  heroTouchKo: {
    fontSize: 'clamp(22px, 4vw, 40px)',
    fontWeight: 800,
    color: '#ffffff',
    textShadow: '0 2px 12px rgba(0,0,0,0.55)',
    wordBreak: 'keep-all',
  },
  heroTouchEn: {
    fontSize: 'clamp(13px, 2vw, 20px)',
    fontWeight: 600,
    color: '#e2e8f0',
    letterSpacing: '0.04em',
    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
  },
  heroQr: {
    position: 'absolute',
    right: 'clamp(12px, 2vw, 24px)',
    bottom: 'clamp(12px, 2vw, 24px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: '8px',
    borderRadius: '10px',
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
  },
  heroQrText: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#1e3a8a',
    maxWidth: '96px',
    textAlign: 'center',
    lineHeight: 1.3,
    wordBreak: 'keep-all',
  },
  // WO-O4O-KPA-TABLET-TEMPLATE-USABILITY-REFINE-V1(§5.5): 상품 0건 카드형 empty state.
  emptyWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
    padding: '24px',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '8px',
    maxWidth: '420px',
    width: '100%',
    padding: 'clamp(24px, 4vw, 40px)',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
  },
  emptyIcon: {
    fontSize: '40px',
    lineHeight: 1,
    marginBottom: '4px',
  },
  emptyTitle: {
    fontSize: 'clamp(15px, 1.8vw, 18px)',
    fontWeight: 700,
    color: '#334155',
    margin: 0,
  },
  emptyDesc: {
    fontSize: 'clamp(13px, 1.5vw, 14px)',
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
    wordBreak: 'keep-all',
    overflowWrap: 'break-word',
  },
  // WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-RUNTIME-V1: content_list 카드 섹션 + 상세 모달.
  contentListSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: 'clamp(12px, 2vw, 18px) clamp(16px, 3vw, 28px)',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
    maxHeight: '48vh',
    overflowY: 'auto',
  },
  contentListLabel: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: '#94a3b8',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
    gap: '12px',
  },
  contentCard: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  contentThumbArea: {
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  contentCardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px 14px',
  },
  contentBadge: {
    alignSelf: 'flex-start',
    fontSize: '11px',
    fontWeight: 700,
    color: '#1d4ed8',
    backgroundColor: '#eff6ff',
    borderRadius: '4px',
    padding: '2px 8px',
  },
  contentCardTitle: {
    fontSize: 'clamp(14px, 1.6vw, 16px)',
    fontWeight: 700,
    color: '#0f172a',
    wordBreak: 'keep-all',
    overflowWrap: 'break-word',
  },
  contentCardSummary: {
    fontSize: 'clamp(12px, 1.4vw, 13px)',
    color: '#64748b',
    lineHeight: 1.5,
    wordBreak: 'keep-all',
    overflowWrap: 'break-word',
  },
  contentCardRelated: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  contentCardMore: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#2563eb',
    marginTop: '2px',
  },
  contentModalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15,23,42,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    zIndex: 900,
  },
  contentModal: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '640px',
    maxHeight: '86vh',
    backgroundColor: '#fff',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  contentModalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '18px 20px',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  contentModalTitle: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
    color: '#0f172a',
    wordBreak: 'keep-all',
    overflowWrap: 'break-word',
  },
  contentModalClose: {
    flexShrink: 0,
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#334155',
    fontSize: '16px',
    cursor: 'pointer',
  },
  contentModalBody: {
    padding: '20px',
    overflowY: 'auto',
  },
  // Idle overlay (WO-O4O-TABLET-IDLE-LAYER-V1)
  idleOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 999,
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  idleMedia: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain' as const,
  },
  // WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1: YouTube/Vimeo iframe + tap-catcher
  idleEmbedWrap: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
  },
  idleEmbed: {
    width: '100%',
    height: '100%',
    border: 0,
    display: 'block',
  },
  idleTapCatcher: {
    position: 'absolute' as const,
    inset: 0,
    cursor: 'pointer',
    background: 'transparent',
  },
  idleEmpty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
};

export default TabletKioskPage;
