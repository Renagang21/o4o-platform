/**
 * Store Workspace — 매장 업무공간 상위 구조 (Home / My Store / Store Hub / My Services)
 *
 * WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1
 *
 * ROLE-WORKSPACE-ARCHITECTURE §3 의 Store Workspace 는 **네 표면의 상위 구조**이며 새 도메인이 아니다.
 *   Home        : 진입 허브 (`{basePath}/workspace`)          — KPA 대시보드 복사 아님 (WO §10)
 *   My Store    : 기존 MyStoreShell 트리 (`{basePath}`)        — KPA 기반 공통 canonical (WO §5)
 *   Store Hub   : 기존 StoreHubShell 트리 (`/store-hub`)       — 3 서비스 동일 경로
 *   My Services : `GET /api/v1/work-scope/store-services` (`{basePath}/services`) — WO §7
 *
 * 경로의 단일 출처는 각 서비스 `StoreDashboardConfig.basePath` 다 (PharmacyHub `/store-owner` 는
 * PG callback 때문에 유지 — 여기서 새 경로 상수를 만들지 않는다). `/store-hub` 는 세 서비스가
 * 같은 값을 쓰고 있어 그대로 고정한다.
 *
 * 이 모듈은 **순수 계산**만 한다 — 권한 판정 · 데이터 조회 없음.
 */

import type { StoreDashboardConfig } from '../config/storeMenuConfig';
import {
  COSMETICS_STORE_CONFIG,
  KPA_SOCIETY_STORE_CONFIG,
  PHARMACY_HUB_STORE_CONFIG,
} from '../config/storeMenuConfig';

export type StoreWorkspaceTabKey = 'home' | 'my-store' | 'store-hub' | 'my-services';

export interface StoreWorkspacePaths {
  home: string;
  myStore: string;
  storeHub: string;
  myServices: string;
}

export interface StoreWorkspaceTab {
  key: StoreWorkspaceTabKey;
  label: string;
  to: string;
  /** NavLink exact 매칭 — 상위 경로(`myStore`)는 하위 화면에서도 active 여야 하므로 false */
  end: boolean;
}

/** 세 서비스가 동일하게 쓰는 Store Hub 경로 (KPA/KCos/PH App.tsx 모두 `/store-hub`) */
export const STORE_HUB_PATH = '/store-hub';

/** 표면 라벨 — 서비스 용어(약국/매장)를 셸이 고정하지 않고 중립어를 쓴다 */
export const STORE_WORKSPACE_TAB_LABELS: Record<StoreWorkspaceTabKey, string> = {
  home: '홈',
  'my-store': '내 매장',
  'store-hub': '매장 HUB',
  'my-services': '내 서비스',
};

export function resolveStoreWorkspacePaths(config: Pick<StoreDashboardConfig, 'basePath'>): StoreWorkspacePaths {
  const base = config.basePath.replace(/\/+$/, '');
  return {
    home: `${base}/workspace`,
    myStore: base,
    storeHub: STORE_HUB_PATH,
    myServices: `${base}/services`,
  };
}

export function buildStoreWorkspaceTabs(paths: StoreWorkspacePaths): StoreWorkspaceTab[] {
  return [
    { key: 'home', label: STORE_WORKSPACE_TAB_LABELS.home, to: paths.home, end: true },
    { key: 'my-store', label: STORE_WORKSPACE_TAB_LABELS['my-store'], to: paths.myStore, end: false },
    { key: 'store-hub', label: STORE_WORKSPACE_TAB_LABELS['store-hub'], to: paths.storeHub, end: false },
    { key: 'my-services', label: STORE_WORKSPACE_TAB_LABELS['my-services'], to: paths.myServices, end: true },
  ];
}

const startsWithPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/**
 * 현재 pathname 이 속한 표면. Home/My Services 는 정확 매칭, Store Hub 는 prefix,
 * 나머지 `{basePath}/**` 는 My Store 다. 어디에도 속하지 않으면 null.
 */
export function resolveActiveStoreWorkspaceTab(
  pathname: string,
  paths: StoreWorkspacePaths,
): StoreWorkspaceTabKey | null {
  if (pathname === paths.home) return 'home';
  if (pathname === paths.myServices) return 'my-services';
  if (startsWithPath(pathname, paths.storeHub)) return 'store-hub';
  if (startsWithPath(pathname, paths.myStore)) return 'my-store';
  return null;
}

/**
 * canonical serviceKey → 그 서비스의 My Store 진입 경로 (My Services 에서 다른 서비스로 이동할 때).
 * 새 상수가 아니라 기존 세 config 의 basePath 를 그대로 읽는다.
 */
export const STORE_CONFIGS_BY_SERVICE_KEY: Readonly<Record<string, StoreDashboardConfig>> = Object.freeze({
  'kpa-society': KPA_SOCIETY_STORE_CONFIG,
  'k-cosmetics': COSMETICS_STORE_CONFIG,
  'pharmacy-hub': PHARMACY_HUB_STORE_CONFIG,
});

export function getStoreWorkspacePathsForService(serviceKey: string): StoreWorkspacePaths | null {
  const config = STORE_CONFIGS_BY_SERVICE_KEY[serviceKey];
  return config ? resolveStoreWorkspacePaths(config) : null;
}
