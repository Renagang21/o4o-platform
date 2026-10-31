import type { GlobalHeaderNavItem } from '@o4o/ui';

/** Presentation metadata; membership/operator decisions remain server-owned. */
export const PARTNER_PUBLIC_NAV: GlobalHeaderNavItem[] = [
  { label: '파트너 커뮤니티', href: '/community' },
  { label: '홍보 작업공간', href: '/workspace' },
];
export const PARTNER_OPERATOR_NAV: GlobalHeaderNavItem[] = [
  { label: '운영 관리', href: '/operator' },
];
