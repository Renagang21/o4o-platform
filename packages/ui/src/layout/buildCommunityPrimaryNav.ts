/**
 * buildCommunityPrimaryNav — 커뮤니티 서비스 Primary Nav 공통 조립기
 *
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1 §9
 *
 * 배경:
 *   `filterContextualNav` 로 "역할 필터"는 이미 공통화됐지만, **조립 순서**는
 *   각 서비스 헤더 브릿지에 손으로 흩어져 있었다(KPA 는 base→contextual→안내→About 을
 *   직접 concat, Pharmacy-Hub 는 publicNav/contextualNav 를 분리 전달). 같은 커뮤니티
 *   구조인데 메뉴 배열 순서가 서비스마다 달라지는 drift 를 막는다.
 *
 * Canonical 순서:
 *   base(커뮤니티 진입) → 역할 contextual → trailing(서비스 안내 · About) → guestTrailing(비로그인 전용)
 *
 * 계약:
 *   - PrimaryNav 는 1단이다. `children` submenu 계약은 제거됐고 되살리지 않는다
 *     (WO-O4O-GLOBAL-HEADER-UNUSED-CHILDREN-CONTRACT-REMOVAL-V1).
 *   - 항목·조건 키·역할 판정은 서비스 소유(config/navigation.ts). 여기서는 순서만 고정한다.
 *   - 서비스 분기를 두지 않는다.
 */

import type { GlobalHeaderNavItem } from './GlobalHeader';
import { filterContextualNav, type ContextualNavItem } from './filterContextualNav';

export interface BuildCommunityPrimaryNavConfig<TCondition extends string = string> {
  /** 커뮤니티 진입 등 항상 맨 앞에 오는 항목 */
  base: readonly GlobalHeaderNavItem[];
  /** 역할 조건부 업무 진입점 */
  contextual?: readonly ContextualNavItem<TCondition>[];
  /** contextual 노출 조건 */
  conditions?: Partial<Record<TCondition, boolean>>;
  /** operator/admin 전체 노출 정책을 쓰는 서비스만 true */
  showAllContextual?: boolean;
  /** 서비스 안내 · About 등 공개 안내 항목 (contextual 뒤) */
  trailing?: readonly GlobalHeaderNavItem[];
  /** 비로그인 사용자에게만 노출하는 항목 (예: Contact) */
  guestTrailing?: readonly GlobalHeaderNavItem[];
  /** 로그인 여부 — guestTrailing 판정에만 사용 */
  isAuthenticated?: boolean;
}

export function buildCommunityPrimaryNav<TCondition extends string = string>(
  config: BuildCommunityPrimaryNavConfig<TCondition>,
): GlobalHeaderNavItem[] {
  const roleItems = config.contextual?.length
    ? filterContextualNav(config.contextual, config.conditions ?? {}, {
        showAll: config.showAllContextual,
      })
    : [];

  return [
    ...config.base,
    ...roleItems,
    ...(config.trailing ?? []),
    ...(config.isAuthenticated ? [] : (config.guestTrailing ?? [])),
  ];
}
