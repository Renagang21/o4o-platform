/**
 * MobileBottomNavTab — 모바일 하단 nav 탭 1칸(공통 정본)
 *
 * WO-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1
 *
 * `to` 를 주면 `<Link>`, `onClick` 만 주면 `<button>` 으로 렌더한다.
 * active 판정은 하지 않는다 — 계산된 `active` 를 받기만 한다(§8: 판정은 서비스 소관).
 * 아이콘 library 를 강제하지 않는다 — `size`/`strokeWidth` 를 받는 컴포넌트면 된다.
 */

import type { CSSProperties, ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { NotificationTabBadge } from '../components/NotificationSheet.js';
import {
  mobileBottomNavTabStyle,
  mobileBottomNavLabelStyle,
  mobileBottomNavBadgeStyle,
} from './mobileBottomNavStyles.js';

export interface MobileBottomNavTabIconProps {
  size?: number;
  strokeWidth?: number;
}

export interface MobileBottomNavTabProps {
  label: string;
  icon: ComponentType<MobileBottomNavTabIconProps>;
  /** 계산된 active 상태. 판정 로직은 서비스가 소유한다. */
  active?: boolean;
  /** 브랜드 active 색 (서비스 토큰). */
  activeColor: string;
  /** 있으면 `<Link>` 로 렌더. 없으면 `<button>`. */
  to?: string;
  onClick?: () => void;
  /** 기본은 label 과 동일. */
  ariaLabel?: string;
  ariaHasPopup?: 'dialog' | 'menu';
  ariaExpanded?: boolean;
  /**
   * 강조 탭(비로그인 '로그인' 버튼). active 와 무관하게 브랜드 색 + 굵은 획.
   */
  emphasis?: boolean;
  /** 배지 표시(알림 탭). undefined 면 배지 자체를 렌더하지 않는다. */
  badgeCount?: number;
  /** 배지 위치/굵기 서비스 차이 보존용 부분 override. */
  badgeStyle?: CSSProperties;
  iconSize?: number;
}

export function MobileBottomNavTab({
  label,
  icon: Icon,
  active = false,
  activeColor,
  to,
  onClick,
  ariaLabel,
  ariaHasPopup,
  ariaExpanded,
  emphasis = false,
  badgeCount,
  badgeStyle,
  iconSize = 22,
}: MobileBottomNavTabProps) {
  const style: CSSProperties = emphasis
    ? { ...mobileBottomNavTabStyle, color: activeColor, fontWeight: 700 }
    : active
      ? { ...mobileBottomNavTabStyle, color: activeColor }
      : mobileBottomNavTabStyle;

  const strokeWidth = emphasis ? 2 : active ? 2.5 : 1.75;

  const content = (
    <>
      {badgeCount === undefined ? (
        <Icon size={iconSize} strokeWidth={strokeWidth} />
      ) : (
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <Icon size={iconSize} strokeWidth={strokeWidth} />
          <NotificationTabBadge
            unreadCount={badgeCount}
            style={badgeStyle ? { ...mobileBottomNavBadgeStyle, ...badgeStyle } : mobileBottomNavBadgeStyle}
          />
        </span>
      )}
      <span style={mobileBottomNavLabelStyle}>{label}</span>
    </>
  );

  if (to !== undefined) {
    return (
      <Link to={to} style={style} aria-label={ariaLabel ?? label} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      aria-label={ariaLabel ?? label}
      aria-haspopup={ariaHasPopup}
      aria-expanded={ariaExpanded}
    >
      {content}
    </button>
  );
}
