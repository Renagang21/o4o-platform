/**
 * Store Dashboard Menu Configuration
 * WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1 Phase 1
 *
 * 공통 9개 메뉴 정의 + 서비스별 활성화 설정
 */

export type StoreMenuKey =
  | 'overview'
  | 'identity'
  | 'storefront'
  | 'products'
  | 'orders'
  | 'settlement'
  | 'content'
  | 'services'
  | 'settings';

export interface StoreDashboardConfig {
  serviceKey: string;
  serviceName: string;
  basePath: string;
  enabledMenus: StoreMenuKey[];
}

export interface StoreMenuItemDef {
  key: StoreMenuKey;
  label: string;
  subPath: string; // '' for index route
}

/** 전체 메뉴 정의 (순서 고정) */
export const ALL_STORE_MENUS: StoreMenuItemDef[] = [
  { key: 'overview', label: '대시보드', subPath: '' },
  { key: 'identity', label: '매장 정보', subPath: '/identity' },
  { key: 'storefront', label: '사이버 매장', subPath: '/storefront' },
  { key: 'products', label: '상품 관리', subPath: '/products' },
  { key: 'orders', label: '주문 관리', subPath: '/orders' },
  { key: 'settlement', label: '정산', subPath: '/settlement' },
  { key: 'content', label: '콘텐츠/사이니지', subPath: '/content' },
  { key: 'services', label: '서비스 관리', subPath: '/services' },
  { key: 'settings', label: '설정', subPath: '/settings' },
];

/** K-Cosmetics Store Config */
export const COSMETICS_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'cosmetics',
  serviceName: 'K-Cosmetics',
  basePath: '/store',
  enabledMenus: [
    'overview', 'identity', 'products', 'orders',
    'settlement', 'content', 'services', 'settings',
  ],
};

/** GlycoPharm Store Config */
export const GLYCOPHARM_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'glycopharm',
  serviceName: 'GlycoPharm',
  basePath: '/store',
  enabledMenus: [
    'overview', 'identity', 'products', 'orders',
    'content', 'services', 'settings',
  ],
};

/** GlucoseView Store Config */
export const GLUCOSEVIEW_STORE_CONFIG: StoreDashboardConfig = {
  serviceKey: 'glucoseview',
  serviceName: 'GlucoseView',
  basePath: '/store',
  enabledMenus: ['overview', 'identity', 'services', 'settings'],
};
