/**
 * filterMenuByRole — Operator 통합 메뉴의 adminOnly 필터 (4 서비스 공통)
 *
 * WO-O4O-OPERATOR-MENU-ROLE-FILTER-COMMONIZATION-G3A-V1:
 *   KPA-Society / GlycoPharm / K-Cosmetics / Neture 의 config/operatorMenuGroups.ts 에
 *   각각 존재하던 동일 구현을 공통화. 서비스별 메뉴 정의(UNIFIED_MENU) 와
 *   isAdmin 산출 방식은 각 서비스에 그대로 남는다.
 *
 * 계약 (기존 동작 보존):
 *   - adminOnly: true 항목은 isAdmin === true 일 때만 통과
 *   - adminOnly 키는 반환 객체에서 제거 (렌더러 계약 = OperatorMenuItem)
 *   - 항목 순서 보존
 *   - 통과 항목이 0개인 그룹은 결과에서 제외 (빈 그룹 헤딩 미표시)
 *   - 그 외 필드(label / path / exact / sectionLabel) 는 그대로 보존
 *
 * 권한 판정은 하지 않는다. isAdmin 산출은 호출처(wrapper) 책임이다.
 */

import type { OperatorGroupKey, OperatorMenuItem, UnifiedMenuItem } from './types';

export function filterMenuByRole(
  menu: Partial<Record<OperatorGroupKey, UnifiedMenuItem[]>>,
  isAdmin: boolean,
): Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> {
  const filtered: Partial<Record<OperatorGroupKey, OperatorMenuItem[]>> = {};
  for (const [key, items] of Object.entries(menu) as [OperatorGroupKey, UnifiedMenuItem[]][]) {
    const visible = items
      .filter(item => !item.adminOnly || isAdmin)
      .map(({ adminOnly: _adminOnly, ...rest }) => rest);
    if (visible.length > 0) filtered[key] = visible;
  }
  return filtered;
}
