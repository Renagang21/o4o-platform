/**
 * MobileBottomNav — 모바일 하단 네비게이션 공통 정본
 *
 * WO-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1 §6
 *
 * 서비스는 탭 배열(items)과 브랜드 색만 넘긴다. 이 컴포넌트는 배치·탭 렌더만 한다.
 *   - active 판정은 하지 않는다. 계산된 `active` 를 받는다 (§8: 판정은 서비스 소관).
 *   - route/label/icon/역할별 노출 조건을 여기서 알지 않는다.
 *   - serviceKey 분기 없음.
 *
 * 시트(알림/프로필)·backdrop 은 nav 내부에 렌더되므로 children 으로 받는다.
 */

import type { ReactNode } from 'react';
import { MobileBottomNavShell } from './MobileBottomNavShell.js';
import { MobileBottomNavTab } from './MobileBottomNavTab.js';
import type { MobileBottomNavTabProps } from './MobileBottomNavTab.js';

export interface MobileBottomNavItem extends Omit<MobileBottomNavTabProps, 'activeColor'> {
  /** React key. 서비스 내에서만 유일하면 된다. */
  key: string;
  /** 탭별 색을 따로 쓰는 경우만. 기본은 nav 의 activeColor. */
  activeColor?: string;
}

export interface MobileBottomNavProps {
  items: MobileBottomNavItem[];
  /** 브랜드 active 색 (서비스 토큰). */
  activeColor: string;
  /** 서비스별 기존 z-index 유지 (KPA·Neture `z-40`, GlycoPharm·K-Cosmetics `z-50`). */
  zIndexClassName?: string;
  ariaLabel?: string;
  /** 알림/프로필 시트 · backdrop 등 nav 안에 붙는 요소. */
  children?: ReactNode;
}

export function MobileBottomNav({
  items,
  activeColor,
  zIndexClassName,
  ariaLabel,
  children,
}: MobileBottomNavProps) {
  return (
    <MobileBottomNavShell zIndexClassName={zIndexClassName} ariaLabel={ariaLabel}>
      {items.map(({ key, activeColor: itemColor, ...tab }) => (
        <MobileBottomNavTab key={key} activeColor={itemColor ?? activeColor} {...tab} />
      ))}
      {children}
    </MobileBottomNavShell>
  );
}
