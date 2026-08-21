import type { CSSProperties } from 'react';

/**
 * MobileBottomNav 공통 스타일 토큰
 *
 * WO-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1
 *
 * KPA / GlycoPharm / K-Cosmetics / Neture 네 구현이 각자 들고 있던 동일한
 * style 상수(tabStyle / labelStyle / navSafeArea / badgeStyle)의 정본이다.
 * 브랜드 색(activeColor)과 z-index 만 서비스가 주입한다.
 *
 * display/visibility 는 Tailwind 만 제어한다 — inline style 로 display 를 지정하면
 * `md:hidden` 보다 우선순위가 높아 데스크톱에서도 노출된다.
 */

/** `<nav>` 기본 class. z-index 는 zIndexClassName 으로 덧붙인다. */
export const MOBILE_BOTTOM_NAV_BASE_CLASS =
  'flex md:hidden fixed bottom-0 left-0 right-0 items-stretch bg-white border-t border-slate-200';

/** safe-area-inset 은 Tailwind 미지원 CSS custom property 이므로 inline style. */
export const mobileBottomNavSafeAreaStyle: CSSProperties = {
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
};

/** 탭 1칸(아이콘 + 라벨 세로 배치). 색은 호출 측이 덮어쓴다. */
export const mobileBottomNavTabStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  gap: 2,
  padding: '8px 0',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  textDecoration: 'none',
  color: '#94a3b8',
};

export const mobileBottomNavLabelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  lineHeight: 1,
};

/**
 * unread 배지 기본 위치/모양. 99+ 상한 규칙은 NotificationTabBadge 가 처리한다.
 * top / fontWeight 는 서비스별로 -4/700 과 -6/600 두 값이 있어 badgeStyle 로 덮어쓴다.
 */
export const mobileBottomNavBadgeStyle: CSSProperties = {
  position: 'absolute',
  top: -4,
  right: -8,
  minWidth: 16,
  height: 16,
  padding: '0 4px',
  borderRadius: 999,
  background: '#ef4444',
  color: '#fff',
  fontSize: 10,
  fontWeight: 700,
  lineHeight: '16px',
  textAlign: 'center',
};
