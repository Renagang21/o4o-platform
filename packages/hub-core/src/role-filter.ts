/**
 * Role-based filtering for hub cards and sections
 *
 * WO-PLATFORM-HUB-CORE-EXTRACTION-V1
 */

import type { HubCardDefinition, HubSectionDefinition } from './types.js';

/**
 * 사용자 역할 기준으로 카드 필터링
 *
 * card.roles가 undefined이거나 빈 배열이면 → 모든 사용자에게 노출
 * card.roles가 정의되면 → userRoles와 교집합이 있을 때만 노출
 */
export function filterCardsByRole(
  cards: HubCardDefinition[],
  userRoles: string[],
): HubCardDefinition[] {
  return cards.filter((card) => {
    if (!card.roles || card.roles.length === 0) return true;
    return card.roles.some((r) => userRoles.includes(r));
  });
}

/**
 * 사용자 역할 기준으로 섹션 필터링
 *
 * 1. section.roles 체크 — 섹션 자체 접근 권한
 * 2. 각 카드의 roles 체크 — 카드 단위 필터링
 * 3. 카드가 0개인 섹션은 제거
 */
export function filterSectionsByRole(
  sections: HubSectionDefinition[],
  userRoles: string[],
): HubSectionDefinition[] {
  return sections
    .filter((section) => {
      if (!section.roles || section.roles.length === 0) return true;
      return section.roles.some((r) => userRoles.includes(r));
    })
    .map((section) => ({
      ...section,
      cards: filterCardsByRole(section.cards, userRoles),
    }))
    .filter((section) => section.cards.length > 0);
}
