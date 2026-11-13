/** My Home의 다중 화면 탐색. 기존 계정 하위 경로와 공급자 역할 SSOT를 유지한다. */
import type { MyPageNavItem } from '@o4o/account-ui';
import { SUPPLIER_ONLY_ROLES } from '../../lib/role-constants';
import { CURRENT_HOST_PROFILE } from '../../lib/hostProfile';

/**
 * @param hasStore 모아보기가 확인한 매장 보유 여부(lib/my-home-store-presence). false 일 때만 「경영 현황」을 숨긴다 —
 *   모아보기도 매장이 없으면 경영 현황 링크를 보이지 않는다(2026-11-13 My Home 개선 3). 직접 URL 의 빈 상태는 그대로다.
 */
export function getNetureMyPageNavItems(roles: readonly string[] | undefined | null, hasStore?: boolean): MyPageNavItem[] {
  const isSupplier = (roles ?? []).some((r) => SUPPLIER_ONLY_ROLES.includes(r));

  return [
    { label: '모아보기', path: '' },
    { label: '참여 서비스', path: '/services' },
    { label: '커뮤니티 활동', path: '/activity' },
    { label: '경영 현황', path: '/management', visible: hasStore !== false },
    // 내 정보 묶음 — 프로필(약사 자격 포함) · 사업자 정보
    { label: '내 정보', path: '/profile' },
    { label: '사업자 정보', path: '/business-profile', visible: isSupplier },
    { label: '계정 설정', path: '/settings' },
    ...(CURRENT_HOST_PROFILE === 'main' ? [{label:'개인 메일',path:'/mail'}] : []),
  ];
}
