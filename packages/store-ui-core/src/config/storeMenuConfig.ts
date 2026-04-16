/**
 * Store Dashboard Menu Configuration
 * WO-STORE-CORE-MENU-ALIGNMENT-V1 Phase 2 Step 1
 *
 * Store Core v1.0 기준 8개 메뉴 고정 + 서비스별 활성화 설정
 *
 * 이전 키 → 신규 키 매핑:
 *   overview   → dashboard
 *   identity   → (settings 하위로 강등)
 *   storefront → (settings 하위로 강등)
 *   settlement → billing
 *   display    → signage
 *   services   → (settings 하위로 강등)
 *   (신규)      → channels
 */

export type StoreMenuKey =
  | 'dashboard'
  | 'products'
  | 'local-products'
  | 'channels'
  | 'orders'
  | 'content'
  | 'signage'
  | 'billing'
  | 'settings';

/** Section-based menu item (WO-O4O-STORE-HUB-STRUCTURE-REFACTOR-V1) */
export interface StoreMenuSectionItem {
  key: string;
  label: string;
  subPath: string;
}

/** Grouped menu section with optional header label */
export interface StoreMenuSection {
  label: string;  // 빈 문자열이면 헤더 미표시
  items: StoreMenuSectionItem[];
}

export interface StoreDashboardConfig {
  serviceKey: string;
  serviceName: string;
  basePath: string;
  enabledMenus: StoreMenuKey[];
  /** Section-based menu (제공 시 flat enabledMenus 대신 사용) */
  menuSections?: StoreMenuSection[];
}

export interface StoreMenuItemDef {
  key: StoreMenuKey;
  label: string;
  subPath: string; // '' for index route
}

/** Store Core v1.0 기준 메뉴 (순서 고정, 8개) */
export const ALL_STORE_MENUS: StoreMenuItemDef[] = [
  { key: 'dashboard', label: '대시보드', subPath: '' },
  { key: 'products', label: '상품 관리', subPath: '/products' },
  { key: 'local-products', label: '자체 상품', subPath: '/local-products' },
  { key: 'channels', label: '채널 관리', subPath: '/channels' },
  { key: 'orders', label: '주문 관리', subPath: '/orders' },
  { key: 'content', label: '콘텐츠 관리', subPath: '/content' },
  { key: 'signage', label: '사이니지', subPath: '/signage' },
  { key: 'billing', label: '정산/인보이스', subPath: '/billing' },
  { key: 'settings', label: '설정', subPath: '/settings' },
];

/** K-Cosmetics Store Config */
export const COSMETICS_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'cosmetics',
  serviceName: 'K-Cosmetics',
  basePath: '/store',
  enabledMenus: [
    'dashboard', 'products', 'local-products', 'channels', 'orders',
    'billing', 'content', 'settings',
  ],
};

/**
 * GlycoPharm Store Config
 * WO-O4O-GLYCOPHARM-NAVIGATION-AND-STORE-STRUCTURE-REFINE-V1:
 *   flat enabledMenus → 섹션형 menuSections (4개 그룹)
 *   개요 / 운영 / 마케팅·콘텐츠 / 경영 / 설정
 */
export const GLYCOPHARM_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'glycopharm',
  serviceName: 'GlycoPharm 약국',
  basePath: '/store',
  enabledMenus: ['dashboard'],   // section 모드에서는 미사용, 하위 호환용으로 유지
  menuSections: [
    {
      label: '',
      items: [
        { key: 'dashboard', label: '대시보드', subPath: '/hub' },
      ],
    },
    {
      label: '운영',
      items: [
        { key: 'products',        label: '상품 관리',    subPath: '/products' },
        { key: 'local-products',  label: '자체 상품',    subPath: '/local-products' },
        { key: 'b2b-order',       label: 'B2B 주문',     subPath: '/b2b-order' },
        { key: 'orders',          label: '주문 내역',    subPath: '/orders' },
        { key: 'tablet-displays', label: '태블릿 진열',  subPath: '/tablet-displays' },
        { key: 'requests',        label: '고객 요청',    subPath: '/requests' },
      ],
    },
    {
      label: '마케팅·콘텐츠',
      items: [
        { key: 'market-trial', label: 'Market Trial', subPath: '/market-trial' },
        { key: 'funnel',       label: '전환 퍼널',      subPath: '/funnel' },
        { key: 'content',      label: '콘텐츠 가져오기', subPath: '/content' },
        { key: 'channels',     label: '채널 관리',      subPath: '/channels' },
        { key: 'signage',      label: '사이니지',        subPath: '/signage' },
      ],
    },
    {
      label: '경영',
      items: [
        { key: 'management', label: '약국 경영', subPath: '/management' },
        { key: 'billing',    label: '정산/인보이스', subPath: '/billing' },
      ],
    },
    {
      label: '설정',
      items: [
        { key: 'settings', label: '설정', subPath: '/settings' },
      ],
    },
  ],
};

