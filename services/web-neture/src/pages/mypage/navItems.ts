/** My Home의 다중 화면 탐색. 기존 계정 하위 경로와 공급자 역할 SSOT를 유지한다. */
import type { MyPageNavItem } from '@o4o/account-ui';
import { SUPPLIER_ONLY_ROLES } from '../../lib/role-constants';

export function getNetureMyPageNavItems(roles: readonly string[] | undefined | null): MyPageNavItem[] {
  const isSupplier = (roles ?? []).some((r) => SUPPLIER_ONLY_ROLES.includes(r));

  return [
    { label: '모아보기', path: '' },
    { label: '참여 서비스', path: '/services' },
    { label: '커뮤니티 활동', path: '/activity' },
    { label: '경영 현황', path: '/management' },
    { label: '계정 설정', path: '/settings' },
    { label: '프로필', path: '/profile' },
    { label: '사업자 정보', path: '/business-profile', visible: isSupplier },
  ];
}
