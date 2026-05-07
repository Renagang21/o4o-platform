/**
 * Menu ↔ Capability Mapping & Resolver
 * WO-O4O-CAPABILITY-MENU-INTEGRATION-V1
 *
 * Capability OFF → 메뉴 숨김, Capability ON → 메뉴 표시.
 * 매핑되지 않은 메뉴(dashboard, channels, billing, settings 등)는 항상 표시.
 *
 * Zero-dependency: @o4o/capabilities 미import (store-ui-core는 peerDeps만 허용).
 */

import type { StoreDashboardConfig, StoreMenuKey, StoreMenuSection } from './storeMenuConfig';

/**
 * 메뉴 키 → Capability 키 매핑.
 * 여기 없는 키는 항상 표시.
 */
export const MENU_CAPABILITY_MAP: Record<string, string> = {
  // Flat mode (GlycoPharm, K-Cosmetics)
  products: 'B2C_COMMERCE',
  orders: 'B2C_COMMERCE',
  signage: 'SIGNAGE',
  // WO-O4O-KPA-STORE-SIDEBAR-MENU-RESTRUCTURE-V1:
  // qr / pop / library 매핑 임시 제거 — 기존 매장의 store_capabilities row 누락으로 인한
  // UX 불일치(홈 카드 vs 사이드바) 해결. 후속: row backfill 또는 default fallback 도입.
  // library: 'LIBRARY',
  // qr: 'QR_MARKETING',
  // pop: 'POP_PRINT',
};

/**
 * Capability 기반 메뉴 필터링.
 *
 * @param config   원본 StoreDashboardConfig
 * @param enabledCaps  활성화된 Capability key Set (null이면 필터 미적용)
 * @returns 필터링된 새 config (원본 불변)
 */
export function resolveStoreMenu(
  config: StoreDashboardConfig,
  enabledCaps: Set<string> | null | undefined,
): StoreDashboardConfig {
  // 하위 호환: capabilities 미제공 시 원본 그대로
  if (!enabledCaps) return config;

  const isVisible = (key: string): boolean => {
    const cap = MENU_CAPABILITY_MAP[key];
    if (!cap) return true;
    return enabledCaps.has(cap);
  };

  // Flat mode: enabledMenus 필터
  const filteredMenus = config.enabledMenus.filter((k) => isVisible(k));

  // Section mode: items 필터 + 빈 섹션 제거
  let filteredSections: StoreMenuSection[] | undefined;
  if (config.menuSections) {
    filteredSections = config.menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => isVisible(item.key)),
      }))
      .filter((section) => section.items.length > 0);
  }

  return {
    ...config,
    enabledMenus: filteredMenus as StoreMenuKey[],
    ...(filteredSections !== undefined ? { menuSections: filteredSections } : {}),
  };
}
