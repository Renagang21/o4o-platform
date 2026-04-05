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

/** GlycoPharm Store Config (WO-STORE-BILLING-FOUNDATION-V1) */
export const GLYCOPHARM_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'glycopharm',
  serviceName: 'GlycoPharm',
  basePath: '/store',
  enabledMenus: [
    'dashboard', 'products', 'local-products', 'channels', 'orders',
    'content', 'signage', 'billing', 'settings',
  ],
};

/** GlucoseView Store Config */
export const GLUCOSEVIEW_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'glucoseview',
  serviceName: 'GlucoseView',
  basePath: '/store',
  enabledMenus: ['dashboard', 'settings'],
};

/**
 * KPA-Society Store Config
 * WO-KPA-STORE-SIDEBAR-REALIGNMENT-V1
 * WO-KPA-PHARMACY-HUB-NAVIGATION-RESTRUCTURE-V1:
 *   - 약국 정보 섹션 추가 (대시보드 아래)
 *   - 주문 가능 상품 제거 (canonical: /hub/b2b)
 */
export const KPA_SOCIETY_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'kpa-society',
  serviceName: '약국 경영지원',
  basePath: '/store',
  enabledMenus: ['dashboard'],
  menuSections: [
    { label: '', items: [
      { key: 'dashboard', label: '대시보드', subPath: '/dashboard' },
    ]},
    { label: '', items: [
      { key: 'pharmacy-info', label: '약국 정보', subPath: '/info' },
    ]},
    { label: '운영', items: [
      { key: 'library', label: '자료실', subPath: '/operation/library' },
      { key: 'blog', label: '블로그', subPath: '/content/blog' },
    ]},
    { label: '마케팅', items: [
      { key: 'qr', label: 'QR 관리', subPath: '/marketing/qr' },
      { key: 'pop', label: 'POP 자료', subPath: '/marketing/pop' },
      { key: 'signage', label: '매장 사이니지', subPath: '/marketing/signage' },
      { key: 'analytics-marketing', label: '마케팅 분석', subPath: '/analytics/marketing' },
    ]},
    { label: '상품/판매', items: [
      { key: 'products', label: '상품 관리(B2B)', subPath: '/commerce/products' },
      { key: 'b2c', label: 'B2C 상품 판매', subPath: '/commerce/products/b2c' },
      { key: 'local-products', label: '자체 상품', subPath: '/commerce/local-products' },
      { key: 'suppliers', label: '공급자', subPath: '/commerce/products/suppliers' },
      { key: 'orders', label: '주문 관리', subPath: '/commerce/orders' },
    ]},
    { label: '채널/디바이스', items: [
      { key: 'channels', label: '채널 관리', subPath: '/channels' },
      { key: 'tablet-channels', label: '태블릿 채널', subPath: '/channels/tablet' },
      { key: 'tablet-displays', label: '태블릿 디스플레이', subPath: '/commerce/tablet-displays' },
    ]},
    { label: '설정', items: [
      { key: 'store-settings', label: '매장 설정', subPath: '/settings' },
      { key: 'layout-builder', label: '레이아웃 빌더', subPath: '/settings/layout' },
    ]},
    { label: '정산', items: [
      { key: 'billing', label: '정산/인보이스', subPath: '/billing' },
    ]},
  ],
};
