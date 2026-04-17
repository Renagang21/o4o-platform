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

/**
 * K-Cosmetics Store Config
 * WO-KCOS-MENU-STRUCTURE-ALIGN-V1: placeholder 메뉴 비노출
 *   제거: products, orders, billing, content, settings (StorePlaceholderPage)
 *   유지: dashboard, local-products, channels (실구현 완료)
 */
export const COSMETICS_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'cosmetics',
  serviceName: 'K-Cosmetics',
  basePath: '/store',
  enabledMenus: [
    'dashboard', 'local-products', 'channels',
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
      label: '디지털 사이니지',
      items: [
        { key: 'signage-playlist',  label: '플레이리스트', subPath: '/signage/playlist' },
        { key: 'signage-videos',    label: '동영상',       subPath: '/signage/videos' },
        { key: 'signage-schedules', label: '스케줄',       subPath: '/signage/schedules' },
        { key: 'signage-player',    label: '재생',         subPath: '/signage/player' },
      ],
    },
    {
      label: '마케팅·콘텐츠',
      items: [
        { key: 'market-trial', label: 'Market Trial', subPath: '/market-trial' },
        { key: 'funnel',       label: '전환 퍼널',      subPath: '/funnel' },
        { key: 'content',      label: '콘텐츠 가져오기', subPath: '/content' },
        { key: 'channels',     label: '채널 관리',      subPath: '/channels' },
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
 * WO-STORE-SIDEBAR-RESTRUCTURE-V1:
 *   - 7섹션/15항목 → 6섹션/14항목 재구성
 *   - 홈 단독 / 상품·주문 / 매장 실행 / 채널 / 자료·분석 / 설정
 *   - 자체 상품·매장 진열 상품 사이드바 제거 (라우트 유지)
 *   - 라벨 변경: QR 관리→QR 코드, 채널 현황→B2B 사이트, 매장 사이니지→디지털 사이니지
 *   - 약국 정보 설정 그룹으로 이동
 */
export const KPA_SOCIETY_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'kpa-society',
  serviceName: '약국 경영지원',
  basePath: '/store',
  enabledMenus: ['dashboard'],
  menuSections: [
    { label: '', items: [
      { key: 'home', label: '홈', subPath: '' },
    ]},
    { label: '상품/주문', items: [
      { key: 'products', label: '상품 관리', subPath: '/commerce/products' },
      { key: 'orders',   label: '주문 관리', subPath: '/commerce/orders' },
    ]},
    { label: '디지털 사이니지', items: [
      { key: 'signage-playlist',  label: '플레이리스트', subPath: '/marketing/signage/playlist' },
      { key: 'signage-videos',    label: '동영상',       subPath: '/marketing/signage/videos' },
      { key: 'signage-schedules', label: '스케줄',       subPath: '/marketing/signage/schedules' },
      { key: 'signage-player',    label: '재생',         subPath: '/marketing/signage/player' },
    ]},
    { label: '매장 실행', items: [
      { key: 'qr',  label: 'QR 코드', subPath: '/marketing/qr' },
      { key: 'pop', label: 'POP 자료', subPath: '/marketing/pop' },
    ]},
    { label: '채널', items: [
      { key: 'tablet-displays', label: '태블릿 진열', subPath: '/commerce/tablet-displays' },
      { key: 'channels',        label: 'B2B 사이트',  subPath: '/channels' },
      { key: 'blog',            label: '블로그',       subPath: '/content/blog' },
    ]},
    { label: '자료/분석', items: [
      { key: 'library',            label: '자료실',     subPath: '/operation/library' },
      { key: 'analytics-marketing', label: '마케팅 분석', subPath: '/analytics/marketing' },
    ]},
    { label: '설정', items: [
      { key: 'pharmacy-info',  label: '약국 정보',      subPath: '/info' },
      { key: 'store-settings', label: '매장 설정',      subPath: '/settings' },
      { key: 'layout-builder', label: '레이아웃 빌더', subPath: '/settings/layout' },
    ]},
  ],
};
