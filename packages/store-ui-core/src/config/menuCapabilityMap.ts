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
  signage: 'SIGNAGE',
  // WO-O4O-KPA-STORE-SIDEBAR-MENU-RESTRUCTURE-V1:
  // qr / pop / library 매핑 임시 제거 — 기존 매장의 store_capabilities row 누락으로 인한
  // UX 불일치(홈 카드 vs 사이드바) 해결. 후속: row backfill 또는 default fallback 도입.
  // library: 'LIBRARY',
  // qr: 'QR_MARKETING',
  // pop: 'POP_PRINT',
  // WO-O4O-STORE-MENU-CANONICAL-TREE-ALIGNMENT-V2 (공통 정책 수정 — smoke 후속):
  // products / orders 매핑 제거. 동일 사유(매장 B2C_COMMERCE row 누락)로 "상품·거래" 그룹의
  // item(products, orders)이 전부 필터링되어 그룹 자체가 숨겨지던 문제.
  // 이는 KPA 개별 문제가 아니라 3개 서비스 공통 정책 문제 — 상품·거래는 KPA/GlycoPharm/
  // K-Cosmetics 모두에서 최상단 핵심 업무축이므로 capability 필터로 숨겨선 안 된다.
  // KPA 단독 capability 주입/DB backfill/최상단 그룹 특수 예외 로직을 쓰지 않고 공통 de-map 으로 해결.
  // 서비스별 실제 노출 차이는 각 config 의 items(라우트 존재분만)로 유지. 후속: capability row backfill.
  // products: 'B2C_COMMERCE',
  // orders: 'B2C_COMMERCE',
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
