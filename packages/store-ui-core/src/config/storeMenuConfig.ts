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

/** KPA-Society Store Config (WO-O4O-STORE-HUB-STRUCTURE-REFACTOR-V1) */
export const KPA_SOCIETY_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'kpa-society',
  serviceName: '약국 경영지원',
  basePath: '/store',
  enabledMenus: ['dashboard'],
  menuSections: [
    { label: '', items: [
      { key: 'dashboard', label: '대시보드', subPath: '/dashboard' },
    ]},
    { label: 'Operation', items: [
      { key: 'library', label: '자료실', subPath: '/operation/library' },
    ]},
    { label: 'Marketing', items: [
      { key: 'qr', label: 'QR 관리', subPath: '/marketing/qr' },
      { key: 'pop', label: 'POP 자료', subPath: '/marketing/pop' },
      { key: 'signage', label: '사이니지', subPath: '/marketing/signage' },
    ]},
    { label: 'Commerce', items: [
      { key: 'products', label: '상품 관리', subPath: '/commerce/products' },
      { key: 'local-products', label: '자체 상품', subPath: '/commerce/local-products' },
      { key: 'orders', label: '주문 관리', subPath: '/commerce/orders' },
    ]},
    { label: 'Analytics', items: [
      { key: 'analytics-marketing', label: '마케팅 분석', subPath: '/analytics/marketing' },
    ]},
  ],
};
