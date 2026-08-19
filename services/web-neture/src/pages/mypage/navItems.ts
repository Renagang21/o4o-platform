/**
 * Neture My Page navigation config
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1
 *
 * 결함: Neture 는 /mypage 하위 4개 라우트를 갖고 있으면서 navItems 를 주지 않아
 *       공통 기본 3개만 렌더됐고, /mypage/business-profile 에서는 활성 tab 이
 *       없었다(해당 화면으로 이동할 tab 자체가 없음).
 * 교정: KPA / K-Cosmetics / GlycoPharm 과 같은 축으로 nav config 를 명시한다.
 *
 * 역할 판정은 **신설하지 않는다** (WO §11).
 * Neture 의 기존 SSOT `lib/role-constants.ts` 의 `SUPPLIER_ONLY_ROLES` 를 그대로
 * 쓴다 — MyPageHub 가 인라인으로 갖고 있던 판정과 같은 집합이다.
 */

import type { MyPageNavItem } from '@o4o/account-ui';
import { SUPPLIER_ONLY_ROLES } from '../../lib/role-constants';

/**
 * 보유 역할 기준 My Page nav 구성.
 * 사업자 정보는 공급자에게만 보인다 — 다른 사용자에게는 라우트는 있어도
 * 내용이 없으므로 tab 을 노출하지 않는다(데드링크 0).
 */
export function getNetureMyPageNavItems(roles: readonly string[] | undefined | null): MyPageNavItem[] {
  const isSupplier = (roles ?? []).some((r) => SUPPLIER_ONLY_ROLES.includes(r));

  return [
    { label: '홈', path: '' },
    { label: '프로필', path: '/profile' },
    // mobileVisible 기본 true — 좁은 폭에서도 진입이 사라지지 않는다 (WO §12)
    { label: '사업자 정보', path: '/business-profile', visible: isSupplier },
    { label: '설정', path: '/settings' },
  ];
}
