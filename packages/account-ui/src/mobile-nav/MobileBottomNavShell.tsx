/**
 * MobileBottomNavShell — 모바일 하단 네비게이션 컨테이너(공통 정본)
 *
 * WO-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1
 *
 * 계약:
 *   - `md:hidden` 고정 배치 · safe-area 처리만 담당한다.
 *   - 탭 구성 / 라벨 / route / 역할별 노출은 전부 호출 측(서비스) 소관이다.
 *   - serviceKey 분기 없음.
 */

import type { CSSProperties, ReactNode } from 'react';
import {
  MOBILE_BOTTOM_NAV_BASE_CLASS,
  mobileBottomNavSafeAreaStyle,
} from './mobileBottomNavStyles.js';

export interface MobileBottomNavShellProps {
  children: ReactNode;
  /**
   * z-index Tailwind class. 서비스별 기존 값을 그대로 유지한다
   * (KPA·Neture `z-40`, GlycoPharm·K-Cosmetics `z-50`).
   */
  zIndexClassName?: string;
  /** 추가 class (기본 계약을 덮어쓰지 않는 범위에서). */
  className?: string;
  ariaLabel?: string;
  style?: CSSProperties;
}

export function MobileBottomNavShell({
  children,
  zIndexClassName = 'z-40',
  className,
  ariaLabel = '모바일 하단 메뉴',
  style,
}: MobileBottomNavShellProps) {
  return (
    <nav
      className={[MOBILE_BOTTOM_NAV_BASE_CLASS, zIndexClassName, className]
        .filter(Boolean)
        .join(' ')}
      style={style ? { ...mobileBottomNavSafeAreaStyle, ...style } : mobileBottomNavSafeAreaStyle}
      aria-label={ariaLabel}
    >
      {children}
    </nav>
  );
}

/**
 * 고정 nav 높이만큼 문서 흐름 여백을 만드는 spacer.
 * 콘텐츠 마지막 부분이 nav 뒤로 가려지는 것을 막는다. 필요한 서비스만 렌더한다.
 */
export function MobileBottomNavSpacer({ height = '3.5rem' }: { height?: string }) {
  return (
    <div
      className="md:hidden"
      aria-hidden
      style={{ height: `calc(${height} + env(safe-area-inset-bottom, 0px))` }}
    />
  );
}

/** 시트(알림·프로필)가 열렸을 때 뒤를 덮는 backdrop. 알림/프로필이 공유한다. */
export function MobileBottomNavBackdrop({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      aria-hidden
      className="md:hidden fixed inset-0 z-40 bg-black/30"
    />
  );
}
