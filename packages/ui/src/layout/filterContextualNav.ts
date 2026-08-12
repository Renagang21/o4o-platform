/**
 * filterContextualNav — GlobalHeader contextual nav 공통 필터 엔진
 *
 * WO-O4O-FRONTEND-MENU-AND-ROUTE-CONTRACT-COMMONIZATION-FULL-CLOSE-V1
 *
 * KPA / Neture / K-Cosmetics / GlycoPharm 4개 서비스가 각각 `config/navigation.ts` 안에
 * 동일 구조의 filterContextualNav 를 중복 구현하고 있었다. 필터 "구조"만 Core 로 승격하고,
 * 메뉴 항목·노출 조건 키·역할 판정은 서비스별 설정(Extension)으로 유지한다.
 *
 * 계약 (기존 4개 구현과 동일한 결과):
 * - `showAll: true` 이면 조건을 무시하고 전체 항목을 노출한다
 *   (WO-O4O-COMMON-MENU-VISIBILITY-POLICY-IMPL-V1: operator/admin 은 모든 contextual nav 를 본다).
 *   KPA 처럼 이 정책이 없는 서비스는 showAll 을 주입하지 않는다.
 * - 그 외에는 `conditions[item.visibleWhen] === true` 인 항목만 노출한다.
 *   조건이 정의되지 않은 visibleWhen 키는 false (기존 구현의 `return false` 기본값과 동일).
 * - 반환값은 `{ label, href }` 로 정규화한다 (GlobalHeaderNavItem 계약).
 * - 입력 순서는 보존한다.
 */

import type { GlobalHeaderNavItem } from './GlobalHeader';

export interface ContextualNavItem<TCondition extends string = string>
  extends GlobalHeaderNavItem {
  /** 노출 조건 키 (서비스별 union 으로 좁혀 사용) */
  visibleWhen: TCondition;
}

export interface FilterContextualNavOptions {
  /** true 이면 조건 판정을 건너뛰고 전체 항목 노출 (operator/admin 정책) */
  showAll?: boolean;
}

export function filterContextualNav<TCondition extends string>(
  items: readonly ContextualNavItem<TCondition>[],
  conditions: Partial<Record<TCondition, boolean>>,
  options: FilterContextualNavOptions = {},
): GlobalHeaderNavItem[] {
  const toNavItem = (item: ContextualNavItem<TCondition>): GlobalHeaderNavItem => ({
    label: item.label,
    href: item.href,
  });

  if (options.showAll) return items.map(toNavItem);

  return items.filter((item) => conditions[item.visibleWhen] === true).map(toNavItem);
}
