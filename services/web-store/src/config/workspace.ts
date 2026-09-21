/**
 * Unified Store Workspace 상수 — WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1
 *
 * store.neture.co.kr 은 **O4O 공통 Store Workspace 이며 서비스가 아니다.**
 * 그래서 이 앱에는 SERVICE_KEY 가 없다(IR §13 — `serviceKey='store'` 금지). 1차 축은 organizationId 이고
 * serviceKey 는 그 매장의 enrollment(1 Store : N Services)를 가리키는 2차 축일 뿐이다.
 */
export const WORKSPACE_KEY = 'store' as const;

export const BRAND = {
  name: '내 매장',
  nameEn: 'O4O Store Workspace',
  domain: 'store.neture.co.kr',
  tagline: '가입한 모든 서비스의 매장 업무를 한곳에서',
} as const;

/** 대표 도메인(계정 · 약관 · 개인정보처리방침의 정본 위치). 법정정보 footer 는 플랫폼 운영자(neture) 프로필을 쓴다. */
export const PLATFORM_ORIGIN = 'https://neture.co.kr';
export const PLATFORM_LEGAL_SERVICE_KEY = 'neture';

/**
 * canonical path 초안(IR §21) — 상위 nav 6개. 하위 항목은 전부 placeholder(기능 이전 0 · 메뉴 합집합 금지).
 * 기능이 없는 경로는 `PlaceholderPage` 1개로 통일한다.
 */
export const WORKSPACE_PATHS = {
  home: '/',
  myStore: '/store',
  serviceWork: '/work',
  storeHub: '/hub',
  myServices: '/services',
  settings: '/settings',
  select: '/select-store',
  login: '/login',
  handoff: '/handoff',
} as const;

export interface RootNavItem {
  key: 'home' | 'my-store' | 'service-work' | 'store-hub' | 'my-services' | 'settings';
  label: string;
  to: string;
  end: boolean;
}

export const ROOT_NAV_ITEMS: readonly RootNavItem[] = [
  { key: 'home', label: '홈', to: WORKSPACE_PATHS.home, end: true },
  { key: 'my-store', label: '내 매장', to: WORKSPACE_PATHS.myStore, end: false },
  { key: 'service-work', label: '서비스 업무', to: WORKSPACE_PATHS.serviceWork, end: false },
  { key: 'store-hub', label: '매장 HUB', to: WORKSPACE_PATHS.storeHub, end: false },
  { key: 'my-services', label: '내 서비스', to: WORKSPACE_PATHS.myServices, end: true },
  { key: 'settings', label: '설정', to: WORKSPACE_PATHS.settings, end: false },
] as const;