/**
 * KPA-Society Store Config
 * WO-KPA-STORE-SIDEBAR-REALIGNMENT-V1
 * WO-KPA-PHARMACY-HUB-NAVIGATION-RESTRUCTURE-V1:
 *   - 약국 정보 섹션 추가 (대시보드 아래)
 *   - 주문 가능 상품 제거 (canonical: /hub/b2b)
 *
 * WO-KPA-A-STORE-HOME-AND-SIDEBAR-RESTRUCTURE-V1:
 *   - 8섹션/20항목 → 5섹션/13항목 재구성
 *   - 대시보드→홈, 운영+마케팅→콘텐츠+홍보, 채널/디바이스·구매 섹션 제거
 *   - 미완성 메뉴 비노출 (B2C, 주문 작업대, 구매 내역)
 *   - 상품 관리(B2B)→상품 관리 명칭 정리
 *
 * WO-STORE-HIDDEN-ROUTES-UNHIDE-V1:
 *   - "매장 디스플레이" 섹션 신설 (4항목 flat 구조)
 *   - signage를 "콘텐츠"에서 "매장 디스플레이"로 이동
 *   - 매장 진열 상품(B2C), 채널 현황, 매장 사이니지, 태블릿 진열 정식 노출
 *   - 순서: 매장 진열 상품 → 채널 현황 → 매장 사이니지 → 태블릿 진열
 */
export const KPA_SOCIETY_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'kpa-society',
  serviceName: '약국 경영지원',
  basePath: '/store',
  enabledMenus: ['dashboard'],
  menuSections: [
    { label: '', items: [
      { key: 'home', label: '홈', subPath: '' },
      { key: 'pharmacy-info', label: '약국 정보', subPath: '/info' },
    ]},
    { label: '콘텐츠', items: [
      { key: 'library', label: '자료실', subPath: '/operation/library' },
      { key: 'blog', label: '블로그', subPath: '/content/blog' },
    ]},
    { label: '홍보', items: [
      { key: 'qr', label: 'QR 관리', subPath: '/marketing/qr' },
      { key: 'pop', label: 'POP 자료', subPath: '/marketing/pop' },
    ]},
    { label: '상품/주문', items: [
      { key: 'products', label: '상품 관리', subPath: '/commerce/products' },
      { key: 'local-products', label: '자체 상품', subPath: '/commerce/local-products' },
      { key: 'orders', label: '주문 관리', subPath: '/commerce/orders' },
    ]},
    { label: '매장 디스플레이', items: [
      { key: 'products-b2c',     label: '매장 진열 상품', subPath: '/commerce/products/b2c' },
      { key: 'channels',         label: '채널 현황',      subPath: '/channels' },
      { key: 'signage',          label: '매장 사이니지',  subPath: '/marketing/signage' },
      { key: 'tablet-displays',  label: '태블릿 진열',   subPath: '/commerce/tablet-displays' },
    ]},
    { label: '분석', items: [
      { key: 'analytics-marketing', label: '마케팅 분석', subPath: '/analytics/marketing' },
    ]},
    { label: '설정', items: [
      { key: 'store-settings', label: '매장 설정', subPath: '/settings' },
      { key: 'layout-builder', label: '레이아웃 빌더', subPath: '/settings/layout' },
    ]},
  ],
};
