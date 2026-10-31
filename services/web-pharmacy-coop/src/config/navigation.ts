import type { GlobalHeaderNavItem } from '@o4o/ui';

/** Federation and individual cooperative permissions are evaluated by their own ledgers. */
export const COOPERATIVE_PUBLIC_NAV: GlobalHeaderNavItem[] = [
  { label: '연합회 홈', href: '/' },
  { label: '소속 협동조합', href: '/cooperatives' },
  { label: '연합회 소개', href: '/about' },
  { label: '문의하기', href: '/contact' },
];
export const COOPERATIVE_MEMBER_NAV: GlobalHeaderNavItem[] = [
  { label: '내 협동조합', href: '/cooperatives/mine' },
  { label: '내 처리 소식', href: '/cooperatives/updates' },
];
export const FEDERATION_OPERATOR_NAV: GlobalHeaderNavItem[] = [
  { label: '연합회 운영', href: '/operator' },
];
